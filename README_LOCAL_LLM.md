# Local LLM Setup for SOW Wizard

This project uses a local, open-source LLM served by the backend_express container. No paid APIs are required. OpenAI is not supported in this deployment.

## Steps

1) Install backend dependencies:
   cd backend_express
   npm install

2) Download a GGUF model (instruct-tuned) and place it under backend_express/models/.
   Examples (choose a small instruct model for speed):
   - Llama 3.2 3B Instruct (quantized Q4_K_M)
   - Mistral 7B Instruct (quantized)
   - Phi-3-mini Instruct (quantized)
   Ensure you have the legal rights to download and use the chosen model.

3) Configure backend:
   cp .env.example .env
   Edit .env, set LLM_MODEL_PATH to your GGUF file path.

4) Run backend:
   npm start
   Verify http://localhost:8080/api/health shows "llamaReady": true.

5) Configure frontend to call backend:
   cd ../frontend_reactjs
   cp .env.example .env
   # Option A: set REACT_APP_BACKEND_URL=http://localhost:8080
   # Option B: add "proxy": "http://localhost:8080" to package.json and leave REACT_APP_BACKEND_URL blank
   npm start

6) Use the app:
   - The Generate Draft step and AI Chat Wizard invoke /api/ai/sow (non-stream) on the backend.
   - No external API keys are needed or supported.

Notes:
- If you prefer reverse-proxying /api to the backend, configure your dev server or deployment environment accordingly.
- SSE streaming requires proxies to not buffer responses (relevant for /api/chat if you wire streaming UI later).
