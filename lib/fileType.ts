const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "avif", "svg", "bmp", "ico", "heic", "heif",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4", "webm", "ogg", "mov", "mkv", "avi", "flv", "wmv",
  "m4v", "mpg", "mpeg", "3gp", "gif",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3", "wav", "ogg", "flac", "aac", "m4a", "wma", "opus",
]);

export function detectFileType(fileName: string, mimeType?: string): "image" | "video" | "audio" | "document" {
  const ext = fileName.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";

  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (mimeType?.startsWith("image/")) {
    if (ext === "gif") return "video";
    return "image";
  }

  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";

  return "document";
}
