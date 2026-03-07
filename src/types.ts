// ─── Market ────────────────────────────────────────────────────

/** Market summary (from explore/list endpoints) */
export interface MarketSummary {
  id: string;
  marketAddr: string;
  /** Bytes32 condition ID for trading endpoints. Null for v1 markets. */
  conditionId: string | null;
  title: string;
  description?: string;
  status: "open" | "paused" | "pending" | "resolved";
  volumeUsdc: number;
  liquidityUsdc?: number;
  tradesCount: number;
  createdAt: string;
  resolveEndAt?: string;
  resolvedOutcome?: boolean | null;
  resolutionCriteria?: string | null;
  resolutionSource?: string | null;
  resolutionDate?: string | null;
  category?: string | null;
  fingerprint?: string;
}

/** Full market details (from GET /api/agent/markets/{address}) */
export interface Market extends MarketSummary {
  currentPriceYesBps?: number;
  currentPriceNoBps?: number;
  agentMetadata?: AgentMetadata;
  resolution?: ResolutionInfo;
}

export interface ResolutionInfo {
  proposedOutcome: "yes" | "no" | null;
  proposedAt: string | null;
  finalizeAfter: string | null;
  canFinalize: boolean;
  disputeTimeRemaining: number;
  isDisputed: boolean;
}

export interface AgentMetadata {
  reasoning?: string;
  confidence?: number;
  sources?: string[];
  modelId?: string;
  tags?: string[];
}

export interface Trade {
  trader: string;
  side: "yes" | "no";
  amountUsdc: number;
  shares: number;
  fee: number;
  priceYesBps: number;
  txHash: string;
  blockNumber: number;
  eventTime: string;
}

// ─── Market Creation ──────────────────────────────────────────

export interface CreateMarketParams {
  title: string;
  resolutionCriteria: string;
  resolutionSource: string;
  resolutionDate?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  resolveStartAt?: string;
  resolveEndAt?: string;
  liquidityTier?: "trial" | "low" | "medium" | "high";
  initialPriceYesBps?: number;
  metadata?: AgentMetadata;
}

export interface CreateMarketResult {
  success: boolean;
  status: "pending" | "success" | "failed";
  requestId: string;
  /** Contract address (auto_sign only) */
  marketAddr?: string;
  /** Transaction hash (auto_sign only) */
  txHash?: string;
  /** Condition ID (auto_sign only) */
  conditionId?: string;
  /** EIP-712 typed data for manual signing (Mode A) */
  typedData?: EIP712TypedData;
}

export interface ValidateResult {
  success: boolean;
  valid: boolean;
  issues: Array<{
    field: string;
    code: string;
    message: string;
    severity: "error" | "warning";
  }>;
  duplicateCheck?: {
    hasDuplicates: boolean;
    similarMarkets: Array<{
      marketAddr: string;
      title: string;
      status: string;
      fingerprint: string;
      createdAt: string;
    }>;
  };
  preview?: {
    slug: string;
    fingerprint: string;
    seedUsdc: string;
    initialPriceYesBps: number;
    deadline: string;
    estimatedMaxLoss: string;
    liquidityTier: string;
  };
}

// ─── Trading (LMSR) ──────────────────────────────────────────

export interface TradeParams {
  /** Market condition ID (bytes32 hex) */
  conditionId: string;
  /** YES or NO */
  side: "yes" | "no";
  /** buy or sell (default: buy) */
  action?: "buy" | "sell";
  /**
   * Amount in USDC for buy, shares for sell (human-readable, e.g. 10 = $10 or 10 shares).
   * Converted to base units (6 decimals) automatically.
   */
  amount: number;
  /** Max slippage in bps (default: 100 = 1%) */
  maxSlippageBps?: number;
  /** Max fee in bps */
  maxFeeBps?: number;
  /** Execution venue: lmsr, clob, or auto (default: auto) */
  venue?: "lmsr" | "clob" | "auto";
}

export interface TradeIntentResponse {
  intentId: string;
  status: "awaiting_relay";
  venue: "lmsr" | "clob";
  quote: {
    sharesOut: string;
    fee: string;
    priceImpactBps: number;
    avgPriceBps: number;
  };
  typedData?: EIP712TypedData;
  balanceCheck?: BalanceCheck;
  priceImpactGuard?: PriceImpactGuard;
}

export interface TradeResult {
  intentId: string;
  status: "confirmed" | "failed";
  venue: "lmsr";
  txHash?: string;
  sharesOut?: string;
  usdcOut?: string;
  feeUsdc?: string;
  nextNonce?: string | null;
  error?: string | null;
  errorCode?: string | null;
  retryable?: boolean;
}

