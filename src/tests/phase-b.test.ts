import { describe, expect, it } from "vitest";
import { recommend } from "@/engine/recommend";
import { loadFixtureBundle } from "./fixtures";

const db = loadFixtureBundle();
const NOW = new Date("2026-04-19T00:00:00Z");

describe("Phase B — requiredInterfaces propagation", () => {
  it("propagates Visa Touch / iD interfaces from smbc_nl_7p rule to the route", () => {
    const routes = recommend({
      wallet: { ownedMethodIds: ["smbc_nl"], preferredPointTypeIds: [] },
      storeId: "seven_eleven",
      db,
      now: NOW,
      amountYen: 1000,
    });
    const top = routes[0];
    expect(top.requiredInterfaces).toContain("touch");
    expect(top.requiredInterfaces).toContain("id");
  });

  it("returns empty requiredInterfaces when the applied rule has none specified", () => {
    const routes = recommend({
      wallet: { ownedMethodIds: ["aeon_card"], preferredPointTypeIds: [] },
      storeId: "aeon",
      db,
      now: NOW,
      amountYen: 1000,
    });
    expect(routes[0].requiredInterfaces).toEqual([]);
  });
});

describe("Phase B — minAmountYen filter", () => {
  it("applies a rule when amount meets the minimum", () => {
    const customDb = {
      ...db,
      bonusRules: [
        ...db.bonusRules,
        {
          id: "min_test",
          label: "test min 500",
          trigger: { kind: "pay" as const, methodId: "rakuten_card", storeIds: "*" as const },
          reward: { pointTypeId: "rakuten_point", rate: 5, per: 100 },
          stacking: "add" as const,
          minAmountYen: 500,
        },
      ],
    };
    const routes = recommend({
      wallet: { ownedMethodIds: ["rakuten_card"], preferredPointTypeIds: [] },
      storeId: "starbucks",
      db: customDb,
      now: NOW,
      amountYen: 1000,
    });
    expect(routes[0].breakdown.some((b) => b.appliedRuleIds.includes("min_test"))).toBe(true);
  });

  it("does NOT apply a rule when amount is below the minimum", () => {
    const customDb = {
      ...db,
      bonusRules: [
        ...db.bonusRules,
        {
          id: "min_test",
          label: "test min 500",
          trigger: { kind: "pay" as const, methodId: "rakuten_card", storeIds: "*" as const },
          reward: { pointTypeId: "rakuten_point", rate: 5, per: 100 },
          stacking: "add" as const,
          minAmountYen: 500,
        },
      ],
    };
    const routes = recommend({
      wallet: { ownedMethodIds: ["rakuten_card"], preferredPointTypeIds: [] },
      storeId: "starbucks",
      db: customDb,
      now: NOW,
      amountYen: 300,
    });
    expect(routes[0].breakdown.some((b) => b.appliedRuleIds.includes("min_test"))).toBe(false);
  });
});
