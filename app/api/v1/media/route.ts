import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { logActivity } from "@/lib/activity";
import { dispatchWebhook } from "@/lib/api/webhooks";
import { detectFileType } from "@/lib/fileType";
import { isOwnR2Url, mediaKey, putToR2, MAX_MEDIA_SIZE } from "@/lib/api/media";
import { apiError, apiJson } from "@/lib/api/response";

// Allow time for the R2 upload of larger files.
export const maxDuration = 60;

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const fileType = searchParams.get("type");

  const supabase = createAdminClient();

  let query = supabase
    .from("media")
    .select("id, file_url, file_type, caption, created_at, profiles(display_name, username, avatar_url)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (fileType) {
    query = query.eq("file_type", fileType);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiError(request, error.message, 500);
  }

  const media = (data || []).map((m) => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles || null,
  }));

  return apiJson(request, {
    media,
    pagination: { limit, offset, total: count ?? media.length },
  });
});

async function insertMedia(
  authorId: string,
  fileUrl: string,
  fileType: string,
  fileSize: number,
  caption: string
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("media")
    .insert({
      author_id: authorId,
      file_url: fileUrl,
      file_type: fileType,
      file_size: fileSize,
      caption,
    })
    .select("id, file_url, file_type, file_size, caption, created_at")
    .single();

  if (error) return { ok: false as const, error: error.message };

  logActivity(authorId, "media_uploaded", "media", data.id, { via: "api", fileType });
  void dispatchWebhook("media.uploaded", { media: data });

  return { ok: true as const, data };
}

export const POST = withApiAuth(
  async (request, ctx) => {
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;
    const authorId = userCheck.userId;

    const contentType = request.headers.get("content-type") || "";

    // Path 1 — register a file already uploaded to R2 via /media/presign.
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const fileUrl = typeof body.file_url === "string" ? body.file_url.trim() : "";
      if (!fileUrl) return apiError(request, "file_url is required", 400);
      if (!isOwnR2Url(fileUrl)) {
        return apiError(request, "file_url must point to a KodloHUB upload (use /media/presign first)", 400, "invalid_file_url");
      }

      const caption = typeof body.caption === "string" ? body.caption.trim() : "";
      // Clients may send file_type as a MIME string (e.g. "image/jpeg") because
      // /media/presign takes it that way. Always normalize to a category so we
      // never store a raw MIME that violates the media_file_type_check constraint.
      const fileType = detectFileType(
        fileUrl,
        typeof body.file_type === "string" ? body.file_type : undefined
      );
      const fileSize = typeof body.file_size === "number" ? body.file_size : 0;

      const result = await insertMedia(authorId, fileUrl, fileType, fileSize, caption);
      if (!result.ok) return apiError(request, result.error, 500);
      return apiJson(request, { media: result.data }, 201);
    }

    // Path 2 — direct multipart upload (file streamed through the API).
    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return apiError(request, "Invalid multipart/form-data body", 400);
      }

      const file = formData.get("file");
      if (!(file instanceof File)) {
        return apiError(request, "file field is required", 400);
      }
      if (file.size === 0) {
        return apiError(request, "file is empty", 400);
      }
      if (file.size > MAX_MEDIA_SIZE) {
        return apiError(request, "File too large. Max 100 MB. Use /media/presign for direct upload.", 413, "file_too_large");
      }

      const caption = typeof formData.get("caption") === "string" ? (formData.get("caption") as string).trim() : "";
      const key = mediaKey(authorId, file.name || "upload.bin");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fileUrl = await putToR2(key, bytes, file.type);
      const fileType = detectFileType(file.name || key, file.type);

      const result = await insertMedia(authorId, fileUrl, fileType, file.size, caption);
      if (!result.ok) return apiError(request, result.error, 500);
      return apiJson(request, { media: result.data }, 201);
    }

    return apiError(
      request,
      "Use multipart/form-data (field 'file') to upload, or application/json with file_url to register a presigned upload.",
      415,
      "unsupported_media_type"
    );
  },
  { scopes: ["write"] }
);

export const OPTIONS = GET;
