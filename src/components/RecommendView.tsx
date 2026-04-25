"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DataBundle, Store } from "@/schemas";
import { recommend } from "@/engine/recommend";
import type { RankedRoute, Hop } from "@/engine/types";
import {
  getRecentStores,
  getSavedAmount,
  pushRecentStore,
  saveAmount,
  useWallet,
} from "@/lib/storage";
import { searchStores, buildSearchIndex } from "@/lib/search";
import { formatPoints, formatRate, formatYen } from "@/lib/format";

export function RecommendView({ db }: { db: DataBundle }) {
  const [wallet, , walletReady] = useWallet();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1000);
  const [recent, setRecent] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    buildSearchIndex(db.stores);
  }, [db.stores]);

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

  const isDataStale = useMemo(() => {
    const generated = Date.parse(db.manifest.generatedAt);
    return Date.now() - generated > 30 * 24 * 60 * 60 * 1000;
  }, [db.manifest.generatedAt]);

  const suggestions = useMemo<Store[]>(() => {
    if (!search.trim()) return [];
    return searchStores(search, db.stores).slice(0, 6);
  }, [search, db.stores]);

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

  function selectStore(id: string) {
    setStoreId(id);
    setSearch("");
    setDropdownOpen(false);
    setActiveIdx(-1);
  }

  function resetStore() {
    setStoreId(null);
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!dropdownOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectStore(suggestions[activeIdx].id);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  if (store) {
    return (
      <div className="space-y-5 pt-2">
        {isDataStale && <StaleDataBanner />}

        <div className="card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{store.chain}</div>
          </div>
          <AmountInput amount={amount} onChange={setAmount} />
        </div>

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
            この店舗で使える保有決済がありません。
            <Link href="/wallet" className="text-accent underline ml-1">
              手段を追加
            </Link>
          </div>
        ) : (
          <RouteResults routes={routes} db={db} amount={amount} />
        )}

        <button
          onClick={resetStore}
          className="w-full rounded-xl border border-border bg-surface2 py-3 text-sm text-muted hover:border-accent/40 hover:text-accent"
        >
          別の店舗を調べる →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2">
      {isDataStale && <StaleDataBanner />}

      <div className="relative">
        <input
          ref={searchRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          autoFocus
          placeholder="店舗名で検索 (例: スタバ、マック、セブン)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setDropdownOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => search.trim() && setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded-2xl border border-border bg-surface2 px-5 py-4 text-lg outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />

        {dropdownOpen && suggestions.length > 0 && (
          <ul
            ref={dropdownRef}
            className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-surface2 shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  onMouseDown={() => selectStore(s.id)}
                  className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-accent/10 ${
                    i === activeIdx ? "bg-accent/10 text-accent" : ""
                  }`}
                >
                  <span className="font-medium">{s.chain}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!search.trim() && (
        <>
          {recentResolved.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted">最近使った店</div>
              <div className="flex flex-wrap gap-2">
                {recentResolved.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStore(s.id)}
                    className="chip chip-active"
                  >
                    {s.chain}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs text-muted">すべての店舗</div>
            <div className="flex flex-wrap gap-2">
              {db.stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectStore(s.id)}
                  className="chip"
                >
                  {s.chain}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {search.trim() && suggestions.length === 0 && !dropdownOpen && (
        <div className="text-sm text-muted">該当する店舗がありません</div>
      )}
    </div>
  );
}

function StaleDataBanner() {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-2 text-xs text-warn">
      ⚠ データが 30 日以上更新されていません。ボーナス情報が古い可能性があります。
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
    <label className="flex shrink-0 items-center gap-1 text-sm">
      <span className="text-muted">¥</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={amount}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n > 0) onChange(n);
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

const interfaceLabel: Record<string, string> = {
  touch: "タッチ決済",
  id: "iD",
  quicpay: "QUICPay",
  qr: "QRコード",
  code: "バーコード",
  physical: "カード",
};

function InterfaceBadges({ interfaces }: { interfaces: string[] }) {
  if (interfaces.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <span className="text-muted">支払方法:</span>
      {interfaces.map((i) => (
        <span key={i} className="rounded-md bg-accent/15 px-2 py-0.5 font-medium text-accent">
          {interfaceLabel[i] ?? i}
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
      <InterfaceBadges interfaces={route.requiredInterfaces} />
      <PointBreakdown route={route} db={db} amount={amount} />
      {route.capHints.length > 0 && (
        <div className="text-xs text-warn">
          {route.capHints.map((c, i) => (
            <div key={i}>⚠︎ {c}</div>
          ))}
        </div>
      )}
      {route.expiringBonuses.length > 0 && (
        <div className="space-y-0.5 text-xs text-warn">
          {route.expiringBonuses.map((msg, i) => (
            <div key={i}>⏳ {msg}</div>
          ))}
        </div>
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
