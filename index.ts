import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { extractText } from 'unpdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import services dynamically after env is loaded
const { groqService, groqReasoningService, groqVisionService } = await import('./services/groq.js');
const { cerebrasService } = await import('./services/cerebras.js');
import type { AIService, ChatMessage, ChatMessageContent } from './types.js';

const app = express();
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|docx|xlsx|pptx|txt|json|csv|zip|rar|md)$/i;
    cb(null, allowed.test(file.originalname));
  }
});

// File processing function
async function processFile(file: Express.Multer.File): Promise<ChatMessageContent> {
  const ext = file.originalname.split('.').pop()?.toLowerCase();

  try {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        // Send images as base64 for Groq vision model
        return {
          type: 'image_url',
          image_url: {
            url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
          }
        };

      case 'pdf':
        try {
          // unpdf expects Uint8Array, convert Buffer
          const uint8Array = new Uint8Array(file.buffer);
          const result = await extractText(uint8Array);
          // extractText returns { text: string[] } - join the array
          const pdfText = Array.isArray(result.text) ? result.text.join('\n') : result.text;
          return {
            type: 'text',
            text: `[PDF: ${file.originalname}]\n\n${pdfText.substring(0, 10000)}`
          };
        } catch (pdfError) {
          console.error('PDF extraction error:', pdfError);
          return {
            type: 'text',
            text: `[PDF: ${file.originalname}]\nFailed to extract text. Error: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
          };
        }

      case 'docx':
        const { value } = await mammoth.extractRawText({ buffer: file.buffer });
        return {
          type: 'text',
          text: `[Word Document: ${file.originalname}]\n\n${value.substring(0, 10000)}`
        };

      case 'xlsx':
        const workbook = XLSX.read(file.buffer);
        const text = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          return `Sheet: ${name}\n${csv}`;
        }).join('\n\n');
        return {
          type: 'text',
          text: `[Excel Spreadsheet: ${file.originalname}]\n\n${text.substring(0, 10000)}`
        };

      case 'txt':
      case 'csv':
      case 'json':
      case 'md':
        const content = file.buffer.toString('utf-8');
        return {
          type: 'text',
          text: `[${ext.toUpperCase()}: ${file.originalname}]\n\n${content.substring(0, 10000)}`
        };

      case 'zip':
      case 'rar':
        return {
          type: 'text',
          text: `[Archive: ${file.originalname}]\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nNote: Archive contents not extracted for security. Please extract files manually and upload individual files.`
        };

      default:
        return {
          type: 'text',
          text: `[File: ${file.originalname}]\nType: ${file.mimetype}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nNote: This file type may not be fully supported.`
        };
    }
  } catch (error) {
    console.error(`Error processing file ${file.originalname}:`, error);
    return {
      type: 'text',
      text: `[Error processing ${file.originalname}]: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Service rotation - free services (Groq Kimi, Groq Reasoning, Cerebras)
const services = [
  groqService,
  groqReasoningService,
  cerebrasService
];
let currentServiceIndex = 0;

function getNextService() {
  const service = services[currentServiceIndex];
  currentServiceIndex = (currentServiceIndex + 1) % services.length;
  return service;
}

app.post('/chat', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    // Handle messages from both JSON and FormData
    let messages: ChatMessage[];
    if (typeof req.body.messages === 'string') {
      messages = JSON.parse(req.body.messages);
    } else {
      messages = req.body.messages || [];
    }

    const files = (req.files as Express.Multer.File[]) || [];

    console.log(`Received ${files.length} files`);

    // Process uploaded files
    if (files.length > 0) {
      const processedFiles = await Promise.all(files.map(processFile));

      // Add file content to the last user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        const textContent: ChatMessageContent = {
          type: 'text',
          text: typeof lastMessage.content === 'string' ? lastMessage.content : ''
        };
        lastMessage.content = [textContent, ...processedFiles];
      }
    }
    // Get model preference from request (default to 'auto' for rotation)
    const modelPreference = typeof req.body.model === 'string'
      ? req.body.model
      : (req.body.get?.('model') || 'auto');

    // Check if there are images in the messages
    const hasImages = messages.some(msg => {
      if (Array.isArray(msg.content)) {
        return msg.content.some((content: ChatMessageContent) => content.type === 'image_url');
      }
      return false;
    });

    // Select service based on model preference or image presence
    let service: AIService;
    if (hasImages) {
      // Images disabled - inform user
      service = groqService; // Fallback to regular service
    } else if (modelPreference === 'auto') {
      // Auto rotation
      service = getNextService();
    } else if (modelPreference === 'kimi') {
      service = groqService;
    } else if (modelPreference === 'reasoning') {
      service = groqReasoningService;
    } else if (modelPreference === 'cerebras') {
      service = cerebrasService;
    } else {
      // Default to rotation
      service = getNextService();
    }

    console.log(`Using ${service?.name} service (preference: ${modelPreference})`);

    const stream = await service?.chat(messages);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error('Error in /chat endpoint:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});