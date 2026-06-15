"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";

// --- WIKI PREVIEW ---
function WikiArticlePreview({ category, slug, defaultTitle, href }: { category: string; slug: string; defaultTitle?: string; href: string }) {
  const [data, setData] = useState<{ title: string; excerpt: string; categoryName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/wiki/articles/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((resData) => {
        if (!active) return;
        const article = resData.article || resData;
        const contentText = article.content || "";
        const excerpt = contentText.substring(0, 160) + (contentText.length > 160 ? "..." : "");
        setData({
          title: article.title || defaultTitle || slug,
          excerpt,
          categoryName: article.category?.name || category,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => { active = false; };
  }, [slug, category, defaultTitle]);

  if (loading) {
    return (
      <div className="my-2 p-4 border border-hairline-dark bg-canvas-night-soft rounded animate-pulse max-w-md">
        <div className="h-3 w-24 bg-zinc-850 rounded mb-2" />
        <div className="h-4 w-48 bg-zinc-800 rounded mb-2" />
        <div className="h-3 w-full bg-zinc-850 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <a href={href} className="text-cyan-400 hover:underline">
        {defaultTitle || slug}
      </a>
    );
  }

  return (
    <div className="my-3 p-4 border border-hairline-dark bg-canvas-night-soft hover:border-on-primary-mute transition-colors rounded max-w-md shadow-lg group">
      <span className="micro-cap text-[10px] text-ink-mute block mb-1">
        Кодлопедія • {data.categoryName}
      </span>
      <h4 className="button-cap text-sm text-on-primary font-bold mb-1.5 group-hover:text-cyan-400 transition-colors">
        {data.title}
      </h4>
      <p className="text-xs text-on-primary-mute leading-relaxed mb-3">
        {data.excerpt}
      </p>
      <a
        href={href}
        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 tracking-wider uppercase transition-colors"
      >
        Читати статтю →
      </a>
    </div>
  );
}

// --- PODCAST PREVIEW ---
function PodcastEpisodePreview({ id, defaultTitle, href }: { id: string; defaultTitle?: string; href: string }) {
  const [data, setData] = useState<{ title: string; description: string; audioUrl: string; episodeNumber: number; duration: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const supabase = createClient();
        const { data: epData, error: epErr } = await supabase
          .from("podcast_episodes")
          .select("title, description, audio_url, episode_number, duration")
          .eq("id", id)
          .single();

        if (epErr || !epData) {
          setError(true);
        } else {
          setData({
            title: epData.title,
            description: epData.description || "",
            audioUrl: epData.audio_url,
            episodeNumber: epData.episode_number,
            duration: epData.duration,
          });
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [id]);

  if (loading) {
    return (
      <div className="my-2 p-4 border border-hairline-dark bg-canvas-night-soft rounded animate-pulse max-w-lg">
        <div className="h-3 w-28 bg-zinc-850 rounded mb-2" />
        <div className="h-4 w-56 bg-zinc-800 rounded mb-3" />
        <div className="h-10 w-full bg-zinc-850 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <a href={href} className="text-cyan-400 hover:underline">
        {defaultTitle || "Подкаст випуск"}
      </a>
    );
  }

  return (
    <div className="my-4 p-5 border border-hairline-dark bg-canvas-night-soft hover:border-cyan-500/40 transition-colors rounded max-w-xl shadow-xl">
      <span className="micro-cap text-[10px] text-cyan-400 block mb-1">
        КодлоCAST • Випуск #{data.episodeNumber}
      </span>
      <h4 className="button-cap text-base text-on-primary font-bold mb-2">
        {data.title}
      </h4>
      <p className="text-xs text-on-primary-mute leading-relaxed mb-4 whitespace-pre-wrap">
        {data.description}
      </p>
      <div className="bg-canvas-night p-3 rounded border border-hairline-dark/60">
        <audio src={data.audioUrl} controls className="w-full h-10 accent-cyan-500 bg-transparent" />
        <div className="flex justify-between items-center mt-2 px-1">
          <span className="text-[10px] text-ink-mute">
            Тривалість: {Math.round(data.duration / 60)} хв
          </span>
          <a
            href={href}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 tracking-wider uppercase transition-colors"
          >
            Сторінка випуску →
          </a>
        </div>
      </div>
    </div>
  );
}

// --- DOCUMENT PREVIEW ---
function DocumentPreview({ href, defaultTitle }: { href: string; defaultTitle?: string }) {
  const fileName = decodeURIComponent(href.split("/").pop() || "Документ");
  return (
    <div className="my-3 p-4 border border-hairline-dark bg-canvas-night-soft rounded max-w-md flex items-center justify-between gap-4 shadow-md hover:border-on-primary-mute transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl select-none">📄</span>
        <div className="min-w-0">
          <h5 className="button-cap text-xs font-bold text-on-primary truncate">
            {defaultTitle || fileName}
          </h5>
          <span className="text-[10px] text-ink-mute">Документ сайту</span>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 rounded bg-canvas-night border border-hairline-dark hover:border-on-primary-mute text-[10px] font-bold text-on-primary tracking-wider uppercase transition-all whitespace-nowrap"
      >
        Скачати
      </a>
    </div>
  );
}

// --- MEDIA PREVIEW (IMG/VIDEO) ---
function SlopusMediaPreview({ src, alt }: { src: string; alt?: string }) {
  const isVideo = src.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) || alt?.toLowerCase() === "video";

  if (isVideo) {
    return (
      <div className="my-3 rounded border border-hairline-dark overflow-hidden bg-black max-w-xl">
        <video src={src} controls className="w-full h-auto max-h-[360px]" />
        {alt && alt !== "video" && (
          <div className="px-3 py-1.5 text-xs text-ink-mute border-t border-hairline-dark bg-canvas-night-soft">
            {alt}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="my-3 rounded border border-hairline-dark overflow-hidden bg-canvas-night-soft max-w-md inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto max-h-[300px] object-contain block hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
        onClick={() => window.open(src, "_blank")}
      />
      {alt && (
        <div className="px-3 py-1.5 text-xs text-ink-mute border-t border-hairline-dark bg-canvas-night-soft">
          {alt}
        </div>
      )}
    </div>
  );
}

// --- DISPATCHER PREVIEW ---
function SlopusLinkPreview({ href, children }: { href: string; children?: React.ReactNode }) {
  const text = children?.toString() || "";

  // 1. Wiki category & article Match
  const wikiMatch = href.match(/^\/wiki\/([^/]+)\/([^/]+)$/);
  if (wikiMatch) {
    const [, category, slug] = wikiMatch;
    return <WikiArticlePreview category={category} slug={slug} defaultTitle={text} href={href} />;
  }

  // 2. Podcast Match
  const castMatch = href.match(/^\/cast\/([^/]+)$/);
  if (castMatch) {
    const [, id] = castMatch;
    return <PodcastEpisodePreview id={id} defaultTitle={text} href={href} />;
  }

  // 3. Document / Media file Match
  const isDoc = href.match(/\.(pdf|docx|doc|xls|xlsx|zip|rar|txt|csv)(\?.*)?$/i) || href.includes("/media/") && !href.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|ogg|mov|m4v)(\?.*)?$/i);
  if (isDoc) {
    return <DocumentPreview href={href} defaultTitle={text} />;
  }

  // 4. Video file Match
  const isVideo = href.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i);
  if (isVideo) {
    return <SlopusMediaPreview src={href} alt={text} />;
  }

  // 5. Image file Match
  const isImg = href.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i);
  if (isImg) {
    return <SlopusMediaPreview src={href} alt={text} />;
  }

  // Default fallback link
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-semibold"
    >
      {children}
    </a>
  );
}


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

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Не вдалося відкрити потік відповіді");

      const decoder = new TextDecoder();
      let done = false;
      let streamedContent = "";

      // Add a placeholder message for the assistant
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          streamedContent += chunk;
          setMessages([...newMessages, { role: "assistant", content: streamedContent }]);
        }
      }
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
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children, ...props }) => {
                            if (!href) return <a {...props}>{children}</a>;
                            const hrefStr = typeof href === "string" ? href : "";
                            return <SlopusLinkPreview href={hrefStr}>{children}</SlopusLinkPreview>;
                          },
                          img: ({ src, alt }) => {
                            if (!src) return null;
                            const srcStr = typeof src === "string" ? src : "";
                            const altStr = typeof alt === "string" ? alt : "";
                            return <SlopusMediaPreview src={srcStr} alt={altStr} />;
                          },
                        }}
                      >
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
