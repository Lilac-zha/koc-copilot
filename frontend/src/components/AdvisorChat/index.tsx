import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePersonaStore } from "../../store/personaStore";
import { advisorChat } from "../../api";

interface Message {
  role: "user" | "ai";
  content: string;
  action?: { has_action: boolean; action_type: string; action_label: string; prefill_topic: string };
}

const INIT_BUBBLES = [
  "最近有没有哪条内容效果特别好或特别差？",
  "你现在发内容最大的困惑是什么？",
  "你觉得粉丝最喜欢你哪类内容？",
];

export default function AdvisorChat() {
  const navigate = useNavigate();
  const { persona } = usePersonaStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [bubbles, setBubbles] = useState<string[]>(INIT_BUBBLES);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    const historyForApi = newHistory.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));

    try {
      const res = await advisorChat(text, historyForApi, persona || {});
      const data = res.data;
      const aiMsg: Message = {
        role: "ai",
        content: data.reply || "我在思考中，稍等一下...",
        action: data.suggested_action,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.next_bubbles?.length > 0) setBubbles(data.next_bubbles.slice(0, 3));
      if (!open) setUnread(true);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "抱歉，遇到了点问题。请稍后再试，或者直接去选题地图逛逛？" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: any) => {
    if (action.action_type === "go_topic_map") {
      navigate("/topics");
      setOpen(false);
    } else if (action.action_type === "go_create") {
      navigate("/create", action.prefill_topic ? { state: { topic: { title: action.prefill_topic } } } : undefined);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: 28, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? "#0284C7" : "#0EA5E9",
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(14,165,233,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, transition: "all 0.2s ease",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
        title="AI成长顾问"
      >
        {open ? "✕" : "💬"}
        {unread && !open && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#EF4444", border: "2px solid #fff" }} />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 999,
          width: 360, height: 520,
          background: "#fff", borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", border: "1px solid #E5E7EB",
          animation: "slideUp 0.2s ease",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#0EA5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>AI 成长顾问</p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>基于你的人设，给出专属建议</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#9CA3AF", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Welcome message */}
            {messages.length === 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
                <div style={{ background: "#F1F5F9", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", maxWidth: "85%" }}>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                    你好{persona ? `，${persona.niche}赛道的你` : ""}！我是你的专属内容顾问小助 👋<br />
                    有什么内容上的困惑，尽管说～
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
                {msg.role === "ai" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
                )}
                <div style={{ maxWidth: "85%" }}>
                  <div style={{
                    background: msg.role === "user" ? "#0EA5E9" : "#F1F5F9",
                    color: msg.role === "user" ? "#fff" : "#374151",
                    borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                    padding: "10px 14px", fontSize: 13, lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                  {msg.role === "ai" && msg.action?.has_action && (
                    <button
                      onClick={() => handleAction(msg.action!)}
                      style={{ marginTop: 6, background: "#0EA5E9", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "block" }}
                    >
                      {msg.action.action_label} →
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
                <div style={{ background: "#F1F5F9", borderRadius: "4px 12px 12px 12px", padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((n) => (
                      <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", animation: `bounce 1.2s ${n * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion bubbles */}
          {!loading && bubbles.length > 0 && (
            <div style={{ padding: "8px 16px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {bubbles.map((b, i) => (
                <button key={i} onClick={() => sendMessage(b)} style={{ background: "#fff", border: "1px solid #BFDBFE", color: "#0284C7", borderRadius: 20, padding: "5px 12px", fontSize: 11, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                  {b}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #F3F4F6", display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="说说你的困惑，或点击上方气泡..."
              style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: "#374151", background: "#F9FAFB" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{ background: loading || !input.trim() ? "#E5E7EB" : "#0EA5E9", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}
            >
              发送
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); }
          40% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
