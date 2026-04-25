"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Store } from "@/schemas";
import { getMonthlyEarnings, getRecentStores } from "@/lib/storage";
import { formatYen } from "@/lib/format";

export function HomeStats({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const [monthlyYen, setMonthlyYen] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setMonthlyYen(getMonthlyEarnings());
    setRecentIds(getRecentStores());
  }, []);

  const recentStores = recentIds
    .map((id) => stores.find((s) => s.id === id))
    .filter((s): s is Store => Boolean(s));

  return (
    <div className="space-y-4">
      {monthlyYen > 0 && (
        <div className="card flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-muted">今月の節約合計</div>
            <div className="text-2xl font-bold tabular-nums text-accent">
              {formatYen(monthlyYen)}
            </div>
          </div>
          <div className="text-3xl">🎉</div>
        </div>
      )}

      {recentStores.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted">最近調べた店舗</div>
          <div className="flex flex-wrap gap-2">
            {recentStores.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/recommend?store=${s.id}`)}
                className="chip chip-active"
              >
                {s.chain}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
