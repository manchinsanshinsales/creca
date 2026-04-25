"use client";

import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const methods = q
      ? db.paymentMethods.filter(
          (m) =>
            m.displayName.toLowerCase().includes(q) ||
            m.issuer?.toLowerCase().includes(q) ||
            m.brand?.toLowerCase().includes(q),
        )
      : db.paymentMethods;

    const map = new Map<PaymentMethod["kind"], PaymentMethod[]>();
    for (const m of methods) {
      const list = map.get(m.kind) ?? [];
      list.push(m);
      map.set(m.kind, list);
    }
    return map;
  }, [db.paymentMethods, query]);

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

  const toggleAllInKind = (kind: PaymentMethod["kind"], list: PaymentMethod[]) => {
    const ids = list.map((m) => m.id);
    const allActive = ids.every((id) => wallet.ownedMethodIds.includes(id));
    const next = new Set(wallet.ownedMethodIds);
    if (allActive) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    setWallet({ ...wallet, ownedMethodIds: [...next] });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">保有している決済</h2>
          <span className="text-xs text-muted">
            {wallet.ownedMethodIds.length} / {db.paymentMethods.length} 種類
          </span>
        </div>
        <p className="text-xs text-muted">
          複数選択OK。登録した手段だけが推薦に使われます。
        </p>

        <input
          type="search"
          placeholder="カード名・発行会社で絞り込み"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface2 px-4 py-2.5 text-sm outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />

        {grouped.size === 0 && (
          <div className="text-sm text-muted">該当するカードがありません</div>
        )}

        {[...grouped.entries()].map(([kind, list]) => {
          const allActive = list.every((m) => wallet.ownedMethodIds.includes(m.id));
          return (
            <div key={kind} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{kindLabel[kind]}</span>
                <button
                  onClick={() => toggleAllInKind(kind, list)}
                  className="text-xs text-accent underline"
                >
                  {allActive ? "全解除" : "全選択"}
                </button>
              </div>
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
          );
        })}
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
    </div>
  );
}
