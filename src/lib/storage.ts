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
