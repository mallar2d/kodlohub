"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "Розкажи про гру Брат TD",
  "Які документи завантажені на сайт?",
  "Знайди статті про Подро в Кодлопедії",
  "Хто такий Петро Хоменко?",
];

export default function SlopusClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isGenerating) return;

    setError(null);
    const newMessages: Message[] = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/tools/slopus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Помилка сервера: ${response.status}`);
      }

      const data = await response.json();
      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Не вдалося отримати відповідь від Слопуса.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="card-dark flex flex-col min-h-[650px] max-h-[80vh] border border-hairline-dark bg-canvas-night overflow-hidden rounded-md relative shadow-2xl">
      {/* Header status bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline-dark bg-canvas-night-soft">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="micro-cap text-on-primary tracking-wider text-xs">
            СЛОПУС SYSTEM v2.5
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-[10px] font-bold tracking-widest text-ink-mute hover:text-on-primary uppercase transition-colors"
          >
            ОЧИСТИТИ ЧАТ
          </button>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
            <span className="text-5xl mb-6 select-none animate-pulse">🤖</span>
            <h2 className="button-cap text-on-primary text-base mb-3 tracking-widest">
              СЛОПУС AI АКТИВОВАНИЙ
            </h2>
            <p className="text-on-primary-mute text-sm leading-relaxed mb-8">
              Я — ШІ-агент Слопус, відновлений та інтегрований у Кодлохаб. 
              Я знаю все про цей сайт (статті в Кодлопедії, завантажені документи, блоги), а також знаю механіки, вежі та баланс гри <strong>Брат TD</strong>. 
              Запитай мене про будь-що!
            </p>

            <div className="w-full space-y-3">
              <p className="micro-cap text-ink-mute text-center mb-1 text-[10px]">
                Швидкі запити
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSubmit(prompt)}
                    className="p-3 text-left text-xs text-on-primary-mute bg-canvas-night border border-hairline-dark hover:border-on-primary-mute rounded transition-all duration-300 hover:bg-canvas-night-soft group"
                  >
                    <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } animate-slide-up`}
              >
                <span className="micro-cap text-[9px] text-ink-mute mb-1">
                  {msg.role === "user" ? "ТИ" : "СЛОПУС"}
                </span>
                <div
                  className={`p-4 rounded border text-sm max-w-[85%] sm:max-w-[75%] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-canvas-night-soft border-hairline-dark text-on-primary"
                      : "bg-canvas-night border-hairline-dark/70 text-on-primary-mute"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex flex-col items-start animate-slide-up">
                <span className="micro-cap text-[9px] text-ink-mute mb-1">
                  СЛОПУС
                </span>
                <div className="p-4 rounded border border-hairline-dark/70 bg-canvas-night text-on-primary-mute max-w-[85%] sm:max-w-[75%]">
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-[pulse_1s_infinite_0ms]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-[pulse_1s_infinite_200ms]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-[pulse_1s_infinite_400ms]"></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center p-4 border border-red-900/40 bg-red-950/10 rounded">
                <p className="text-xs text-red-400 font-mono text-center">
                  ⚠️ {error}
                </p>
                {error.includes("DEEPSEEK_API_KEY") && (
                  <p className="text-[10px] text-ink-mute text-center mt-2 max-w-md">
                    Будь ласка, попросіть власника сайту отримати ключ у кабінеті DeepSeek та додати <code>DEEPSEEK_API_KEY</code> у <code>.env.local</code>.
                  </p>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input controls */}
      <div className="p-4 border-t border-hairline-dark bg-canvas-night-soft">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
          }}
          className="flex gap-3 items-end"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Запитай щось у Слопуса..."
            rows={1}
            disabled={isGenerating}
            className="flex-1 min-h-[44px] max-h-[120px] bg-canvas-night text-on-primary text-sm rounded border border-hairline-dark p-3 focus:outline-none focus:border-on-primary-mute transition-colors resize-none overflow-y-auto"
            style={{ height: "auto" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="h-[44px] px-6 rounded bg-on-primary text-canvas-night text-xs font-bold tracking-widest uppercase hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? "..." : "НАЖАТИ"}
          </button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
