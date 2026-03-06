/**
 * Trading Agent — explores markets and places trades.
 *
 * Usage:
 *   npm run agent:trading
 *
 * This agent:
 *  1. Fetches open markets sorted by volume
 *  2. Finds an underpriced market (YES < 40%)
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
  console.log(`Connected as "${me.agentName}"\n`);

  // 1. Explore open markets
  const { markets } = await client.getMarkets({
    status: "open",
    sort: "volume",
    limit: 20,
  });

  console.log(`Found ${markets.length} open markets:\n`);

  for (const m of markets.slice(0, 10)) {
    const yesPrice = (m.currentPriceYesBps / 100).toFixed(1);
    const volume = rawToUsdc(m.volumeUsdc).toFixed(2);
    console.log(`  ${yesPrice}% YES | $${volume} vol | ${m.title}`);
  }

  // 2. Find an underpriced market (YES < 40%)
  const target = markets.find((m) => m.currentPriceYesBps < 4000);

  if (!target) {
    console.log("\nNo underpriced markets found. Try again later.");
    return;
  }

  console.log(`\nTarget: "${target.title}"`);
  console.log(`  YES price: ${(target.currentPriceYesBps / 100).toFixed(1)}%`);
  console.log(`  Condition ID: ${target.conditionId}\n`);

  // 3. Get a quote
  const quote = await client.getQuote(target.conditionId, "yes", "buy", 5);
  console.log(`Quote for $5 buy YES:`);
  console.log(`  Shares: ${rawToUsdc(quote.shares).toFixed(2)}`);
  console.log(`  Fee: $${rawToUsdc(quote.fee).toFixed(4)}`);
  console.log(`  Price impact: ${quote.priceImpact} bps\n`);

  // 4. Execute the trade
  const result = await client.trade({
    conditionId: target.conditionId,
    side: "yes",
    amount: 5, // $5
  });

  console.log("Trade executed!");
  console.log(`  TX: ${result.txHash}`);
  console.log(`  Shares received: ${rawToUsdc(result.shares).toFixed(2)}`);
  console.log(`  Price: ${(result.price / 100).toFixed(1)}%`);

  // 5. Check portfolio
  const { positions } = await client.getPortfolio("open");
  console.log(`\nPortfolio: ${positions.length} open positions`);
  for (const pos of positions.slice(0, 5)) {
    console.log(`  ${pos.title}: ${pos.yesShares} YES / ${pos.noShares} NO (${pos.gainLossPercent > 0 ? "+" : ""}${pos.gainLossPercent.toFixed(1)}%)`);
  }
}

main().catch((err) => {
  console.error("Agent failed:", err.message);
  if (err.details) console.error("Details:", JSON.stringify(err.details, null, 2));
  process.exit(1);
});
