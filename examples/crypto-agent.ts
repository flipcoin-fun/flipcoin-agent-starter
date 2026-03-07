/**
 * Crypto Agent — monitors crypto prices and creates prediction markets.
 *
 * Usage:
 *   npm run agent:crypto
 *
 * This agent:
 *  1. Fetches current crypto prices from CoinGecko
 *  2. Identifies tokens near round-number milestones
 *  3. Creates "Will X exceed $Y?" prediction markets
 *
 * No CoinGecko API key needed (uses free public API).
 */

import "dotenv/config";
import { FlipCoin } from "../src/client.js";

const client = new FlipCoin({
  apiKey: process.env.FLIPCOIN_API_KEY!,
  baseUrl: process.env.FLIPCOIN_API_URL,
});

// ─── Configuration ─────────────────────────────────────────────

/** Tokens to monitor with their milestones */
const TOKENS: Record<string, { name: string; milestones: number[] }> = {
  bitcoin: {
    name: "BTC",
    milestones: [50_000, 75_000, 80_000, 90_000, 100_000, 125_000, 150_000, 200_000],
  },
  ethereum: {
    name: "ETH",
    milestones: [2_000, 2_500, 3_000, 3_500, 4_000, 5_000, 7_500, 10_000],
  },
  solana: {
    name: "SOL",
    milestones: [100, 150, 200, 250, 300, 500],
  },
};

/** How close to a milestone to trigger market creation (as fraction of milestone) */
const PROXIMITY_THRESHOLD = 0.15; // within 15%

/** Market deadline: 1 week from now */
const DEADLINE_DAYS = 7;

// ─── Helpers ───────────────────────────────────────────────────

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
}

async function fetchPrices(): Promise<Record<string, CoinGeckoPrice>> {
  const ids = Object.keys(TOKENS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<Record<string, CoinGeckoPrice>>;
}

function findNearestMilestone(
  price: number,
  milestones: number[],
): { milestone: number; distance: number; isBelow: boolean } | null {
  let best: { milestone: number; distance: number; isBelow: boolean } | null = null;

  for (const ms of milestones) {
    // Only consider milestones above current price (upside targets)
    if (ms <= price) continue;

    const distance = (ms - price) / ms;
    if (distance <= PROXIMITY_THRESHOLD) {
      if (!best || distance < best.distance) {
        best = { milestone: ms, distance, isBelow: true };
      }
    }
  }

  return best;
}

function formatPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US")}`;
  return `$${n}`;
}

function estimateInitialPrice(distance: number): number {
  // Closer to milestone = higher initial probability
  // distance 0 → 7000 bps (70%), distance 0.15 → 2500 bps (25%)
  const prob = Math.round(7000 - distance * 30000);
  return Math.max(1500, Math.min(8500, prob));
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  const me = await client.ping();
  console.log(`Crypto Agent connected as "${me.agent.name}"\n`);

  // 1. Fetch current prices
  console.log("Fetching crypto prices from CoinGecko...\n");
  const prices = await fetchPrices();

  const opportunities: Array<{
    tokenId: string;
    tokenName: string;
    price: number;
    change24h: number;
    milestone: number;
    distance: number;
  }> = [];

  for (const [tokenId, config] of Object.entries(TOKENS)) {
    const priceData = prices[tokenId];
    if (!priceData) {
      console.warn(`  No price data for ${config.name}`);
      continue;
    }

    const change = priceData.usd_24h_change || 0;
    console.log(
      `  ${config.name}: ${formatPrice(priceData.usd)} (${change >= 0 ? "+" : ""}${change.toFixed(2)}% 24h)`,
    );

    const nearest = findNearestMilestone(priceData.usd, config.milestones);
    if (nearest) {
      console.log(
        `    → Near milestone ${formatPrice(nearest.milestone)} (${(nearest.distance * 100).toFixed(1)}% away)`,
      );
      opportunities.push({
        tokenId,
        tokenName: config.name,
        price: priceData.usd,
        change24h: change,
        milestone: nearest.milestone,
        distance: nearest.distance,
      });
    }
  }

  console.log(`\nOpportunities found: ${opportunities.length}\n`);

  if (opportunities.length === 0) {
    console.log("No tokens are near milestone prices. Check back later.");
    return;
  }

  // 2. Create markets for each opportunity
  for (const opp of opportunities) {
    const deadline = new Date(Date.now() + DEADLINE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const initialPrice = estimateInitialPrice(opp.distance);

    const params = {
      title: `Will ${opp.tokenName} exceed ${formatPrice(opp.milestone)} this week?`,
      resolutionCriteria: `Resolves YES if ${opp.tokenName}/USD price on CoinGecko exceeds ${formatPrice(opp.milestone)} at any point before the deadline.`,
      resolutionSource: `https://www.coingecko.com/en/coins/${opp.tokenId}`,
      category: "crypto",
      description: `${opp.tokenName} is currently trading at ${formatPrice(opp.price)} (${opp.change24h >= 0 ? "+" : ""}${opp.change24h.toFixed(2)}% 24h), ${(opp.distance * 100).toFixed(1)}% away from ${formatPrice(opp.milestone)}.`,
      resolveEndAt: deadline,
      liquidityTier: "low" as const,
      initialPriceYesBps: initialPrice,
      metadata: {
        reasoning: `${opp.tokenName} at ${formatPrice(opp.price)}, ${(opp.distance * 100).toFixed(1)}% below ${formatPrice(opp.milestone)}. 24h change: ${opp.change24h.toFixed(2)}%.`,
        confidence: Math.round((1 - opp.distance) * 100),
        sources: [`https://www.coingecko.com/en/coins/${opp.tokenId}`],
        tags: ["crypto", opp.tokenName.toLowerCase(), "price-milestone"],
      },
    };

    console.log(`Creating: "${params.title}"`);
    console.log(`  Initial price: ${(initialPrice / 100).toFixed(0)}% YES`);

    try {
      // Validate first
      const validation = await client.validateMarket(params);
      if (!validation.valid) {
        console.log(`  Skipped: ${validation.issues.map((i) => i.message).join(", ")}\n`);
        continue;
      }

      // Create
      const result = await client.createMarket(params);
      console.log(`  Created: ${result.marketAddr}`);
      console.log(`  TX: ${result.txHash}\n`);
    } catch (err) {
      console.error(`  Failed: ${(err as Error).message}\n`);
    }
  }

  console.log("Done! Crypto Agent finished.");
}

main().catch((err) => {
  console.error("Crypto Agent failed:", err.message);
  if (err.details) console.error("Details:", JSON.stringify(err.details, null, 2));
  process.exit(1);
});
