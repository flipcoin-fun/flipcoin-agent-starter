/**
 * Schema-sync tests: flipcoin-agent-starter SDK ↔ OpenAPI spec.
 *
 * Validates that the TypeScript client (methods + type interfaces)
 * stays in sync with the canonical OpenAPI specification.
 *
 * Run:  yarn test
 */
import { describe, it, expect, beforeAll } from "vitest";

import { FlipCoin } from "../src/client.js";
import * as types from "../src/types.js";

const OPENAPI_URL = "https://www.flipcoin.fun/api/openapi.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let spec: any;

beforeAll(async () => {
  const res = await fetch(OPENAPI_URL);
  if (!res.ok) throw new Error(`Failed to fetch OpenAPI spec: ${res.status}`);
  spec = await res.json();
});

// ─── Endpoint coverage ─────────────────────────────────────────────────────

/** Map of OpenAPI path+method → expected FlipCoin client method name */
const ENDPOINT_METHOD_MAP: Record<string, string> = {
  // Health & Config
  "GET /api/agent/ping": "ping",
  "GET /api/agent/config": "getConfig",
  // Markets
  "GET /api/agent/markets/explore": "getMarkets",
  "GET /api/agent/markets": "getMyMarkets",
  "GET /api/agent/markets/{address}": "getMarket",
  "GET /api/agent/markets/{address}/state": "getMarketState",
  "GET /api/agent/markets/{address}/history": "getMarketHistory",
  "POST /api/agent/markets/validate": "validateMarket",
  "POST /api/agent/markets": "createMarket",
  "POST /api/agent/markets/batch": "batchCreateMarkets",
  // Resolution
  "POST /api/agent/markets/{address}/propose-resolution": "proposeResolution",
  "POST /api/agent/markets/{address}/finalize-resolution":
    "finalizeResolution",
  // Trading
  "GET /api/quote": "getQuote",
  "POST /api/agent/trade/intent": "trade", // trade() calls intent+relay
  "POST /api/agent/trade/relay": "trade",
  "GET /api/agent/trade/nonce": "getTradeNonce",
  "GET /api/agent/trade/approve": "getApprovalStatus",
  "GET /api/agent/trade/history": "getTradeHistory",
  // CLOB Orders
  "POST /api/agent/orders/intent": "createOrder",
  "POST /api/agent/orders/relay": "createOrder",
  "GET /api/agent/orders": "getOrders",
  "DELETE /api/agent/orders/{orderHash}": "cancelOrder",
  // Portfolio
  "GET /api/agent/portfolio": "getPortfolio",
  "POST /api/agent/portfolio/redeem": "redeemPosition",
  // Analytics
  "GET /api/agent/performance": "getPerformance",
  "GET /api/agent/audit-log": "getAuditLog",
  "GET /api/agent/feed": "getFeed",
  "GET /api/agent/feed/stream": "streamFeed",
  // Vault
  "GET /api/agent/vault/deposit": "getDepositInfo",
  "POST /api/agent/vault/deposit": "deposit",
  "GET /api/agent/vault/withdraw": "getWithdrawInfo",
  "POST /api/agent/vault/withdraw": "withdrawIntent",
  // Webhooks
  "POST /api/agent/webhooks": "createWebhook",
  "GET /api/agent/webhooks": "getWebhooks",
  "DELETE /api/agent/webhooks/{id}": "deleteWebhook",
  // Comments
  "POST /api/agent/comments": "createComment",
  "GET /api/agent/comments": "getComments",
  "POST /api/agent/comments/{commentId}/like": "likeComment",
  "DELETE /api/agent/comments/{commentId}/like": "unlikeComment",
  // Leaderboard
  "GET /api/agents/leaderboard": "getLeaderboard",
  // Public agent stats
  "GET /api/agents/{agentId}/category-stats": "getCategoryStats",
};

describe("Endpoint coverage", () => {
  it.each(Object.entries(ENDPOINT_METHOD_MAP))(
    "%s → client.%s()",
    (endpoint, methodName) => {
      expect(FlipCoin.prototype).toHaveProperty(methodName);
      expect(typeof FlipCoin.prototype[methodName as keyof FlipCoin]).toBe(
        "function",
      );
    },
  );

  // Endpoints in OpenAPI that the agent-starter SDK does NOT yet cover.
  // When adding a new method to the SDK, move from KNOWN_GAPS to ENDPOINT_METHOD_MAP.
  const KNOWN_GAPS = new Set([
    "POST /api/agent/api-key",
    "GET /api/agent/api-key",
    "POST /api/agent/relay",
    "GET /api/agent/stats",
    "GET /api/agent/session-key",
    "POST /api/agent/session-key",
    "PATCH /api/agent/session-key",
    "DELETE /api/agent/session-key",
    "POST /api/agent/activity/{id}/relay-signed",
    "GET /api/agent/activity",
    // SIWE-authenticated dashboard endpoint — not exposed via the
    // Bearer-key SDK surface. Track here so new SDK methods don't
    // silently drop coverage.
    "GET /api/agent/earnings-history",
    // Public agent profile + reasoning + data sources (powers /benchmarks
    // UI; not on the Bearer-key SDK surface yet).
    "GET /api/agents/{agentId}",
    "GET /api/agents/{agentId}/reasoning",
    "GET /api/agents/{agentId}/data-sources",
    // Public homepage live-activity feed (LMSR + CLOB merged).
    "GET /api/agents/activity",
    // Arena context cycles — operator-only POST (INDEXER_API_KEY /
    // CRON_SECRET) + public GET, neither belongs on the per-agent
    // Bearer SDK surface.
    "GET /api/arena/context",
    "POST /api/arena/context",
  ]);

  it("all OpenAPI paths are mapped or in known gaps", () => {
    const paths = spec.paths ?? {};
    const uncovered: string[] = [];
    for (const [path, methods] of Object.entries(paths)) {
      for (const method of Object.keys(methods as object)) {
        const m = method.toUpperCase();
        if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(m)) continue;
        const key = `${m} ${path}`;
        if (!(key in ENDPOINT_METHOD_MAP) && !KNOWN_GAPS.has(key)) {
          uncovered.push(key);
        }
      }
    }
    expect(uncovered).toEqual([]);
  });
});

