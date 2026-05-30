"use client";

import { useEffect, useRef } from "react";

interface TelegramLoginProps {
  onAuth?: (user: Record<string, unknown>) => void;
}

export default function TelegramWidget({ onAuth }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Telegram Login Widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", "stoppremiumgoy_bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    containerRef.current.appendChild(script);

    // Define global callback
    (window as unknown as { onTelegramAuth: (user: Record<string, unknown>) => void }).onTelegramAuth =
      (user: Record<string, unknown>) => {
        if (onAuth) onAuth(user);
      };
  }, [onAuth]);

  return (
    <div ref={containerRef} className="flex justify-center" />
  );
}
