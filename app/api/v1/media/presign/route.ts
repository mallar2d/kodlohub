import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { mediaKey, presignPut, publicUrlFor, MAX_MEDIA_SIZE } from "@/lib/api/media";
import { apiError, apiJson } from "@/lib/api/response";

export const POST = withApiAuth(
  async (request, ctx) => {
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;

    const body = await request.json();
    const fileName = typeof body.file_name === "string" ? body.file_name.trim() : "";
    const fileType = typeof body.file_type === "string" ? body.file_type.trim() : "application/octet-stream";
    const fileSize = typeof body.file_size === "number" ? body.file_size : null;

    if (!fileName) return apiError(request, "file_name is required", 400);
    if (fileSize !== null && fileSize > MAX_MEDIA_SIZE) {
      return apiError(request, "File too large. Max 100 MB.", 413, "file_too_large");
    }

    const key = mediaKey(userCheck.userId, fileName);
    const uploadUrl = await presignPut(key, fileType);

    return apiJson(request, {
      upload_url: uploadUrl,
      method: "PUT",
      headers: { "Content-Type": fileType },
      file_url: publicUrlFor(key),
      expires_in: 600,
      next: "After uploading, POST /api/v1/media with { \"file_url\": \"…\" } to register it.",
    });
  },
  { scopes: ["write"] }
);

export const OPTIONS = POST;