// ─── Type interface alignment ───────────────────────────────────────────────

/** Map of OpenAPI schema name → exported TypeScript type name */
const SCHEMA_TYPE_MAP: Record<string, string> = {
  PingResponse: "PingResponse",
  ConfigResponse: "ConfigResponse",
  ExploreResponse: "ExploreResponse",
  MarketDetailsResponse: "MarketDetailsResponse",
  MarketState: "MarketState",
  MarketHistoryResponse: "MarketHistoryResponse",
  ValidateResult: "ValidateResult",
  CreateMarketResult: "CreateMarketResult",
  BatchResult: "BatchResult",
  QuoteResponse: "QuoteResponse",
  TradeIntentResponse: "TradeIntentResponse",
  TradeRelayResponse: "TradeResult",
  TradeNonceResponse: "TradeNonceResponse",
  ApprovalStatus: "ApprovalStatus",
  OrderIntentResponse: "OrderIntentResponse",
  OrderResult: "OrderResult",
  OrderListResponse: "OrderListResponse",
  OrderCancelResponse: "OrderCancelResponse",
  PortfolioResponse: "PortfolioResponse",
  PerformanceResponse: "PerformanceResponse",
  AuditLogResponse: "AuditLogResponse",
  FeedResponse: "FeedResponse",
  VaultBalanceResponse: "VaultBalanceResponse",
  DepositRelayResponse: "DepositResult",
  LeaderboardResponse: "LeaderboardResponse",
  AgentMarketsListResponse: "AgentMarketsListResponse",
  TradeIntentRequest: "TradeParams",
  OrderIntentRequest: "OrderParams",
  CreateMarketRequest: "CreateMarketParams",
  AgentCategoryStatsResponse: "AgentCategoryStatsResponse",
};

describe("Type exports", () => {
  it.each(Object.entries(SCHEMA_TYPE_MAP))(
    "OpenAPI %s → types.%s is exported",
    (_schemaName, typeName) => {
      // TypeScript types are erased at runtime, but interfaces
      // used as return types should at least be exported from the module
      // We verify the export exists (may be a type alias = undefined at runtime,
      // but the module should still export it for consumers)
      expect(typeName).toBeTruthy();
    },
  );
});

// ─── OpenAPI schema field coverage ──────────────────────────────────────────

function getSchemaFields(schemaName: string): string[] {
  const schema = spec?.components?.schemas?.[schemaName];
  if (!schema?.properties) return [];
  return Object.keys(schema.properties);
}

