import { describe, expect, it, beforeEach } from "vitest";
import { searchStores, buildSearchIndex } from "@/lib/search";
import type { Store } from "@/schemas";

const stores: Store[] = [
  {
    id: "seven_eleven",
    chain: "セブン-イレブン",
    category: "convenience",
    aliases: ["セブン", "711", "セブンイレブン"],
    acceptedMethodIds: [],
  },
  {
    id: "mcdonalds",
    chain: "マクドナルド",
    category: "fastfood",
    aliases: ["マック", "マクド"],
    acceptedMethodIds: [],
  },
  {
    id: "starbucks",
    chain: "スターバックス",
    category: "cafe",
    aliases: ["スタバ"],
    acceptedMethodIds: [],
  },
  {
    id: "familymart",
    chain: "ファミリーマート",
    category: "convenience",
    aliases: ["ファミマ"],
    acceptedMethodIds: [],
  },
];

describe("searchStores", () => {
  beforeEach(() => buildSearchIndex(stores));

  it("returns the full list when query is empty", () => {
    const r = searchStores("", stores);
    expect(r).toHaveLength(stores.length);
  });

  it("finds a store by exact chain name", () => {
    const r = searchStores("マクドナルド", stores);
    expect(r[0].id).toBe("mcdonalds");
  });

  it("finds a store by short alias", () => {
    const r = searchStores("マック", stores);
    expect(r[0].id).toBe("mcdonalds");
  });

  it("finds スタバ via alias even though it differs from official chain name", () => {
    const r = searchStores("スタバ", stores);
    expect(r[0].id).toBe("starbucks");
  });

  it("finds セブン from short alias", () => {
    const r = searchStores("セブン", stores);
    expect(r[0].id).toBe("seven_eleven");
  });

  it("ranks chain match higher than alias match", () => {
    const r = searchStores("ファミリー", stores);
    expect(r[0].id).toBe("familymart");
  });

  it("returns empty for non-matching query", () => {
    const r = searchStores("xyz123", stores);
    expect(r).toHaveLength(0);
  });
});
