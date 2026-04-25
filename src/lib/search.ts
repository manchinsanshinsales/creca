import Fuse, { type IFuseOptions } from "fuse.js";
import type { Store } from "@/schemas";

const FUSE_OPTIONS: IFuseOptions<Store> = {
  keys: [
    { name: "chain", weight: 3 },
    { name: "aliases", weight: 2 },
    { name: "id", weight: 1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
};

let fuseInstance: Fuse<Store> | null = null;

export function buildSearchIndex(stores: Store[]): void {
  fuseInstance = new Fuse(stores, FUSE_OPTIONS);
}

export function searchStores(query: string, stores: Store[]): Store[] {
  if (!query.trim()) return stores;
  if (!fuseInstance) buildSearchIndex(stores);
  const results = fuseInstance!.search(query.trim());
  return results.map((r) => r.item);
}
