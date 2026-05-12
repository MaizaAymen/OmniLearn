import { useState, useRef, useEffect, useCallback } from "react";
import { XIcon, SendIcon, BotIcon, Loader2Icon, SparklesIcon, RotateCcwIcon } from "lucide-react";

const MENTOR_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api") + "/ai/ai/mentor";

const QUICK_ACTIONS = [
  { label: "Explain this", icon: "💡", prompt: "Explain what this code does step by step." },
  { label: "Why wrong?", icon: "🐛", prompt: "Why might this code be incorrect or buggy? What should I look for?" },
  { label: "Give a hint", icon: "🧩", prompt: "Give me a hint to solve this problem without telling me the answer." },
  { label: "Improve it", icon: "✨", prompt: "How can this code be improved in terms of clarity, performance, or best practices?" },
  { label: "What concept?", icon: "📚", prompt: "What programming concepts or data structures should I understand to solve this?" },
];

function MentorMessage({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-primary text-primary-content px-3 py-2 rounded-2xl rounded-br-sm text-sm break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0 mt-0.5">
        <BotIcon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-base-content/40 mb-0.5 font-semibold uppercase tracking-wide">
          Mentor
        </div>
        <div className="text-sm text-base-content leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
          {msg.streaming && (
            <span className="inline-block w-1.5 h-4 bg-primary/70 ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIMentor({ isOpen, onClose, code, language, problemTitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Hi! I'm your coding mentor for this session. I'm here to help you *learn* — not hand you answers.\n\nAsk me anything about your code, concepts, or where you're stuck. I'll guide you through it with hints and explanations. 🚀`,
          id: "welcome",
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (question) => {
      const text = question?.trim() || input.trim();
      if (!text || isStreaming) return;
      setInput("");

      const history = messages
        .filter((m) => m.id !== "welcome" && !m.streaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsg = { role: "user", content: text, id: Date.now() };
      const assistantId = Date.now() + 1;
      const assistantMsg = { role: "assistant", content: "", id: assistantId, streaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const token = document.cookie
          .split("; ")
          .find((c) => c.startsWith("token="))
          ?.split("=")[1];

        const res = await fetch(MENTOR_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ code, language, question: text, problemTitle, history }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + parsed.text } : m
                  )
                );
              }
            } catch { /* skip malformed chunks */ }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Sorry, I couldn't connect. Please try again.", streaming: false }
                : m
            )
          );
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
        setIsStreaming(false);
      }
    },
    [input, isStreaming, code, language, problemTitle]
  );

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages([
      {
        role: "assistant",
        content: "Fresh start! What would you like to work on?",
        id: Date.now(),
      },
    ]);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-96 bg-base-100 border-l border-base-300 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 shrink-0 bg-base-100">
          <span className="font-semibold text-sm flex items-center gap-2">
            <SparklesIcon className="size-4 text-secondary" />
            AI Coding Mentor
          </span>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost btn-xs btn-circle tooltip tooltip-bottom"
              data-tip="Clear chat"
              onClick={handleClear}
            >
              <RotateCcwIcon className="size-3.5" />
            </button>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={onClose}
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Context badge */}
        {(problemTitle || language) && (
          <div className="px-3 py-1.5 bg-secondary/10 border-b border-base-300 shrink-0 flex items-center gap-2 flex-wrap">
            {problemTitle && (
              <span className="badge badge-secondary badge-sm truncate max-w-[180px]">
                {problemTitle}
              </span>
            )}
            {language && (
              <span className="badge badge-outline badge-sm capitalize">{language}</span>
            )}
            <span className="text-[10px] text-base-content/40 ml-auto">Context loaded</span>
          </div>
        )}

        {/* Quick actions */}
        <div className="px-3 py-2 border-b border-base-300 shrink-0 flex gap-1.5 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              disabled={isStreaming}
              className="btn btn-xs btn-ghost border border-base-300 hover:border-secondary hover:text-secondary gap-1 text-[11px]"
              onClick={() => sendMessage(action.prompt)}
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
        >
          {messages.map((msg) => (
            <MentorMessage key={msg.id} msg={msg} />
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-base-300 p-2 shrink-0 flex items-end gap-2 bg-base-100">
          <textarea
            ref={inputRef}
            className="textarea textarea-bordered textarea-sm flex-1 resize-none text-sm leading-snug min-h-[36px] max-h-[100px]"
            placeholder="Ask me anything about your code…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
          />
          {isStreaming ? (
            <button
              className="btn btn-sm btn-square btn-error shrink-0"
              onClick={handleStop}
              title="Stop"
            >
              <Loader2Icon className="size-4 animate-spin" />
            </button>
          ) : (
            <button
              className="btn btn-sm btn-square btn-secondary shrink-0"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              title="Send (Enter)"
            >
              <SendIcon className="size-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
