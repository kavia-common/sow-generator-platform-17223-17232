import React, { useEffect, useMemo, useRef, useState } from "react";
import "../theme.css";

/**
 * PUBLIC_INTERFACE
 * AIChatWidget
 * Floating FAB-style assistant that opens an accessible dialog panel with an interactive prompt.
 * Props:
 * - title?: string
 * - initialSuggestions?: string[]
 * - onSend?: (message: string) => Promise<{ ok: boolean, content?: string, error?: string }>
 * - fabPosition?: { right?: number, left?: number, bottom?: number, top?: number }  // defaults to { right: 16, bottom: 16 }
 * - zIndex?: number                                                                  // defaults to 1000
 * - className?: string
 */
export default function AIChatWidget({
  title = "SOW Assistant",
  initialSuggestions = [
    "Draft scope of work from our notes",
    "List client deliverables",
    "Suggest milestones and payment terms",
  ],
  onSend,
  fabPosition,
  zIndex = 1000,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I can help you outline a strong SOW. Ask me to draft sections or refine your wording." },
  ]);

  const endRef = useRef(null);
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const suggestions = useMemo(
    () => Array.from(new Set(initialSuggestions || [])).slice(0, 6),
    [initialSuggestions]
  );

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  // Focus management and focus trap
  useEffect(() => {
    function handleKey(e) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "Tab") {
        // simple focus trap
        const container = dialogRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    if (open) {
      previouslyFocusedRef.current = document.activeElement;
      setTimeout(() => {
        const inputEl = dialogRef.current?.querySelector("input, textarea, button");
        inputEl?.focus();
      }, 0);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      // restore focus
      if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === "function") {
        try { previouslyFocusedRef.current.focus(); } catch {}
      }
    };
  }, [open]);

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

  const fabStyle = {
    position: "fixed",
    right: fabPosition?.right ?? (fabPosition?.left == null ? 16 : undefined),
    left: fabPosition?.left ?? undefined,
    bottom: fabPosition?.bottom ?? (fabPosition?.top == null ? 16 : undefined),
    top: fabPosition?.top ?? undefined,
    zIndex,
    fontWeight: 800,
    borderRadius: 999,
  };

  return (
    <>
      {/* Floating FAB */}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen(true)}
        style={fabStyle}
        aria-expanded={open}
        aria-controls="ai-chat-panel"
        aria-haspopup="dialog"
        title="Open SOW Assistant"
      >
        Ask AI
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="modal-overlay"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: zIndex - 1 + 1, // ensure behind panel but above content
          }}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        id="ai-chat-panel"
        ref={dialogRef}
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
          zIndex,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="SOW Assistant"
        onClick={(e) => e.stopPropagation()} // prevent backdrop close from inner clicks
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
                  background: m.role === "user" ? "rgba(244, 114, 182, 0.15)" : "var(--color-surface-2)",
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