// ─── Quote ────────────────────────────────────────────────────

export interface QuoteResponse {
  quoteId: string;
  conditionId: string;
  side: "yes" | "no";
  action: "buy" | "sell";
  amount: string;
  /** Recommended execution venue */
  venue: "lmsr" | "clob";
  /** Human-readable routing explanation */
  reason: string;
  /** True if CLOB can only partially fill */
  mayPartialFill?: boolean;
  /** Quote validity window (~6 seconds) */
  validUntil: string;
  splitLegs?: {
    clob: { shares: string; cost: string; avgPriceBps: number };
    lmsr: { shares: string; cost: string; avgPriceBps: number };
  };
  lmsr?: {
    available: boolean;
    sharesOut: string;
    amountOut: string;
    fee: string;
    priceYesBps: number;
    priceNoBps: number;
    newPriceYesBps: number;
    priceImpactBps: number;
    avgPriceBps: number;
  };
  clob?: {
    available: boolean;
    canFillFull: boolean;
    sharesOut: string;
    amountOut: string;
    avgPriceBps: number;
    levelsUsed: number;
    bestBidBps: number;
    bestAskBps: number;
    spreadBps: number;
    depthNearMid: number;
  };
  priceImpactGuard?: PriceImpactGuard;
}

// ─── CLOB Orders ──────────────────────────────────────────────

export interface OrderParams {
  /** Market condition ID (bytes32 hex) */
  conditionId: string;
  /** YES or NO */
  side: "yes" | "no";
  /** buy or sell */
  action: "buy" | "sell";
  /** Limit price in bps (1-9999, e.g. 4500 = $0.45) */
  priceBps: number;
  /** Number of shares (human-readable, e.g. 10 = 10 shares) */
  amount: number;
  /** Time-in-force: GTC (resting), IOC (immediate), FOK (all-or-nothing) */
  timeInForce?: "GTC" | "IOC" | "FOK";
  /** Order expiry in seconds from now (default: 7 days, max: 90 days) */
  expirationSeconds?: number;
  /** Max acceptable fee in bps */
  maxFeeBps?: number;
}

export interface OrderIntentResponse {
  intentId: string;
  status: "awaiting_relay";
  venue: "clob";
  order: {
    conditionId: string;
    side: string;
    action: string;
    priceBps: number;
    amount: string;
    timeInForce: string;
    tokenId: string;
    salt: string;
    makerAmount: string;
    takerAmount: string;
    expiration: string;
    nonce: string;
    maxFeeBps: number;
  };
  typedData?: EIP712TypedData;
  matchEstimate?: {
    fillableShares: string;
    fillableUsdc: string;
    canFillFull: boolean;
    levelsUsed: number;
  };
  balanceCheck?: BalanceCheck;
}

export interface OrderResult {
  intentId: string;
  status: "open" | "partially_filled" | "filled" | "cancelled";
  venue: "clob";
  orderHash: string;
  fills: Array<{
    matchType: "COMPLEMENTARY" | "MINT" | "MERGE";
    fillAmount: string;
    counterpartyHash: string;
  }>;
  filledShares: string;
  totalShares: string;
  unfilled: string;
  error?: string | null;
  errorCode?: string | null;
  idempotent?: boolean;
}

