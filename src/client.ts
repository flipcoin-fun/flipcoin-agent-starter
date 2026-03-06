import type {
  Market,
  CreateMarketParams,
  CreateMarketResult,
  ValidateResult,
  TradeParams,
  TradeResult,
  Quote,
  OrderParams,
  OrderResult,
  Order,
  Position,
  PingResponse,
  ConfigResponse,
  ExploreResponse,
  GetMarketsOptions,
} from "./types.js";

// ─── Helpers ───────────────────────────────────────────────────

/** Convert human-readable USDC (e.g. 10) to raw 6-decimal string ("10000000") */
export function usdcToRaw(amount: number): string {
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
        "API key is required. Get one at https://www.flipcoin.fun/agents",
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://www.flipcoin.fun";
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
        error.error || error.message || "Unknown error",
        error,
      );
    }

    return res.json() as Promise<T>;
  }

  // ── Health & Config ────────────────────────────────────────

  /** Health check — verifies API key and returns agent info */
  async ping(): Promise<PingResponse> {
    return this.request("GET", "/api/agent/ping");
  }

  /** Platform config — contract addresses, fees, limits */
  async getConfig(): Promise<ConfigResponse> {
    return this.request("GET", "/api/agent/config");
  }

  // ── Markets ────────────────────────────────────────────────

  /** Explore all markets on the platform */
  async getMarkets(options?: GetMarketsOptions): Promise<ExploreResponse> {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.sort) params.sort = options.sort;
    if (options?.search) params.search = options.search;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    return this.request("GET", "/api/agent/markets/explore", { params });
  }

  /** Get details for a single market */
  async getMarket(address: string): Promise<{ market: Market }> {
    return this.request("GET", `/api/agent/markets/${address}`);
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

  // ── Trading (LMSR via BackstopRouter) ──────────────────────

  /**
   * Get a price quote for a trade.
   *
   * @param conditionId  Market condition ID
   * @param side         "yes" or "no"
   * @param action       "buy" or "sell"
   * @param amount       USDC amount (human-readable, e.g. 10 = $10)
   */
  async getQuote(
    conditionId: string,
    side: "yes" | "no",
    action: "buy" | "sell",
    amount: number,
  ): Promise<Quote> {
    return this.request("GET", "/api/quote", {
      params: {
        conditionId,
        side,
        action,
        amount: usdcToRaw(amount),
      },
    });
  }

  /**
   * Execute a trade (buy/sell YES/NO shares).
   *
   * Combines intent + relay in one call using auto_sign.
   * Requires an active session key with on-chain delegation.
   *
   * @param params.conditionId  Market condition ID
   * @param params.side         "yes" or "no"
   * @param params.action       "buy" (default) or "sell"
   * @param params.amount       USDC amount (human-readable, e.g. 10 = $10)
   * @param params.slippageBps  Max slippage (default 500 = 5%)
   */
  async trade(params: TradeParams): Promise<TradeResult> {
    // Step 1: Create intent
    const intent = await this.request<{ intentId: string }>(
      "POST",
      "/api/agent/trade/intent",
      {
        body: {
          conditionId: params.conditionId,
          side: params.side,
          action: params.action || "buy",
          amount: usdcToRaw(params.amount),
          slippageBps: params.slippageBps || 500,
          auto_sign: true,
        },
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

  // ── CLOB Orders (Exchange) ─────────────────────────────────

  /**
   * Place a limit order on the CLOB order book.
   *
   * Combines intent + relay in one call using auto_sign.
   *
   * @param params.conditionId  Market condition ID
   * @param params.side         "yes" or "no"
   * @param params.priceBps     Limit price in bps (e.g. 4500 = $0.45)
   * @param params.shares       Number of shares (human-readable, e.g. 10)
   * @param params.timeInForce  "GTC" (default), "IOC", or "FOK"
   */
  async createOrder(params: OrderParams): Promise<OrderResult> {
    // Step 1: Create intent
    const intent = await this.request<{ intentId: string }>(
      "POST",
      "/api/agent/orders/intent",
      {
        body: {
          conditionId: params.conditionId,
          side: params.side,
          priceBps: params.priceBps,
          shares: usdcToRaw(params.shares),
          timeInForce: params.timeInForce || "GTC",
          auto_sign: true,
        },
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

  /** List your CLOB orders */
  async getOrders(status?: "open" | "filled" | "cancelled" | "all"): Promise<{ orders: Order[] }> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return this.request("GET", "/api/agent/orders", { params });
  }

  /** Cancel a CLOB order */
  async cancelOrder(orderHash: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/agent/orders/${orderHash}`);
  }

  // ── Portfolio ──────────────────────────────────────────────

  /** Get your open/closed positions */
  async getPortfolio(status?: "open" | "closed" | "all"): Promise<{ positions: Position[] }> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return this.request("GET", "/api/agent/portfolio", { params });
  }
}
