import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
        <header className="sticky top-0 z-20 bg-transparent">
          <nav className="mx-auto flex max-w-xl items-center justify-end px-4 py-3">
            <div className="flex gap-2 text-xs font-medium">
              <Link href="/recommend" className="hover:text-accent transition-colors">
                店舗一覧
              </Link>
              <Link href="/wallet" className="hover:text-accent transition-colors">
                保有決済
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-xl px-4 pb-24 pt-4">{children}</main>
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
