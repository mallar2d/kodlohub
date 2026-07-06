import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CoffeeReminder from "@/components/ui/CoffeeReminder";
import SoundCloudPlayer from "@/components/ui/SoundCloudPlayer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import AuthProvider from "@/components/providers/AuthProvider";
import { buildPageMetadata } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kodlo.host"),
  ...buildPageMetadata({
    title: {
      default: "KodloHUB — Хостинг для кодла",
      template: "%s | KodloHUB",
    },
    description:
      "Галерея, блог та артефакт-бібліотека для кодла. Зберігай фотки, відео та тексти про подро та інші приколи.",
    path: "/",
  }),
  icons: {
    icon: "/kodlohub-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas-night text-on-primary">
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <SoundCloudPlayer />
              <CoffeeReminder />
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
