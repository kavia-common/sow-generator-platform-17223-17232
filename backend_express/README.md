# SOW Backend — Express + Local LLM

This backend exposes a local, open‑source conversational AI for the SOW wizard. No external paid APIs are used.

Features:
- Local LLM inference via llama.cpp (through @llama-node)
- Streaming chat endpoint (SSE) at /api/chat
- Simple SOW draft helper endpoint at /api/ai/sow
- Health endpoint at /api/health

## Requirements

- Node 18+ (ESM)
- A local GGUF model file (e.g., Llama 3.x Instruct, Mistral Instruct, Phi-3, Gemma IT)
  - Example file naming: llama-3.2-3b-instruct.Q4_K_M.gguf
- llama.cpp compiled backend is embedded via @llama-node/llama-cpp prebuilds

Note: Some environments may require system libraries for BLAS/accelerations; GPU layers are optional.

## Setup

1) Install dependencies:
   npm install

2) Place your model file:
   - Create a models/ folder in backend_express
   - Put your GGUF model under models/, e.g.:
     backend_express/models/llama-3.2-3b-instruct.Q4_K_M.gguf

3) Configure environment:
   - Copy .env.example to .env
   - Set LLM_MODEL_PATH to the absolute or relative path to your GGUF file

4) Run the server:
   npm start
   # Server runs at http://localhost:8080

5) Test health:
   curl http://localhost:8080/api/health

## Env Variables

- PORT: Server port (default 8080)
- ALLOW_ORIGIN: CORS origin (default "*")
- LLM_MODEL_PATH: Path to GGUF model (required)
- LLM_CTX_SIZE: Context length tokens (default 2048)
- LLM_GPU_LAYERS: GPU layers if supported (default 0)

## Endpoints

- GET /api/health
  Returns { ok, llamaReady, error }

- POST /api/chat
  Body:
    {
      "messages": [{ "role": "user"|"assistant"|"system", "content": "..." }],
      "stream": true,                // use SSE stream (default true)
      "temperature": 0.4,
      "top_p": 0.9,
      "max_tokens": 512
    }
  If stream=true: responds as text/event-stream with events:
    data: {"token":"..."} per token
    data: {"done":true,"content":"..."} when finished

  If stream=false: responds JSON:
    { "ok": true, "content": "..." }

- POST /api/ai/sow
  Body:
    { "prompt": "Generate SOW about ..." }
  Returns:
    { "ok": true, "sow": "..." }

## Frontend Integration

The React frontend tries POST /api/ai/sow for SOW generation. Ensure the dev proxy or deployment routes /api/* to this backend. If running both locally:
- Frontend: http://localhost:3000
- Backend:  http://localhost:8080
Configure CRA devServer proxy (optional) or call absolute URL.

## Troubleshooting

- Model not ready:
  Check /api/health. Ensure LLM_MODEL_PATH points to a valid GGUF file and the process has read permissions.

- Performance:
  Reduce LLM_CTX_SIZE or use smaller quantized models (Q4_K_M or Q5_K_M). Adjust LLM_GPU_LAYERS if you have GPU support.

- SSE:
  Ensure reverse proxies do not buffer SSE (disable buffering / enable flush).
