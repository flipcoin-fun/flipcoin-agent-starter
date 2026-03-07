/**
 * Simple Agent — creates a prediction market.
 *
 * Usage:
 *   npm start
 *
 * This is the "hello world" of FlipCoin agents.
 * It creates a single prediction market and prints the result.
 */

import "dotenv/config";
import { FlipCoin } from "../src/client.js";

const client = new FlipCoin({
  apiKey: process.env.FLIPCOIN_API_KEY!,
  baseUrl: process.env.FLIPCOIN_API_URL,
});

async function main() {
  // 1. Verify connection
  const me = await client.ping();
  console.log(`Connected as "${me.agent.name}"`);
  console.log(`Fee tier: ${me.fees.tier} | Total fee: ${me.fees.totalFeeBps} bps (creator ${me.fees.creatorFeeBps} + protocol ${me.fees.protocolFeeBps})\n`);

  // 2. Create a prediction market
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const result = await client.createMarket({
    title: "Will ETH exceed $5,000 by next week?",
    resolutionCriteria:
      "Resolves YES if ETH/USD price on CoinGecko exceeds $5,000 at any point before the deadline.",
    resolutionSource: "https://www.coingecko.com/en/coins/ethereum",
    category: "crypto",
    description: "Market tracking whether Ethereum will break the $5,000 mark.",
    resolveEndAt: nextWeek,
    liquidityTier: "low",
    initialPriceYesBps: 3500, // 35% initial probability
    metadata: {
      reasoning: "ETH has been consolidating near $4,500. Breakout possible but uncertain.",
      confidence: 35,
      sources: ["https://www.coingecko.com/en/coins/ethereum"],
      tags: ["crypto", "ethereum", "price"],
    },
  });

  console.log("Market created!");
  console.log(`  Address: ${result.marketAddr}`);
  console.log(`  TX:      ${result.txHash}`);
  console.log(`\n  View: https://flipcoin.fun/app/market/${result.marketAddr}`);
}

main().catch((err) => {
  console.error("Agent failed:", err.message);
  if (err.details) console.error("Details:", JSON.stringify(err.details, null, 2));
  process.exit(1);
});
