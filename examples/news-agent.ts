/**
 * News Agent — reads RSS feeds and creates prediction markets from headlines.
 *
 * Usage:
 *   npm run agent:news
 *
 * This agent:
 *  1. Fetches latest news from RSS feeds
 *  2. Filters for market-worthy headlines
 *  3. Creates prediction markets from them
 *
 * Customize the RSS_FEEDS array and shouldCreateMarket() to match your strategy.
 */

import "dotenv/config";
import Parser from "rss-parser";
import { FlipCoin } from "../src/client.js";

const client = new FlipCoin({
  apiKey: process.env.FLIPCOIN_API_KEY!,
  baseUrl: process.env.FLIPCOIN_API_URL,
});

const parser = new Parser();

// ─── Configuration ─────────────────────────────────────────────

/** RSS feeds to monitor */
const RSS_FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://feeds.reuters.com/reuters/topNews",
];

/** Keywords that suggest a market-worthy event */
const MARKET_KEYWORDS = [
  "election",
  "vote",
  "resign",
  "ban",
  "approve",
  "launch",
  "deal",
  "agreement",
  "summit",
  "sanction",
  "record",
  "crisis",
  "breakthrough",
  "milestone",
];

/** Category mapping based on keywords */
function detectCategory(title: string): string {
  const lower = title.toLowerCase();
  if (lower.match(/bitcoin|btc|ethereum|eth|crypto|blockchain/)) return "crypto";
  if (lower.match(/election|president|congress|parliament|vote/)) return "politics";
  if (lower.match(/nba|nfl|fifa|olympics|championship|tournament/)) return "sports";
  if (lower.match(/fda|vaccine|drug|trial|health/)) return "science";
  if (lower.match(/stock|market|fed|rate|gdp|inflation/)) return "finance";
  return "world";
}

/** Check if a headline is worth creating a market for */
function shouldCreateMarket(title: string): boolean {
  const lower = title.toLowerCase();
  return MARKET_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Convert a news headline into a prediction market question */
function headlineToMarket(item: Parser.Item) {
  const title = item.title || "Unknown event";
  const link = item.link || "";
  const category = detectCategory(title);

  // Create a forward-looking question from the headline
  const question = `Will this happen: ${title}?`;
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  return {
    title: question.slice(0, 500),
    resolutionCriteria: `Resolves YES if the event described in the headline is confirmed by major news sources within two weeks. Source: ${link}`,
    resolutionSource: link || "https://news.google.com",
    category,
    resolveEndAt: twoWeeks,
    liquidityTier: "low" as const,
    initialPriceYesBps: 5000,
    metadata: {
      reasoning: `Based on news headline: "${title}"`,
      confidence: 50,
      sources: [link].filter(Boolean),
      tags: [category, "news"],
    },
  };
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  const me = await client.ping();
  console.log(`News Agent connected as "${me.agent.name}"\n`);

  // 1. Fetch headlines from all RSS feeds
  console.log("Fetching news feeds...\n");
  const allItems: Parser.Item[] = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      console.log(`  ${feed.title}: ${feed.items.length} items`);
      allItems.push(...feed.items);
    } catch (err) {
      console.warn(`  Failed to fetch ${feedUrl}: ${(err as Error).message}`);
    }
  }

  console.log(`\nTotal headlines: ${allItems.length}`);

  // 2. Filter for market-worthy headlines
  const marketWorthy = allItems.filter((item) => item.title && shouldCreateMarket(item.title));
  console.log(`Market-worthy headlines: ${marketWorthy.length}\n`);

  if (marketWorthy.length === 0) {
    console.log("No market-worthy headlines found. Try adjusting MARKET_KEYWORDS.");
    return;
  }

  // 3. Create markets (limit to 3 per run)
  const toCreate = marketWorthy.slice(0, 3);

  for (const item of toCreate) {
    const params = headlineToMarket(item);
    console.log(`Creating market: "${params.title.slice(0, 80)}..."`);

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

  console.log("Done! News Agent finished.");
}

main().catch((err) => {
  console.error("News Agent failed:", err.message);
  if (err.details) console.error("Details:", JSON.stringify(err.details, null, 2));
  process.exit(1);
});
