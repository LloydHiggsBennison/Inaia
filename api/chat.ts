import type { VercelRequest, VercelResponse } from '@vercel/node';
import { groqService, groqReasoningService } from '../services/groq.js';
import { cerebrasService } from '../services/cerebras.js';
import type { AIService, ChatMessage } from '../types.js';

// Service rotation
let currentServiceIndex = 0;
const services: AIService[] = [groqService, groqReasoningService, cerebrasService];

function getNextService(): AIService {
    const service = services[currentServiceIndex];
    currentServiceIndex = (currentServiceIndex + 1) % services.length;
    return service;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, model = 'auto' } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        // Select service based on model preference
        let service: AIService;
        if (model === 'auto') {
            service = getNextService();
        } else if (model === 'kimi') {
            service = groqService;
        } else if (model === 'reasoning') {
            service = groqReasoningService;
        } else if (model === 'cerebras') {
            service = cerebrasService;
        } else {
            service = getNextService();
        }

        console.log(`Using ${service?.name} service (preference: ${model})`);

        const stream = await service?.chat(messages);

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Stream the response
        for await (const chunk of stream) {
            res.write(chunk);
        }

        res.end();
    } catch (error: any) {
        console.error('Error in /api/chat:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