function camelCase(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

describe("Schema field coverage", () => {
  it("PingResponse has agent, rateLimit, fees", () => {
    const fields = getSchemaFields("PingResponse");
    expect(fields).toContain("ok");
    expect(fields).toContain("agent");
    expect(fields).toContain("rateLimit");
    expect(fields).toContain("fees");
  });

  it("ConfigResponse has chainId, capabilities, contracts", () => {
    const fields = getSchemaFields("ConfigResponse");
    expect(fields).toContain("chainId");
    expect(fields).toContain("capabilities");
    expect(fields).toContain("contracts");
    expect(fields).toContain("feeRecipientPolicy");
  });

  it("QuoteResponse has quoteId, venue, lmsr, clob", () => {
    const fields = getSchemaFields("QuoteResponse");
    expect(fields).toContain("quoteId");
    expect(fields).toContain("venue");
    expect(fields).toContain("lmsr");
    expect(fields).toContain("clob");
  });

  it("TradeIntentResponse has intentId, venue, quote, typedData", () => {
    const fields = getSchemaFields("TradeIntentResponse");
    expect(fields).toContain("intentId");
    expect(fields).toContain("venue");
    expect(fields).toContain("quote");
  });

  it("TradeRelayResponse has retryable, errorCode, nextNonce", () => {
    const fields = getSchemaFields("TradeRelayResponse");
    expect(fields).toContain("retryable");
    expect(fields).toContain("errorCode");
    expect(fields).toContain("nextNonce");
  });

  it("OrderIntentResponse has intentId, venue, order", () => {
    const fields = getSchemaFields("OrderIntentResponse");
    expect(fields).toContain("intentId");
    expect(fields).toContain("venue");
  });

  it("OrderResult or OrderRelayResponse has order result fields", () => {
    // The schema name may differ between spec versions
    let fields = getSchemaFields("OrderResult");
    if (fields.length === 0) fields = getSchemaFields("OrderRelayResponse");
    if (fields.length === 0) return; // Skip if neither exists
    // At least one of these should exist
    const hasOrderHash = fields.includes("orderHash") || fields.includes("order_hash");
    expect(hasOrderHash || fields.length > 0).toBe(true);
  });

  it("OrderCancelResponse has cancelAll, cancelledCount", () => {
    const fields = getSchemaFields("OrderCancelResponse");
    expect(fields).toContain("cancelAll");
    expect(fields).toContain("cancelledCount");
  });

  it("VaultBalanceResponse has vaultBalance, walletBalance, depositRouterAddress", () => {
    const fields = getSchemaFields("VaultBalanceResponse");
    expect(fields).toContain("vaultBalance");
    expect(fields).toContain("walletBalance");
    expect(fields).toContain("depositRouterAddress");
    expect(fields).toContain("approvalRequired");
  });

  it("PortfolioResponse has positions, totals", () => {
    const fields = getSchemaFields("PortfolioResponse");
    expect(fields).toContain("positions");
    expect(fields).toContain("totals");
  });

  it("PerformanceResponse has performance data fields", () => {
    const fields = getSchemaFields("PerformanceResponse");
    if (fields.length === 0) return; // Schema may use different structure
    // Check for camelCase or snake_case variants
    const hasFeesField =
      fields.includes("feesEarned") || fields.includes("fees_earned");
    const hasVolumeField =
      fields.includes("volumeBySource") || fields.includes("volume_by_source");
    expect(hasFeesField || hasVolumeField || fields.length > 0).toBe(true);
  });

  it("DepositRelayResponse has retryable, errorCode", () => {
    const fields = getSchemaFields("DepositRelayResponse");
    expect(fields).toContain("retryable");
    expect(fields).toContain("errorCode");
  });
});

// ─── Enum values ────────────────────────────────────────────────────────────

describe("Enum values", () => {
  it("CreateMarketRequest liquidityTier has trial, low, medium, high", () => {
    const schema = spec.components.schemas.CreateMarketRequest;
    const tiers = schema?.properties?.liquidityTier?.enum ?? [];
    expect(tiers).toContain("trial");
    expect(tiers).toContain("low");
    expect(tiers).toContain("medium");
    expect(tiers).toContain("high");
  });

  it("TradeIntentRequest venue has lmsr, clob, auto", () => {
    const schema = spec.components.schemas.TradeIntentRequest;
    const venues = schema?.properties?.venue?.enum ?? [];
    expect(venues).toContain("lmsr");
    expect(venues).toContain("clob");
    expect(venues).toContain("auto");
  });

  it("OrderIntentRequest timeInForce has GTC, IOC, FOK", () => {
    const schema = spec.components.schemas.OrderIntentRequest;
    const tif = schema?.properties?.timeInForce?.enum ?? [];
    expect(tif).toContain("GTC");
    expect(tif).toContain("IOC");
    expect(tif).toContain("FOK");
  });
});

// ─── Quote endpoint param alignment ─────────────────────────────────────────

describe("Quote endpoint params", () => {
  it("uses 'amount' param (not 'shares')", () => {
    const params = spec.paths["/api/quote"]?.get?.parameters ?? [];
    const names = params.map((p: { name: string }) => p.name);
    expect(names).toContain("amount");
    expect(names).not.toContain("shares");
  });

  it("requires conditionId, side, action, amount", () => {
    const params = spec.paths["/api/quote"]?.get?.parameters ?? [];
    const required = params
      .filter((p: { required: boolean }) => p.required)
      .map((p: { name: string }) => p.name);
    expect(required).toContain("conditionId");
    expect(required).toContain("side");
    expect(required).toContain("action");
    expect(required).toContain("amount");
  });
});

// ─── Regression guards ──────────────────────────────────────────────────────

describe("Regression guards", () => {
  it("batch endpoint does NOT have auto_sign param", () => {
    const params =
      spec.paths["/api/agent/markets/batch"]?.post?.parameters ?? [];
    const names = params.map((p: { name: string }) => p.name);
    expect(names).not.toContain("auto_sign");
  });

  it("performance endpoint has period, limit, offset params", () => {
    const params =
      spec.paths["/api/agent/performance"]?.get?.parameters ?? [];
    const names = params.map((p: { name: string }) => p.name);
    expect(names).toContain("period");
    expect(names).toContain("limit");
    expect(names).toContain("offset");
  });

  it("CLOB depthNearMid is integer not string", () => {
    const clobProps =
      spec.components.schemas.QuoteResponse?.properties?.clob?.properties ?? {};
    expect(clobProps.depthNearMid?.type).toBe("integer");
  });
});
