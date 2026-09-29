export const TIERS = ['T0', 'T1', 'T2', 'T3', 'T4'] as const;
export type Tier = (typeof TIERS)[number];

const EXPECTED_ENGINES: Record<Tier, string> = {
  T0: 'deterministic',
  T1: 'local',
  T2: 'cloud-economy',
  T3: 'cloud-premium',
  T4: 'human',
};

export interface RoutingPolicy {
  version: number;
  productionEnabled: false;
  routes: Record<Tier, { engine: string }>;
}

export interface RouteRequest {
  tier: Tier;
  maximumTier: Tier;
  budgetUsd: number;
  estimatedCostUsd: number;
  unavailableTiers: Tier[];
  fallbackTiers: Tier[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asTier(value: unknown, field: string): Tier {
  if (typeof value !== 'string' || !TIERS.includes(value as Tier)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return value as Tier;
}
function finiteNonNegative(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return value;
}

function tierList(value: unknown, field: string): Tier[] {
  if (!Array.isArray(value)) throw new Error(`INVALID_${field.toUpperCase()}`);
  return value.map(item => asTier(item, field));
}

function validatePolicy(value: unknown): asserts value is RoutingPolicy {
  if (!isRecord(value)) throw new Error('INVALID_POLICY');
  if (!Number.isInteger(value.version) || Number(value.version) <= 0) throw new Error('INVALID_POLICY_VERSION');
  if (value.productionEnabled !== false || !isRecord(value.routes)) throw new Error('INVALID_POLICY');
  const keys = Object.keys(value.routes);
  if (keys.length !== TIERS.length || !TIERS.every(tier => keys.includes(tier))) throw new Error('INVALID_POLICY_ROUTES');
  for (const tier of TIERS) {
    const route = value.routes[tier];
    if (!isRecord(route) || route.engine !== EXPECTED_ENGINES[tier]) throw new Error('INVALID_POLICY_ROUTE');
  }
}

export function route(input: unknown, policy: unknown): { tier: Tier; engine: string } {
  validatePolicy(policy);
  if (!isRecord(input)) throw new Error('INVALID_REQUEST');

  const tier = asTier(input.tier, 'tier');
  const maximumTier = asTier(input.maximumTier, 'maximumTier');
  const budgetUsd = finiteNonNegative(input.budgetUsd, 'budgetUsd');
  const estimatedCostUsd = finiteNonNegative(input.estimatedCostUsd, 'estimatedCostUsd');
  const unavailableTiers = tierList(input.unavailableTiers, 'unavailableTiers');
  const fallbackTiers = tierList(input.fallbackTiers, 'fallbackTiers');
  const requestedIndex = TIERS.indexOf(tier);
  const ceilingIndex = TIERS.indexOf(maximumTier);
  if (requestedIndex > ceilingIndex) throw new Error('TIER_CEILING_EXCEEDED');
  if (estimatedCostUsd > budgetUsd) throw new Error('BUDGET_EXCEEDED');

  let selected = tier;
  if (unavailableTiers.includes(tier)) {
    if (tier === 'T4') throw new Error('HUMAN_TIER_UNAVAILABLE');
    const fallback = fallbackTiers.find(candidate =>
      !unavailableTiers.includes(candidate) &&
      TIERS.indexOf(candidate) <= ceilingIndex &&
      TIERS.indexOf(candidate) < requestedIndex
    );
    if (!fallback) throw new Error('NO_SAFE_FALLBACK');
    selected = fallback;
  }

  return { tier: selected, engine: policy.routes[selected].engine };
}
