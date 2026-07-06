import type { Metadata } from "next";

const SITE_NAME = "KodloHUB";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kodlo.host";
const DEFAULT_OG_IMAGE = "/opengraph-image";

type OgImage = NonNullable<NonNullable<Metadata["openGraph"]>["images"]>;

interface PageMetadataInput {
  title: Metadata["title"];
  description: string;
  path?: string;
  image?: string | null;
  images?: OgImage;
  type?: "website" | "article" | "profile" | "music.song";
  audio?: string;
  video?: string;
  noIndex?: boolean;
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, SITE_URL).toString();
}

export function plainText(value: string, limit = 160) {
  const normalized = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  image,
  images,
  type = "website",
  audio,
  video,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const ogImages = images || [{ url: image || DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }];
  const socialTitle = typeof title === "string" ? title : title && "absolute" in title ? title.absolute : title?.default;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "uk_UA",
      type,
      images: ogImages,
      audio,
      videos: video ? [{ url: video }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: ogImages,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
