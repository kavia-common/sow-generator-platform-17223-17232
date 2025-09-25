//
// Lightweight AI client for generating SOW content from a prompt.
// WARNING: OpenAI is NOT supported in this deployment.
// This client uses ONLY the local backend_express API at /api/ai/sow.
// Ensure backend_express is running and the frontend routes /api to it
// via a CRA dev proxy (see DEV_PROXY_GUIDE.md) or set REACT_APP_BACKEND_URL.
//
// PUBLIC_INTERFACE
export async function generateSOWFromPrompt(promptText) {
  /**
   * Generate a SOW draft from the provided prompt by calling the local backend.
   *
   * Request:
   *  POST {prompt: string} to /api/ai/sow (or `${REACT_APP_BACKEND_URL}/api/ai/sow`)
   *
   * Returns:
   *  { ok: true, content: string } on success
   *  { ok: false, error: string } on failure
   */
  try {
    const content = String(promptText || "").trim();
    if (!content) {
      return { ok: false, error: "Please enter a prompt before generating a SOW." };
    }

    const base = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/+$/, "");
    const url = base ? `${base}/api/ai/sow` : "/api/ai/sow";

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: content }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return {
        ok: false,
        error: `AI backend error (${resp.status}). ${text || "Ensure backend_express is running and /api is routed."}`,
      };
    }

    const data = await resp.json();
    const text = data?.sow || data?.content || data?.text;
    if (!text) {
      return { ok: false, error: "AI backend returned no content." };
    }
    return { ok: true, content: text };
  } catch (e) {
    return { ok: false, error: e?.message || "Unexpected error generating SOW." };
  }
}
