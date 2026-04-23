import type {
  BonusRule,
  PaymentMethod,
  Reward,
  Store,
} from "@/schemas";
import type { ComputeContext, Hop, PointsEarned, RewardBreakdown } from "./types";

function parseLocalDayStart(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function parseLocalDayEnd(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export function isRuleActive(rule: BonusRule, now: Date): boolean {
  if (rule.validFrom && parseLocalDayStart(rule.validFrom) > now.getTime()) return false;
  if (rule.validTo && parseLocalDayEnd(rule.validTo) < now.getTime()) return false;
  return true;
}

export function earnedFromReward(
  reward: Reward,
  amountYen: number,
  monetaryValuePerPoint: number,
  via: string,
): PointsEarned {
  const buckets = Math.floor(amountYen / reward.per);
  const points = buckets * reward.rate;
  const yenValue = points * monetaryValuePerPoint;
  return { pointTypeId: reward.pointTypeId, points, yenValue, via };
}

function findPayRules(
  rules: BonusRule[],
  method: PaymentMethod,
  store: Store,
  upstreamMethodIds: string[],
  now: Date,
): BonusRule[] {
  return rules.filter((r) => {
    if (r.trigger.kind !== "pay") return false;
    if (r.trigger.methodId !== method.id) return false;
    if (r.trigger.storeIds !== "*" && !r.trigger.storeIds.includes(store.id)) return false;
    if (r.trigger.viaMethodId) {
      // viaMethodId requires that the upstream chain includes that method id
      // OR the pay method itself has chargeableFrom pointing at it (i.e., Apple/Google Pay iD etc.)
      const chainIds = new Set([method.id, ...upstreamMethodIds]);
      if (!chainIds.has(r.trigger.viaMethodId)) return false;
    }
    if (!isRuleActive(r, now)) return false;
    return true;
  });
}

function findChargeRules(
  rules: BonusRule[],
  from: PaymentMethod,
  to: PaymentMethod,
  now: Date,
): BonusRule[] {
  return rules.filter((r) => {
    if (r.trigger.kind !== "charge") return false;
    if (r.trigger.fromMethodId !== from.id) return false;
    if (r.trigger.toMethodId !== to.id) return false;
    if (!isRuleActive(r, now)) return false;
    return true;
  });
}

// Given a set of applicable rules + the method's baseReward, apply stacking semantics.
// - Start with baseReward (if any) as the initial "earned" list.
// - If any rule has stacking "replace", the best-value replace-rule REPLACES the base.
// - All "add" rules add on top.
// monetaryValuePerPoint is used to compare replace candidates by yen.
function applyStacking(
  base: Reward | null,
  rules: BonusRule[],
  amountYen: number,
  pointValue: (pointTypeId: string) => number,
  via: string,
): { earned: PointsEarned[]; appliedRuleIds: string[] } {
  const replaces = rules.filter((r) => r.stacking === "replace");
  const adds = rules.filter((r) => r.stacking === "add");

  // Pick the best replace rule by yen value. A replace rule models a specific condition
  // under which the card's default reward does NOT apply — so when a replace rule matches,
  // it unconditionally replaces the base (even if the base is numerically higher).
  let bestReplace: { rule: BonusRule; earned: PointsEarned } | null = null;
  for (const r of replaces) {
    const e = earnedFromReward(r.reward, amountYen, pointValue(r.reward.pointTypeId), via);
    if (!bestReplace || e.yenValue > bestReplace.earned.yenValue) {
      bestReplace = { rule: r, earned: e };
    }
  }

  const earned: PointsEarned[] = [];
  const appliedRuleIds: string[] = [];

  if (bestReplace) {
    earned.push(bestReplace.earned);
    appliedRuleIds.push(bestReplace.rule.id);
  } else if (base) {
    earned.push(earnedFromReward(base, amountYen, pointValue(base.pointTypeId), via));
  }

  for (const r of adds) {
    const e = earnedFromReward(r.reward, amountYen, pointValue(r.reward.pointTypeId), via);
    if (e.points > 0) {
      earned.push(e);
      appliedRuleIds.push(r.id);
    }
  }

  return { earned, appliedRuleIds };
}

export function computeHopRewards(
  hop: Hop,
  upstreamMethodIds: string[],
  amountYen: number,
  store: Store,
  ctx: ComputeContext,
): RewardBreakdown {
  const pointValue = (id: string) => ctx.pointTypes.get(id)?.monetaryValuePerPoint ?? 1;

  if (hop.kind === "pay") {
    const rules = findPayRules(ctx.bonusRules, hop.method, store, upstreamMethodIds, ctx.now);
    const { earned, appliedRuleIds } = applyStacking(
      hop.method.baseReward ?? null,
      rules,
      amountYen,
      pointValue,
      `pay:${hop.method.id}`,
    );
    const capHint = rules.find((r) => r.monthlyCapPoints || r.monthlyCapYen);
    return {
      earned,
      appliedRuleIds,
      cappedNotice: capHint
        ? `月間上限あり (${capHint.monthlyCapPoints ? `${capHint.monthlyCapPoints}pt` : `¥${capHint.monthlyCapYen}`})`
        : undefined,
    };
  }

  // Charge hop: award earned-on-charge if edge says so; apply any charge BonusRule via stacking.
  const edge = hop.to.chargeableFrom.find((e) => e.fromMethodId === hop.from.id);
  const rules = findChargeRules(ctx.bonusRules, hop.from, hop.to, ctx.now);

  // Default "base" reward on charge = the `from` card's baseReward if earnsPoints is true.
  let base: Reward | null = null;
  if (edge?.earnsPoints && hop.from.baseReward) {
    base = hop.from.baseReward;
  }

  const { earned, appliedRuleIds } = applyStacking(
    base,
    rules,
    amountYen,
    pointValue,
    `charge:${hop.from.id}->${hop.to.id}`,
  );
  const capHint = rules.find((r) => r.monthlyCapPoints || r.monthlyCapYen);
  return {
    earned,
    appliedRuleIds,
    cappedNotice: capHint
      ? `チャージ上限 (${capHint.monthlyCapPoints ? `${capHint.monthlyCapPoints}pt` : `¥${capHint.monthlyCapYen}`})`
      : undefined,
  };
}