export interface ClobOrder {
  orderHash: string;
  conditionId: string;
  tokenId: string;
  side: "yes" | "no";
  isBuy: boolean;
  priceBps: number;
  totalShares: number;
  filledShares: number;
  filledPercent: number;
  /** Effective status. For cancelled IOC orders with fills, shows 'partially_filled'. */
  status: "open" | "partially_filled" | "filled" | "cancelled";
  /** Raw database status. May differ from `status` for IOC orders with partial fills. */
  dbStatus?: string;
  timeInForce: "GTC" | "IOC" | "FOK";
  expiration: string;
  autoSign: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Portfolio ────────────────────────────────────────────────

export interface Position {
  marketAddr: string;
  title: string;
  status: string;
  yesShares: number;
  noShares: number;
  netSide: "yes" | "no";
  netShares: number;
  avgEntryPriceUsdc: number;
  currentPriceBps: number;
  currentValueUsdc: number;
  pnlUsdc: number;
  lastTradeAt: string;
}

// ─── Market State ─────────────────────────────────────────────

export interface MarketState {
  success: boolean;
  market: string;
  conditionId: string | null;
  lmsr: {
    qYes: string;
    qNo: string;
    b: string;
    priceYesBps: number;
    priceNoBps: number;
  };
  analytics: {
    volume24h: string;
    trades24h: number;
    liquidityUsdc: string;
  };
  slippageCurve: Array<{
    amountUsdc: string;
    priceImpactBps: number;
    effectivePriceBps: number;
  }>;
}

// ─── Market History ───────────────────────────────────────────

export interface HistoryPoint {
  timestamp?: string;
  timestampStart?: string;
  priceYesBps?: number;
  priceYesBpsOpen?: number;
  priceYesBpsHigh?: number;
  priceYesBpsLow?: number;
  priceYesBpsClose?: number;
  volumeUsdc?: number;
  tradesCount?: number;
  blockNumber?: number;
}

export interface MarketHistoryResponse {
  history: HistoryPoint[];
  interval?: string;
}

export interface GetHistoryOptions {
  interval?: "raw" | "1m" | "5m" | "1h" | "1d";
  from?: string;
  to?: string;
  includeVolume?: boolean;
  limit?: number;
}

// ─── Performance ──────────────────────────────────────────────

export interface PerformanceResponse {
  success: boolean;
  feesEarned: string;
  volumeBySource: {
    backstop: string;
    clob: string;
    total: string;
  };
  byCategory: Array<{
    category: string;
    volume: string;
    fees: string;
    markets: number;
  }>;
  byMarket: Array<{
    marketAddr: string;
    title: string;
    volume: string;
    fees: string;
  }>;
  period: string;
}

// ─── Audit Log ────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  pagination: Pagination;
}

export interface GetAuditLogOptions {
  limit?: number;
  offset?: number;
  eventType?: string;
  since?: string;
  before?: string;
}

// ─── Feed ─────────────────────────────────────────────────────

