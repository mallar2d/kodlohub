"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  onImageUpload?: (url: string) => void;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Пиши тут. Підтримується Markdown.",
  rows = 12,
  onImageUpload,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.querySelector<HTMLTextAreaElement>("[data-md-editor]");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const newText = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const infoRes = await fetch("/api/wiki/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!infoRes.ok) {
        const data = await infoRes.json();
        throw new Error(data.error || "Upload failed");
      }

      const { presignedUrl, publicUrl } = await infoRes.json();

      await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const textarea = document.querySelector<HTMLTextAreaElement>("[data-md-editor]");
      const cursorPos = textarea?.selectionStart || value.length;
      const imageMarkdown = `![${file.name}](${publicUrl})`;

      const before = value.substring(0, cursorPos);
      const after = value.substring(cursorPos);
      const needsNewline = before.length > 0 && !before.endsWith("\n");
      const newText = before + (needsNewline ? "\n" : "") + imageMarkdown + "\n" + after;
      onChange(newText);

      if (onImageUpload) onImageUpload(publicUrl);
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border border-hairline-dark rounded-lg overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-canvas-night-soft border-b border-hairline-dark">
        <button
          type="button"
          onClick={() => insertMarkdown("**", "**")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs font-bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("*", "*")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("~~", "~~")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs line-through"
          title="Strikethrough"
        >
          S
        </button>
        <div className="w-px h-4 bg-hairline-dark mx-1" />
        <button
          type="button"
          onClick={() => insertMarkdown("[", "](url)")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs"
          title="Link"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs disabled:opacity-50"
          title="Завантажити зображення"
        >
          {uploading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <circle cx="12" cy="12" r="10" strokeDasharray="30 60" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </button>
        <div className="w-px h-4 bg-hairline-dark mx-1" />
        <button
          type="button"
          onClick={() => insertMarkdown("`", "`")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs font-mono"
          title="Code"
        >
          {"</>"}
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("\n```\n", "\n```\n")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs"
          title="Code block"
        >
          {"{ }"}
        </button>
        <div className="w-px h-4 bg-hairline-dark mx-1" />
        <button
          type="button"
          onClick={() => insertMarkdown("| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| ", " | data | data |\n")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs"
          title="Table"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("- [ ] ", "")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs"
          title="Task list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-2 py-1 text-xs rounded transition-colors ${showPreview ? "bg-on-primary/10 text-on-primary" : "text-ink-mute hover:text-on-primary"}`}
        >
          {showPreview ? "РЕДАГУВАТИ" : "ПРЕВʼЮ"}
        </button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="p-4 min-h-[200px] max-h-[500px] overflow-auto bg-canvas-night-soft">
          {value ? (
            <div className="prose text-on-primary leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-ink-mute text-sm">Поки нічого не написано...</p>
          )}
        </div>
      ) : (
        <textarea
          data-md-editor
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 bg-canvas-night-soft text-on-primary placeholder:text-ink-mute focus:outline-none resize-none font-mono text-sm"
        />
      )}
    </div>
  );
}
