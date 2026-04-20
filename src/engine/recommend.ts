import type { DataBundle, PaymentMethod, PointType } from "@/schemas";
import type { ComputeContext, RankedRoute, RecommendInput } from "./types";
import { enumeratePaths } from "./graph";
import { computeHopRewards } from "./rewards";

const DEFAULT_MAX_HOPS = 3;
const DEFAULT_LIMIT = 8;

function buildContext(db: DataBundle, now: Date): ComputeContext {
  const pointTypes = new Map<string, PointType>();
  for (const p of db.pointTypes) pointTypes.set(p.id, p);
  const methods = new Map<string, PaymentMethod>();
  for (const m of db.paymentMethods) methods.set(m.id, m);
  return { pointTypes, methods, bonusRules: db.bonusRules, now };
}

export function recommend(input: RecommendInput): RankedRoute[] {
  const { wallet, storeId, db, amountYen = 1000 } = input;
  const now = input.now ?? new Date();
  const maxHops = input.maxHops ?? DEFAULT_MAX_HOPS;
  const limit = input.limit ?? DEFAULT_LIMIT;

  const store = db.stores.find((s) => s.id === storeId);
  if (!store) return [];

  const ctx = buildContext(db, now);
  const paths = enumeratePaths(ctx.methods, store, wallet, { maxHops });

  const routes: RankedRoute[] = paths.map((hops) => {
    const breakdown: RankedRoute["breakdown"] = [];
    const upstreamIds: string[] = [];
    const capHints: string[] = [];
    let expiring: string | undefined;

    for (const hop of hops) {
      const b = computeHopRewards(hop, upstreamIds, amountYen, store, ctx);
      breakdown.push(b);
      if (b.cappedNotice) capHints.push(b.cappedNotice);
      for (const ruleId of b.appliedRuleIds) {
        const rule = db.bonusRules.find((r) => r.id === ruleId);
        if (rule?.validTo && !expiring) {
          expiring = `${rule.label ?? ruleId} は ${rule.validTo} まで`;
        }
      }
      upstreamIds.push(hop.kind === "pay" ? hop.method.id : hop.from.id);
    }

    const totalByPointType: Record<string, number> = {};
    const totalYenByPointType: Record<string, number> = {};
    let effectiveYen = 0;
    for (const b of breakdown) {
      for (const e of b.earned) {
        totalByPointType[e.pointTypeId] = (totalByPointType[e.pointTypeId] ?? 0) + e.points;
        totalYenByPointType[e.pointTypeId] =
          (totalYenByPointType[e.pointTypeId] ?? 0) + e.yenValue;
        effectiveYen += e.yenValue;
      }
    }

    return {
      id: hops
        .map((h) => (h.kind === "pay" ? `P:${h.method.id}` : `C:${h.from.id}->${h.to.id}`))
        .join("|"),
      hops,
      effectiveYen,
      effectiveRate: amountYen > 0 ? effectiveYen / amountYen : 0,
      breakdown,
      totalByPointType,
      totalYenByPointType,
      expiringBonus: expiring,
      capHints,
    };
  });

  const preferred = new Set(wallet.preferredPointTypeIds);
  routes.sort((a, b) => {
    if (b.effectiveYen !== a.effectiveYen) return b.effectiveYen - a.effectiveYen;
    if (a.hops.length !== b.hops.length) return a.hops.length - b.hops.length;
    // Prefer routes that grant at least one of the user's preferred point types
    const aHit = Object.keys(a.totalByPointType).some((p) => preferred.has(p)) ? 1 : 0;
    const bHit = Object.keys(b.totalByPointType).some((p) => preferred.has(p)) ? 1 : 0;
    return bHit - aHit;
  });

  // Deduplicate equivalent routes (same id) keeping the first.
  const seen = new Set<string>();
  const deduped = routes.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return deduped.slice(0, limit);
}

export { enumeratePaths } from "./graph";
