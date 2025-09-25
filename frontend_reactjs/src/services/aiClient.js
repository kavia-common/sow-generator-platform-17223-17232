//
//
// Lightweight AI client for generating SOW content from a prompt.
// Tries a local backend endpoint first (preferred): /api/ai/sow or REACT_APP_BACKEND_URL + /api/ai/sow
// Optional fallback to OpenAI only if REACT_APP_OPENAI_API_KEY is explicitly configured.
//
// PUBLIC_INTERFACE
export async function generateSOWFromPrompt(promptText) {
  /**
   * Generate a SOW draft from the provided prompt.
   * Prefers a local backend endpoint at /api/ai/sow (POST {prompt})
   * Optional fallback: OpenAI chat completions API using REACT_APP_OPENAI_API_KEY if set.
   *
   * Returns:
   *  { ok: true, content: string } on success
   *  { ok: false, error: string } on failure
   *
   * Notes:
   * - To ensure no external paid API is used, do NOT set REACT_APP_OPENAI_API_KEY.
   * - Configure REACT_APP_BACKEND_URL if the frontend is not reverse-proxying /api to the backend.
   */
  try {
    const content = String(promptText || "").trim();
    if (!content) {
      return { ok: false, error: "Please enter a prompt before generating a SOW." };
    }

    // Prefer local backend
    const base = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/+$/, "");
    const url = base ? `${base}/api/ai/sow` : "/api/ai/sow";

    try {
      const resp = await fetch(url, {
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
      }
    } catch (_e) {
      // ignore and consider fallback below
    }

    // Optional fallback to OpenAI if explicitly configured (not required for this project)
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return {
        ok: false,
        error:
          "Local AI backend not reachable. Start backend_express and set a dev proxy or REACT_APP_BACKEND_URL.",
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

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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
