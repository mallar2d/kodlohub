import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CoffeeReminder from "@/components/ui/CoffeeReminder";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "KODLOHOST — Хостинг для кодла",
  description:
    "Галерея, блог та лора-бібліотека для кодла. Зберігай фотки, відео та тексти про подро та інші приколи.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas-night text-on-primary">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CoffeeReminder />
      </body>
    </html>
  );
}
