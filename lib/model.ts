// The blue-chip token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// This entry prices pre-token protocols the way a cautious allocator would: not at what the median
// comparable trades for, but at the lower quartile of what comparable launches actually sustain, and
// only after the protocol itself has proved scale, seasoning and reach. The model is "bluechip-1":
//
//   multiple   = the p25 (lower quartile) of mcap/TVL among the snapshot's own tokenised protocols at
//                scale (TVL at or above $25M), read by category where at least 5 peers price one, else
//                by category family, else by the whole market; shrunk toward the market's p25 by peer
//                count (weight n/(n+6)) and clamped to [0.005, 0.60]. CEX-category peers never price a
//                protocol: an exchange token's ratio prices the exchange's whole business against
//                custodial balances, not a protocol launch.
//   scale      = maturity x TVL scale x reach, the dominant adjustment:
//                  maturity = 0.72 + 0.40 x min(age_days, 1460)/1460   (unknown age counts as 365)
//                  tvlscale = clamp(0.80 + 0.12 x log10(TVL / $50M), 0.68, 1.15)
//                  reach    = 1 + 0.015 x min(chains - 1, 10)
//   momentum   = 1 + clamp(change_7d, -20, +20) x 0.005, a small tilt only: at most +/-10%.
//   implied    = max(1, round(TVL x multiple x scale x momentum))
//   range      = the same formula at the peer group's shrunk p10 (low) and shrunk median (high): the
//                central claim sits at the lower quartile on purpose, and the range shows what the
//                median peer would imply instead.
//
// Every row also carries a risk tier read off the same record: Core (TVL >= $1B, listed >= 540 days,
// on >= 3 chains), Established (TVL >= $150M, listed >= 365 days), else Emerging, each with the facts
// that put it there stated in words. No protocol name is ever special-cased in the pricing: the same
// function scores every row. The board covers the whole watchlist, adds the pre-token majors at or
// above the floor that pass every test of the house's watchlist rule the snapshot itself can show,
// and fills the rest with the largest early protocols below the floor passing the same tests.
// Wrapped, staked or bridged products of assets that already trade, and exchange balances, are
// never ranked. A protocol is described as one that records no token, never as one that has none.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard's method view states them. */
export interface ModelConstants {
  peer_floor_usd: number;
  peer_min_group: number;
  shrink_k: number;
  multiple_min: number;
  multiple_max: number;
  maturity_base: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  tvl_scale_base: number;
  tvl_scale_per_decade: number;
  tvl_scale_min: number;
  tvl_scale_max: number;
  reach_per_chain: number;
  reach_max_extra_chains: number;
  momentum_per_pct: number;
  momentum_clamp_pct: number;
  core_tvl_usd: number;
  core_age_days: number;
  core_chains: number;
  established_tvl_usd: number;
  established_age_days: number;
}

export const MODEL: ModelConstants = {
  peer_floor_usd: 25_000_000,
  peer_min_group: 5,
  shrink_k: 6,
  multiple_min: 0.005,
  multiple_max: 0.6,
  maturity_base: 0.72,
  maturity_range: 0.4,
  maturity_days: 1460,
  unknown_age_days: 365,
  tvl_scale_base: 0.8,
  tvl_scale_per_decade: 0.12,
  tvl_scale_min: 0.68,
  tvl_scale_max: 1.15,
  reach_per_chain: 0.015,
  reach_max_extra_chains: 10,
  momentum_per_pct: 0.005,
  momentum_clamp_pct: 20,
  core_tvl_usd: 1_000_000_000,
  core_age_days: 540,
  core_chains: 3,
  established_tvl_usd: 150_000_000,
  established_age_days: 365,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'bluechip-1';

/** The board's total size: the watchlist, the overlooked majors, then early rows by TVL. */
export const BOARD_ROWS = 190;

/** How many live-token protocols the Priced peers view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** A protocol's risk tier under this model. */
export type Tier = 'Core' | 'Established' | 'Emerging';

/** Which part of the board a row came from. */
export type Section = 'Watchlist' | 'Overlooked major' | 'Early radar';

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  section: Section;
  tier: Tier;
  tier_reason: string;
  age_days: number | null;
  implied_value_usd: number;
  range_low_usd: number;
  range_high_usd: number;
  model: {
    peer_group: string;
    peer_count: number;
    peer_p25: number;
    multiple: number;
    maturity_multiplier: number;
    tvl_scale_multiplier: number;
    reach_multiplier: number;
    momentum_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's view of one row: everything the page renders, farm plan included. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  section: Section;
  tier: Tier;
  tier_reason: string;
  implied_value_usd: number;
  range_low_usd: number;
  range_high_usd: number;
  peer_group: string;
  peer_count: number;
  peer_p25: number;
  multiple: number;
  maturity_multiplier: number;
  tvl_scale_multiplier: number;
  reach_multiplier: number;
  momentum_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  ratio: number | null;
  at_scale: boolean;
}

/** One peer group the model priced from, for the method view's evidence table. */
export interface PeerGroup {
  name: string;
  kind: 'category' | 'family' | 'market';
  peers: number;
  p10: number;
  p25: number;
  median: number;
  shrunk_p25: number;
}

/** Everything the dashboard needs: the board, the live set, the peer evidence, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  majors_size: number;
  tier_counts: Record<Tier, number>;
  peers: PeerGroup[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The q-quantile of a non-empty list, by linear interpolation between closest ranks. */
function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 1) return s[0]!;
  const at = (s.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo]! + (s[hi]! - s[lo]!) * (at - lo);
}