export interface FeedEvent {
  type: "market_created" | "trade" | "market_resolved" | "resolution_proposed";
  timestamp: string;
  data: Record<string, unknown>;
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

// ─── Webhooks ─────────────────────────────────────────────────

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

// ─── Batch Markets ────────────────────────────────────────────

export interface BatchMarketItem {
  title: string;
  resolutionCriteria: string;
  resolutionSource: string;
  resolutionDate?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  resolveStartAt?: string;
  resolveEndAt?: string;
  liquidityTier?: "trial" | "low" | "medium" | "high";
  initialPriceYesBps?: number;
  metadata?: AgentMetadata;
}

export interface BatchResult {
  success: boolean;
  results: Array<{
    index: number;
    status: "pending" | "error";
    requestId?: string;
    typedData?: EIP712TypedData;
    error?: { code: string; message: string };
  }>;
  summary: {
    total: number;
    pending: number;
    errors: number;
  };
}

// ─── Responses ────────────────────────────────────────────────

export interface PingResponse {
  ok: boolean;
  agent: {
    name: string;
  };
  rateLimit: RateLimitInfo;
  fees: FeeInfo;
}

export interface FeeInfo {
  tier: "early_adopter" | "standard";
  creatorFeeBps: number;
  protocolFeeBps: number;
  totalFeeBps: number;
  resolutionFeeBps: number;
  creatorFeePercent: string;
  totalFeePercent: string;
  earlyAdopter: {
    isEarlyAdopter: boolean;
    activationRank: number | null;
    slotsTotal: number;
    slotsRemaining: number;
  };
  seedSubsidy?: {
    eligible: boolean;
    total: number;
    used: number;
    remaining: number;
  };
}

export interface RateLimitInfo {
  read: RateLimitBucket;
  write: RateLimitBucket;
  create: RateLimitBucket;
  trade: RateLimitBucket;
  dailyMarkets: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
}

export interface RateLimitBucket {
  remaining: number;
  limit: number;
  window: string;
  resetAt: string;
}

export interface ConfigResponse {
  success: boolean;
  chainId: number;
  mode: "testnet" | "mainnet";
  feeRecipientPolicy: string;
  contracts: {
    v1: { factory: string; vault: string };
    v2: {
      factory: string;
      vault: string;
      exchange: string;
      backstopRouter: string;
      shareToken: string;
      delegationRegistry: string;
      depositRouter: string;
    };
  };
  capabilities: {
    relay: boolean;
    autoSign: boolean;
    sessionKeys: boolean;
    treasury: boolean;
    deposit: boolean;
  };
  limits: {
    minTradeUsdc: string;
    maxTradeUsdc: string;
  };
  trading: {
    venues: string[];
    autoSign: {
      maxTradeUsdc: string;
      maxTxPerMinute: number;
      maxDepositUsdc: string;
      maxDepositPerMinute: number;
    };
    quoteValiditySeconds: number;
  };
  vault: {
    minDepositUsdc: string;
    maxDepositUsdc: string;
  };
  units: {
    usdcDecimals: number;
    priceUnit: string;
    volumeDefinition: string;
  };
}

export interface ExploreResponse {
  markets: MarketSummary[];
  pagination: Pagination;
}

/** Response from GET /api/agent/markets (agent's own markets) */
export interface AgentMarketsListResponse {
  markets: Market[];
  pendingRequests: Array<{
    requestId: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}

/** Leaderboard entry from GET /api/agents/leaderboard */
export interface LeaderboardEntry {
  rank: number;
  agentName: string;
  ownerAddr: string;
  volume: string;
  fees: string;
  marketsCreated: number;
}

/** Response from GET /api/agents/leaderboard */
export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  metric: string;
}

export interface Pagination {
  offset: number;
  limit: number;
  total: number;
  hasMore?: boolean;
}

export interface GetMarketsOptions {
  status?: "open" | "resolved" | "pending" | "all";
  sort?: "volume" | "created" | "trades" | "deadlineSoon";
  search?: string;
  fingerprint?: string;
  createdByAgent?: string;
  creatorAddr?: string;
  minVolume?: number;
  resolveEndBefore?: string;
  resolveEndAfter?: string;
  limit?: number;
  offset?: number;
}

export interface MarketDetailsResponse {
  market: Market;
  recentTrades: Trade[];
  stats: {
    volume24h: string;
    trades24h: number;
  };
}

// ─── Vault Deposits ───────────────────────────────────────────

export interface VaultBalanceResponse {
  vaultBalance: string;
  walletBalance: string;
  allowance: string;
  depositRouterAddress: string | null;
  approvalRequired: boolean;
  recentDeposits: Array<{
    id: string;
    amount: string;
    status: "awaiting_relay" | "submitted" | "confirmed" | "failed";
    txHash: string | null;
    createdAt: string;
  }>;
}

export interface DepositIntentResponse {
  intentId: string;
  typedData: EIP712TypedData;
  validUntil: string;
  preflight: {
    vaultBalance: string;
    walletBalance: string;
    allowance: string;
    sufficientBalance: boolean;
    sufficientAllowance: boolean;
  };
  approvalRequired?: {
    contract: string;
    function: string;
    spender: string;
    amount: string;
    hint: string;
  } | null;
}

export interface DepositResult {
  intentId: string;
  status: "confirmed" | "failed";
  txHash: string | null;
  amount: string;
  nextNonce?: string | null;
  error?: string | null;
  errorCode?: string | null;
  retryable?: boolean;
}

// ─── Approval Status ──────────────────────────────────────────

export interface ApprovalStatus {
  owner: string;
  shareToken: string;
  approvals: {
    backstopRouter: {
      operator: string;
      approved: boolean;
    };
    exchange: {
      operator: string;
      approved: boolean;
    };
  };
  allApproved: boolean;
  instructions?: string;
}

// ─── SSE Stream ───────────────────────────────────────────────

export interface StreamFeedOptions {
  /** Channels: "orderbook:{conditionId}", "trades:{conditionId}", "prices:{conditionId}" */
  channels: string[];
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

// ─── Trade Nonce ──────────────────────────────────────────────

export interface TradeNonceResponse {
  venue: "lmsr";
  nonce: number;
  signerAddress: string;
  contract: string;
}

// ─── Shared Types ─────────────────────────────────────────────

export interface EIP712TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, unknown>;
  primaryType: string;
  message: Record<string, unknown>;
  relayerInfo?: Record<string, unknown>;
}

export interface BalanceCheck {
  available: string;
  required: string;
  sufficient: boolean;
}

export interface PriceImpactGuard {
  currentPriceYesBps: number;
  newPriceYesBps: number;
  impactBps: number;
  maxAllowedImpactBps: number;
  level: "ok" | "warn" | "blocked";
}

export interface PortfolioResponse {
  positions: Position[];
  totals: {
    marketsActive: number;
    marketsResolved: number;
  };
}

export interface OrderCancelResponse {
  success: boolean;
  /** Order hash (single cancel only, null for mass cancel) */
  orderHash?: string | null;
  /** On-chain transaction hash (single cancel only) */
  txHash?: string | null;
  /** true when mass cancel was performed (mass cancel only) */
  cancelAll?: boolean;
  /** Number of orders cancelled (mass cancel only) */
  cancelledCount?: number;
}
