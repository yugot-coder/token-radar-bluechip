# token-radar-bluechip

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/yugot-coder/token-radar-bluechip/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/yugot-coder/token-radar-bluechip/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A blue-chip token launch radar over the sealed DefiLlama snapshot of 2026-11-14. It ranks 190 protocols that record no token — no market cap, no CoinGecko id, no symbol in their record — by the value a hypothetical token launch would imply, priced the way a cautious allocator prices an illiquid position: conservatively, and only after the protocol has proved scale, seasoning and reach.

Where a momentum radar pays for growth, this entry pays for survival. The implied value (model `bluechip-1`) is TVL × a **lower-quartile (p25) peer multiple** — the mcap/TVL that the weaker half of comparable tokenised protocols at scale (TVL ≥ $25M) actually sustain, read from the same snapshot by category, else by category family, else by the whole market, shrunk toward the market's p25 by peer count — times a **dominant scale factor** (maturity on listing age × TVL scale × chain reach), times a **momentum tilt capped at ±10%**, so one hot week can never carry a ranking. Each row also carries the peer range (the same formula at the group's shrunk p10 and median), so the optimistic case is shown next to the claim instead of being the claim.

Every row is graded **Core**, **Established** or **Emerging** on stated bars — Core asks $1B of TVL, 540 days listed and 3 chains; Established asks $150M and 365 days — and the detail view states the facts that put the row in its tier, including the bar it falls short of. The tier never changes the price; it tells the reader how to size the farm.

The board has three sections, all chosen by stated rules and never by hand: the snapshot's whole 40-protocol watchlist; 20 "overlooked majors" at or above the $50M floor that pass every test of the house's watchlist rule the snapshot itself can show, so only the parent-protocol record the snapshot does not carry can have kept them off the list; and 130 early protocols below the floor passing the same tests. Wrapped, staked or bridged products of assets that already trade, and centralised-exchange balances, are never ranked.

Each row carries a 7-step farm plan written for a cautious farmer — verify the venue from the protocol's own record first, test the exit with $25 before real size, stay inside the protocol's own contracts, keep a log. The top 15 plans are hand-written for the protocol itself (its real venue, its real exit, its real risks); the rest are generated from the protocol's own category, chain and tier, and name all three.

The dashboard is static and makes no network calls: a sortable, filterable board (search, tier, section, category, chain), a priced-peers view showing the tokenised protocols the model is priced from, a method view that states the whole model and tables the peer evidence group by group, and a per-protocol detail view that recomputes the implied value in the page from the row's own factors and checks it against board.json.

## Run it

With Node 22 or newer, from this repository, pointing `--input` at a directory holding the competition's `snapshot.json` (the grader mounts it at `/input`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /input
```

This writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` into the output directory. Open `dashboard/index.html` from the output directory to read the board.

---
[▶ Try make.fun — AI agent bounties, rewards in USDC on Solana](https://make.fun/?ref=za0zfbxx)
