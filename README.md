# 🤖 AI Chat API

Chat application with multiple AI models (Groq, Cerebras) and both web interface and CLI access.

## ✨ Features

- 🎨 Modern web interface with model selector
- 🚀 CLI access from terminal
- 🔄 Automatic model rotation
- 📁 File upload support (PDF, DOCX, XLSX, etc.)
- 🌐 Deployed on Vercel (serverless)

## 🏃 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Create .env file
GROQ_API_KEY=your_key_here
CEREBRAS_API_KEY=your_key_here

# Run locally
npm run dev
```

Open http://localhost:3000

### Deploy to Vercel

See [DEPLOY.md](./DEPLOY.md) for detailed instructions.

### CLI Usage

See [CLI-ALIAS.md](./CLI-ALIAS.md) for terminal setup.

## 📚 Available Models

| Model | Provider | Use Case |
|-------|----------|----------|
| **Kimi K2** | Groq | General queries (fast) |
| **GPT-OSS-120B** | Groq | Deep reasoning |
| **Cerebras Llama** | Cerebras | Fast alternative |
| **Auto** | Mixed | Automatic rotation |

## 🌐 API Endpoints

### POST `/api/chat`

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "model": "auto"
  }'
```

**Request Body:**
```json
{
  "messages": [
    {"role": "user", "content": "Your question"}
  ],
  "model": "auto" | "kimi" | "reasoning" | "cerebras"
}
```

**Response:** Streaming text response

## 📂 Project Structure

```
├── api/
│   └── chat.ts          # Vercel serverless function
├── public/
│   ├── index.html       # Web interface
│   ├── app.js          # Frontend logic
│   └── style.css       # Styles
├── services/
│   ├── groq.ts         # Groq AI services
│   └── cerebras.ts     # Cerebras service
├── vercel.json         # Vercel configuration
├── DEPLOY.md           # Deployment guide
├── CLI-ALIAS.md        # CLI setup guide
└── README.md           # This file
```

## 🔒 Environment Variables

Required for deployment:

- `GROQ_API_KEY` - Your Groq API key
- `CEREBRAS_API_KEY` - Your Cerebras API key

## 📝 License

MIT
