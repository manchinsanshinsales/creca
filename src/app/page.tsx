import Link from "next/link";
import { loadData } from "@/data/loader";

export default function HomePage() {
  const db = loadData();

  const creditCount = db.paymentMethods.filter((m) => m.kind === "credit").length;
  const emoneyQrCount = db.paymentMethods.filter(
    (m) => m.kind === "emoney" || m.kind === "qr"
  ).length;

  return (
    <div className="space-y-5 pt-4">
      <section>
        <p className="text-xs text-muted">キャッシュレス最適化</p>
        <h1 className="mt-1 text-2xl font-bold leading-snug">
          レジ前 0.5 秒で<br />最適ルートを提案
        </h1>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-3xl font-bold tabular-nums text-accent">
            {db.paymentMethods.length}
          </div>
          <div className="mt-1 text-xs text-muted">収録決済手段</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold tabular-nums text-accent">
            {db.stores.length}
          </div>
          <div className="mt-1 text-xs text-muted">収録店舗</div>
        </div>
      </section>

      <Link href="/recommend" className="btn btn-primary flex h-14 w-full text-base">
        推薦を見る →
      </Link>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">収録データ</span>
          <span className="text-xs text-muted">{db.manifest.version}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="chip">クレジット {creditCount}</span>
          <span className="chip">電子マネー / QR {emoneyQrCount}</span>
          <span className="chip">店舗 {db.stores.length}</span>
          <span className="chip">特典ルール {db.bonusRules.length}</span>
        </div>
        <div className="text-xs text-muted">
          データ as of {db.manifest.generatedAt}。最新は各公式サイトで要確認。
        </div>
      </section>

      <Link href="/wallet" className="btn flex h-12 w-full text-sm">
        保有決済を登録 / 確認する
      </Link>
    </div>
  );
}
