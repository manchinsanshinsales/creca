import type { BonusRule, DataBundle, PaymentMethod, PointType, Reward, UserWallet } from "@/schemas";

export type Hop =
  | { kind: "charge"; from: PaymentMethod; to: PaymentMethod }
  | { kind: "pay"; method: PaymentMethod; viaMethod?: PaymentMethod };

export type PointsEarned = {
  pointTypeId: string;
  points: number;
  yenValue: number;
  via: string;
};

export type RewardBreakdown = {
  appliedRuleIds: string[];
  cappedNotice?: string;
  earned: PointsEarned[];
};

export type RankedRoute = {
  id: string;
  hops: Hop[];
  effectiveYen: number;
  effectiveRate: number;
  breakdown: RewardBreakdown[];
  totalByPointType: Record<string, number>;
  totalYenByPointType: Record<string, number>;
  expiringBonus?: string;
  capHints: string[];
};

export type RecommendInput = {
  wallet: UserWallet;
  storeId: string;
  db: DataBundle;
  now?: Date;
  amountYen?: number;
  maxHops?: number;
  limit?: number;
};

export type ComputeContext = {
  pointTypes: Map<string, PointType>;
  methods: Map<string, PaymentMethod>;
  bonusRules: BonusRule[];
  now: Date;
};

export type { Reward };
