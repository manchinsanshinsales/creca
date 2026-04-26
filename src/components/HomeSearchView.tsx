"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DataBundle, Store } from "@/schemas";
import { searchStores, buildSearchIndex } from "@/lib/search";
import Link from "next/link";

export function HomeSearchView({ db }: { db: DataBundle }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    buildSearchIndex(db.stores);
  }, [db.stores]);

  const suggestions = useMemo<Store[]>(() => {
    if (!search.trim()) return [];
    return searchStores(search, db.stores).slice(0, 6);
  }, [search, db.stores]);

  function selectStore(id: string) {
    router.push(`/recommend?store=${id}`);
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
    } else if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      selectStore(suggestions[0].id);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-12 pb-20">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-6xl font-bold tracking-tighter text-accent transition-all hover:scale-105 active:scale-95">
          creca
        </h1>
        <p className="text-sm font-medium tracking-widest text-muted uppercase">
          レジ前 0.5 秒の最適解
        </p>
      </div>

      {/* Google-like Search Bar Container */}
      <div className="relative w-full max-w-lg">
        <div className="group relative">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-muted transition-colors group-focus-within:text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={searchRef}
            type="search"
            inputMode="search"
            autoComplete="off"
            autoFocus
            placeholder="店舗名で検索 (セブン、カフェ、成城石井...)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
              setActiveIdx(-1);
            }}
            onFocus={() => search.trim() && setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
            onKeyDown={handleSearchKeyDown}
            className="w-full rounded-full border border-border bg-surface2 py-4 pl-14 pr-6 text-xl outline-none transition-all shadow-lg focus:border-accent/60 focus:ring-4 focus:ring-accent/10 sm:text-2xl"
          />
        </div>

        {/* Suggestions Dropdown */}
        {dropdownOpen && suggestions.length > 0 && (
          <ul className="absolute top-full z-20 mt-2 w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl backdrop-blur-xl">
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  onMouseDown={() => selectStore(s.id)}
                  className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-accent/10 ${
                    i === activeIdx ? "bg-accent/10 text-accent font-semibold" : "text-text"
                  }`}
                >
                  <svg
                    className={`h-4 w-4 ${i === activeIdx ? "text-accent" : "text-muted"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{s.chain}</span>
                  {s.id && <span className="ml-auto text-xs text-muted font-normal lowercase opacity-60">@{s.id}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Actions / Buttons */}
      <div className="flex gap-3">
        <Link href="/recommend" className="btn btn-primary px-8 py-3 rounded-full text-base font-semibold shadow-md">
          店舗一覧
        </Link>
        <Link href="/wallet" className="btn px-8 py-3 rounded-full text-base font-semibold shadow-md">
          保有決済を管理
        </Link>
      </div>

      {/* Footer-like Stats (Discreet) */}
      <div className="text-center text-xs text-muted/60 absolute bottom-10 left-0 right-0">
        収録データ: カード {db.paymentMethods.filter((m) => m.kind === "credit").length}種 / 
        店舗 {db.stores.length}箇所 / 
        Ver {db.manifest.version}
      </div>
    </div>
  );
}
