import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";

export const maxDuration = 10;

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
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const authorId = formData.get("authorId") as string;
    const caption = (formData.get("caption") as string) || "";

    if (!file || !authorId) {
      return NextResponse.json(
        { error: "Файл та authorId обов'язкові" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Ensure profile exists (foreign key constraint)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", authorId)
      .single();

    if (!existingProfile) {
      // Get user data from auth
      const { data: userData } = await admin.auth.admin.getUserById(authorId);
      const meta = userData?.user?.user_metadata || {};

      await admin.from("profiles").upsert(
        {
          id: authorId,
          username: meta.email?.split("@")[0] || `user_${authorId.slice(0, 8)}`,
          display_name: meta.full_name || meta.name || "Учасник кодла",
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: "",
        },
        { onConflict: "id" }
      );
    }

    const fileExt = file.name.split(".").pop() || "bin";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${authorId}/${fileName}`;
    const bucket = process.env.R2_BUCKET_NAME || "kodlo-hub";
    const publicUrl = process.env.R2_PUBLIC_URL || "";

    // Upload to R2
    const bytes = new Uint8Array(await file.arrayBuffer());

    const r2 = getR2();
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: filePath,
        Body: bytes,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const fileUrl = `${publicUrl}/${filePath}`;

    const fileType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
      ? "audio"
      : "document";

    // Save to Supabase
    const { data, error: dbError } = await admin
      .from("media")
      .insert({
        author_id: authorId,
        file_url: fileUrl,
        file_type: fileType,
        file_size: file.size,
        caption,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json(
      { error: `Серверна помилка: ${message}` },
      { status: 500 }
    );
  }
}
