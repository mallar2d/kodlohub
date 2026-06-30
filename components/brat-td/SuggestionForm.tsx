"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { BRAT_TD_SUGGESTION_TAGS } from "@/lib/brat-td/suggestion-tags";

export default function BratTdSuggestionForm() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }

  async function handleSubmit() {
    if (!user || submitting) return;

    if (selectedTags.length === 0) {
      toast("Обери хоча б один тег", "error");
      return;
    }

    if (description.trim().length < 10) {
      toast("Опис має бути щонайменше 10 символів", "error");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/brat-td/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), tags: selectedTags }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Не вдалося надіслати пропозицію", "error");
        setSubmitting(false);
        return;
      }

      toast("Пропозицію надіслано! Дякуємо за фідбек.", "success");
      setDescription("");
      setSelectedTags([]);
      setSubmitted(true);
    } catch {
      toast("Мережева помилка. Спробуй ще раз.", "error");
    }

    setSubmitting(false);
  }

  if (authLoading) {
    return (
      <section className="card-dark mb-8 p-6">
        <div className="flex justify-center py-6">
          <div className="animate-spin w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="card-dark mb-8 p-6 hover:border-on-primary-mute transition-colors">
      <p className="micro-cap text-ink-mute mb-2">ФІДБЕК</p>
      <h2 className="heading-sub mb-3">Запропонуй оновлення</h2>
      <p className="text-on-primary-mute text-sm mb-6 max-w-2xl">
        Маєш ідею для Brat TD? Обери теги, опиши що хочеш змінити або додати — Головний
        Подро побачить це в адмін-панелі.
      </p>

      <div className="mb-6 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 max-w-2xl">
        <p className="micro-cap text-yellow-400 mb-1">УВАГА</p>
        <p className="text-yellow-400/80 text-sm">
          Пропозиції оновлень стосуються лише Brat TD: Total PDR Edition. Інші версії гри не
          підтримуються.
        </p>
      </div>

      {submitted ? (
        <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4">
          <p className="text-green-400 text-sm mb-3">Пропозицію надіслано. Дякуємо!</p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="button-cap text-xs text-on-primary hover:underline"
          >
            Надіслати ще одну
          </button>
        </div>
      ) : !user ? (
        <p className="text-on-primary-mute text-sm">
          <Link href="/login" className="text-on-primary hover:underline">
            Увійди
          </Link>
          , щоб запропонувати оновлення або ідею.
        </p>
      ) : (
        <div className="space-y-5 max-w-2xl">
          <div>
            <p className="micro-cap text-on-primary-mute mb-3">ТЕГИ</p>
            <div className="flex flex-wrap gap-2">
              {BRAT_TD_SUGGESTION_TAGS.map((tag) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`button-cap px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      active
                        ? "bg-on-primary/15 text-on-primary border-on-primary/50"
                        : "bg-canvas-night-soft text-ink-mute border-hairline-dark hover:text-on-primary hover:border-on-primary-mute"
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="brat-td-suggestion" className="micro-cap text-on-primary-mute block mb-2">
              ОПИС
            </label>
            <textarea
              id="brat-td-suggestion"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опиши ідею: що змінити, чому це важливо, як це має працювати..."
              rows={5}
              maxLength={2000}
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none"
            />
            <p className="caption text-ink-mute mt-1">{description.length}/2000</p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selectedTags.length === 0 || description.trim().length < 10}
            className="btn-ghost text-on-primary disabled:opacity-30"
          >
            {submitting ? "НАДСИЛАЄМО..." : "НАДІСЛАТИ ПРОПОЗИЦІЮ"}
          </button>
        </div>
      )}
    </section>
  );
}
