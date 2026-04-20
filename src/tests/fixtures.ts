import type { DataBundle } from "@/schemas";
import { DataBundleSchema } from "@/schemas";

import manifest from "@/data/v1/manifest.json";
import pointTypes from "@/data/v1/point-types.json";
import paymentMethods from "@/data/v1/payment-methods.json";
import stores from "@/data/v1/stores.json";
import bonusRules from "@/data/v1/bonus-rules.json";

export function loadFixtureBundle(): DataBundle {
  return DataBundleSchema.parse({
    manifest,
    pointTypes,
    paymentMethods,
    stores,
    bonusRules,
  });
}
