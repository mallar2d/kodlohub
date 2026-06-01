"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const msg = searchParams.get("message");
  const message = msg === "auth_failed" ? "Не вдалося увійти через Google. Спробуй ще раз." : "Сталася помилка при вході.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="card-dark p-8">
          <div className="mb-6">
            <svg className="mx-auto w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="heading-section mb-4">ПОМИЛКА</h1>
          <p className="text-on-primary-mute mb-8">{message}</p>
          <Link href="/login" className="btn-ghost text-on-primary inline-block">
            Спробувати ще раз
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}