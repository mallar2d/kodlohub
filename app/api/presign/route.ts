import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

const MAX_FILES_PER_BATCH = 10;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

type PresignFile = {
  fileName: string;
  fileType: string;
  fileSize: number;
};

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
    const { files, authorId } = await request.json();

    if (!Array.isArray(files) || files.length === 0 || !authorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json({ error: `Максимум ${MAX_FILES_PER_BATCH} файлів за раз.` }, { status: 400 });
    }

    for (const file of files as PresignFile[]) {
      if (!file.fileName || !file.fileType || typeof file.fileSize !== "number") {
        return NextResponse.json({ error: "Missing file fields" }, { status: 400 });
      }

      if (file.fileSize > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Файл занадто великий. Максимум 100 МБ." }, { status: 400 });
      }
    }

    const bucket = process.env.R2_BUCKET_NAME || "kodlo-hub";

    const r2 = getR2();
    const now = Date.now();

    const uploads = await Promise.all(
      (files as PresignFile[]).map(async (file, index) => {
        const ext = file.fileName.split(".").pop() || "bin";
        const uniqueName = `${now}-${index}.${ext}`;
        const filePath = `${authorId}/${uniqueName}`;

        // Add charset=utf-8 for text files.
        const textTypes = ["text/", "application/json", "application/xml"];
        const contentType = textTypes.some((t) => file.fileType.startsWith(t))
          ? `${file.fileType}; charset=utf-8`
          : file.fileType;

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: filePath,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        });

        return {
          presignedUrl: await getSignedUrl(r2, command, { expiresIn: 600 }),
          filePath,
          publicUrl: `${process.env.R2_PUBLIC_URL}/${filePath}`,
        };
      }),
    );

    return NextResponse.json({ uploads });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
