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

// ─── Market State ──────────────────────────────────────────────

export interface SlippageCurveEntry {
  amountUsdc: number;
  baselinePriceYesBps: number;
  postTradePriceYesBps: number;
  priceImpactBps: number;
  avgFillPriceExFeeBps: number;
  avgFillPriceInclFeeBps: number;
  sharesOut: string;
}

export interface MarketState {
  schemaVersion: string;
  units: {
    usdc: string;
    shares: string;
    bps: string;
    q: string;
  };
  market: string;
  conditionId: string | null;
  lmsrState: {
    bRaw: string;
    b: string;
    qYesRaw: string;
    qYes: string;
    qNoRaw: string;
    qNo: string;
    feeBps: number;
    priceYesBps: number;
    priceNoBps: number;
    yesSharesTotal: string;
    noSharesTotal: string;
  };
  analytics: {
    skew: string;
    stateImbalance: string;
    maxLossUsdc: string;
  };
  slippageCurve: {
    buyYes: SlippageCurveEntry[];
    buyNo: SlippageCurveEntry[];
  };
}

// ─── Market History ────────────────────────────────────────────

export interface HistoryPointRaw {
  timestamp: string;
  priceYesBps: number;
  blockNumber: number;
  volumeUsdc?: number;
}

export interface HistoryPointOHLC {
  timestampStart: string;
  priceYesBpsOpen: number;
  priceYesBpsHigh: number;
  priceYesBpsLow: number;
  priceYesBpsClose: number;
  volumeUsdc?: number;
  tradesCount?: number;
}

export interface MarketHistoryResponse {
  history: HistoryPointRaw[] | HistoryPointOHLC[];
  interval?: string;
}

export interface GetHistoryOptions {
  interval?: "raw" | "1m" | "5m" | "1h" | "1d";
  from?: string;
  to?: string;
  includeVolume?: boolean;
  limit?: number;
}

// ─── Performance ───────────────────────────────────────────────

export interface PerformanceResponse {
  period: string;
  volumeDefinition: string;
  creatorStats: {
    marketsCreated: number;
    marketsResolved: number;
    totalVolumeUsdc: string;
    avgVolumePerMarket: string;
    creatorFeesEarnedUsdc: string;
    volumeBySource: {
      backstop: string;
      clob: string;
    };
  };
  byCategory: Array<{
    category: string;
    volumeUsdc: string;
    feesEarnedUsdc: string;
    markets: number;
    trades: number;
  }>;
  byMarket: Array<{
    marketAddr: string;
    title: string;
    volumeUsdc: string;
    feesEarnedUsdc: string;
    trades: number;
  }>;
  activity: {
    totalTrades: number;
    avgTradeSizeUsdc: string;
    totalFeesUsdc: string;
  };
}

// ─── Audit Log ─────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface GetAuditLogOptions {
  limit?: number;
  offset?: number;
  eventType?: string;
  since?: string;
  before?: string;
}

// ─── Feed ──────────────────────────────────────────────────────

export interface FeedEvent {
  type: string;
  timestamp: string;
  data: {
    marketAddr: string | null;
    title: string;
    txHash: string | null;
    [key: string]: unknown;
  };
}

export interface FeedResponse {
  events: FeedEvent[];
  cursor: string;
  hasMore: boolean;
}

export interface GetFeedOptions {
  since: string;
  types?: string;
  limit?: number;
}

// ─── Webhooks ──────────────────────────────────────────────────

export interface Webhook {
  id: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: string | null;
  consecutiveFailures?: number;
}

export interface WebhookCreateResult {
  webhook: Webhook & { secret: string };
  message: string;
}

export interface CreateWebhookParams {
  url: string;
  eventTypes: string[];
}

// ─── Batch Markets ─────────────────────────────────────────────

export interface BatchMarketItem {
  title: string;
  resolutionCriteria: string;
  resolutionSource: string;
  description?: string;
  category?: string;
  resolveEndAt?: string;
  liquidityTier?: "low" | "medium" | "high";
  initialPriceYesBps?: number;
  metadata?: Record<string, unknown>;
}

export interface BatchResult {
  success: boolean;
  results: Array<{
    index: number;
    status: "pending" | "error";
    requestId?: string;
    error?: { code: string; message: string };
  }>;
  summary: {
    total: number;
    pending: number;
    errors: number;
  };
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

// ─── Vault Deposits ─────────────────────────────────────────────

export interface DepositInfo {
  vaultBalanceUsdc: string;
  walletBalanceUsdc: string;
  allowanceUsdc: string;
  recentDeposits: Array<{
    amount: string;
    txHash: string;
    createdAt: string;
  }>;
}

export interface DepositResult {
  success: boolean;
  txHash: string;
  amountUsdc: string;
}

// ─── SSE Stream ─────────────────────────────────────────────────

export interface StreamFeedOptions {
  /** Channels to subscribe: "orderbook:{conditionId}", "trades:{conditionId}", "prices:{conditionId}" */
  channels: string[];
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

// ─── Approval Status ────────────────────────────────────────────

export interface ApprovalStatus {
  conditionId: string;
  backstopRouter: {
    approved: boolean;
    operator: string;
  };
  exchange: {
    approved: boolean;
    operator: string;
  };
}
