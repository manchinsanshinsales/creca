"use client";

import { useEffect, useState } from "react";
import { UserWalletSchema, type UserWallet } from "@/schemas";

const WALLET_KEY = "creca:wallet:v1";
const RECENT_STORES_KEY = "creca:recent-stores:v1";
const AMOUNT_KEY = "creca:last-amount:v1";

export const DEFAULT_WALLET: UserWallet = {
  ownedMethodIds: [],
  preferredPointTypeIds: [],
};

export function loadWallet(): UserWallet {
  if (typeof window === "undefined") return DEFAULT_WALLET;
  try {
    const raw = window.localStorage.getItem(WALLET_KEY);
    if (!raw) return DEFAULT_WALLET;
    return UserWalletSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_WALLET;
  }
}

export function saveWallet(w: UserWallet) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WALLET_KEY, JSON.stringify(w));
}

export function useWallet(): [UserWallet, (w: UserWallet) => void, boolean] {
  const [wallet, setWallet] = useState<UserWallet>(DEFAULT_WALLET);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setWallet(loadWallet());
    setReady(true);
  }, []);
  const update = (w: UserWallet) => {
    setWallet(w);
    saveWallet(w);
  };
  return [wallet, update, ready];
}

export function getRecentStores(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_STORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

export function pushRecentStore(id: string) {
  if (typeof window === "undefined") return;
  const prev = getRecentStores().filter((x) => x !== id);
  const next = [id, ...prev].slice(0, 6);
  window.localStorage.setItem(RECENT_STORES_KEY, JSON.stringify(next));
}

export function getSavedAmount(): number {
  if (typeof window === "undefined") return 1000;
  const raw = window.localStorage.getItem(AMOUNT_KEY);
  const n = raw ? Number(raw) : 1000;
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

export function saveAmount(n: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AMOUNT_KEY, String(n));
}

// ── Payment log ──────────────────────────────────────────────────────────────
const PAYMENT_LOG_KEY = "creca:payment-log:v1";
const MAX_LOG_ENTRIES = 200;

export type PaymentLogEntry = {
  id: string;
  storeId: string;
  storeName: string;
  amountYen: number;
  earnedYen: number;
  timestamp: number;
};

export function getPaymentLog(): PaymentLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PAYMENT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PaymentLogEntry[];
  } catch {
    return [];
  }
}

export function addPaymentLog(entry: Omit<PaymentLogEntry, "id">): void {
  if (typeof window === "undefined") return;
  const log = getPaymentLog();
  const next: PaymentLogEntry = { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  window.localStorage.setItem(
    PAYMENT_LOG_KEY,
    JSON.stringify([next, ...log].slice(0, MAX_LOG_ENTRIES)),
  );
}

export function getMonthlyEarnings(now = new Date()): number {
  const log = getPaymentLog();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return log
    .filter((e) => e.timestamp >= start)
    .reduce((sum, e) => sum + e.earnedYen, 0);
}
