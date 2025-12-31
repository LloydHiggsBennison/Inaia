import { Groq } from 'groq-sdk';
import type { AIService, ChatMessage, ChatMessageContent } from '../types.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export const groqService: AIService = {
  name: 'Groq (Kimi)',
  async chat(messages: ChatMessage[]) {
    // Using Kimi K2 Instruct - fast general purpose model
    const model = "moonshotai/kimi-k2-instruct-0905";

    console.log(`Using Groq model: ${model}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model,
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 1,
      stream: true,
      stop: null
    });

    return (async function* () {
      for await (const chunk of chatCompletion) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    })();
  }
};

export const groqReasoningService: AIService = {
  name: 'Groq (Reasoning)',
  async chat(messages: ChatMessage[]) {
    // Using GPT-OSS-120B with reasoning capabilities
    const model = "openai/gpt-oss-120b";

    console.log(`Using Groq reasoning model: ${model}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model,
      temperature: 1,
      max_completion_tokens: 8192,
      top_p: 1,
      reasoning_effort: "medium" as any,
      stream: true,
      stop: null
    });

    return (async function* () {
      for await (const chunk of chatCompletion) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    })();
  }
};

export const groqVisionService: AIService = {
  name: 'Groq (Vision)',
  async chat(messages: ChatMessage[]) {
    // Using llama-3.2-90b-vision-preview for vision
    const model = "llama-3.2-90b-vision-preview";

    console.log(`Using Groq vision model: ${model}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model,
      temperature: 0.7,
      max_completion_tokens: 4096,
      top_p: 1,
      stream: true,
      stop: null
    });

    return (async function* () {
      for await (const chunk of chatCompletion) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    })();
  }
};
