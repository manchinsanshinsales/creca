import { describe, expect, it } from "vitest";
import { loadFixtureBundle } from "./fixtures";

describe("seed data referential integrity", () => {
  const db = loadFixtureBundle();
  const methodIds = new Set(db.paymentMethods.map((m) => m.id));
  const pointIds = new Set(db.pointTypes.map((p) => p.id));
  const storeIds = new Set(db.stores.map((s) => s.id));

  it("all payment methods reference valid point types", () => {
    for (const m of db.paymentMethods) {
      if (m.baseReward) {
        expect(pointIds.has(m.baseReward.pointTypeId), `${m.id}.baseReward`).toBe(true);
      }
      for (const edge of m.chargeableFrom) {
        expect(methodIds.has(edge.fromMethodId), `${m.id}.chargeableFrom`).toBe(true);
      }
    }
  });

  it("all store accepted methods resolve", () => {
    for (const s of db.stores) {
      for (const id of s.acceptedMethodIds) {
        expect(methodIds.has(id), `${s.id} accepts ${id}`).toBe(true);
      }
    }
  });

  it("all bonus rules reference valid ids", () => {
    for (const r of db.bonusRules) {
      expect(pointIds.has(r.reward.pointTypeId), `rule ${r.id} reward pointType`).toBe(true);
      if (r.trigger.kind === "pay") {
        expect(methodIds.has(r.trigger.methodId), `rule ${r.id} pay method`).toBe(true);
        if (r.trigger.storeIds !== "*") {
          for (const sid of r.trigger.storeIds) {
            expect(storeIds.has(sid), `rule ${r.id} store ${sid}`).toBe(true);
          }
        }
        if (r.trigger.viaMethodId) {
          expect(
            methodIds.has(r.trigger.viaMethodId),
            `rule ${r.id} via ${r.trigger.viaMethodId}`,
          ).toBe(true);
        }
      } else {
        expect(methodIds.has(r.trigger.fromMethodId)).toBe(true);
        expect(methodIds.has(r.trigger.toMethodId)).toBe(true);
      }
    }
  });
});
