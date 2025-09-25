import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { nanoid } from 'nanoid';

// llama-node with llama.cpp backend
import { LlamaModel, LlamaContext, LlamaChatSession, getLlama } from '@llama-node/core';
import { LlamaCpp } from '@llama-node/llama-cpp';

/**
 * Simple Express backend that hosts a local LLM for chat and SOW assistance.
 *
 * Env:
 *  - LLM_MODEL_PATH: absolute path to a local GGUF model file (e.g., ./models/llama-3.2-3b-instruct.Q4_K_M.gguf)
 *  - LLM_CTX_SIZE: context tokens (default: 2048)
 *  - LLM_GPU_LAYERS: number of GPU layers if supported by build (default: 0)
 *  - PORT: server port (default: 8080)
 *  - ALLOW_ORIGIN: CORS origin (default: *)
 *
 * Endpoints:
 *  GET  /api/health             - health check
 *  POST /api/chat               - chat with streaming (SSE). Body: { messages: [{role, content}], stream?: boolean }
 *  POST /api/ai/sow             - helper to generate SOW-like draft from a prompt (non-stream JSON)
 */

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(cors({
  origin: process.env.ALLOW_ORIGIN || '*'
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

let llamaReady = false;
let llamaError = null;
let model = null;
let context = null;

async function initLlama() {
  try {
    const llama = await getLlama(LlamaCpp);
    const modelPath = process.env.LLM_MODEL_PATH || './models/model.gguf';
    const ctxSize = Number(process.env.LLM_CTX_SIZE || 2048);
    const gpuLayers = Number(process.env.LLM_GPU_LAYERS || 0);

    model = await llama.loadModel(new LlamaModel({
      modelPath,
      gpuLayers,
    }));

    context = await model.createContext(new LlamaContext({
      contextSize: ctxSize,
    }));

    llamaReady = true;
    llamaError = null;
    // eslint-disable-next-line no-console
    console.log(`[llama] Model loaded: ${modelPath} (ctx=${ctxSize}, gpuLayers=${gpuLayers})`);
  } catch (err) {
    llamaReady = false;
    llamaError = err;
    // eslint-disable-next-line no-console
    console.error('[llama] Failed to initialize model:', err?.message || err);
  }
}

// kick off model load (non-blocking)
initLlama();

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    llamaReady,
    error: llamaError ? String(llamaError?.message || llamaError) : null
  });
});

/**
 * Build a friendly system prompt for general-purpose assistant usage.
 */
function buildSystemPrompt() {
  return [
    'You are an expert SOW (Statement of Work) assistant.',
    'Provide concise, business-appropriate guidance.',
    'Format lists as short bullet points when appropriate.',
    'If asked to draft a SOW section, produce clean, structured text.',
  ].join('\n');
}

/**
 * Convert chat messages (role, content) into a LlamaChatSession
 */
function createSessionFromMessages(messages = []) {
  const sys = buildSystemPrompt();
  const session = new LlamaChatSession({ context, systemPrompt: sys });
  for (const m of messages) {
    if (!m || !m.role || !m.content) continue;
    if (m.role === 'system') {
      // merge additional system content by appending
      session.appendSystemMessage(m.content);
    } else if (m.role === 'user') {
      session.appendUserMessage(m.content);
    } else if (m.role === 'assistant') {
      session.appendAssistantMessage(m.content);
    }
  }
  return session;
}

/**
 * Streaming endpoint using Server-Sent Events (SSE).
 * Body: { messages: [{role:'system'|'user'|'assistant', content: string}], stream?: boolean, temperature?: number, top_p?: number, max_tokens?: number }
 */
app.post('/api/chat', async (req, res) => {
  try {
    if (!llamaReady) {
      return res.status(503).json({ ok: false, error: 'Model not ready. Check /api/health and LLM_MODEL_PATH.' });
    }
    const { messages = [], stream = true, temperature = 0.4, top_p = 0.9, max_tokens = 512 } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: 'messages array is required.' });
    }

    if (!stream) {
      // Non-streaming: return full text at once
      const session = createSessionFromMessages(messages);
      const last = messages[messages.length - 1];
      const prompt = last?.content || '';
      const out = await session.prompt(prompt, {
        temperature,
        topP: top_p,
        maxTokens: Number(max_tokens),
      });
      return res.json({ ok: true, content: out });
    }

    // Streaming via SSE
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const session = createSessionFromMessages(messages);
    const last = messages[messages.length - 1];
    const prompt = last?.content || '';
    let accumulated = '';

    const controller = new AbortController();
    req.on('close', () => {
      controller.abort();
    });

    // llama-node streaming token callback
    await session.promptStreaming(prompt, {
      temperature,
      topP: top_p,
      maxTokens: Number(max_tokens),
      onToken: (t) => {
        accumulated += t;
        res.write(`data: ${JSON.stringify({ token: t })}\n\n`);
      },
      signal: controller.signal
    });

    res.write(`data: ${JSON.stringify({ done: true, content: accumulated })}\n\n`);
    res.end();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('chat error:', e);
    try {
      res.write(`data: ${JSON.stringify({ error: String(e?.message || e) })}\n\n`);
    } catch (_ignored) {}
    res.end();
  }
});

/**
 * Helper endpoint for the frontend SOW generation fallback.
 * Body: { prompt: string }
 * Returns JSON: { sow: string }
 */
app.post('/api/ai/sow', async (req, res) => {
  try {
    if (!llamaReady) {
      return res.status(503).json({ ok: false, error: 'Model not ready. Check /api/health and LLM_MODEL_PATH.' });
    }
    const { prompt } = req.body || {};
    const content = String(prompt || '').trim();
    if (!content) {
      return res.status(400).json({ ok: false, error: 'prompt is required' });
    }

    const session = new LlamaChatSession({
      context,
      systemPrompt: [
        'You are an expert consultant drafting professional Statements of Work (SOW).',
        'Generate a concise, structured SOW based on the user prompt.',
        'Include: Overview, Objectives, Scope, Deliverables, Assumptions, Timeline, Roles & Responsibilities, Acceptance Criteria, and Out of Scope.',
        'Use crisp, business-appropriate language.',
      ].join('\n')
    });

    const sowText = await session.prompt(content, {
      temperature: 0.4,
      topP: 0.9,
      maxTokens: 700,
    });

    res.json({ ok: true, sow: sowText });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('sow error:', e);
    res.status(500).json({ ok: false, error: e?.message || 'Unexpected error' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SOW backend running on http://localhost:${PORT}`);
});
