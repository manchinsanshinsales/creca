"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DataBundle, Store, StoreCategory } from "@/schemas";
import { recommend } from "@/engine/recommend";
import type { RankedRoute, Hop } from "@/engine/types";
import {
  getRecentStores,
  getSavedAmount,
  pushRecentStore,
  saveAmount,
  useWallet,
} from "@/lib/storage";
import { formatPoints, formatRate, formatYen } from "@/lib/format";

const categoryLabel: Record<StoreCategory, string> = {
  convenience: "コンビニ",
  fastfood: "ファスト",
  cafe: "カフェ",
  restaurant: "レストラン",
  supermarket: "スーパー",
  drugstore: "ドラッグ",
  transit: "交通",
  ecommerce: "EC",
  other: "その他",
};

export function RecommendView({ db }: { db: DataBundle }) {
  const [wallet, , walletReady] = useWallet();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1000);
  const [recent, setRecent] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setAmount(getSavedAmount());
    setRecent(getRecentStores());
  }, []);

  useEffect(() => {
    if (storeId) pushRecentStore(storeId);
  }, [storeId]);

  useEffect(() => {
    saveAmount(amount);
  }, [amount]);

  const storesByCategory = useMemo(() => {
    const map = new Map<StoreCategory, Store[]>();
    for (const s of db.stores) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return map;
  }, [db.stores]);

  const filteredStores = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return db.stores.filter((s) => s.chain.toLowerCase().includes(q) || s.id.includes(q));
  }, [db.stores, search]);

  const recentResolved = recent
    .map((id) => db.stores.find((s) => s.id === id))
    .filter((s): s is Store => Boolean(s));

  const store = storeId ? db.stores.find((s) => s.id === storeId) ?? null : null;

  const routes = useMemo<RankedRoute[]>(() => {
    if (!store || !walletReady) return [];
    return recommend({
      wallet,
      storeId: store.id,
      db,
      amountYen: amount,
      now: new Date(),
      maxHops: 3,
      limit: 8,
    });
  }, [store, walletReady, wallet, db, amount]);

  return (
    <div className="space-y-5 pt-2">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">店舗</h2>
          {store && (
            <button
              onClick={() => setStoreId(null)}
              className="text-xs text-muted underline"
            >
              変更
            </button>
          )}
        </div>

        {!store && (
          <>
            <input
              type="search"
              inputMode="search"
              placeholder="店舗名で検索 (例: セブン)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface2 px-4 py-3 text-base outline-none focus:border-accent/60"
            />

            {filteredStores ? (
              <div className="flex flex-wrap gap-2">
                {filteredStores.length === 0 ? (
                  <span className="text-xs text-muted">該当なし</span>
                ) : (
                  filteredStores.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStoreId(s.id);
                        setSearch("");
                      }}
                      className="chip"
                    >
                      {s.chain}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                {recentResolved.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted">最近使った店</div>
                    <div className="flex flex-wrap gap-2">
                      {recentResolved.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setStoreId(s.id)}
                          className="chip chip-active"
                        >
                          {s.chain}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {[...storesByCategory.entries()].map(([cat, list]) => (
                  <div key={cat} className="space-y-1">
                    <div className="text-xs text-muted">{categoryLabel[cat]}</div>
                    <div className="flex flex-wrap gap-2">
                      {list.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setStoreId(s.id)}
                          className="chip"
                        >
                          {s.chain}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {store && (
          <div className="card flex items-center justify-between">
            <div>
              <div className="text-xs text-muted">{categoryLabel[store.category]}</div>
              <div className="text-lg font-semibold">{store.chain}</div>
            </div>
            <AmountInput amount={amount} onChange={setAmount} />
          </div>
        )}
      </section>

      {store && (
        <>
          {!walletReady ? (
            <div className="text-sm text-muted">読み込み中…</div>
          ) : wallet.ownedMethodIds.length === 0 ? (
            <div className="card space-y-2 text-sm">
              <div>保有している決済がまだ登録されていません。</div>
              <Link href="/wallet" className="btn btn-primary">
                保有決済を登録する
              </Link>
            </div>
          ) : routes.length === 0 ? (
            <div className="card text-sm">
              この店舗で使える保有決済がありません。別の店舗を選ぶか
              <Link href="/wallet" className="text-accent underline">
                手段を追加
              </Link>
              してください。
            </div>
          ) : (
            <RouteResults routes={routes} db={db} amount={amount} />
          )}
        </>
      )}
    </div>
  );
}

function AmountInput({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="text-muted">¥</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={amount}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        className="w-24 rounded-lg border border-border bg-surface2 px-2 py-1 text-right tabular-nums outline-none focus:border-accent/60"
      />
    </label>
  );
}

function RouteResults({
  routes,
  db,
  amount,
}: {
  routes: RankedRoute[];
  db: DataBundle;
  amount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [best, ...rest] = routes;
  return (
    <div className="space-y-3">
      <BestRouteCard route={best} db={db} amount={amount} />
      {rest.length > 0 && (
        <>
          <button
            className="w-full text-left text-xs text-muted underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "他の選択肢を隠す" : `他の選択肢 (${rest.length}) を見る`}
          </button>
          {expanded && (
            <div className="space-y-2">
              {rest.map((r) => (
                <AltRouteCard key={r.id} route={r} db={db} amount={amount} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HopChips({ hops }: { hops: Hop[] }) {
  const items: { key: string; label: string; isPay?: boolean }[] = [];
  for (const h of hops) {
    if (h.kind === "charge") {
      items.push({ key: `c-${h.from.id}`, label: h.from.displayName });
      items.push({ key: `c-${h.to.id}`, label: h.to.displayName });
    } else {
      if (items.length === 0) {
        items.push({ key: `p-${h.method.id}`, label: h.method.displayName, isPay: true });
      } else {
        items[items.length - 1].isPay = true;
      }
    }
  }
  // Deduplicate while preserving order
  const seen = new Set<string>();
  const dedup = items.filter((i) => {
    if (seen.has(i.label)) return false;
    seen.add(i.label);
    return true;
  });
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      {dedup.map((i, idx) => (
        <span key={i.key} className="flex items-center gap-1">
          <span className={`chip ${i.isPay ? "chip-active" : ""}`}>{i.label}</span>
          {idx < dedup.length - 1 && <span className="text-muted">→</span>}
        </span>
      ))}
    </div>
  );
}

function BestRouteCard({
  route,
  db,
  amount,
}: {
  route: RankedRoute;
  db: DataBundle;
  amount: number;
}) {
  return (
    <div className="card space-y-3 border-accent/40 bg-gradient-to-b from-accent/10 to-transparent">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-accent">最適</span>
        <div className="flex items-baseline gap-2 text-right">
          <span className="text-3xl font-bold tabular-nums text-accent">
            {formatRate(route.effectiveRate)}
          </span>
          <span className="text-sm text-muted">≒ {formatYen(route.effectiveYen)}</span>
        </div>
      </div>
      <HopChips hops={route.hops} />
      <PointBreakdown route={route} db={db} amount={amount} />
      {route.capHints.length > 0 && (
        <div className="text-xs text-warn">
          {route.capHints.map((c, i) => (
            <div key={i}>⚠︎ {c}</div>
          ))}
        </div>
      )}
      {route.expiringBonus && (
        <div className="text-xs text-warn">⏳ {route.expiringBonus}</div>
      )}
    </div>
  );
}

function AltRouteCard({
  route,
  db,
  amount,
}: {
  route: RankedRoute;
  db: DataBundle;
  amount: number;
}) {
  return (
    <div className="card space-y-2">
      <div className="flex items-baseline justify-between">
        <HopChips hops={route.hops} />
        <div className="text-right text-sm tabular-nums">
          <span className="font-semibold">{formatRate(route.effectiveRate)}</span>
          <span className="ml-1 text-muted">({formatYen(route.effectiveYen)})</span>
        </div>
      </div>
      <PointBreakdown route={route} db={db} amount={amount} compact />
    </div>
  );
}

function PointBreakdown({
  route,
  db,
  compact,
}: {
  route: RankedRoute;
  db: DataBundle;
  amount: number;
  compact?: boolean;
}) {
  const entries = Object.entries(route.totalByPointType);
  if (entries.length === 0) {
    return <div className="text-xs text-muted">獲得ポイントなし</div>;
  }
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      {entries.map(([pid, pts]) => {
        const pt = db.pointTypes.find((p) => p.id === pid);
        const yen = route.totalYenByPointType[pid] ?? 0;
        return (
          <span key={pid} className="chip">
            <span className="text-muted">{pt?.name ?? pid}</span>
            <span className="tabular-nums">+{formatPoints(pts)}pt</span>
            {pt && pt.monetaryValuePerPoint !== 1 && (
              <span className="text-muted">({formatYen(yen)})</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
