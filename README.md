# FlipCoin Agent Starter

Build a prediction market agent in 5 minutes. Create markets, trade, and earn creator fees on every trade.

## Quick Start

### 1. Get your API key

Go to [flipcoin.fun/agents](https://www.flipcoin.fun/agents), connect your wallet, and create an agent. Copy the API key (`fc_xxx`).

### 2. Clone & install

```bash
git clone https://github.com/flipcoin-fun/flipcoin-agent-starter
cd flipcoin-agent-starter
npm install
```

### 3. Add your API key

```bash
cp .env.example .env
```

Edit `.env` and paste your key:

```
FLIPCOIN_API_KEY=fc_your_api_key_here
```

### 4. Run

```bash
npm start
```

Output:

```
Connected as "My Agent" (0x1234...abcd)
Fee tier: medium | Taker fee: 50 bps

Market created!
  Address:      0xabcdef...
  Condition ID: 0x123456...
  TX:           0x789abc...

  View: https://www.flipcoin.fun/app/market/0xabcdef...
```

## What Can Agents Do?

| Action | Method | Description |
|--------|--------|-------------|
| **Create markets** | `client.createMarket()` | Any topic — crypto, politics, sports, world events |
| **Batch create** | `client.batchCreateMarkets()` | Create up to 10 markets in one call |
| **Trade** | `client.trade()` | Buy/sell YES/NO shares via LMSR AMM |
| **Place orders** | `client.createOrder()` | Limit orders on the CLOB order book |
| **Explore** | `client.getMarkets()` | Discover and analyze all platform markets |
| **Market state** | `client.getMarketState()` | LMSR state, slippage curve, analytics |
| **Price history** | `client.getMarketHistory()` | Raw trades or OHLC candles |
| **Get quotes** | `client.getQuote()` | Price quotes before trading |
| **Portfolio** | `client.getPortfolio()` | Track positions and P&L |
| **Performance** | `client.getPerformance()` | Creator fees, volume breakdown |
| **Webhooks** | `client.createWebhook()` | Real-time event notifications |
| **Audit log** | `client.getAuditLog()` | Key events and security audit trail |
| **Event feed** | `client.getFeed()` | Platform events (trades, new markets) |
| **Earn fees** | — | Creators earn fees on every trade in their markets |

## Examples

### Simple Agent — create a market

Creates a single prediction market:

```bash
npm start
# or: npm run agent:simple
```

```typescript
const result = await client.createMarket({
  title: "Will ETH exceed $5,000 by next week?",
  resolutionCriteria: "Resolves YES if ETH/USD on CoinGecko exceeds $5,000 before deadline.",
  resolutionSource: "https://www.coingecko.com/en/coins/ethereum",
  category: "crypto",
  liquidityTier: "low",
});

console.log("Market created:", result.marketAddr);
```

### Trading Agent — explore & trade

Finds underpriced markets and buys YES shares:

```bash
npm run agent:trading
```

```typescript
const { markets } = await client.getMarkets({ status: "open", sort: "volume" });
const target = markets.find((m) => m.currentPriceYesBps < 4000);

await client.trade({
  conditionId: target.conditionId,
  side: "yes",
  amount: 5, // $5
});
```

### News Agent — RSS to markets

Reads news RSS feeds and creates markets from headlines:

```bash
npm run agent:news
```

Monitors BBC, NYT, Reuters. When a market-worthy headline appears (elections, bans, deals, breakthroughs), creates a prediction market automatically.

### Crypto Agent — price milestones

Monitors crypto prices via CoinGecko and creates markets near round-number milestones:

```bash
npm run agent:crypto
```

Example: If BTC is at $95,000, creates *"Will BTC exceed $100,000 this week?"* with an appropriate initial probability.

## Setup Guide

### Prerequisites

- **Node.js 18+** (uses native `fetch`)
- **Wallet** on Base network
- **USDC** in VaultV2 (for non-trial markets)

### Step-by-step

1. **Create agent & get API key** at [flipcoin.fun/agents](https://www.flipcoin.fun/agents)

2. **Deposit USDC** to VaultV2 (skip for `trial` tier):
   - Approve: `USDC.approve(vaultV2Address, amount)`
   - Deposit: `VaultV2.deposit(amount)`

3. **Create a session key** (for autonomous mode):
   - Go to [flipcoin.fun/agents](https://www.flipcoin.fun/agents) → "Create Autopilot Key"
   - Sign the `setDelegation()` transaction on DelegationRegistry
   - This allows your agent to create markets and trade without manual wallet signatures

4. **Run your agent!**

### Liquidity Tiers

| Tier | Seed Cost | Use Case |
|------|-----------|----------|
| `trial` | Free ($50 platform-funded) | First-time testing |
| `low` | $35 | Small markets |
| `medium` | $139 | Standard markets |
| `high` | $693 | High-volume markets |

## Client API Reference

```typescript
import { FlipCoin } from "./src/client.js";

const client = new FlipCoin({
  apiKey: "fc_xxx",
  baseUrl: "https://www.flipcoin.fun", // optional, this is the default
});
```

### Health & Config

```typescript
const me = await client.ping();          // verify connection, agent info
const config = await client.getConfig(); // contract addresses, fees, limits
```

### Markets

```typescript
// Explore all markets
const { markets } = await client.getMarkets({
  status: "open",
  sort: "volume",
  search: "bitcoin",
  limit: 20,
});

// Get market details
const { market } = await client.getMarket("0x...");

// Get LMSR state (prices, quantities, slippage curve)
const state = await client.getMarketState("0x...");
console.log("YES price:", state.lmsrState.priceYesBps, "bps");
console.log("Skew:", state.analytics.skew);

// Get price history (raw trades or OHLC candles)
const history = await client.getMarketHistory("0x...", {
  interval: "1h",
  includeVolume: true,
  limit: 100,
});

// Validate before creating
const validation = await client.validateMarket({ title: "...", ... });

// Create a market
const result = await client.createMarket({
  title: "Will X happen?",
  resolutionCriteria: "Resolves YES if ...",
  resolutionSource: "https://...",
  category: "crypto",
  liquidityTier: "low",
  initialPriceYesBps: 5000, // 50%
});

// Batch create (up to 10 markets)
const batch = await client.batchCreateMarkets([
  { title: "Will X?", resolutionCriteria: "...", resolutionSource: "https://...", liquidityTier: "low" },
  { title: "Will Y?", resolutionCriteria: "...", resolutionSource: "https://...", liquidityTier: "low" },
]);
```

### Trading

```typescript
// Get a price quote
const quote = await client.getQuote(conditionId, "yes", "buy", 10); // $10

// Execute LMSR trade (buy/sell YES/NO)
const trade = await client.trade({
  conditionId: "0x...",
  side: "yes",
  amount: 10, // $10 — human-readable, no decimals needed
});

// Place CLOB limit order
const order = await client.createOrder({
  conditionId: "0x...",
  side: "yes",
  priceBps: 4500, // $0.45 per share
  shares: 20,     // 20 shares
  timeInForce: "GTC",
});

// List & cancel orders
const { orders } = await client.getOrders("open");
await client.cancelOrder("0x...");
```

### Portfolio

```typescript
const { positions } = await client.getPortfolio("open");
for (const pos of positions) {
  console.log(`${pos.title}: ${pos.gainLossPercent}%`);
}
```

### Analytics & Monitoring

```typescript
// Creator performance — fees earned, volume breakdown
const perf = await client.getPerformance("30d");
console.log("Fees earned:", perf.creatorStats.creatorFeesEarnedUsdc);
console.log("Volume:", perf.creatorStats.totalVolumeUsdc);

// Audit log — security events
const log = await client.getAuditLog({ limit: 20, eventType: "market_created" });

// Event feed — platform-wide events since a timestamp
const feed = await client.getFeed({
  since: new Date(Date.now() - 3600_000).toISOString(),
  types: "trade,market_created",
});
```

### Webhooks

```typescript
// Register a webhook for real-time notifications
const wh = await client.createWebhook({
  url: "https://your-server.com/webhook",
  eventTypes: ["market_created", "trade", "market_resolved"],
});
console.log("Webhook secret:", wh.webhook.secret); // save this!

// List & delete
const { webhooks } = await client.getWebhooks();
await client.deleteWebhook(webhooks[0].id);
```

## curl Examples

See [docs/curl-examples.md](docs/curl-examples.md) for raw HTTP examples.

Quick test:

```bash
curl -s https://www.flipcoin.fun/api/agent/ping \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Key Concepts

### Prices

All prices are in **basis points (bps)**: `5000` = 50%, `10000` = 100%.

YES + NO always sum to 10,000 bps (100%).

### USDC

USDC uses 6 decimals on-chain (`1000000` = $1.00). The client handles conversion — pass human-readable amounts (e.g., `10` for $10).

### Two Trading Venues

- **LMSR** (BackstopRouter) — always-on AMM, guaranteed liquidity
- **CLOB** (Exchange) — limit order book, better prices with depth

### Fees

| Role | Fee |
|------|-----|
| Maker (CLOB) | 0 bps |
| Taker (CLOB) | 50 bps (0.5%) |
| LMSR | 50 bps (0.5%) |
| **Creator earnings** | Fees on every trade in your markets |

### Mode A vs Mode B

- **Mode A (Manual)**: API returns EIP-712 typed data → you sign with wallet → relay
- **Mode B (Autonomous)**: `auto_sign=true` → agent signs with session key → fully autonomous

The starter uses Mode B by default. Set up a session key to enable it.

## Architecture

```
flipcoin-agent-starter/
├── src/
│   ├── client.ts      # FlipCoin HTTP client (native fetch, zero deps)
│   └── types.ts       # TypeScript interfaces
├── examples/
│   ├── simple-agent.ts    # Create a market
│   ├── trading-agent.ts   # Explore + trade
│   ├── news-agent.ts      # RSS → markets
│   └── crypto-agent.ts    # CoinGecko → markets
└── docs/
    └── curl-examples.md   # Raw HTTP examples
```

## Links

- [FlipCoin App](https://www.flipcoin.fun)
- [Agent Dashboard](https://www.flipcoin.fun/agents)
- [API Documentation](https://www.flipcoin.fun/docs/agents)
- [Agent Playbook](https://www.flipcoin.fun/docs/playbook)

## License

MIT
