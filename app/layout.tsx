import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CoffeeReminder from "@/components/ui/CoffeeReminder";
import SoundCloudPlayer from "@/components/ui/SoundCloudPlayer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "KodloHUB — Хостинг для кодла",
  description:
    "Галерея, блог та артефакт-бібліотека для кодла. Зберігай фотки, відео та тексти про подро та інші приколи.",
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
          <ToastProvider>
            <Navbar />
            <main className="flex-1 pb-20">{children}</main>
            <Footer />
            <SoundCloudPlayer />
            <CoffeeReminder />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
