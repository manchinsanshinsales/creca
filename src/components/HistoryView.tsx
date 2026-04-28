"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPaymentLog,
  getMonthlyEarnings,
  type PaymentLogEntry,
} from "@/lib/storage";
import { formatYen } from "@/lib/format";

export function HistoryView() {
  const [log, setLog] = useState<PaymentLogEntry[]>([]);
  const [monthlyYen, setMonthlyYen] = useState(0);

  useEffect(() => {
    setLog(getPaymentLog());
    setMonthlyYen(getMonthlyEarnings());
  }, []);

  if (log.length === 0) {
    return (
      <div className="space-y-5 pt-2">
        <h1 className="text-lg font-semibold">支払い履歴</h1>
        <div className="card space-y-3 text-sm text-muted">
          <p>まだ支払い記録がありません。</p>
          <Link href="/recommend" className="btn btn-primary inline-flex">
            店舗を調べて記録する
          </Link>
        </div>
      </div>
    );
  }

  const grouped = groupByMonth(log);

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-lg font-semibold">支払い履歴</h1>

      <div className="card flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs text-muted">今月の還元合計</div>
          <div className="text-2xl font-bold tabular-nums text-accent">
            {formatYen(monthlyYen)}
          </div>
        </div>
        <div className="text-xs text-muted">{log.length}件の記録</div>
      </div>

      {grouped.map(({ label, entries, totalYen }) => (
        <section key={label} className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-xs font-medium text-muted">{label}</div>
            <div className="text-xs text-muted">還元 {formatYen(totalYen)}</div>
          </div>
          <div className="space-y-2">
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EntryCard({ entry }: { entry: PaymentLogEntry }) {
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <div className="truncate font-medium">{entry.storeName}</div>
        <div className="text-xs text-muted">
          {dateStr} {timeStr} · {formatYen(entry.amountYen)} 支払
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums text-accent">
          +{formatYen(entry.earnedYen)}
        </div>
      </div>
    </div>
  );
}

type MonthGroup = {
  label: string;
  entries: PaymentLogEntry[];
  totalYen: number;
};

function groupByMonth(log: PaymentLogEntry[]): MonthGroup[] {
  const map = new Map<string, PaymentLogEntry[]>();
  for (const e of log) {
    const d = new Date(e.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = map.get(key) ?? [];
    bucket.push(e);
    map.set(key, bucket);
  }
  return Array.from(map.entries()).map(([key, entries]) => {
    const [y, m] = key.split("-");
    return {
      label: `${y}年${Number(m)}月`,
      entries,
      totalYen: entries.reduce((s, e) => s + e.earnedYen, 0),
    };
  });
}
