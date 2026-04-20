import Link from "next/link";
import { loadData } from "@/data/loader";

export default function HomePage() {
  const db = loadData();
  return (
    <div className="space-y-6 pt-6">
      <section className="space-y-3">
        <p className="text-sm text-muted">レジ前 0.5 秒で最適ルート</p>
        <h1 className="text-3xl font-bold leading-tight">
          持ってる決済から、<br />
          一番お得な支払い方法。
        </h1>
        <p className="text-sm text-muted">
          クレジットカード・電子マネー・QR を組み合わせた実質還元率を、
          チャージ経路も含めて計算して提案します。
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link href="/recommend" className="btn btn-primary h-16 text-base">
          推薦を見る
        </Link>
        <Link href="/wallet" className="btn h-16 text-base">
          保有決済を登録
        </Link>
      </section>

      <section className="card space-y-3">
        <div className="text-sm font-semibold">収録データ ({db.manifest.version})</div>
        <div className="flex flex-wrap gap-1 text-xs text-muted">
          <span className="chip">カード {db.paymentMethods.filter((m) => m.kind === "credit").length}</span>
          <span className="chip">電子マネー/QR {db.paymentMethods.filter((m) => m.kind === "emoney" || m.kind === "qr").length}</span>
          <span className="chip">店舗 {db.stores.length}</span>
          <span className="chip">特典ルール {db.bonusRules.length}</span>
        </div>
        <div className="text-xs text-muted">
          データ as of {db.manifest.generatedAt}。最新は各公式サイトで要確認。
        </div>
      </section>
    </div>
  );
}