/** Category families: the fallback pricing group when a category alone prices too few peers. */
const FAMILIES: Record<string, string[]> = {
  'Vaults & allocators': ['Risk Curators', 'Onchain Capital Allocator', 'Yield', 'Yield Aggregator', 'Indexes', 'Farm', 'Leveraged Farming', 'Liquidity Manager'],
  'Lending & credit': ['Lending', 'CDP', 'CDP Manager', 'Collateral Markets', 'Collateral Management', 'Uncollateralized Lending', 'Basis Trading', 'CeDeFi'],
  'Trading venues': ['Dexs', 'Derivatives', 'Options', 'Synthetics', 'Prediction Market', 'Interest Rate Derivatives', 'OTC Marketplace', 'NFT Marketplace', 'Launchpad'],
  'Staking & restaking': ['Liquid Staking', 'Restaking', 'Liquid Restaking', 'Staking Pool', 'Restaked BTC', 'Anchor BTC', 'Decentralized BTC'],
  'Bridges, chains & payments': ['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Chain', 'Payments', 'Crypto Card Issuer'],
  'Money, RWA & stablecoins': ['RWA', 'Stablecoin Wrapper', 'Dual-Token Stablecoin', 'Algo-Stables', 'Stablecoin Issuer', 'Reserve Currency'],
};

const FAMILY_OF = new Map<string, string>();
for (const [family, cats] of Object.entries(FAMILIES)) for (const c of cats) FAMILY_OF.set(c, family);

/** A priced peer: a protocol whose token already trades, at a scale where its ratio means something. */
function isPeer(p: SnapshotProtocol, model: ModelConstants): boolean {
  return p.mcap_usd !== null && p.tvl_usd >= model.peer_floor_usd && p.category !== 'CEX';
}

/** The peer evidence: every pricing group with its raw quartiles and its shrunk p25. */
export interface PeerBook {
  market: number[];
  byCategory: Map<string, number[]>;
  byFamily: Map<string, number[]>;
  groups: PeerGroup[];
}

function buildPeerBook(snapshot: Snapshot, model: ModelConstants): PeerBook {
  const peers = snapshot.protocols.filter((p) => isPeer(p, model));
  const ratio = (p: SnapshotProtocol): number => p.mcap_usd! / p.tvl_usd;
  const market = peers.map(ratio);
  const byCategory = new Map<string, number[]>();
  const byFamily = new Map<string, number[]>();
  for (const p of peers) {
    if (p.category !== null) {
      const list = byCategory.get(p.category) ?? [];
      list.push(ratio(p));
      byCategory.set(p.category, list);
      const family = FAMILY_OF.get(p.category);
      if (family !== undefined) {
        const fl = byFamily.get(family) ?? [];
        fl.push(ratio(p));
        byFamily.set(family, fl);
      }
    }
  }
  const shrink = (values: number[], q: number): number => {
    const w = values.length / (values.length + model.shrink_k);
    return w * quantile(values, q) + (1 - w) * quantile(market, q);
  };
  const groups: PeerGroup[] = [];
  const addGroup = (name: string, kind: PeerGroup['kind'], values: number[]): void => {
    groups.push({
      name,
      kind,
      peers: values.length,
      p10: round4(quantile(values, 0.1)),
      p25: round4(quantile(values, 0.25)),
      median: round4(quantile(values, 0.5)),
      shrunk_p25: round4(shrink(values, 0.25)),
    });
  };
  for (const [name, values] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) addGroup(name, 'category', values);
  for (const [name, values] of [...byFamily.entries()].sort((a, b) => b[1].length - a[1].length)) addGroup(name, 'family', values);
  addGroup('Whole market', 'market', market);
  return { market, byCategory, byFamily, groups };
}

