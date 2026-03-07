/**
 * Trading Agent — explores markets and places trades.
 *
 * Usage:
 *   npm run agent:trading
 *
 * This agent:
 *  1. Fetches open markets sorted by volume
 *  2. Finds a market with details (prices, resolution info)
 *  3. Buys $5 of YES shares
 */

import "dotenv/config";
import { FlipCoin, rawToUsdc } from "../src/client.js";

const client = new FlipCoin({
  apiKey: process.env.FLIPCOIN_API_KEY!,
  baseUrl: process.env.FLIPCOIN_API_URL,
});

async function main() {
  const me = await client.ping();
  console.log(`Connected as "${me.agent.name}"\n`);

  // 1. Explore open markets
  const { markets } = await client.getMarkets({
    status: "open",
    sort: "volume",
    limit: 20,
  });

  console.log(`Found ${markets.length} open markets:\n`);

  for (const m of markets.slice(0, 10)) {
    const volume = m.volumeUsdc.toFixed(2);
    console.log(`  ${m.status} | $${volume} vol | ${m.title}`);
  }

  // 2. Find a market with conditionId (v2 markets)
  const target = markets.find((m) => m.conditionId);

  if (!target) {
    console.log("\nNo tradeable v2 markets found. Try again later.");
    return;
  }

  // 3. Get full market details
  const details = await client.getMarket(target.marketAddr);
  const market = details.market;

  console.log(`\nTarget: "${market.title}"`);
  console.log(`  YES price: ${(market.currentPriceYesBps! / 100).toFixed(1)}%`);
  console.log(`  Condition ID: ${market.conditionId}\n`);

  // 4. Get a quote (amount is shares)
  const quote = await client.getQuote(market.conditionId!, "yes", "buy", 5);
  console.log(`Quote for 5 shares buy YES:`);
  console.log(`  Venue: ${quote.venue} — ${quote.reason}`);
  if (quote.lmsr?.available) {
    console.log(`  LMSR shares: ${rawToUsdc(quote.lmsr.sharesOut).toFixed(2)}`);
    console.log(`  LMSR fee: $${rawToUsdc(quote.lmsr.fee).toFixed(4)}`);
    console.log(`  Price impact: ${quote.lmsr.priceImpactBps} bps`);
  }

  // 5. Execute the trade
  const result = await client.trade({
    conditionId: market.conditionId!,
    side: "yes",
    action: "buy",
    amount: 5, // $5
  });

  console.log("\nTrade executed!");
  console.log(`  Status: ${result.status}`);
  console.log(`  TX: ${result.txHash}`);
  if (result.sharesOut) console.log(`  Shares received: ${rawToUsdc(result.sharesOut).toFixed(2)}`);

  // 6. Check portfolio
  const portfolio = await client.getPortfolio("open");
  console.log(`\nPortfolio: ${portfolio.positions.length} open positions`);
  for (const pos of portfolio.positions.slice(0, 5)) {
    console.log(`  ${pos.title}: ${pos.netShares} ${pos.netSide} (PnL: ${pos.pnlUsdc > 0 ? "+" : ""}${pos.pnlUsdc.toFixed(2)})`);
  }
}

main().catch((err) => {
  console.error("Agent failed:", err.message);
  if (err.details) console.error("Details:", JSON.stringify(err.details, null, 2));
  process.exit(1);
});
