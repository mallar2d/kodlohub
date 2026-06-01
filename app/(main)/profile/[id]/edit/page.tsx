"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";

export default function ProfileEditPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Файл занадто великий! Максимум 5 МБ.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: params.id,
          files: [{
            fileName: file.name,
            fileType: file.type || "image/jpeg",
            fileSize: file.size,
          }],
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      const upload = data.uploads?.[0];
      if (!upload) throw new Error();

      const uploadRes = await fetch(upload.presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/jpeg",
        },
        body: file,
      });

      if (!uploadRes.ok) throw new Error();

      setAvatarUrl(upload.publicUrl);
    } catch {
      alert("Помилка завантаження аватара.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      if (!data.user || data.user.id !== params.id) {
        router.push("/login");
        return;
      }
      setUser(data.user);

      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .single();

      // Auto-create profile if missing
      if (!profile) {
        const meta = data.user.user_metadata || {};
        const newProfile = {
          id: data.user.id,
          username: meta.email?.split("@")[0] || data.user.email?.split("@")[0] || `user_${data.user.id.slice(0, 8)}`,
          display_name: meta.full_name || meta.name || data.user.email?.split("@")[0] || "Учасник кодла",
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: "",
        };

        const { data: created } = await supabase
          .from("profiles")
          .upsert(newProfile, { onConflict: "id" })
          .select()
          .single();

        profile = created;
      }

      if (profile) {
        setDisplayName(profile.display_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
      }
      setLoading(false);
    });
  }, [params.id, router, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Check username uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", params.id)
      .single();

    if (existing) {
      setError("Цей нікнейм вже зайнятий");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username,
        bio,
        avatar_url: avatarUrl || null,
      })
      .eq("id", params.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push(`/profile/${params.id}`);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">НАЛАШТУВАННЯ</p>
          <h1 className="heading-section mb-4">РЕДАГУВАТИ ПРОФІЛЬ</h1>
        </div>

        {/* Avatar preview */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-3xl font-bold overflow-hidden mb-4 relative group">
            <Avatar src={avatarUrl} displayName={displayName} size={96} />
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-canvas-night/70 flex items-center justify-center rounded-full">
                <div className="animate-spin w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <label className="button-cap px-4 py-2 rounded-full border border-hairline-dark hover:border-on-primary text-ink-mute hover:text-on-primary cursor-pointer transition-colors text-xs">
              {uploadingAvatar ? "ЗАВАНТАЖЕННЯ..." : "ОБРАТИ ФАЙЛ"}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="button-cap px-4 py-2 rounded-full border border-red-500/50 hover:bg-red-500/10 text-red-400 cursor-pointer transition-colors text-xs"
              >
                ВИДАЛИТИ
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Avatar URL */}
          <div>
            <label className="micro-cap text-on-primary-mute block mb-2">
              АБО ВСТАВИТИ URL АВАТАРА
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
            />
            <p className="caption text-ink-mute mt-1">
              Встав URL зображення, якщо не хочеш завантажувати файл.
            </p>
          </div>

          <div>
            <label className="micro-cap text-on-primary-mute block mb-2">
              ІМ'Я ВІДОБРАЖЕННЯ
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Як тебе називати?"
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
            />
          </div>

          {/* Username */}
          <div>
            <label className="micro-cap text-on-primary-mute block mb-2">
              НІКНЕЙМ
            </label>
            <div className="flex items-center">
              <span className="text-ink-mute mr-1">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="nickname"
                className="flex-1 px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
              />
            </div>
            <p className="caption text-ink-mute mt-1">
              Тільки літери, цифри та підкреслення
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="micro-cap text-on-primary-mute block mb-2">
              ПРО СЕБЕ
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Розкажи про себе щось цікаве..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute resize-none"
            />
            <p className="caption text-ink-mute mt-1">
              {bio.length}/500
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 border border-red-500/50 rounded-lg bg-red-500/10">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-4 border border-green-500/50 rounded-lg bg-green-500/10">
              <p className="text-green-400 text-sm text-center">
                Профіль оновлено! Гойда!
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !displayName || !username}
              className="btn-ghost text-on-primary disabled:opacity-30"
            >
              {saving ? "ЗБЕРІГАЄМО..." : "ЗБЕРЕГТИ"}
            </button>
            <button
              onClick={() => router.push(`/profile/${params.id}`)}
              className="btn-ghost text-ink-mute border-hairline-dark"
            >
              СКАСУВАТИ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
