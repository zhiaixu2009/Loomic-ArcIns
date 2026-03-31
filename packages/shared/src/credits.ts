import { z } from "zod";

// ── Plan types ───────────────────────────────────────────────

export const subscriptionPlanSchema = z.enum([
  "free",
  "starter",
  "pro",
  "ultra",
  "business",
]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const billingPeriodSchema = z.enum(["monthly", "yearly"]);
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;

export const creditTransactionTypeSchema = z.enum([
  "subscription_grant",
  "daily_grant",
  "purchase",
  "generation_deduct",
  "generation_refund",
  "admin_adjustment",
  "bonus",
]);
export type CreditTransactionType = z.infer<typeof creditTransactionTypeSchema>;

// ── Plan configuration ───────────────────────────────────────

export interface PlanConfig {
  /** Plan identifier */
  plan: SubscriptionPlan;
  /** Monthly subscription credits (0 for free — uses daily instead) */
  monthlyCredits: number;
  /** Daily free credits (only for free plan) */
  dailyCredits: number;
  /** Max concurrent generation jobs */
  maxConcurrentJobs: number;
  /** Max image quality tier */
  maxResolution: "standard" | "hd" | "ultra";
  /** Max projects allowed */
  maxProjects: number;
  /** Max brand kits allowed */
  maxBrandKits: number;
  /** Whether watermark is applied to generated content */
  watermark: boolean;
  /** Monthly price in USD */
  monthlyPrice: number;
  /** Yearly price per month in USD */
  yearlyPrice: number;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    plan: "free",
    monthlyCredits: 0,
    dailyCredits: 50,
    maxConcurrentJobs: 1,
    maxResolution: "standard",
    maxProjects: 3,
    maxBrandKits: 1,
    watermark: true,
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  starter: {
    plan: "starter",
    monthlyCredits: 1200,
    dailyCredits: 0,
    maxConcurrentJobs: 2,
    maxResolution: "standard",
    maxProjects: 10,
    maxBrandKits: 3,
    watermark: false,
    monthlyPrice: 12,
    yearlyPrice: 9,
  },
  pro: {
    plan: "pro",
    monthlyCredits: 5000,
    dailyCredits: 0,
    maxConcurrentJobs: 4,
    maxResolution: "hd",
    maxProjects: 50,
    maxBrandKits: 10,
    watermark: false,
    monthlyPrice: 39,
    yearlyPrice: 29,
  },
  ultra: {
    plan: "ultra",
    monthlyCredits: 15000,
    dailyCredits: 0,
    maxConcurrentJobs: 8,
    maxResolution: "ultra",
    maxProjects: 200,
    maxBrandKits: 30,
    watermark: false,
    monthlyPrice: 99,
    yearlyPrice: 79,
  },
  business: {
    plan: "business",
    monthlyCredits: 50000,
    dailyCredits: 0,
    maxConcurrentJobs: 12,
    maxResolution: "ultra",
    maxProjects: -1, // unlimited
    maxBrandKits: 100,
    watermark: false,
    monthlyPrice: 249,
    yearlyPrice: 199,
  },
};

// ── Model access tiers ───────────────────────────────────────

/**
 * Minimum plan required to use each model.
 * Models not listed here default to "pro" access.
 */
export const MODEL_MIN_TIER: Record<string, SubscriptionPlan> = {
  // Image — free tier (basic 3)
  "google-official/gemini-2.5-flash-image": "free",
  "google-official/gemini-3.1-flash-image-preview": "free",
  // Replicate image models — all need at least starter
  "google/nano-banana-pro": "starter",
  "google/nano-banana-2": "starter",
  "google/nano-banana": "free",
  "google/imagen-4": "starter",
  "google/imagen-3": "starter",
  "openai/gpt-image-1.5": "starter",
  "openai/gpt-image-1": "starter",
  "black-forest-labs/flux-kontext-pro": "starter",
  "black-forest-labs/flux-kontext-max": "pro",
  "black-forest-labs/flux-1.1-pro": "starter",
  "black-forest-labs/flux-pro": "starter",
  "bytedance/seedream": "starter",
  "recraft/recraft-v3": "starter",
  // Video — basic 2 for starter
  "google-official/veo-3.1-generate-preview": "pro",
  // Replicate video models
  "kling/kling-2.6": "starter",
  "haiper/haiper-2.0": "starter",
  "runway/gen-4-turbo": "pro",
  "pika/pika-2.2": "pro",
};

const PLAN_ORDER: SubscriptionPlan[] = [
  "free",
  "starter",
  "pro",
  "ultra",
  "business",
];

/** Check if a given plan meets the minimum tier required for a model. */
export function canAccessModel(
  userPlan: SubscriptionPlan,
  modelId: string,
): boolean {
  const minTier = MODEL_MIN_TIER[modelId] ?? "pro";
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minTier);
}

/** Get the plan config for a given plan. */
export function getPlanConfig(plan: SubscriptionPlan): PlanConfig {
  return PLAN_CONFIGS[plan];
}

// ── Model credit costs ──────────────────────────────────────

export type ImageQualityLevel = "standard" | "hd" | "ultra";

export interface ImageModelCost {
  standard: number;
  hd: number;
  ultra: number;
}

export interface VideoModelCost {
  /** Base cost per generation (varies by duration/resolution) */
  base: number;
  /** Additional cost per second beyond base duration */
  perSecond?: number;
}

/**
 * Credit costs per image generation, by model and quality.
 * Models not listed default to { standard: 5, hd: 10, ultra: 20 }.
 */
