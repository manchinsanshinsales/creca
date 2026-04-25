import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

export const PointTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  monetaryValuePerPoint: z.number().positive(),
  notes: z.string().optional(),
});
export type PointType = z.infer<typeof PointTypeSchema>;

export const RewardSchema = z.object({
  pointTypeId: z.string(),
  rate: z.number().min(0),
  per: z.number().positive(),
});
export type Reward = z.infer<typeof RewardSchema>;

export const ChargeEdgeSchema = z.object({
  fromMethodId: z.string(),
  earnsPoints: z.boolean().default(false),
  note: z.string().optional(),
});
export type ChargeEdge = z.infer<typeof ChargeEdgeSchema>;

export const PaymentMethodKindSchema = z.enum([
  "credit",
  "debit",
  "prepaid",
  "emoney",
  "qr",
]);
export type PaymentMethodKind = z.infer<typeof PaymentMethodKindSchema>;

export const PaymentMethodSchema = z.object({
  id: z.string(),
  kind: PaymentMethodKindSchema,
  brand: z.string(),
  issuer: z.string(),
  displayName: z.string(),
  baseReward: RewardSchema.nullable(),
  chargeableFrom: z.array(ChargeEdgeSchema).default([]),
  canPayDirectly: z.boolean().default(true),
  notes: z.string().optional(),
});
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const StoreCategorySchema = z.enum([
  "convenience",
  "fastfood",
  "cafe",
  "restaurant",
  "supermarket",
  "drugstore",
  "transit",
  "ecommerce",
  "other",
]);
export type StoreCategory = z.infer<typeof StoreCategorySchema>;

export const StoreSchema = z.object({
  id: z.string(),
  chain: z.string(),
  category: StoreCategorySchema,
  acceptedMethodIds: z.array(z.string()),
  aliases: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type Store = z.infer<typeof StoreSchema>;

// A BonusRule fires on an "action" — either paying at a store, or charging one method from another.
// Generalized from the earlier store-only model so campaigns like "今月 Kyash → Suica チャージで +1%" can be expressed.
export const PayTriggerSchema = z.object({
  kind: z.literal("pay"),
  methodId: z.string(),
  storeIds: z.union([z.array(z.string()), z.literal("*")]),
  viaMethodId: z.string().optional(),
});

export const ChargeTriggerSchema = z.object({
  kind: z.literal("charge"),
  fromMethodId: z.string(),
  toMethodId: z.string(),
});

export const BonusTriggerSchema = z.discriminatedUnion("kind", [
  PayTriggerSchema,
  ChargeTriggerSchema,
]);
export type BonusTrigger = z.infer<typeof BonusTriggerSchema>;

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const BonusRuleSchema = z.object({
  id: z.string(),
  trigger: BonusTriggerSchema,
  reward: RewardSchema,
  stacking: z.enum(["replace", "add"]),
  monthlyCapYen: z.number().positive().optional(),
  monthlyCapPoints: z.number().positive().optional(),
  validFrom: IsoDateSchema.optional(),
  validTo: IsoDateSchema.optional(),
  source: z.string().optional(),
  label: z.string().optional(),
});
export type BonusRule = z.infer<typeof BonusRuleSchema>;

export const UserWalletSchema = z.object({
  ownedMethodIds: z.array(z.string()).default([]),
  preferredPointTypeIds: z.array(z.string()).default([]),
});
export type UserWallet = z.infer<typeof UserWalletSchema>;

export const ManifestSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  generatedAt: z.string(),
  version: z.string(),
  sources: z.array(z.string()).default([]),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export const DataBundleSchema = z.object({
  manifest: ManifestSchema,
  pointTypes: z.array(PointTypeSchema),
  paymentMethods: z.array(PaymentMethodSchema),
  stores: z.array(StoreSchema),
  bonusRules: z.array(BonusRuleSchema),
});
export type DataBundle = z.infer<typeof DataBundleSchema>;
