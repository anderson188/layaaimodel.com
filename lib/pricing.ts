/** Prepaid packs — same ladder as jevtypesafe.org ($5–$500, lower $/M at scale). */
export type CreditPack = {
  id: string;
  label: string;
  usd: number;
  tokens: number;
  ratePerM: number;
  badge?: string;
  rpm: number;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter_5", label: "Starter", usd: 5, tokens: 11_900_000, ratePerM: 0.42, badge: "Start", rpm: 60 },
  { id: "pack_10", label: "$10", usd: 10, tokens: 23_800_000, ratePerM: 0.42, rpm: 60 },
  { id: "pack_20", label: "$20", usd: 20, tokens: 47_600_000, ratePerM: 0.42, rpm: 90 },
  { id: "staging_50", label: "Staging", usd: 50, tokens: 142_900_000, ratePerM: 0.35, rpm: 120 },
  { id: "popular_100", label: "Popular", usd: 100, tokens: 400_000_000, ratePerM: 0.25, badge: "Popular", rpm: 120 },
  { id: "scale_250", label: "Scale", usd: 250, tokens: 1_136_400_000, ratePerM: 0.22, rpm: 180 },
  { id: "volume_500", label: "Volume", usd: 500, tokens: 2_500_000_000, ratePerM: 0.2, rpm: 240 },
];

export const ANON_FREE_TOOL_RUNS = 5;
export const MONTHLY_FREE_TOKENS = 10_000;
export const TYPICAL_TOKENS_PER_DECIDE = 952;

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function approxDecideCalls(tokens: number): number {
  return Math.floor(tokens / TYPICAL_TOKENS_PER_DECIDE);
}
