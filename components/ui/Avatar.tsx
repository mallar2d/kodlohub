import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  displayName?: string | null;
  size?: number; // e.g. 24, 32, 40, 56, 96
  className?: string;
}

export default function Avatar({ src, displayName, size = 40, className = "" }: AvatarProps) {
  const initials = displayName?.trim().charAt(0).toUpperCase() || "?";
  const isDataUrl = src?.startsWith("data:") || false;

  return (
    <div
      className={`rounded-full bg-canvas-cool flex items-center justify-center text-ink font-bold overflow-hidden relative shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        <Image
          src={src}
          alt={displayName || "Аватар"}
          fill
          className="object-cover rounded-full"
          sizes={`${size}px`}
          unoptimized={isDataUrl}
        />
      ) : (
        initials
      )}
    </div>
  );
}
