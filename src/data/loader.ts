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
  return cache;
}
