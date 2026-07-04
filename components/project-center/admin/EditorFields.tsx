"use client";

import { useRef, useState } from "react";

export const inputClass =
  "w-full rounded border border-hairline-dark bg-canvas-night-soft px-4 py-3 text-on-primary placeholder:text-ink-mute focus:border-on-primary-mute focus:outline-none transition-colors";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block" title={hint}>
      <span className="micro-cap mb-2 flex items-center gap-2 text-ink-mute">
        {label}
        {hint && (
          <span className="group relative inline-flex">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-hairline-dark text-[10px] leading-none text-on-primary-mute">
              ?
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded border border-hairline-dark bg-canvas-night-soft px-3 py-2 text-left text-xs font-normal leading-5 text-on-primary-mute shadow-xl group-hover:block">
              {hint}
            </span>
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Slider — progress percent with live value + colored track          */
/* ------------------------------------------------------------------ */

export function SliderField({
  label,
  hint,
  value,
  onChange,
  accent = "#ffffff",
  disabled = false,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  accent?: string;
  disabled?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-hairline-dark accent-white disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.12) 100%)`,
          }}
        />
        <div className="flex w-24 shrink-0 items-center rounded border border-hairline-dark bg-canvas-night-soft px-2">
          <input
            type="number"
            min={0}
            max={100}
            value={pct}
            disabled={disabled}
            onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-full bg-transparent py-2 text-right text-on-primary focus:outline-none"
          />
          <span className="pl-1 text-ink-mute">%</span>
        </div>
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* ColorField — swatch + hex input                                    */
/* ------------------------------------------------------------------ */

export function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#ffffff";
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <label
          className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded border border-hairline-dark"
          style={{ backgroundColor: safe }}
        >
          <input
            type="color"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
        />
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* ChipsInput — tags/types with suggestions instead of raw CSV        */
/* ------------------------------------------------------------------ */

export function ChipsInput({
  label,
  hint,
  value,
  onChange,
  suggestions = [],
  placeholder = "Додай і натисни Enter",
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const item = raw.trim();
    if (!item) return;
    if (value.some((v) => v.toLowerCase() === item.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, item]);
    setDraft("");
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  const unusedSuggestions = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <Field label={label} hint={hint}>
      <div className="rounded border border-hairline-dark bg-canvas-night-soft px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline-dark bg-canvas-night px-2.5 py-1 text-xs text-on-primary"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="text-ink-mute transition-colors hover:text-red-400"
                aria-label={`Видалити ${item}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Backspace" && !draft && value.length) {
                remove(value[value.length - 1]);
              }
            }}
            onBlur={() => add(draft)}
            placeholder={value.length ? "" : placeholder}
            className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm text-on-primary placeholder:text-ink-mute focus:outline-none"
          />
        </div>
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-hairline-dark px-2.5 py-1 text-xs text-ink-mute transition-colors hover:border-on-primary-mute hover:text-on-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* ImageField — upload to R2 + live preview instead of pasting URLs   */
/* ------------------------------------------------------------------ */

async function uploadToR2(file: File): Promise<string> {
  const presignRes = await fetch("/api/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authorId: "project-center",
      files: [{ fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size }],
    }),
  });
  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    throw new Error(data.error || "Не вдалося отримати посилання для завантаження");
  }
  const { uploads } = await presignRes.json();
  const upload = uploads?.[0];
  if (!upload) throw new Error("Сервер не повернув URL завантаження");

  const uploadRes = await fetch(upload.presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Помилка завантаження (${uploadRes.status}): ${errText || uploadRes.statusText}`);
  }
  return upload.publicUrl as string;
}

export function ImageField({
  label,
  hint,
  value,
  onChange,
  onError,
  aspect = "aspect-video",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onError?: (message: string) => void;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToR2(file);
      onChange(url);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Field label={label} hint={hint}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
        onChange={handleFile}
        className="hidden"
      />
      <div className="rounded-lg border border-hairline-dark bg-canvas-night-soft p-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={`relative flex ${aspect} w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-hairline-dark bg-canvas-night text-ink-mute transition-colors hover:border-on-primary-mute hover:text-on-primary disabled:opacity-50`}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] uppercase tracking-wider">
                {uploading ? "..." : "Файл"}
              </span>
            )}
            {uploading && value && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-on-primary">
                ...
              </span>
            )}
          </button>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="button-cap rounded border border-hairline-dark px-3 py-1.5 text-on-primary transition-colors hover:border-on-primary-mute disabled:opacity-50"
              >
                {uploading ? "Завантаження..." : value ? "Замінити" : "Завантажити"}
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="button-cap rounded border border-hairline-dark px-3 py-1.5 text-red-400 transition-colors hover:border-red-500/50"
                >
                  Прибрати
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowUrl((s) => !s)}
                className="button-cap px-2 py-1.5 text-ink-mute transition-colors hover:text-on-primary"
              >
                URL
              </button>
            </div>
            {showUrl ? (
              <input
                className="w-full rounded border border-hairline-dark bg-canvas-night px-3 py-2 text-xs text-on-primary placeholder:text-ink-mute focus:outline-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://..."
              />
            ) : (
              <p className="truncate text-xs text-ink-mute">
                {value || "PNG / JPG / WebP / GIF"}
              </p>
            )}
          </div>
        </div>
      </div>
    </Field>
  );
}
