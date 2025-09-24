//
// Lightweight AI client for generating SOW content from a prompt.
// Tries a local backend endpoint first (if available): /api/ai/sow
// Falls back to OpenAI chat.completions if REACT_APP_OPENAI_API_KEY is set.
//
// PUBLIC_INTERFACE
export async function generateSOWFromPrompt(promptText) {
  /**
   * Generate a SOW draft from the provided prompt.
   * Prefers a local backend endpoint at /api/ai/sow (POST {prompt})
   * Fallback: OpenAI chat completions API using REACT_APP_OPENAI_API_KEY.
   *
   * Returns:
   *  { ok: true, content: string } on success
   *  { ok: false, error: string } on failure
   *
   * Note:
   * - For OpenAI fallback, set REACT_APP_OPENAI_API_KEY in .env (frontend build-time var).
   * - If neither backend nor OpenAI key is available, a clear error is returned.
   */
  try {
    const content = String(promptText || "").trim();
    if (!content) {
      return { ok: false, error: "Please enter a prompt before generating a SOW." };
    }

    // 1) Try local/backend endpoint first (if hosted via proxy or same origin)
    try {
      const resp = await fetch("/api/ai/sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data?.sow || data?.content || data?.text;
        if (text) {
          return { ok: true, content: text };
        }
        // Non-fatal: backend reachable but response isn't usable
      }
    } catch (_e) {
      // Ignore and fall back to OpenAI
    }

    // 2) Fallback: OpenAI (client-side, for demo/dev only)
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return {
        ok: false,
        error:
          "AI configuration missing: Set REACT_APP_OPENAI_API_KEY in your .env or provide a backend at /api/ai/sow.",
      };
    }

    const prompt = [
      "You are an expert consultant drafting professional Statements of Work (SOW).",
      "Generate a concise, structured SOW based on the following project prompt.",
      "Include: Overview, Objectives, Scope, Deliverables, Assumptions, Timeline, Roles & Responsibilities, Acceptance Criteria, and Out of Scope.",
      "Use crisp, business-appropriate language.",
      "",
      `Project Prompt: ${content}`,
    ].join("\n");

    // Call OpenAI Chat Completions API (gpt-4o-mini or gpt-3.5/4 variant)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.REACT_APP_OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You create professional, structured SOW documents." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return {
        ok: false,
        error: `OpenAI request failed (${resp.status}). ${errText || "Check API key and network."}`,
      };
    }

    const data = await resp.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.text?.trim();
    if (!text) {
      return { ok: false, error: "OpenAI returned no content." };
    }
    return { ok: true, content: text };
  } catch (e) {
    return { ok: false, error: e?.message || "Unexpected error generating SOW." };
  }
}
