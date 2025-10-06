import React, { useEffect, useMemo, useRef, useState } from "react";
import "../theme.css";

// PUBLIC_INTERFACE
export default function AIChatWidget({
  title = "SOW Assistant",
  initialSuggestions = [
    "Draft scope of work from our notes",
    "List client deliverables",
    "Suggest milestones and payment terms",
  ],
  onSend, // optional hook: (message) => Promise<{ok, content}>
  className = "",
}) {
  /**
   * Interactive, AI-like assistant panel.
   * - Shows conversation bubbles
   * - Input box with suggestion chips
   * - Calls aiClient.generateSOWFromPrompt by default, unless onSend is provided
   * - Dark theme compliant with pink CTA focus for send button
   */
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I can help you outline a strong SOW. Ask me to draft sections or refine your wording." },
  ]);
  const endRef = useRef(null);

  const suggestions = useMemo(() => Array.from(new Set(initialSuggestions || [])).slice(0, 6), [initialSuggestions]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  async function defaultSend(text) {
    const { generateSOWFromPrompt } = await import("../services/aiClient.js");
    return await generateSOWFromPrompt(text);
  }

  async function handleSend(text) {
    const content = String(text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: content }]);
    setBusy(true);
    try {
      const fn = onSend || defaultSend;
      const res = await fn(content);
      if (res?.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: res.content }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: res?.error || "Sorry, I couldn't generate a response." },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: e?.message || "Unexpected error. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 50,
          fontWeight: 800,
        }}
        aria-expanded={open}
        aria-controls="ai-chat-panel"
        title="Open SOW Assistant"
      >
        {open ? "Close Assistant" : "Ask AI"}
      </button>

      <div
        id="ai-chat-panel"
        className={className}
        style={{
          position: "fixed",
          right: 16,
          bottom: open ? 80 : -9999,
          width: 360,
          maxWidth: "90vw",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          zIndex: 40,
        }}
        role="dialog"
        aria-modal="false"
        aria-label="SOW Assistant"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: "var(--color-surface-2)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ fontWeight: 800 }}>{title}</div>
          <button className="btn" type="button" onClick={() => setOpen(false)} title="Close assistant">
            ✕
          </button>
        </div>

        <div style={{ padding: 12, display: "grid", gap: 8, maxHeight: 380, overflow: "auto" }}>
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn outline"
                  onClick={() => handleSend(s)}
                  style={{ fontSize: 12, padding: "6px 10px" }}
                  disabled={busy}
                  title={`Use suggestion: ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Conversation */}
          <div style={{ display: "grid", gap: 8 }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  justifySelf: m.role === "user" ? "end" : "start",
                  background: m.role === "user" ? "var(--color-primary-ghost)" : "var(--color-surface-2)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "8px 10px",
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "8px 10px",
                  color: "var(--color-text-muted)",
                  fontStyle: "italic",
                  justifySelf: "start",
                }}
              >
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            padding: 10,
            borderTop: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <input
            className="input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the assistant to draft or refine a section…"
            aria-label="Type your message to the assistant"
            disabled={busy}
            style={{ borderRadius: 999 }}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy || !input.trim()}
            title="Send message"
            style={{ fontWeight: 800 }}
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
