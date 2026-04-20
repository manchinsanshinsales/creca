"use client";

import { useMemo } from "react";
import type { DataBundle, PaymentMethod } from "@/schemas";
import { useWallet } from "@/lib/storage";

const kindLabel: Record<PaymentMethod["kind"], string> = {
  credit: "クレジット",
  debit: "デビット",
  prepaid: "プリペイド",
  emoney: "電子マネー",
  qr: "QR決済",
};

export function WalletEditor({ db }: { db: DataBundle }) {
  const [wallet, setWallet, ready] = useWallet();

  const grouped = useMemo(() => {
    const map = new Map<PaymentMethod["kind"], PaymentMethod[]>();
    for (const m of db.paymentMethods) {
      const list = map.get(m.kind) ?? [];
      list.push(m);
      map.set(m.kind, list);
    }
    return map;
  }, [db.paymentMethods]);

  if (!ready) {
    return <div className="text-sm text-muted">読み込み中…</div>;
  }

  const toggleMethod = (id: string) => {
    const next = new Set(wallet.ownedMethodIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setWallet({ ...wallet, ownedMethodIds: [...next] });
  };

  const togglePointPref = (id: string) => {
    const next = new Set(wallet.preferredPointTypeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setWallet({ ...wallet, preferredPointTypeIds: [...next] });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-bold">保有している決済</h2>
        <p className="text-xs text-muted">
          複数選択OK。登録した手段だけが推薦に使われます。
        </p>
        {[...grouped.entries()].map(([kind, list]) => (
          <div key={kind} className="space-y-2">
            <div className="text-xs text-muted">{kindLabel[kind]}</div>
            <div className="flex flex-wrap gap-2">
              {list.map((m) => {
                const active = wallet.ownedMethodIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMethod(m.id)}
                    className={`chip ${active ? "chip-active" : ""}`}
                  >
                    {m.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">優先したいポイント</h2>
        <p className="text-xs text-muted">
          同率なら選んだポイントを貯めるルートを上位に。任意。
        </p>
        <div className="flex flex-wrap gap-2">
          {db.pointTypes.map((p) => {
            const active = wallet.preferredPointTypeIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePointPref(p.id)}
                className={`chip ${active ? "chip-active" : ""}`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="text-sm text-muted">
        登録中: <span className="text-text">{wallet.ownedMethodIds.length}</span> 種類
      </section>
    </div>
  );
}