/** The pricing group one protocol falls into: its category, else its family, else the market. */
function groupFor(p: SnapshotProtocol, book: PeerBook, model: ModelConstants): { name: string; values: number[] } {
  if (p.category !== null) {
    const cat = book.byCategory.get(p.category);
    if (cat !== undefined && cat.length >= model.peer_min_group) return { name: p.category, values: cat };
    const family = FAMILY_OF.get(p.category);
    if (family !== undefined) {
      const fam = book.byFamily.get(family);
      if (fam !== undefined && fam.length >= model.peer_min_group) return { name: family, values: fam };
    }
  }
  return { name: 'Whole market', values: book.market };
}

/** The three scale components and the momentum tilt for one protocol. */
export function scaleFactors(
  p: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { maturity: number; tvlScale: number; reach: number; momentum: number; age: number | null } {
  const age = ageDays(asOf, p.listed_at);
  const ageForModel = age ?? model.unknown_age_days;
  const maturity = model.maturity_base + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const decades = Math.log10(Math.max(p.tvl_usd, 1) / 50_000_000);
  const tvlScale = Math.min(model.tvl_scale_max, Math.max(model.tvl_scale_min, model.tvl_scale_base + decades * model.tvl_scale_per_decade));
  const reach = 1 + model.reach_per_chain * Math.min(Math.max(p.chains.length - 1, 0), model.reach_max_extra_chains);
  const change = Math.min(model.momentum_clamp_pct, Math.max(-model.momentum_clamp_pct, finite(p.change_7d, 0)));
  const momentum = 1 + change * model.momentum_per_pct;
  return { maturity, tvlScale, reach, momentum, age };
}

/** A compact dollar figure for prose: $2.75B, $499M, $57K. */
function money(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

/** The row's risk tier and the stated facts that put it there. */
export function tierFor(
  p: SnapshotProtocol,
  age: number | null,
  model: ModelConstants,
): { tier: Tier; reason: string } {
  const facts = `${money(p.tvl_usd)} of TVL, ${age === null ? 'listing age unreported' : `${age} days listed`}, on ${p.chains.length} chain${p.chains.length === 1 ? '' : 's'}`;
  if (p.tvl_usd >= model.core_tvl_usd && age !== null && age >= model.core_age_days && p.chains.length >= model.core_chains) {
    return {
      tier: 'Core',
      reason: `Core — ${facts}: scale, seasoning and reach all clear the Core bars ($1B TVL, ${model.core_age_days} days, ${model.core_chains} chains), so the lower-quartile price is applied without a fragility discount.`,
    };
  }
  if (p.tvl_usd >= model.established_tvl_usd && age !== null && age >= model.established_age_days) {
    const gap =
      p.tvl_usd < model.core_tvl_usd
        ? `below the $1B Core TVL bar`
        : age < model.core_age_days
          ? `short of the ${model.core_age_days}-day Core seasoning bar`
          : `on fewer than the ${model.core_chains} chains Core asks for`;
    return {
      tier: 'Established',
      reason: `Established — ${facts}: past the Established bars ($150M TVL, ${model.established_age_days} days) but ${gap}, so it sits one tier below Core.`,
    };
  }
  const gap =
    p.tvl_usd < model.established_tvl_usd && (age === null || age < model.established_age_days)
      ? `below both Established bars ($150M TVL, ${model.established_age_days} days)`
      : p.tvl_usd < model.established_tvl_usd
        ? `below the $150M Established TVL bar`
        : `short of the ${model.established_age_days}-day Established seasoning bar`;
  return {
    tier: 'Emerging',
    reason: `Emerging — ${facts}: ${gap}; the implied value is a lower-quartile claim on an unproven base, so size any farm as speculation, not as a core position.`,
  };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** The exchange names the house rule keeps off the board. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Categories the house rule never ranks: wrapped, staked or bridged products, and exchanges. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol passes every test of the house's watchlist rule that the snapshot itself can
 * show: pre-token, no excluded category, no version marker, no whole word wrapped, staked or staking,
 * and no exchange name at the front. The parent-protocol record is the one test the snapshot cannot
 * show, and the dashboard says so where it matters.
 */
export function passesVisibleTests(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !EXCLUDED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !/\b(wrapped|staked|staking)\b/i.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, { p: SnapshotProtocol; section: Section }>();
  // The watchlist is the floor: every slug, exactly as the house's list names it.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, { p, section: 'Watchlist' });
  }
  // The overlooked majors: at or above the floor, passing every visible test, left off the list only
  // by a record the snapshot does not carry.
  const majors = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && p.tvl_usd >= snapshot.floor_usd && passesVisibleTests(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1));
  for (const p of majors) chosen.set(p.slug, { p, section: 'Overlooked major' });
  // The early radar fills the board to its size with the largest remaining protocols below the floor.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && p.tvl_usd < snapshot.floor_usd && passesVisibleTests(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1))
    .slice(0, Math.max(0, BOARD_ROWS - chosen.size));
  for (const p of early) chosen.set(p.slug, { p, section: 'Early radar' });

  const book = buildPeerBook(snapshot, model);
  const shrinkQ = (values: number[], q: number): number => {
    const w = values.length / (values.length + model.shrink_k);
    return w * quantile(values, q) + (1 - w) * quantile(book.market, q);
  };
  const clampMultiple = (m: number): number => Math.min(model.multiple_max, Math.max(model.multiple_min, m));

  const scored = [...chosen.values()].map(({ p, section }) => {
    const group = groupFor(p, book, model);
    const f = scaleFactors(p, snapshot.as_of, model);
    const scale = f.maturity * f.tvlScale * f.reach;
    const multiple = clampMultiple(shrinkQ(group.values, 0.25));
    const lowMultiple = clampMultiple(shrinkQ(group.values, 0.1));
    const highMultiple = clampMultiple(shrinkQ(group.values, 0.5));
    const implied = Math.max(1, Math.round(p.tvl_usd * multiple * scale * f.momentum));
    const low = Math.max(1, Math.round(p.tvl_usd * lowMultiple * scale * f.momentum));
    const high = Math.max(implied, Math.round(p.tvl_usd * highMultiple * scale * f.momentum));
    const { tier, reason } = tierFor(p, f.age, model);
    return { p, section, group, f, scale, multiple, implied, low, high, tier, reason };
  });
  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : 1));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    section: s.section,
    tier: s.tier,
    tier_reason: s.reason,
    age_days: s.f.age,
    implied_value_usd: s.implied,
    range_low_usd: s.low,
    range_high_usd: s.high,
    model: {
      peer_group: s.group.name,
      peer_count: s.group.values.length,
      peer_p25: round4(quantile(s.group.values, 0.25)),
      multiple: round4(s.multiple),
      maturity_multiplier: round4(s.f.maturity),
      tvl_scale_multiplier: round4(s.f.tvlScale),
      reach_multiplier: round4(s.f.reach),
      momentum_multiplier: round4(s.f.momentum),
      age_days: s.f.age,
    },
    farm_steps: farmSteps(s.p, s.f.age, s.tier).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 200;
  if (p.tvl_usd >= 100_000_000) return 125;
  return 60;
}

