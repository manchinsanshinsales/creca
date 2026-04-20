import { describe, expect, it } from "vitest";
import {
  BonusRuleSchema,
  PaymentMethodSchema,
  PointTypeSchema,
  StoreSchema,
  UserWalletSchema,
} from "@/schemas";

describe("schemas", () => {
  it("PointTypeSchema rejects zero monetary value", () => {
    expect(() =>
      PointTypeSchema.parse({ id: "x", name: "x", issuer: "x", monetaryValuePerPoint: 0 }),
    ).toThrow();
  });

  it("PaymentMethodSchema accepts null baseReward for post-pay wrappers", () => {
    expect(() =>
      PaymentMethodSchema.parse({
        id: "id_x",
        kind: "emoney",
        brand: "x",
        issuer: "x",
        displayName: "x",
        baseReward: null,
        chargeableFrom: [{ fromMethodId: "c" }],
        canPayDirectly: true,
      }),
    ).not.toThrow();
  });

  it("BonusRuleSchema accepts both pay and charge triggers", () => {
    expect(() =>
      BonusRuleSchema.parse({
        id: "p",
        trigger: { kind: "pay", methodId: "m", storeIds: "*" },
        reward: { pointTypeId: "p", rate: 1, per: 100 },
        stacking: "add",
      }),
    ).not.toThrow();
    expect(() =>
      BonusRuleSchema.parse({
        id: "c",
        trigger: { kind: "charge", fromMethodId: "a", toMethodId: "b" },
        reward: { pointTypeId: "p", rate: 1, per: 100 },
        stacking: "replace",
      }),
    ).not.toThrow();
  });

  it("StoreSchema requires a known category", () => {
    expect(() =>
      StoreSchema.parse({
        id: "s",
        chain: "c",
        category: "invalid",
        acceptedMethodIds: [],
      }),
    ).toThrow();
  });

  it("UserWalletSchema fills defaults", () => {
    const w = UserWalletSchema.parse({});
    expect(w.ownedMethodIds).toEqual([]);
    expect(w.preferredPointTypeIds).toEqual([]);
  });
});
