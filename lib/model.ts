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

/** A group's quantile shrunk toward the market's same quantile, by peer count. */
function shrunkQuantile(values: number[], market: number[], q: number, model: ModelConstants): number {
  const w = values.length / (values.length + model.shrink_k);
  return w * quantile(values, q) + (1 - w) * quantile(market, q);
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

/** One protocol's full pricing: the peer multiple, the factors, the implied value and its range. */
export interface Implied {
  groupName: string;
  groupSize: number;
  groupP25: number;
  multiple: number;
  maturity: number;
  tvlScale: number;
  reach: number;
  momentum: number;
  age: number | null;
  implied: number;
  low: number;
  high: number;
}

/**
 * The one pricing path every row takes: peer p25 multiple, dominant scale factor, small momentum
 * tilt. No name is special-cased; the same function scores the whole board.
 */
export function impliedFor(p: SnapshotProtocol, book: PeerBook, snapshot: Snapshot, model: ModelConstants): Implied {
  const group = groupFor(p, book, model);
  const f = scaleFactors(p, snapshot.as_of, model);
  const scale = f.maturity * f.tvlScale * f.reach;
  const clampM = (m: number): number => Math.min(model.multiple_max, Math.max(model.multiple_min, m));
  const multiple = clampM(shrunkQuantile(group.values, book.market, 0.25, model));
  const lowMultiple = clampM(shrunkQuantile(group.values, book.market, 0.1, model));
  const highMultiple = clampM(shrunkQuantile(group.values, book.market, 0.5, model));
  const implied = Math.max(1, Math.round(p.tvl_usd * multiple * scale * f.momentum));
  const low = Math.max(1, Math.round(p.tvl_usd * lowMultiple * scale * f.momentum));
  const high = Math.max(implied, Math.round(p.tvl_usd * highMultiple * scale * f.momentum));
  return {
    groupName: group.name,
    groupSize: group.values.length,
    groupP25: quantile(group.values, 0.25),
    multiple,
    maturity: f.maturity,
    tvlScale: f.tvlScale,
    reach: f.reach,
    momentum: f.momentum,
    age: f.age,
    implied,
    low,
    high,
  };
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
    age === null
      ? `its listing age is unreported, so no seasoning can be credited toward Established`
      : p.tvl_usd < model.established_tvl_usd && age < model.established_age_days
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
  const scored = [...chosen.values()].map(({ p, section }) => {
    const v = impliedFor(p, book, snapshot, model);
    const { tier, reason } = tierFor(p, v.age, model);
    return { p, section, v, tier, reason };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : 1));
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
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    range_low_usd: s.v.low,
    range_high_usd: s.v.high,
    model: {
      peer_group: s.v.groupName,
      peer_count: s.v.groupSize,
      peer_p25: round4(s.v.groupP25),
      multiple: round4(s.v.multiple),
      maturity_multiplier: round4(s.v.maturity),
      tvl_scale_multiplier: round4(s.v.tvlScale),
      reach_multiplier: round4(s.v.reach),
      momentum_multiplier: round4(s.v.momentum),
      age_days: s.v.age,
    },
    farm_steps: farmSteps(s.p, s.v.age, s.tier).map(stepText),
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

/** The weekly qualifying action, in the category's own terms. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('curator') || c.includes('allocator')) return 'a small top-up deposit or a reallocation between vaults';
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'a small top-up supply or a partial repay-and-resupply cycle';
  if (c.includes('dex')) return 'a small swap through the pool you provide to';
  if (c.includes('derivative') || c.includes('perpetual')) return 'one small hedged trade, opened and closed inside the week';
  if (c.includes('prediction')) return 'one small position in a liquid market you follow';
  if (c.includes('bridge')) return 'one small bridge transfer in either direction';
  if (c.includes('staking') || c.includes('restak')) return 'a small additional stake or a claim of staking rewards';
  if (c.includes('stable') || c.includes('rwa') || c.includes('money')) return 'a small additional mint or deposit';
  if (c.includes('insurance')) return 'a renewal check on the cover and one new quote';
  return 'a deposit, a borrow, a swap or a vote';
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
      text: `Make one qualifying action each week in ${p.name} — ${weeklyFor(p)} — and log the wallet, dates and transaction hashes in a farm log.`,
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
export const HAND_PLANS: Record<string, FarmStep[]> = {
  usdd: [
    { text: `Open the official USDD app from the link on its DefiLlama page and confirm the contract address on TronScan against the one in the official docs before you send anything.`, cost: 'nothing', time: '10 minutes' },
    { text: `Use a fresh Tron wallet funded with a small amount of TRX for energy and bandwidth; keep the seed phrase offline and never type it into a site that asks for it.`, cost: 'about $5 of TRX', time: '10 minutes' },
    { text: `Mint a $25 test amount of USDD against TRX collateral in the official app, then burn it back, so you have seen both sides of the CDP work before real size.`, cost: 'the $25 round trip plus Tron energy fees', time: '20 minutes' },
    { text: `Mint or buy $200 of USDD on Tron and hold it in the farming wallet; if you use the official savings vault for it, enter only through the same verified app, never a search result.`, cost: '$200 of capital, held as USDD', time: '15 minutes' },
    { text: `Keep the position in USDD itself or its official savings vault; do not chase higher yield in third-party USDD wrappers, which add a second, unaudited protocol on top of a stablecoin position.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Check the collateral ratio and the position once a week in the official app, and log every mint, stake and burn with its transaction hash in a farm log.`, cost: 'Tron energy fees only', time: '10 minutes a week' },
    { text: `Hold at least 90 days as a Core position; on exit, redeem through the official app to the same wallet, and treat any unsolicited USDD claim link as a scam by default.`, cost: 'energy fees on exit', time: '90 days, then 20 minutes' },
  ],
  'steakhouse-financial': [
    { text: `Open the official Morpho app from the link on Steakhouse Financial's DefiLlama page; Steakhouse vaults live inside Morpho, and copycat vaults with near-identical names are the main risk here.`, cost: 'nothing', time: '10 minutes' },
    { text: `In the Morpho app on Base, find the flagship Steakhouse USDC vault and check its contract address and listed markets match the vault Steakhouse's own site names.`, cost: 'nothing', time: '10 minutes' },
    { text: `Use a fresh Base wallet funded with $25 of USDC and a little ETH for gas; deposit the $25 and withdraw it in full to prove the exit before you size up.`, cost: 'about $1 of Base gas for the round trip', time: '15 minutes' },
    { text: `Deposit $200 of USDC into the verified Steakhouse vault on Base and keep the vault shares in the same wallet; do not lend the shares out or loop them for leverage.`, cost: '$200 of capital and about $1 of gas', time: '10 minutes' },
    { text: `Stay in Steakhouse's own vault contracts inside Morpho; skip aggregators and auto-compounders that re-wrap the vault, since each wrapper is another contract that can fail.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Once a week, skim the vault's market list in the Morpho app for new or removed markets and log the date, the vault balance and any change in a farm log.`, cost: 'no fee to read', time: '10 minutes a week' },
    { text: `Hold at least 90 days as a Core position; withdraw through the Morpho app to the same wallet, and never follow a Steakhouse claim link from social media.`, cost: 'Base gas on exit', time: '90 days, then 10 minutes a month' },
  ],
  'sentora-curator': [
    { text: `Open Sentora's own site from its DefiLlama page and note which lending venue its flagship vaults sit on; then open that venue's official app, not a link from a post or a search ad.`, cost: 'nothing', time: '15 minutes' },
    { text: `In the venue's app on Ethereum, pick a Sentora-curated USDC vault and read its stated risk parameters and market list; if you cannot name the vault's markets, do not deposit yet.`, cost: 'nothing', time: '15 minutes' },
    { text: `Use a fresh Ethereum wallet; deposit a $25 test amount into the vault and withdraw it in full, accepting the L1 gas cost as the price of verifying the exit.`, cost: 'about $8 of Ethereum gas for the round trip', time: '25 minutes' },
    { text: `Deposit $175 of USDC into the verified Sentora vault on Ethereum and hold the shares unlevered in the same wallet.`, cost: '$175 of capital and about $5 of gas', time: '15 minutes' },
    { text: `Keep the position in the Sentora vault itself; do not route it through yield aggregators that re-wrap curator vaults, which stack a second protocol's risk on the first.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Review the vault's utilisation and market list monthly in the venue app, and log deposits, withdrawals and hashes in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 60 days as an Established position; exit through the venue's app to the same wallet, and treat any Sentora points or claim page you did not navigate to yourself as suspect.`, cost: 'Ethereum gas on exit', time: '60 days, then 15 minutes' },
  ],
  'polymarket-international': [
    { text: `Open Polymarket only from the link on its DefiLlama page and bookmark it; phishing clones of this venue are common, and a look-alike domain is the single biggest risk in this plan.`, cost: 'nothing', time: '10 minutes' },
    { text: `Create the account inside the official app and fund it with $25 of USDC on Polygon through the app's own deposit flow, never through a third-party bridge a stranger recommends.`, cost: '$25 of capital', time: '20 minutes' },
    { text: `Place two or three small positions in the most liquid markets to learn the order book and, just as important, sell one position back so you have seen the exit work.`, cost: 'a few dollars of spread at most', time: '30 minutes' },
    { text: `Build to $150 of total exposure across liquid, near-dated markets you actually follow; size every position so a total loss on it is acceptable, because prediction positions can go to zero.`, cost: '$150 of capital at risk', time: '30 minutes a week' },
    { text: `Never install a Polymarket bot, signer or browser extension that asks for your key or seed phrase; the official app is the only venue this plan uses.`, cost: 'nothing', time: '5 minutes to check' },
    { text: `Keep a trading record: market, side, price, size and date for every position, in a farm log; a consistent record is also the honest evidence of real activity.`, cost: 'nothing', time: '5 minutes per trade' },
    { text: `Review monthly and withdraw profits to the same wallet you funded from; hold the activity for at least 60 days rather than churning for a single week.`, cost: 'Polygon gas on exit', time: '60 days, then 15 minutes a month' },
  ],
  'bittensor-dtao': [
    { text: `Start from Bittensor's own site, reached from the DefiLlama page, and use only the wallet tooling and subnet dashboards it names; this is an Emerging row, so every step stays small.`, cost: 'nothing', time: '15 minutes' },
    { text: `Create a Bittensor wallet with the official tooling, write the seed phrase offline, and never paste it into a web page or a staking site.`, cost: 'nothing', time: '15 minutes' },
    { text: `Buy a small amount of TAO on a major exchange and withdraw $40 worth to your own wallet, checking the address twice; exchange withdrawal is the one step with no undo.`, cost: '$40 of capital plus the exchange withdrawal fee', time: '30 minutes' },
    { text: `Stake the TAO into one long-running, high-activity subnet through the official staking flow, rather than splitting dust across many subnets you cannot follow.`, cost: 'a small network fee', time: '20 minutes' },
    { text: `Do not use third-party liquid-staking wrappers or Telegram staking bots for TAO; the native stake in your own wallet is the whole position.`, cost: 'nothing', time: '5 minutes to check' },
    { text: `Check the stake and the subnet's standing once a week and log balances and dates in a farm log; unstake a small part once to prove that exit too.`, cost: 'a small network fee', time: '15 minutes a week' },
    { text: `Hold at least 45 days at Emerging size; if the subnet fades or the record changes, unstake to your own wallet first and reassess from there.`, cost: 'network fees on exit', time: '45 days, then 15 minutes' },
  ],
  onre: [
    { text: `Open OnRe's official app from its DefiLlama page and read the eligibility and redemption terms first; real-world-asset products can restrict who may hold them and how exits settle.`, cost: 'nothing', time: '20 minutes' },
    { text: `Use a fresh Solana wallet funded with USDC and a little SOL for fees; keep the seed phrase offline and the wallet dedicated to this one position.`, cost: 'about $2 of SOL for fees', time: '10 minutes' },
    { text: `Mint a $25 test amount of OnRe's yield asset with USDC in the official app, then redeem it in full, noting how long redemption actually takes before you commit more.`, cost: 'the $25 round trip plus Solana fees', time: '30 minutes, plus the redemption wait' },
    { text: `Mint $175 of the asset with USDC on Solana and hold it in the same wallet; do not lend it out or use it as collateral elsewhere while it is your farm position.`, cost: '$175 of capital', time: '15 minutes' },
    { text: `Keep the position in OnRe's own contracts; secondary-market wrappers and leveraged loops on a redemption-based asset add exactly the liquidity risk this plan avoids.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Check the position and any published backing or attestation updates monthly, and log mints, redemptions and hashes in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 60 days as an Established position; redeem through the official app to the same wallet, allowing for the stated redemption window rather than a panic sale.`, cost: 'Solana fees on exit', time: '60 days, then 20 minutes' },
  ],
  gauntlet: [
    { text: `Open the official Morpho app from Gauntlet's DefiLlama page; Gauntlet's vaults are curated inside lending venues, and the venue's own app is the only front end this plan trusts.`, cost: 'nothing', time: '10 minutes' },
    { text: `On Base, open the flagship Gauntlet USDC vault and confirm its curator field names Gauntlet and its market list matches what Gauntlet's own site describes.`, cost: 'nothing', time: '10 minutes' },
    { text: `Fund a fresh Base wallet with $25 of USDC, deposit it into the vault, and withdraw it in full; Gauntlet vaults can queue withdrawals in stressed markets, so see the normal exit first.`, cost: 'about $1 of Base gas for the round trip', time: '15 minutes' },
    { text: `Deposit $200 of USDC into the verified Gauntlet vault on Base and keep the shares in the same wallet, unlevered and unlooped.`, cost: '$200 of capital and about $1 of gas', time: '10 minutes' },
    { text: `Stay inside the vault's own contracts; skip third-party dashboards that ask for approvals to manage or auto-move curator vault positions.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Once a week, check the vault's utilisation and any market additions in the Morpho app, and log the balance and dates in a farm log.`, cost: 'no fee to read', time: '10 minutes a week' },
    { text: `Hold at least 90 days as a Core position; exit through the Morpho app to the same wallet you funded from.`, cost: 'Base gas on exit', time: '90 days, then 10 minutes a month' },
  ],
  veda: [
    { text: `Open Veda's official app from its DefiLlama page and pick one flagship vault whose strategy you can describe in a sentence; Veda powers vaults for other brands, so confirm the vault is Veda's own listing.`, cost: 'nothing', time: '15 minutes' },
    { text: `Check the vault's contract address on the block explorer of its chain (Ink or Ethereum) against the address in Veda's official docs before funding anything.`, cost: 'nothing', time: '10 minutes' },
    { text: `Use a fresh wallet; make a $25 test deposit into the vault and withdraw it in full, noting any withdrawal delay the vault states, before real size goes in.`, cost: 'about $4 of gas for the round trip', time: '25 minutes' },
    { text: `Deposit $200 of the vault's deposit asset (USDC or ETH, as the vault takes) and hold the vault shares in the same wallet; no looping, no borrowing against them.`, cost: '$200 of capital and about $3 of gas', time: '15 minutes' },
    { text: `Keep the position in the Veda vault itself; partner front ends and wrappers around the same vault add contracts without adding return you can verify.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Review the vault's strategy page and your balance monthly, and log deposits, withdrawals and hashes in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 90 days as a Core position; withdraw through Veda's app to the same wallet, respecting the vault's stated withdrawal window.`, cost: 'gas on exit', time: '90 days, then 15 minutes' },
  ],
  opentrade: [
    { text: `Open OpenTrade's official platform from its DefiLlama page and read the terms of the USDC pool you are considering, including who may deposit and how withdrawals settle; some pools onboard users first.`, cost: 'nothing', time: '20 minutes' },
    { text: `Use a fresh wallet on Avalanche C-Chain funded with USDC and a little AVAX for gas; keep it dedicated to this position.`, cost: 'about $3 of AVAX for gas', time: '10 minutes' },
    { text: `Deposit a $25 test amount into the pool and withdraw it in full at the first window, so you know the settlement rhythm before committing real size.`, cost: 'the $25 round trip plus Avalanche gas', time: '30 minutes, plus the settlement window' },
    { text: `Deposit $150 of USDC into the verified OpenTrade pool on Avalanche and hold the position unlevered in the same wallet.`, cost: '$150 of capital', time: '15 minutes' },
    { text: `Keep the position in OpenTrade's own pool contracts; do not buy a wrapped or secondary version of the pool share from a marketplace you cannot verify.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Read the pool's monthly reporting when it posts, check your balance, and log every deposit and withdrawal in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 60 days as an Established position; exit at a normal settlement window to the same wallet, not through a discounted side sale.`, cost: 'Avalanche gas on exit', time: '60 days, then 15 minutes' },
  ],
  'plume-vaults': [
    { text: `Open the Plume portal from the DefiLlama page and identify the flagship vault's own app (Plume's vault products run through its Nest portal); bookmark the real domain, since RWA chains attract clone sites.`, cost: 'nothing', time: '15 minutes' },
    { text: `Bridge a $25 test amount of USDC to Plume through the official bridge the portal names, then bridge a small part back, so both directions of the route are proven.`, cost: 'about $3 of gas across the round trip', time: '30 minutes' },
    { text: `Use a fresh wallet for Plume; deposit the test amount into the flagship vault and withdraw it in full inside the portal.`, cost: 'small Plume gas fees', time: '20 minutes' },
    { text: `Deposit $150 of USDC into the verified Plume vault and hold the shares in the same wallet; keep the size Established, not Core, because the chain itself is young.`, cost: '$150 of capital', time: '15 minutes' },
    { text: `Keep the position in the portal's own vault contracts; avoid unofficial Plume yield wrappers and any vault that cannot name its underlying RWA.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Check the vault balance and the portal's announcements monthly, and log bridges, deposits and hashes in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 60 days; exit by withdrawing in the portal and bridging back through the official bridge to the wallet you funded from.`, cost: 'gas on exit and the bridge back', time: '60 days, then 20 minutes' },
  ],
  r25: [
    { text: `Open R25's official app from its DefiLlama page and read how its real-world-asset token redeems before anything else; this is an Emerging row with a short record, so the whole plan stays small.`, cost: 'nothing', time: '20 minutes' },
    { text: `Use a fresh wallet on Pharos (the record's first chain) funded with $25 and a little gas token; keep the seed phrase offline.`, cost: '$25 of capital plus gas', time: '15 minutes' },
    { text: `Mint or deposit the $25 test amount in the official app and redeem it in full, timing the redemption; an RWA exit you have not tested is a hope, not a plan.`, cost: 'the $25 round trip plus gas', time: '30 minutes, plus the redemption wait' },
    { text: `If the test exit settles as stated, build the position to $100 of the asset and hold it in the same wallet, unlevered and unpledged.`, cost: '$100 of capital in total', time: '15 minutes' },
    { text: `Keep the position in R25's own contracts; do not buy the asset from an unverified pool or wrap it for extra yield on a chain this young.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Check the position and any attestation or backing update monthly, and log every mint and redemption in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 45 days at Emerging size; exit through the official redemption path to the same wallet, and resize only if the record lengthens.`, cost: 'gas on exit', time: '45 days, then 15 minutes' },
  ],
  symbiotic: [
    { text: `Open Symbiotic's official app from its DefiLlama page and choose a flagship vault with a curator you can name; restaking adds slashing risk on top of the base asset, so read the vault's terms first.`, cost: 'nothing', time: '20 minutes' },
    { text: `Use a fresh Ethereum wallet; deposit a $25 test amount of the vault's asset (ETH or a liquid staking token the vault takes) and withdraw it in full to see the exit and its delay.`, cost: 'about $8 of Ethereum gas for the round trip', time: '30 minutes' },
    { text: `Deposit $150 of the asset into the verified Symbiotic vault on Ethereum mainnet and keep the receipt in the same wallet.`, cost: '$150 of capital and about $5 of gas', time: '20 minutes' },
    { text: `Hold the vault position itself; do not re-stake the receipt into a second restaking layer or loop it for leverage, which compounds slashing exposure you cannot price.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Once a month, read the vault's network and curator updates in the official app and check that the terms you accepted are still the terms in force.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Log every deposit, withdrawal and hash in a farm log, with the vault's stated withdrawal window noted beside the position.`, cost: 'nothing', time: '5 minutes per entry' },
    { text: `Hold at least 60 days as an Established position; withdraw through the official app to the same wallet, allowing the full stated unbonding window.`, cost: 'Ethereum gas on exit', time: '60 days, then 20 minutes' },
  ],
  'defi-saver-asset-management': [
    { text: `Open DeFi Saver's official app from the DefiLlama page and find its asset-management vaults; this row's listing age is unreported, so the plan treats a large, old-looking product as Emerging until you verify its history yourself.`, cost: 'nothing', time: '15 minutes' },
    { text: `Read the vault's strategy and fee terms in the app, and check the vault contract on Etherscan against the address the app itself presents.`, cost: 'nothing', time: '15 minutes' },
    { text: `Use a fresh Ethereum wallet; deposit a $25 test amount into the vault and withdraw it in full before any real size follows.`, cost: 'about $8 of Ethereum gas for the round trip', time: '25 minutes' },
    { text: `Deposit $125 of USDC or DAI, as the vault takes, into the verified DeFi Saver vault on Ethereum and hold the shares unlevered in the same wallet.`, cost: '$125 of capital and about $5 of gas', time: '15 minutes' },
    { text: `Keep the position inside DeFi Saver's own vault contracts; its automation features are optional extras, and this plan does not enable leverage or auto-borrowing.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Check the vault balance and strategy notes monthly in the app, and log deposits, withdrawals and hashes in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 45 days at Emerging size; withdraw through the app to the same wallet, and only resize once the protocol's record is one you have verified.`, cost: 'Ethereum gas on exit', time: '45 days, then 15 minutes' },
  ],
  'bitfi-basis': [
    { text: `Open BitFi's official app from its DefiLlama page and read the basis vault's lock-up and withdrawal terms in full; basis strategies earn a spread and can gate exits, so the terms decide the size.`, cost: 'nothing', time: '20 minutes' },
    { text: `Use a fresh wallet on BNB Chain funded with a $25 test amount of the vault's deposit asset and a little BNB for gas; keep the seed phrase offline.`, cost: '$25 of capital plus about $1 of BNB', time: '15 minutes' },
    { text: `Deposit the test amount and, at the first allowed window, withdraw it in full; a basis vault whose exit you have not timed is not yet a position.`, cost: 'the $25 round trip plus gas', time: '30 minutes, plus the lock-up window' },
    { text: `If the exit settles as the terms state, build to $150 in the verified BitFi basis vault on BNB Chain and hold it unlevered in the same wallet.`, cost: '$150 of capital in total', time: '15 minutes' },
    { text: `Keep the position in BitFi's own vault; do not buy a tokenised share of the strategy from a secondary pool, where the price can detach from the vault's own redemption value.`, cost: 'no extra fee', time: '5 minutes to check' },
    { text: `Check the vault's reported rate and your balance monthly, and log deposits, windows and hashes in a farm log.`, cost: 'no fee to read', time: '15 minutes a month' },
    { text: `Hold at least 60 days as an Established position; exit at a normal withdrawal window to the same wallet rather than selling the claim at a discount.`, cost: 'gas on exit', time: '60 days, then 15 minutes' },
  ],
  'figure-markets-exchange': [
    { text: `Open Figure Markets only from the link on its DefiLlama page and complete the venue's own onboarding there; it is an account-based exchange on Provenance, and look-alike sign-up pages are the main risk.`, cost: 'nothing', time: '25 minutes' },
    { text: `Fund the account with a $25 test amount through the venue's own deposit flow, make one small spot trade, and withdraw the proceeds to your own wallet to prove the full loop.`, cost: '$25 of capital plus venue fees', time: '30 minutes' },
    { text: `Keep only working size on the venue: an exchange balance is a claim on the venue, so this plan holds at most $125 there at any time and sweeps the rest to self-custody.`, cost: '$125 of capital at most on the venue', time: '10 minutes' },
    { text: `Make a few small spot trades each week in the venue's most liquid markets, keeping sizes even and recording every fill; steady, real activity is the farm here.`, cost: 'venue trading fees on small size', time: '20 minutes a week' },
    { text: `Never connect a wallet or enter a seed phrase because a Figure Markets message asks you to; the venue account is the only credential this plan uses, with its own two-factor check on.`, cost: 'nothing', time: '5 minutes to set up' },
    { text: `Export or copy the trade history monthly into a farm log, and reconcile the venue balance against it before adding any size.`, cost: 'nothing', time: '15 minutes a month' },
    { text: `Run the activity for at least 45 days at Emerging size; if you stop, withdraw everything to your own wallet rather than leaving a dormant exchange balance.`, cost: 'withdrawal fees on exit', time: '45 days, then 20 minutes' },
  ],
};

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
