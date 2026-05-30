"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Пиши тут. Підтримується Markdown.",
  rows = 12,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

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

  return (
    <div className="border border-hairline-dark rounded-lg overflow-hidden">
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
          🔗
        </button>
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
          ⊞
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("- [ ] ", "")}
          className="p-1.5 text-ink-mute hover:text-on-primary hover:bg-canvas-night rounded transition-colors text-xs"
          title="Task list"
        >
          ☑
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
