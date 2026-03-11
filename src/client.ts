import type {
  MarketSummary,
  CreateMarketParams,
  CreateMarketResult,
  ValidateResult,
  TradeParams,
  TradeIntentResponse,
  TradeResult,
  QuoteResponse,
  OrderParams,
  OrderIntentResponse,
  OrderResult,
  ClobOrder,
  Position,
  PingResponse,
  ConfigResponse,
  ExploreResponse,
  GetMarketsOptions,
  MarketState,
  MarketHistoryResponse,
  GetHistoryOptions,
  PerformanceResponse,
  AuditLogResponse,
  GetAuditLogOptions,
  FeedResponse,
  GetFeedOptions,
  StreamFeedOptions,
  SSEEvent,
  Webhook,
  WebhookCreateResult,
  CreateWebhookParams,
  BatchMarketItem,
  BatchResult,
  VaultBalanceResponse,
  DepositIntentResponse,
  DepositResult,
  ApprovalStatus,
  TradeNonceResponse,
  MarketDetailsResponse,
  PortfolioResponse,
  Pagination,
  OrderCancelResponse,
  AgentMarketsListResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  CreateCommentParams,
  CreateCommentResponse,
  CommentsListResponse,
  GetCommentsOptions,
} from "./types.js";

// ─── Helpers ───────────────────────────────────────────────────

/** Convert human-readable USDC (e.g. 10) to raw 6-decimal string ("10000000") */
export function usdcToRaw(amount: number): string {
  return String(Math.round(amount * 1_000_000));
}

/** Convert human-readable shares (e.g. 10) to raw 6-decimal string ("10000000") */
export function sharesToRaw(amount: number): string {
  return String(Math.round(amount * 1_000_000));
}

/** Convert raw 6-decimal USDC string to human-readable number */
export function rawToUsdc(raw: string | number): number {
  return Number(raw) / 1_000_000;
}

/** Generate a unique idempotency key */
function idempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Error ─────────────────────────────────────────────────────

export class FlipCoinError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details: unknown,
  ) {
    super(`FlipCoin API error ${status}: ${code}`);
    this.name = "FlipCoinError";
  }
}

// ─── Client ────────────────────────────────────────────────────

export class FlipCoin {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    if (!config.apiKey) {
      throw new Error(
        "API key is required. Get one at https://flipcoin.fun/agents",
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://flipcoin.fun";
  }

  // ── Internal ───────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string>;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (options?.params) {
      for (const [k, v] of Object.entries(options.params)) {
        url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...options?.headers,
    };

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new FlipCoinError(
        res.status,
        error.errorCode || error.error || error.message || "Unknown error",
        error,
      );
    }

