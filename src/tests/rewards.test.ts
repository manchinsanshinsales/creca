import { describe, expect, it } from "vitest";
import { isRuleActive } from "@/engine/rewards";
import type { BonusRule } from "@/schemas";

const baseRule = (extras: Partial<BonusRule> = {}): BonusRule => ({
  id: "test",
  trigger: { kind: "pay", methodId: "x", storeIds: "*" },
  reward: { pointTypeId: "p", rate: 1, per: 100 },
  stacking: "add",
  ...extras,
});

describe("isRuleActive — local-day boundary handling (timezone bug fix)", () => {
  it("rule is active at local midnight on validFrom date", () => {
    const rule = baseRule({ validFrom: "2024-04-01" });
    const localMidnight = new Date(2024, 3, 1, 0, 0, 0);
    expect(isRuleActive(rule, localMidnight)).toBe(true);
  });

  it("rule is NOT active at local 23:59:59 on the day before validFrom", () => {
    const rule = baseRule({ validFrom: "2024-04-01" });
    const dayBefore = new Date(2024, 2, 31, 23, 59, 59);
    expect(isRuleActive(rule, dayBefore)).toBe(false);
  });

  it("rule remains active at local 23:59:59 on validTo date (inclusive end-of-day)", () => {
    const rule = baseRule({ validTo: "2024-04-30" });
    const endOfDay = new Date(2024, 3, 30, 23, 59, 59, 999);
    expect(isRuleActive(rule, endOfDay)).toBe(true);
  });

  it("rule is NOT active at local 00:00:00 on the day after validTo", () => {
    const rule = baseRule({ validTo: "2024-04-30" });
    const nextDay = new Date(2024, 4, 1, 0, 0, 0);
    expect(isRuleActive(rule, nextDay)).toBe(false);
  });

  it("rule with both validFrom and validTo is active inside the window", () => {
    const rule = baseRule({ validFrom: "2024-04-01", validTo: "2024-04-30" });
    const inside = new Date(2024, 3, 15, 12, 0, 0);
    expect(isRuleActive(rule, inside)).toBe(true);
  });

  it("rule with no validFrom/validTo is always active", () => {
    expect(isRuleActive(baseRule(), new Date(1990, 0, 1))).toBe(true);
    expect(isRuleActive(baseRule(), new Date(2100, 11, 31))).toBe(true);
  });
});
