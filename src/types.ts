// ─── Market ────────────────────────────────────────────────────

export interface Market {
  id: string;
  marketAddr: string;
  conditionId: string;
  title: string;
  description?: string;
  status: "open" | "resolved" | "pending";
  category?: string;
  volumeUsdc: number;
  liquidityUsdc?: number;
  tradesCount: number;
  currentPriceYesBps: number;
  currentPriceNoBps: number;
  createdAt: string;
  resolveEndAt?: string;
  resolvedAt?: string;
  resolvedOutcome?: string;
  creatorAddr?: string;
  fingerprint?: string;
  agentMetadata?: Record<string, unknown>;
  // Resolution fields
  isPending?: boolean;
  proposedOutcome?: string;
  finalizeAfter?: string;
  canFinalize?: boolean;
  disputeTimeRemaining?: number;
}

export interface CreateMarketParams {
  title: string;
  resolutionCriteria: string;
  resolutionSource: string;
  description?: string;
  category?: string;
  resolutionDate?: string;
  resolveEndAt?: string;
  liquidityTier?: "trial" | "low" | "medium" | "high";
  initialPriceYesBps?: number;
  metadata?: {
    reasoning?: string;
    confidence?: number;
    sources?: string[];
    modelId?: string;
    tags?: string[];
  };
}

export interface CreateMarketResult {
  success: boolean;
  marketAddr: string;
  txHash: string;
  conditionId: string;
}

export interface ValidateResult {
  valid: boolean;
  issues: Array<{ code: string; severity: string; message: string }>;
  params: {
    seedUsdc: string;
    initialPriceYesBps: number;
    estimatedMaxLoss: string;
  };
  warnings: string[];
  similarMarkets?: Array<{
    marketAddr: string;
    title: string;
    similarityScore: number;
    status: string;
  }>;
}

// ─── Trading ───────────────────────────────────────────────────

export interface TradeParams {
  /** Market condition ID (bytes32 hex) */
  conditionId: string;
  /** YES or NO */
  side: "yes" | "no";
  /** buy or sell */
  action?: "buy" | "sell";
  /** Amount in USDC (human-readable, e.g. 10 = $10) */
  amount: number;
  /** Max slippage in bps (default 500 = 5%) */
  slippageBps?: number;
}

export interface TradeResult {
  success: boolean;
  conditionId: string;
  txHash: string;
  shares: string;
  fee: string;
  price: number;
}

export interface Quote {
  conditionId: string;
  side: string;
  action: string;
  shares: string;
  fee: string;
  price: number;
  priceImpact: number;
}

// ─── CLOB Orders ───────────────────────────────────────────────

export interface OrderParams {
  /** Market condition ID (bytes32 hex) */
  conditionId: string;
  /** YES or NO */
  side: "yes" | "no";
  /** Limit price in bps (100-9900) */
  priceBps: number;
  /** Shares amount in USDC (human-readable, e.g. 10 = 10 shares) */
  shares: number;
  /** Time-in-force: GTC (resting), IOC (immediate), FOK (all-or-nothing) */
  timeInForce?: "GTC" | "IOC" | "FOK";
}

export interface Order {
  orderHash: string;
  conditionId: string;
  side: string;
  priceBps: number;
  sharesPlaced: string;
  sharesFilled: string;
  sharesOpen: string;
  timeInForce: string;
  status: string;
  createdAt: string;
}

export interface OrderResult {
  success: boolean;
  orderHash: string;
  conditionId: string;
  status: string;
  fills: Array<{
    counterpartyHash: string;
    fillAmount: string;
    fillPrice: number;
    matchType: string;
  }>;
  unfilled: string;
}

// ─── Portfolio ──────────────────────────────────────────────────

export interface Position {
  marketAddr: string;
  title: string;
  status: string;
  yesShares: number;
  noShares: number;
  totalCostUsdc: string;
  currentValueUsdc: string;
  gainLossUsdc: string;
  gainLossPercent: number;
}

// ─── Responses ──────────────────────────────────────────────────

export interface PingResponse {
  agentId: string;
  agentName: string;
  ownerAddr: string;
  isActive: boolean;
  fees: {
    tier: string;
    makerFeeBps: number;
    takerFeeBps: number;
  };
}

export interface ConfigResponse {
  platform: {
    name: string;
    version: string;
    network: string;
    chainId: number;
  };
  contracts: Record<string, string>;
  fees: {
    makerFeeBps: number;
    takerFeeBps: number;
  };
  limits: {
    minTradeUsdc: string;
    maxTradeUsdc: string;
  };
}

export interface ExploreResponse {
  markets: Market[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface GetMarketsOptions {
  status?: "open" | "resolved" | "pending";
  sort?: "volume" | "created" | "trades" | "deadlineSoon";
  search?: string;
  limit?: number;
  offset?: number;
}
