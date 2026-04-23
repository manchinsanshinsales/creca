import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "creca — キャッシュレス最適化",
  description:
    "保有カード・電子マネーと店舗から、最もお得な支払いルートをレジ前で一瞬に提案。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "creca",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="text-accent">creca</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-xl px-4 pb-24 pt-4">{children}</main>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

function ServiceWorkerRegister() {
  // Inline script; registers a cache-first service worker for offline PWA use.
  const script = `
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