/** How long to hold, from the tier: Core positions are kept through a full quarter. */
function holdDaysFor(tier: Tier): number {
  if (tier === 'Core') return 90;
  if (tier === 'Established') return 60;
  return 45;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} of USDC into a ${name} vault on ${chain}, choosing the vault whose underlying market you can name and check yourself.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} as a lender, and keep the health of the position visible on the protocol's own page.`;
  if (c.includes('dex') || c.includes('trading')) return `Provide $${capital} split evenly across a ${name} pool pair on ${chain}, in the pool with the deepest liquidity the app offers.`;
  if (c.includes('derivative') || c.includes('perpetual')) return `Deposit $${capital} of USDC as margin on ${name} and open one small, hedged position rather than a directional one.`;
  if (c.includes('prediction')) return `Fund $${capital} on ${name} and take small positions in its most liquid markets, sized so a total loss is acceptable.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} itself, then use the bridged funds in the destination app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token in the same wallet.`;
  if (c.includes('stable') || c.includes('rwa') || c.includes('money')) return `Mint or deposit $${capital} of the protocol's asset through ${name} on ${chain}, reading its redemption terms before you commit.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy NFT or receipt in the farming wallet.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} through its own app and keep the position open.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time, written for a cautious
 * farmer: verify the venue first, test the exit with small size, stay in the protocol's own contracts,
 * and keep records. The plan is derived from the protocol's own record (category, chains, TVL, tier),
 * except for the hand-written plans in HAND_PLANS below.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, tier: Tier): FarmStep[] {
  const hand = HAND_PLANS[p.slug];
  if (hand !== undefined) return hand;
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(tier);
  return [
    {
      text: `Open ${p.name}'s own app from the link on its DefiLlama page and bookmark it; never follow an app or claim link sent by social media or a search ad.`,
      cost: 'nothing',
      time: '10 minutes',
    },
    {
      text: `Set up a fresh wallet used only for ${p.name}, with its seed phrase written offline; fund it with no more than the position below plus gas.`,
      cost: 'under $3 of gas to fund',
      time: '10 minutes',
    },
    {
      text: `Make a $25 test deposit into ${p.name} on ${chain} and withdraw it in full, so you have seen the exit work before any real size goes in.`,
      cost: 'about $4 of gas for the round trip',
      time: '20 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Keep the position inside the own contracts of ${p.name} on ${chain}; do not route it through an aggregator or a wrapped copy, which would add a second protocol's risk on top.`,
      cost: 'no extra fee',
      time: '5 minutes to check the contract address against the official docs',
    },
    {
      text: `Make one qualifying action each week in ${p.name} — a deposit, a borrow, a swap or a vote — and log the wallet, dates and transaction hashes in a farm log.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold for at least ${hold} days, re-check the position and this row's tier monthly, and when you exit, withdraw to the same wallet you funded from.`,
      cost: 'gas only on exit',
      time: `${hold} days, then 15 minutes a month`,
    },
  ];
}

