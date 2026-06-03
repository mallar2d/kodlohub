import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getR2() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "owner" && profile.role !== "podrofikovany")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType || typeof fileSize !== "number") {
      return NextResponse.json({ error: "Missing file info" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Файл занадто великий. Максимум 10 МБ." }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: "Підтримуються тільки зображення (JPEG, PNG, GIF, WebP, SVG)" }, { status: 400 });
    }

    const bucket = process.env.R2_BUCKET_NAME || "kodlo-hub";
    const ext = fileName.split(".").pop() || "png";
    const uniqueName = `wiki/${user.id}/${Date.now()}.${ext}`;

    const r2 = getR2();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueName,
      ContentType: fileType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 600 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueName}`;

    return NextResponse.json({ presignedUrl, publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
