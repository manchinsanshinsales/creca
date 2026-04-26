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

  function handleSubmit() {
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      selectStore(suggestions[activeIdx].id);
    } else if (suggestions.length > 0) {
      selectStore(suggestions[0].id);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownOpen(true);
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-4">
      {/* Logo */}
      <h1 className="text-7xl font-bold tracking-tight text-accent">
        creca
      </h1>

      {/* Search Bar */}
      <div className="relative w-full max-w-xl">
        <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-5 py-3 shadow transition-shadow hover:shadow-md focus-within:shadow-md hover:border-muted/50 focus-within:border-muted/50">
          <svg
            className="h-5 w-5 flex-shrink-0 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={searchRef}
            type="search"
            inputMode="search"
            autoComplete="off"
            autoFocus
            placeholder="店舗名で検索..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
              setActiveIdx(-1);
            }}
            onFocus={() => search.trim() && setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
        </div>

        {/* Suggestions Dropdown */}
        {dropdownOpen && suggestions.length > 0 && (
          <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  onMouseDown={() => selectStore(s.id)}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition-colors ${
                    i === activeIdx ? "bg-surface2 text-accent" : "text-text hover:bg-surface2"
                  }`}
                >
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>{s.chain}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={suggestions.length === 0}
          className="btn btn-primary px-6 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          店舗を検索
        </button>
        <Link href="/wallet" className="btn px-6 py-2 text-sm">
          保有決済を管理
        </Link>
      </div>
    </div>
  );
}
