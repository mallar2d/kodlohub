import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const authorId = formData.get("authorId") as string;

  if (!file || !authorId) {
    return NextResponse.json(
      { error: "Файл та authorId обов'язкові" },
      { status: 400 }
    );
  }

  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Файл занадто великий. Максимум 100 МБ." },
      { status: 400 }
    );
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${authorId}/${fileName}`;

  // Upload to Cloudflare R2
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filePath,
        Body: bytes,
        ContentType: file.type,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Невідома помилка";
    return NextResponse.json(
      { error: `Помилка завантаження в R2: ${message}` },
      { status: 500 }
    );
  }

  const publicUrl = `${R2_PUBLIC_URL}/${filePath}`;

  const fileType = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
    ? "video"
    : "document";

  // Save to Supabase database
  const admin = createAdminClient();

  const { data, error: dbError } = await admin
    .from("media")
    .insert({
      author_id: authorId,
      file_url: publicUrl,
      file_type: fileType,
      file_size: file.size,
      caption: formData.get("caption") || "",
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: `Помилка БД: ${dbError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, media: data });
}