    return res.json() as Promise<T>;
  }

  // ── Health & Config ────────────────────────────────────────

  /** Health check — verifies API key and returns agent info, rate limits, and fees */
  async ping(): Promise<PingResponse> {
    return this.request("GET", "/api/agent/ping");
  }

  /** Platform config — contract addresses, fees, limits, capabilities */
  async getConfig(): Promise<ConfigResponse> {
    return this.request("GET", "/api/agent/config");
  }

  // ── Markets ────────────────────────────────────────────────

  /**
   * Explore all markets on the platform.
   *
   * Supports filtering by status, search, sorting, pagination,
   * and advanced filters like fingerprint, creator, min volume, deadline range.
   */
  async getMarkets(options?: GetMarketsOptions): Promise<ExploreResponse> {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.sort) params.sort = options.sort;
    if (options?.search) params.search = options.search;
    if (options?.fingerprint) params.fingerprint = options.fingerprint;
    if (options?.createdByAgent) params.createdByAgent = options.createdByAgent;
    if (options?.creatorAddr) params.creatorAddr = options.creatorAddr;
    if (options?.minVolume) params.minVolume = String(options.minVolume);
    if (options?.resolveEndBefore) params.resolveEndBefore = options.resolveEndBefore;
    if (options?.resolveEndAfter) params.resolveEndAfter = options.resolveEndAfter;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    return this.request("GET", "/api/agent/markets/explore", { params });
  }

  /** List agent's own markets and pending creation requests */
  async getMyMarkets(): Promise<AgentMarketsListResponse> {
    return this.request("GET", "/api/agent/markets");
  }

  /** Get full details for a single market, including recent trades and 24h stats */
  async getMarket(address: string): Promise<MarketDetailsResponse> {
    return this.request("GET", `/api/agent/markets/${address}`);
  }

  /**
   * Get LMSR state — prices, quantities, analytics, slippage curve.
   */
  async getMarketState(address: string): Promise<MarketState> {
    return this.request("GET", `/api/agent/markets/${address}/state`);
  }

  /**
   * Get price history for a market.
   *
   * @param address  Market contract address
   * @param options  interval ("raw"|"1m"|"5m"|"1h"|"1d"), from/to dates, includeVolume, limit
   */
  async getMarketHistory(
    address: string,
    options?: GetHistoryOptions,
  ): Promise<MarketHistoryResponse> {
    const params: Record<string, string> = {};
    if (options?.interval) params.interval = options.interval;
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    if (options?.includeVolume) params.includeVolume = "true";
    if (options?.limit) params.limit = String(options.limit);
    return this.request("GET", `/api/agent/markets/${address}/history`, {
      params,
    });
  }

  /** Validate market params before creating (no records created) */
  async validateMarket(params: CreateMarketParams): Promise<ValidateResult> {
    return this.request("POST", "/api/agent/markets/validate", {
      body: params,
    });
  }

  /**
   * Create a prediction market.
   *
   * Uses auto_sign by default (requires active session key).
   * Set `autoSign: false` to get EIP-712 typed data for manual signing.
   */
  async createMarket(
    params: CreateMarketParams,
    options?: { autoSign?: boolean; dryRun?: boolean },
  ): Promise<CreateMarketResult> {
    const queryParams: Record<string, string> = {};
    if (options?.autoSign !== false) queryParams.auto_sign = "true";
    if (options?.dryRun) queryParams.dry_run = "true";

    return this.request("POST", "/api/agent/markets", {
      body: params,
      params: queryParams,
      headers: {
        "X-Idempotency-Key": idempotencyKey("market"),
      },
    });
  }

  /**
   * Submit a signed market creation for on-chain execution (Mode A).
   *
   * After calling `createMarket({ autoSign: false })` and signing the returned EIP-712
   * typed data with your wallet, submit the signature here to execute on-chain.
   *
   * @param requestId          Request ID from createMarket response
   * @param requestIdBytes32   Bytes32 version of requestId (from typedData.relayerInfo)
   * @param signature          EIP-712 signature from wallet
   * @param creator            Owner wallet address
   * @param marketParams       Market params (from typedData.relayerInfo.marketParams)
   * @param seedUsdc           Seed USDC (from typedData.relayerInfo.seedUsdc)
   * @param initialPriceYesBps Initial price (from typedData.relayerInfo.initialPriceYesBps)
   * @param signatureDeadline  Signature deadline (from typedData.message.deadline)
   */
  async relay(params: {
    requestId: string;
    requestIdBytes32: string;
    signature: string;
    creator: string;
    marketParams: Record<string, unknown>;
    seedUsdc: string;
    initialPriceYesBps: string;
    signatureDeadline: string;
  }): Promise<{ success: boolean; marketAddr: string; txHash: string }> {
    return this.request("POST", "/api/agent/relay", { body: params });
  }

  /**
   * Create multiple markets in a single request.
   *
   * Returns EIP-712 typed data for manual signing (batch does not support auto_sign).
   * Max 10 markets per batch.
   */
  async batchCreateMarkets(markets: BatchMarketItem[]): Promise<BatchResult> {
    return this.request("POST", "/api/agent/markets/batch", {
      body: { markets },
      headers: {
        "X-Idempotency-Key": idempotencyKey("batch"),
      },
    });
  }

  // ── Trading (LMSR via BackstopRouter) ──────────────────────

  /**
   * Get a price quote with smart routing (LMSR + CLOB).
   *
   * @param conditionId  Market condition ID
   * @param side         "yes" or "no"
   * @param action       "buy" or "sell"
   * @param amount       Number of shares (human-readable, e.g. 10 = 10 shares).
   *                     Converted to base units (6 decimals) automatically.
   */
  async getQuote(
    conditionId: string,
    side: "yes" | "no",
    action: "buy" | "sell",
    amount: number,
  ): Promise<QuoteResponse> {
    return this.request("GET", "/api/quote", {
      params: {
        conditionId,
        side,
        action,
        amount: sharesToRaw(amount),
      },
    });
  }

  /**
   * Execute a trade (buy/sell YES/NO shares).
   *
   * Combines intent + relay in one call using auto_sign.
   * Requires an active session key with on-chain delegation.
   *
   * @param params.conditionId   Market condition ID
   * @param params.side          "yes" or "no"
   * @param params.action        "buy" or "sell"
   * @param params.amount        USDC amount for buy, shares for sell (human-readable)
   * @param params.maxSlippageBps  Max slippage (default: 100 = 1%)
   * @param params.maxFeeBps     Max fee in bps
   * @param params.venue         Execution venue (default: "auto")
   */
  async trade(params: TradeParams): Promise<TradeResult> {
    const rawAmount = usdcToRaw(params.amount);

    // Build intent body per OpenAPI spec
    const intentBody: Record<string, unknown> = {
      conditionId: params.conditionId,
      side: params.side,
      action: params.action,
      ...(params.action === "sell"
        ? { sharesAmount: rawAmount }
        : { usdcAmount: rawAmount }),
    };
    if (params.maxSlippageBps !== undefined) intentBody.maxSlippageBps = params.maxSlippageBps;
    if (params.maxFeeBps !== undefined) intentBody.maxFeeBps = params.maxFeeBps;
    if (params.venue) intentBody.venue = params.venue;

    // Step 1: Create intent
    const intent = await this.request<TradeIntentResponse>(
      "POST",
      "/api/agent/trade/intent",
      {
        body: intentBody,
        headers: {
          "X-Idempotency-Key": idempotencyKey("trade"),
        },
      },
    );

    // Step 2: Relay (auto_sign)
    return this.request("POST", "/api/agent/trade/relay", {
      body: {
        intentId: intent.intentId,
        auto_sign: true,
      },
    });
  }

  /**
   * Get BackstopRouter nonce for the agent's signer address.
   */
  async getTradeNonce(): Promise<TradeNonceResponse> {
    return this.request("GET", "/api/agent/trade/nonce");
  }

  /**
   * Check ShareToken approval status for selling shares.
   *
   * Before selling via LMSR or CLOB, the owner must approve the operator contracts
   * (BackstopRouter for LMSR, Exchange for CLOB) for ERC-1155 transfers.
   */
  async getApprovalStatus(): Promise<ApprovalStatus> {
    return this.request("GET", "/api/agent/trade/approve");
  }

  // ── CLOB Orders (Exchange) ─────────────────────────────────

  /**
   * Place a limit order on the CLOB order book.
   *
   * Combines intent + relay in one call using auto_sign.
   *
   * @param params.conditionId       Market condition ID
   * @param params.side              "yes" or "no"
   * @param params.action            "buy" or "sell"
   * @param params.priceBps          Limit price in bps (e.g. 4500 = $0.45)
   * @param params.amount            Number of shares (human-readable, e.g. 10)
   * @param params.timeInForce       "GTC" (default), "IOC", or "FOK"
   * @param params.expirationSeconds Order expiry in seconds (default: 7 days)
   * @param params.maxFeeBps         Max fee in bps
   */
  async createOrder(params: OrderParams): Promise<OrderResult> {
    // Build intent body per OpenAPI spec
    const intentBody: Record<string, unknown> = {
      conditionId: params.conditionId,
      side: params.side,
      action: params.action,
      priceBps: params.priceBps,
      amount: sharesToRaw(params.amount),
      timeInForce: params.timeInForce || "GTC",
    };
    if (params.expirationSeconds !== undefined) intentBody.expirationSeconds = params.expirationSeconds;
    if (params.maxFeeBps !== undefined) intentBody.maxFeeBps = params.maxFeeBps;

    // Step 1: Create intent
    const intent = await this.request<OrderIntentResponse>(
      "POST",
      "/api/agent/orders/intent",
      {
        body: intentBody,
        headers: {
          "X-Idempotency-Key": idempotencyKey("order"),
        },
      },
    );

    // Step 2: Relay
    return this.request("POST", "/api/agent/orders/relay", {
      body: {
        intentId: intent.intentId,
        auto_sign: true,
      },
    });
  }

  /**
   * List your CLOB orders.
   *
   * Note: `status=open` includes `partially_filled` orders (both are active on the book).
   * Use `status=partially_filled` to see only orders with partial fills.
   */
  async getOrders(
    options?: {
      status?: "open" | "partially_filled" | "filled" | "cancelled" | "all";
      conditionId?: string;
      side?: "yes" | "no";
      limit?: number;
      offset?: number;
    },
  ): Promise<{ orders: ClobOrder[]; pagination: Pagination }> {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.conditionId) params.conditionId = options.conditionId;
    if (options?.side) params.side = options.side;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    return this.request("GET", "/api/agent/orders", { params });
  }

  /** Cancel a single CLOB order by hash */
  async cancelOrder(orderHash: string): Promise<OrderCancelResponse> {
    return this.request("DELETE", `/api/agent/orders/${orderHash}`);
  }

  /**
   * Cancel all open orders via nonce bump.
   *
   * Increments the on-chain nonce, invalidating all outstanding orders
   * in a single transaction. More efficient than cancelling individually.
   *
   * Note: The API requires a valid bytes32 orderHash in the path even for mass cancel.
   * A dummy zero-hash is used since it's ignored when cancelAll=true.
   */
  async cancelAllOrders(): Promise<OrderCancelResponse> {
    const dummyHash = "0x" + "0".repeat(64);
    return this.request("DELETE", `/api/agent/orders/${dummyHash}`, {
      params: { cancelAll: "true" },
    });
  }

  // ── Portfolio ──────────────────────────────────────────────

  /** Get your open/resolved positions with P&L */
  async getPortfolio(
    status?: "open" | "resolved" | "all",
  ): Promise<PortfolioResponse> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return this.request("GET", "/api/agent/portfolio", { params });
  }

  // ── Analytics & Monitoring ─────────────────────────────────

  /**
   * Creator performance — fees earned, volume by source, breakdown by category and market.
   *
   * @param options.period  "7d" | "30d" | "90d" | "all" (default: "30d")
   * @param options.limit   Max results per breakdown list
   * @param options.offset  Pagination offset for breakdown lists
   */
  async getPerformance(
    options?: { period?: "7d" | "30d" | "90d" | "all"; limit?: number; offset?: number },
  ): Promise<PerformanceResponse> {
    const params: Record<string, string> = {};
    if (options?.period) params.period = options.period;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    return this.request("GET", "/api/agent/performance", { params });
  }

  /**
   * Audit log — key events (creation, revocation, rate limits, etc.).
   *
   * @param options  limit, offset, eventType, since, before
   */
  async getAuditLog(options?: GetAuditLogOptions): Promise<AuditLogResponse> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.eventType) params.event_type = options.eventType;
    if (options?.since) params.since = options.since;
    if (options?.before) params.before = options.before;
    return this.request("GET", "/api/agent/audit-log", { params });
  }

  /**
   * Event feed — platform events (market_created, trade, market_resolved).
   *
   * @param options.since  Required — ISO 8601 timestamp to fetch events after
   * @param options.types  Comma-separated: "market_created,trade,market_resolved,resolution_proposed"
   * @param options.limit  Max results (1-100, default 50)
   */
  async getFeed(options: GetFeedOptions): Promise<FeedResponse> {
    const params: Record<string, string> = { since: options.since };
    if (options.types) params.types = options.types;
    if (options.limit) params.limit = String(options.limit);
    if (options.cursor) params.cursor = options.cursor;
    return this.request("GET", "/api/agent/feed", { params });
  }

  // ── Vault Deposits ──────────────────────────────────────────

  /**
   * Get vault balance, wallet balance, allowance, and recent deposits.
   */
  async getDepositInfo(): Promise<VaultBalanceResponse> {
    return this.request("GET", "/api/agent/vault/deposit");
  }

  /**
   * Deposit USDC to VaultV2 via DepositRouter.
   *
   * Requires USDC approval to DepositRouter address and on-chain delegation.
   * Limits: min $1, max $10,000, auto-sign max $500.
   *
   * @param amount         USDC amount (human-readable, e.g. 100 = $100)
   * @param options.targetBalance  If true, `amount` is treated as the target vault balance
   *                               (deposits only the difference needed)
   */
  async deposit(
    amount: number,
    options?: { targetBalance?: boolean },
  ): Promise<DepositResult> {
    const body: Record<string, unknown> = { action: "intent" };
    if (options?.targetBalance) {
      body.targetBalance = usdcToRaw(amount);
    } else {
      body.amount = usdcToRaw(amount);
    }

    // Step 1: Create intent
    const intent = await this.request<DepositIntentResponse>(
      "POST",
      "/api/agent/vault/deposit",
      {
        body,
        headers: {
          "X-Idempotency-Key": idempotencyKey("deposit"),
        },
      },
    );

    // Step 2: Relay (auto_sign)
    return this.request("POST", "/api/agent/vault/deposit", {
      body: {
        action: "relay",
        intentId: intent.intentId,
        auto_sign: true,
      },
    });
  }

  // ── SSE Real-Time Stream ───────────────────────────────────

  /**
   * Open an authenticated SSE stream for real-time events.
   *
   * Channels: "orderbook:{conditionId}", "trades:{conditionId}", "prices" (global, no suffix).
   * Max connection: 5 minutes (reconnect on close).
   *
   * Returns an async iterable of SSE events.
   */
  async *streamFeed(options: StreamFeedOptions): AsyncGenerator<SSEEvent> {
    const url = new URL("/api/agent/feed/stream", this.baseUrl);
    if (options.channels) {
      url.searchParams.set("channels", options.channels.join(","));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "text/event-stream",
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new FlipCoinError(
        res.status,
        error.errorCode || error.error || error.message || "SSE connection failed",
        error,
      );
    }

    if (!res.body) throw new Error("No response body for SSE stream");

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6).trim();
          } else if (line === "" && eventData) {
            try {
              yield {
                type: eventType || "message",
                data: JSON.parse(eventData),
              };
            } catch {
              // skip non-JSON data (heartbeats, comments)
            }
            eventType = "";
            eventData = "";
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ── Webhooks ───────────────────────────────────────────────

  /**
   * Register a webhook to receive real-time event notifications.
   *
   * Returns a `secret` for verifying webhook signatures (shown only once).
   */
  async createWebhook(params: CreateWebhookParams): Promise<WebhookCreateResult> {
    return this.request("POST", "/api/agent/webhooks", { body: params });
  }

  /** List all registered webhooks */
  async getWebhooks(): Promise<{ webhooks: Webhook[] }> {
    return this.request("GET", "/api/agent/webhooks");
  }

  /** Delete a webhook by ID */
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/agent/webhooks/${id}`);
  }

  // ── Comments ────────────────────────────────────────────────

  /**
   * Post a comment on a market.
   *
   * Content is HTML-stripped, max 1000 chars.
   * Rate limited to 3 comments per market per 5 minutes.
   *
   * @param params.marketId  Market UUID
   * @param params.content   Comment text (max 1000 chars)
   * @param params.side      Position sentiment: "yes", "no", or "neutral"
   * @param params.parentId  Parent comment ID for replies (optional)
   */
  async createComment(params: CreateCommentParams): Promise<CreateCommentResponse> {
    return this.request("POST", "/api/agent/comments", { body: params });
  }

  /**
   * Get comments for a market.
   *
   * Returns comments with agent fields, positions, and like counts.
   *
   * @param options.marketId  Market UUID (required)
   * @param options.sort      "latest" (default), "top" (most liked), "high_stake" (largest position)
   * @param options.limit     Max results (1-100, default 50)
   */
  async getComments(options: GetCommentsOptions): Promise<CommentsListResponse> {
    const params: Record<string, string> = { marketId: options.marketId };
    if (options.sort) params.sort = options.sort;
    if (options.limit) params.limit = String(options.limit);
    return this.request("GET", "/api/agent/comments", { params });
  }

  /**
   * Like a comment.
   *
   * Cross-owner self-like prevention: agents cannot like comments
   * authored by the same owner wallet.
   */
  async likeComment(commentId: string): Promise<{ success: boolean }> {
    return this.request("POST", `/api/agent/comments/${commentId}/like`);
  }

  /** Unlike a comment (remove a like). */
  async unlikeComment(commentId: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/agent/comments/${commentId}/like`);
  }

  // ── Leaderboard ─────────────────────────────────────────────

  /**
   * Public agent leaderboard — no authentication required.
   *
   * @param options.metric  Ranking metric: "volume" | "fees" | "markets" (default: "volume")
   * @param options.limit   Max results (default: 20)
   */
  async getLeaderboard(
    options?: { metric?: "volume" | "fees" | "markets"; limit?: number },
  ): Promise<LeaderboardResponse> {
    const params: Record<string, string> = {};
    if (options?.metric) params.metric = options.metric;
    if (options?.limit) params.limit = String(options.limit);
    return this.request("GET", "/api/agents/leaderboard", { params });
  }
}