export const IMAGE_MODEL_COSTS: Record<string, ImageModelCost> = {
  // Google Official
  "google-official/gemini-2.5-flash-image": {
    standard: 5,
    hd: 10,
    ultra: 20,
  },
  "google-official/gemini-3.1-flash-image-preview": {
    standard: 5,
    hd: 10,
    ultra: 20,
  },
  // Replicate — Google models
  "google/nano-banana-pro": { standard: 6, hd: 10, ultra: 18 },
  "google/nano-banana-2": { standard: 4, hd: 8, ultra: 12 },
  "google/nano-banana": { standard: 5, hd: 10, ultra: 20 },
  "google/imagen-4": { standard: 5, hd: 10, ultra: 20 },
  "google/imagen-3": { standard: 5, hd: 10, ultra: 20 },
  // Replicate — OpenAI
  "openai/gpt-image-1.5": { standard: 4, hd: 8, ultra: 16 },
  "openai/gpt-image-1": { standard: 5, hd: 10, ultra: 20 },
  // Replicate — BFL
  "black-forest-labs/flux-kontext-pro": { standard: 8, hd: 12, ultra: 20 },
  "black-forest-labs/flux-kontext-max": { standard: 12, hd: 18, ultra: 30 },
  "black-forest-labs/flux-1.1-pro": { standard: 4, hd: 8, ultra: 14 },
  "black-forest-labs/flux-pro": { standard: 4, hd: 8, ultra: 14 },
  // Replicate — ByteDance
  "bytedance/seedream": { standard: 2, hd: 4, ultra: 8 },
  // Replicate — Recraft
  "recraft/recraft-v3": { standard: 5, hd: 10, ultra: 18 },
};

const DEFAULT_IMAGE_COST: ImageModelCost = {
  standard: 5,
  hd: 10,
  ultra: 20,
};

/**
 * Credit costs per video generation by model.
 * Base cost is for the cheapest configuration; actual cost scales with
 * duration and resolution.
 */
export const VIDEO_MODEL_COSTS: Record<string, VideoModelCost> = {
  "google-official/veo-3.1-generate-preview": { base: 200 },
  "kling/kling-2.6": { base: 25, perSecond: 5 },
  "haiper/haiper-2.0": { base: 40 },
  "runway/gen-4-turbo": { base: 80 },
  "pika/pika-2.2": { base: 40 },
};

const DEFAULT_VIDEO_COST: VideoModelCost = { base: 80 };

/** Calculate the credit cost for an image generation. */
export function getImageCreditCost(
  modelId: string,
  quality: ImageQualityLevel = "hd",
): number {
  const costs = IMAGE_MODEL_COSTS[modelId] ?? DEFAULT_IMAGE_COST;
  return costs[quality];
}

/** Calculate the credit cost for a video generation. */
export function getVideoCreditCost(
  modelId: string,
  durationSeconds?: number,
): number {
  const costs = VIDEO_MODEL_COSTS[modelId] ?? DEFAULT_VIDEO_COST;
  if (costs.perSecond && durationSeconds && durationSeconds > 5) {
    return costs.base + (durationSeconds - 5) * costs.perSecond;
  }
  return costs.base;
}

// ── Resolution guard ─────────────────────────────────────────

const RESOLUTION_ORDER: ImageQualityLevel[] = ["standard", "hd", "ultra"];

/** Check if a plan allows a given quality level. */
export function canUseResolution(
  plan: SubscriptionPlan,
  quality: ImageQualityLevel,
): boolean {
  const config = PLAN_CONFIGS[plan];
  return (
    RESOLUTION_ORDER.indexOf(quality) <=
    RESOLUTION_ORDER.indexOf(config.maxResolution)
  );
}

// ── API schemas ──────────────────────────────────────────────

export const creditBalanceResponseSchema = z.object({
  balance: z.number().int(),
  plan: subscriptionPlanSchema,
  dailyClaimed: z.boolean(),
  limits: z.object({
    maxConcurrentJobs: z.number().int(),
    maxResolution: z.string(),
    monthlyCredits: z.number().int(),
    dailyCredits: z.number().int(),
  }),
});
export type CreditBalanceResponse = z.infer<typeof creditBalanceResponseSchema>;

export const creditTransactionSchema = z.object({
  id: z.string().uuid(),
  transaction_type: creditTransactionTypeSchema,
  amount: z.number().int(),
  balance_after: z.number().int(),
  job_id: z.string().uuid().nullable(),
  description: z.string().nullable(),
  created_at: z.string(),
});
export type CreditTransaction = z.infer<typeof creditTransactionSchema>;

export const creditTransactionsResponseSchema = z.object({
  transactions: z.array(creditTransactionSchema),
});
export type CreditTransactionsResponse = z.infer<
  typeof creditTransactionsResponseSchema
>;

export const claimDailyResponseSchema = z.object({
  success: z.boolean(),
  balance: z.number().int().optional(),
  message: z.string().optional(),
});
export type ClaimDailyResponse = z.infer<typeof claimDailyResponseSchema>;

export const setPlanRequestSchema = z.object({
  plan: subscriptionPlanSchema,
});
export type SetPlanRequest = z.infer<typeof setPlanRequestSchema>;

// ── Annotated model (returned by model list APIs) ────────────

export const annotatedModelSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string(),
  iconUrl: z.string().optional(),
  provider: z.string(),
  accessible: z.boolean(),
  creditCost: z.number().int(),
  minTier: subscriptionPlanSchema,
});
export type AnnotatedModel = z.infer<typeof annotatedModelSchema>;
