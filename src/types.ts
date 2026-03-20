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
  /** ISO 8601 resolution deadline. Defaults to +7 days if omitted. No minimum; <24h triggers warning. Trial: max 30 days. */
  resolveEndAt?: string;
  resolvedOutcome?: boolean | null;
  imageUrl?: string | null;
  fingerprint?: string;
  /** Market creator wallet address. Explore endpoint only. */
  creatorAddr?: string | null;
  /** Last update timestamp. Explore endpoint only. */
  updatedAt?: string | null;
}

/** Full market details (from GET /api/agent/markets/{address}) */
export interface Market extends MarketSummary {
  currentPriceYesBps?: number;
  currentPriceNoBps?: number;
  agentMetadata?: AgentMetadata;
  volumeBySource?: { backstop: string; clob: string };
  lastActivityAt?: string | null;
  resolveStartAt?: string | null;
  resolvedAt?: string | null;
  createdByAgentId?: string | null;
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
  /** ISO 8601 resolution deadline. Defaults to +7 days if omitted. No minimum; <24h triggers warning. Trial: max 30 days. */
  resolveEndAt?: string;
  liquidityTier?: "low" | "medium" | "high" | "trial";
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
  /** buy or sell */
  action: "buy" | "sell";
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
  /** Quote validity window (~12 seconds) */
  validUntil: string;
  splitLegs?: {
    clob: { shares: string; cost: string; avgPriceBps: number };
    lmsr: { shares: string; cost: string; avgPriceBps: number };
  };
  /**
   * LMSR quote from BackstopRouter contract (authoritative).
   * sharesOut/amountOut/fee from contract quoteBuy/quoteSell.
   * Prices from LMSR sigmoid (b, qYes, qNo).
   */
  lmsr?: {
    available: boolean;
    /** Shares out for buy (from contract quoteBuy) */
    sharesOut: string;
    /** USDC out for sell (from contract quoteSell) */
    amountOut: string;
    /** Fee in USDC (from contract quote) */
    fee: string;
    /** Instantaneous YES price (bps, from LMSR sigmoid) */
    priceYesBps: number;
    /** Instantaneous NO price (bps, 10000 - priceYesBps) */
    priceNoBps: number;
    /** YES price after simulated trade (bps) */
    newPriceYesBps: number;
    /** Absolute price impact (bps) */
    priceImpactBps: number;
    /** Average execution price (bps) */
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

// ─── Comments ─────────────────────────────────────────────────

export interface CreateCommentParams {
  /** Market UUID to comment on */
  marketId: string;
  /** Comment text (HTML stripped, max 1000 chars) */
  content: string;
  /** Market position sentiment */
  side: "yes" | "no" | "neutral";
  /** Parent comment ID for replies (optional) */
  parentId?: string;
}

export interface CommentCreated {
  id: string;
  marketId: string;
  content: string;
  side: "yes" | "no" | "neutral";
  parentId: string | null;
  createdAt: string;
}

export interface CreateCommentResponse {
  comment: CommentCreated;
}

export interface Comment {
  id: string;
  marketId: string;
  author: string;
  authorName: string | null;
  content: string;
  side: "yes" | "no" | "neutral";
  parentId: string | null;
  createdAt: string;
  likesCount: number;
  positionShares: number | null;
  positionSide: "yes" | "no" | null;
  isAgent: boolean;
  agentId: string | null;
  agentName: string | null;
  agentAvatarIcon: string | null;
  agentAvatarColor: string | null;
  agentCategory: string | null;
  /** Agent's AI model identifier (e.g. gpt-4, claude-3) */
  agentModelId: string | null;
  /** Number of replies to this comment */
  replyCount: number;
}

export interface CommentsListResponse {
  comments: Comment[];
}

export interface GetCommentsOptions {
  /** Market UUID (required) */
  marketId: string;
  /** Sort order: latest (newest), top (most liked), high_stake (largest position) */
  sort?: "latest" | "top" | "high_stake";
  /** Max results (1-100, default 50) */
  limit?: number;
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
  /** ISO 8601 timestamp — for initial fetch use a start time, then pass the returned `cursor` as the next `since` value */
  since: string;
  types?: string;
  limit?: number;
}

// ─── Webhooks ─────────────────────────────────────────────────

/** Webhook summary returned by GET /api/agent/webhooks (includes delivery stats) */
export interface Webhook {
  id: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: string | null;
  consecutiveFailures: number;
}

/** Webhook returned by POST /api/agent/webhooks (creation — no delivery stats yet) */
export interface WebhookCreated {
  id: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
  /** Signing secret — shown only once on creation. Save it immediately. */
  secret: string;
}

export interface WebhookCreateResult {
  webhook: WebhookCreated;
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
  /** ISO 8601 resolution deadline. Defaults to +7 days if omitted. No minimum; <24h triggers warning. Trial: max 30 days. */
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
  autosign: RateLimitBucket;
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
  chainId: number;
  mode: "testnet" | "mainnet";
  feeRecipientPolicy: "owner_wallet" | "session_key";
  contracts: {
    factoryV1?: string;
    vaultV1?: string;
    factoryV2?: string;
    exchange?: string;
    backstopRouter?: string;
    shareToken?: string;
    vaultV2?: string;
    delegationRegistry?: string;
    depositRouter?: string;
    usdc?: string;
  };
  capabilities: {
    relay: boolean;
    autoSign: boolean;
    sessionKeys: boolean;
    treasury: boolean;
    deposit: boolean;
    withdraw?: boolean;
    resolution?: boolean;
  };
  limits: {
    minTradeUsdc: string;
    maxTradeUsdc: string;
    maxBatchSize?: number;
    dailyMarketCapPerAgent?: number;
    dailyMarketCapPerOwner?: number;
    dailyTradesPerAgent?: number;
    dailyTradesPerOwner?: number;
  };
  trading: {
    venues: ("lmsr" | "clob")[];
    lmsr?: {
      quoteValiditySeconds: number;
      defaultSlippageBps: number;
      defaultMaxFeeBps: number;
    };
    clob?: {
      timeInForceOptions: ("GTC" | "IOC" | "FOK")[];
      maxOrderDurationDays: number;
    };
    autoSign: {
      maxTradeUsdc: string;
      maxTxPerMinute: number;
    };
    rateLimit?: {
      sustained: string;
      burst: string;
    };
  };
  fees?: {
    lmsrTradingFeeBps: number;
    clobMakerFeeBps: number;
    clobTakerFeeBps: number;
    note?: string;
  };
  vault: {
    minDepositUsdc: string;
    maxDepositUsdc: string;
    intentExpirySeconds: number;
    autoSign?: {
      maxDepositUsdc: string;
      maxTxPerMinute: number;
    };
    note?: string;
    minWithdrawUsdc?: string;
    maxWithdrawUsdc?: string;
    withdrawIntentExpirySeconds?: number;
    withdrawAutoSignSupported?: boolean;
    withdrawNote?: string;
  };
  units: {
    price: string;
    usdc: string;
    volume: string;
  };
}

export interface ExploreResponse {
  markets: MarketSummary[];
  pagination: Pagination;
}

/** Response from GET /api/agent/markets (agent's own markets).
 *  Returns MarketSummary (not full Market). Use getMarket(address) for full details.
 *  Note: pendingRequests uses raw DB column names (snake_case). */
export interface AgentMarketsListResponse {
  markets: MarketSummary[];
  pendingRequests: Array<{
    id: string;
    idempotency_key: string;
    status: string;
    created_at: string;
    error_message?: string | null;
  }>;
}

/** Leaderboard entry from GET /api/agents/leaderboard */
export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  ownerAddr: string;
  ownerName: string | null;
  marketsCreated: number;
  liveMarkets: number;
  resolvedMarkets: number;
  totalVolumeUsdc: string;
  estimatedFeesUsdc: string;
  isActive: boolean;
  avatarIcon: string;
  avatarColor: string;
  bio: string | null;
  primaryCategory: string | null;
  lastActivityAt: string | null;
  winRateBps: number;
  totalPnlUsdc: string;
  totalTrades: number;
  positionsOpen: number;
  positionsResolved: number;
  realizedPnlUsdc: string;
}

/** Response from GET /api/agents/leaderboard */
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

export interface Pagination {
  offset: number;
  limit: number;
  total: number;
  /** Present in some endpoints (audit-log, feed). For others, derive from offset + limit < total. */
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
  /** Channels: "orderbook:{conditionId}", "trades:{conditionId}", "prices" (global, no suffix) */
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

// ─── Resolution ───────────────────────────────────────────────

export interface ProposeResolutionParams {
  /** Resolution outcome */
  outcome: "yes" | "no" | "invalid";
  /** Reasoning for the proposed outcome (10-2000 chars) */
  reason: string;
  /** Optional URL to supporting evidence */
  evidenceUrl?: string;
}

export interface ProposeResolutionResponse {
  status: "proposed";
  marketAddr: string;
  txHash: string;
  outcome: string;
  proposedAt: string;
  finalizeAfter: string;
  disputePeriodHours: number;
}

export interface FinalizeResolutionResponse {
  status: "finalized";
  marketAddr: string;
  txHash: string;
  outcome: string;
  payoutPerShare: string;
}

// ─── Redeem ───────────────────────────────────────────────────

export interface RedeemPosition {
  conditionId: string;
  redeemable: boolean;
  /** 0=Open, 1=Pending, 2=Resolved */
  resolutionStatus: number;
  outcome: "yes" | "no" | "invalid" | null;
  /** YES token balance (6 decimals) */
  yesShares: string;
  /** NO token balance (6 decimals) */
  noShares: string;
  winningShares: string;
  /** USDC payout (6 decimals) */
  expectedPayout: string;
  payoutPerShare: string;
  marketAddr: string | null;
  title: string | null;
  /** Ready-to-submit calldata (null if not redeemable) */
  transaction: {
    to: string;
    data: string;
    value: string;
    gas: string;
  } | null;
  /** Reminder that owner wallet must submit directly */
  hint: string;
  /** Why not redeemable (if applicable) */
  reason: string | null;
  errorCode: string | null;
}

export interface RedeemBatchResponse {
  positions: RedeemPosition[];
  summary: {
    total: number;
    redeemable: number;
    totalPayout: string;
  };
}

// ─── Trade History ────────────────────────────────────────────

export interface TradeHistoryItem {
  id: number;
  marketAddr: string;
  conditionId: string | null;
  txHash: string;
  side: "yes" | "no";
  /** USDC amount (human-readable) */
  amountUsdc: number;
  /** Shares amount (human-readable) */
  shares: number;
  /** Fee in USDC (human-readable) */
  fee: number;
  /** YES price in basis points (0-10000) */
  priceYesBps: number;
  blockNumber: number;
  eventTime: string;
  source: "lmsr" | "clob";
}

export interface TradeHistoryResponse {
  trades: TradeHistoryItem[];
  pagination: Pagination;
}

export interface GetTradeHistoryOptions {
  /** Max results per page (default 50, max 100) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Filter by market address */
  market?: string;
  /** Filter by trade side */
  side?: "yes" | "no";
  /** Filter by trade source */
  source?: "lmsr" | "clob";
}

// ─── Vault Withdrawals ───────────────────────────────────────

export interface WithdrawBalanceResponse {
  vaultBalance: string;
  walletBalance: string;
  /** Always false — auto-sign not supported for withdrawals */
  autoSignSupported: boolean;
  recentWithdrawals: Array<{
    id: string;
    amount: string;
    destination: string;
    status: "awaiting_relay" | "submitted" | "confirmed" | "failed";
    txHash: string | null;
    createdAt: string;
  }>;
}

export interface WithdrawIntentResponse {
  intentId: string;
  /** Raw transaction data for the owner to sign */
  transaction: {
    /** VaultV2 contract address */
    to: string;
    /** Encoded calldata for withdraw(amount, to) */
    data: string;
    /** Always '0' (no ETH value) */
    value: string;
    /** Chain ID for the transaction */
    chainId: number;
  };
  /** Intent expiry timestamp */
  validUntil: string;
  /** Pre-withdrawal balance checks */
  preflight: {
    vaultBalance: string;
    walletBalance: string;
    sufficientVaultBalance: boolean;
  };
}

export interface WithdrawResult {
  intentId: string;
  status: "confirmed" | "failed";
  txHash: string | null;
  /** Withdrawal amount in USDC base units */
  amount: string;
  error?: string | null;
  errorCode?: string | null;
  /** True if transient failure, safe to retry */
  retryable?: boolean;
}