/**
 * Hand-written plans for the board's top rows, each written for the protocol itself and each putting
 * venue safety first: the canonical app, a small test of the exit, no wrappers, no leverage.
 * (Filled in for the model's own top 15 once the board is computed; keyed by slug.)
 */
export const HAND_PLANS: Record<string, FarmStep[]> = {};

/** The live-token protocols, by market cap, for the dashboard's Priced peers view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
      at_scale: p.tvl_usd >= MODEL.peer_floor_usd,
    }));
}

/** A board row's form for data.js: everything the page renders, farm plan included. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    section: row.section,
    tier: row.tier,
    tier_reason: row.tier_reason,
    implied_value_usd: row.implied_value_usd,
    range_low_usd: row.range_low_usd,
    range_high_usd: row.range_high_usd,
    peer_group: row.model.peer_group,
    peer_count: row.model.peer_count,
    peer_p25: row.model.peer_p25,
    multiple: row.model.multiple,
    maturity_multiplier: row.model.maturity_multiplier,
    tvl_scale_multiplier: row.model.tvl_scale_multiplier,
    reach_multiplier: row.model.reach_multiplier,
    momentum_multiplier: row.model.momentum_multiplier,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const book = buildPeerBook(snapshot, model);
  const tier_counts: Record<Tier, number> = { Core: 0, Established: 0, Emerging: 0 };
  for (const r of board) tier_counts[r.tier] += 1;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: board.filter((r) => r.section === 'Early radar').length,
    live_size: live.length,
    majors_size: board.filter((r) => r.section === 'Overlooked major').length,
    tier_counts,
    peers: book.groups,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} characters`;
    }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
