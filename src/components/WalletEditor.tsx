"use client";

import { useMemo, useState } from "react";
import type { DataBundle, PaymentMethod } from "@/schemas";
import { useWallet } from "@/lib/storage";

const kindColors: Record<PaymentMethod["kind"], { bg: string; text: string; label: string }> = {
  credit:  { bg: "#a78bfa1a", text: "#a78bfa", label: "クレジット" },
  debit:   { bg: "#60a5fa1a", text: "#60a5fa", label: "デビット" },
  prepaid: { bg: "#fbbf241a", text: "#fbbf24", label: "プリペイド" },
  emoney:  { bg: "#34d3991a", text: "#34d399", label: "電子マネー" },
  qr:      { bg: "#fb71851a", text: "#fb7185", label: "QR決済" },
};

const kindOrder: Array<PaymentMethod["kind"]> = ["credit", "debit", "prepaid", "emoney", "qr"];

export function WalletEditor({ db }: { db: DataBundle }) {
  const [wallet, setWallet, ready] = useWallet();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<PaymentMethod["kind"] | "all">("all");

  const availableKinds = useMemo(
    () => kindOrder.filter((k) => db.paymentMethods.some((m) => m.kind === k)),
    [db.paymentMethods]
  );

  const filteredMethods = useMemo(() => {
    let list = db.paymentMethods;
    if (kindFilter !== "all") list = list.filter((m) => m.kind === kindFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.displayName.toLowerCase().includes(q));
    }
    return list;
  }, [db.paymentMethods, kindFilter, search]);

  const filteredGrouped = useMemo(() => {
    const map = new Map<PaymentMethod["kind"], PaymentMethod[]>();
    for (const m of filteredMethods) {
      const arr = map.get(m.kind) ?? [];
      arr.push(m);
      map.set(m.kind, arr);
    }
    return map;
  }, [filteredMethods]);

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
    <div className="space-y-5">
      <input
        type="search"
        inputMode="search"
        placeholder="決済手段を検索…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setKindFilter("all")}
          className={`chip shrink-0 ${kindFilter === "all" ? "chip-active" : ""}`}
        >
          全て
        </button>
        {availableKinds.map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={`chip shrink-0 ${kindFilter === k ? "chip-active" : ""}`}
          >
            {kindColors[k].label}
          </button>
        ))}
      </div>

      <section className="space-y-5">
        {[...filteredGrouped.entries()].map(([kind, list]) => (
          <div key={kind} className="space-y-2">
            <div className="section-header">{kindColors[kind].label}</div>
            <div className="space-y-2">
              {list.map((m) => {
                const active = wallet.ownedMethodIds.includes(m.id);
                const colors = kindColors[m.kind];
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMethod(m.id)}
                    className="method-row w-full text-left"
                  >
                    <span
                      className="icon-badge"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {m.displayName.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {m.displayName}
                      </span>
                      <span className="block text-xs text-muted">
                        {kindColors[m.kind].label}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        active ? "border-accent bg-accent" : "border-border bg-transparent"
                      }`}
                    >
                      {active && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="#0b0d10"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filteredMethods.length === 0 && (
          <div className="text-sm text-muted">該当する決済手段がありません</div>
        )}
      </section>

      <section className="space-y-3 pt-2">
        <div>
          <h2 className="text-base font-bold">優先したいポイント</h2>
          <p className="mt-0.5 text-xs text-muted">
            同率なら選んだポイントを貯めるルートを上位に。任意。
          </p>
        </div>
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

      <section className="text-xs text-muted">
        登録中: <span className="font-medium text-text">{wallet.ownedMethodIds.length}</span> 種類
      </section>
    </div>
  );
}
