import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

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
    const { fileName, fileType, fileSize, authorId } = await request.json();

    if (!fileName || !fileType || !authorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (fileSize > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл занадто великий. Максимум 100 МБ." }, { status: 400 });
    }

    const ext = fileName.split(".").pop() || "bin";
    const uniqueName = `${Date.now()}.${ext}`;
    const filePath = `${authorId}/${uniqueName}`;
    const bucket = process.env.R2_BUCKET_NAME || "kodlo-hub";

    const r2 = getR2();

    // Add charset=utf-8 for text files
    const textTypes = ["text/", "application/json", "application/xml"];
    const contentType = textTypes.some((t) => fileType.startsWith(t))
      ? `${fileType}; charset=utf-8`
      : fileType;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 600 });

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${filePath}`;

    return NextResponse.json({ presignedUrl, filePath, publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
