import {
  DataBundleSchema,
  type DataBundle,
} from "@/schemas";

import manifest from "./v1/manifest.json";
import pointTypes from "./v1/point-types.json";
import paymentMethods from "./v1/payment-methods.json";
import stores from "./v1/stores.json";
import bonusRules from "./v1/bonus-rules.json";

export const CURRENT_DATA_VERSION = "v1";

function validateReferentialIntegrity(bundle: DataBundle): void {
  const methodIds = new Set(bundle.paymentMethods.map((m) => m.id));
  const warnings: string[] = [];

  for (const store of bundle.stores) {
    for (const id of store.acceptedMethodIds) {
      if (!methodIds.has(id)) {
        warnings.push(`Store "${store.id}": acceptedMethodIds に不明な methodId "${id}"`);
      }
    }
  }

  for (const rule of bundle.bonusRules) {
    if (rule.trigger.kind === "pay" && !methodIds.has(rule.trigger.methodId)) {
      warnings.push(`BonusRule "${rule.id}": trigger.methodId "${rule.trigger.methodId}" が存在しない`);
    }
    if (rule.trigger.kind === "charge") {
      if (!methodIds.has(rule.trigger.fromMethodId)) {
        warnings.push(`BonusRule "${rule.id}": fromMethodId "${rule.trigger.fromMethodId}" が存在しない`);
      }
      if (!methodIds.has(rule.trigger.toMethodId)) {
        warnings.push(`BonusRule "${rule.id}": toMethodId "${rule.trigger.toMethodId}" が存在しない`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn("[creca] 参照整合性エラー:\n" + warnings.join("\n"));
  }
}

let cache: DataBundle | null = null;

export function loadData(): DataBundle {
  if (cache) return cache;
  cache = DataBundleSchema.parse({
    manifest,
    pointTypes,
    paymentMethods,
    stores,
    bonusRules,
  });
  validateReferentialIntegrity(cache);
  return cache;
}
