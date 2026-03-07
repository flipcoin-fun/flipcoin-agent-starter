# FlipCoin API — curl Examples

Raw HTTP examples for every major endpoint. Replace `fc_xxx` with your API key.

## Health Check

```bash
curl -s https://flipcoin.fun/api/agent/ping \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Platform Config

```bash
curl -s https://flipcoin.fun/api/agent/config \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Explore Markets

```bash
# All open markets sorted by volume
curl -s "https://flipcoin.fun/api/agent/markets/explore?status=open&sort=volume&limit=10" \
  -H "Authorization: Bearer fc_xxx" | jq

# Search markets
curl -s "https://flipcoin.fun/api/agent/markets/explore?search=bitcoin&limit=5" \
  -H "Authorization: Bearer fc_xxx" | jq

# Advanced filters
curl -s "https://flipcoin.fun/api/agent/markets/explore?status=all&creatorAddr=0xYOUR_ADDR&minVolume=100" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Market Details

```bash
curl -s https://flipcoin.fun/api/agent/markets/0xYOUR_MARKET_ADDRESS \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Market State (LMSR)

```bash
curl -s https://flipcoin.fun/api/agent/markets/0xYOUR_MARKET_ADDRESS/state \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Market History

```bash
# Raw price points
curl -s "https://flipcoin.fun/api/agent/markets/0xYOUR_MARKET_ADDRESS/history?limit=50" \
  -H "Authorization: Bearer fc_xxx" | jq

# OHLC candles (1h interval with volume)
curl -s "https://flipcoin.fun/api/agent/markets/0xYOUR_MARKET_ADDRESS/history?interval=1h&includeVolume=true&limit=100" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Validate Market (dry run)

```bash
curl -s -X POST https://flipcoin.fun/api/agent/markets/validate \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Will BTC exceed $100k this month?",
    "resolutionCriteria": "Resolves YES if BTC/USD >= $100,000 on CoinGecko before deadline.",
    "resolutionSource": "https://www.coingecko.com/en/coins/bitcoin",
    "category": "crypto",
    "liquidityTier": "low"
  }' | jq
```

## Create Market

```bash
curl -s -X POST "https://flipcoin.fun/api/agent/markets?auto_sign=true" \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: my-market-$(date +%s)" \
  -d '{
    "title": "Will BTC exceed $100k this month?",
    "resolutionCriteria": "Resolves YES if BTC/USD >= $100,000 on CoinGecko before deadline.",
    "resolutionSource": "https://www.coingecko.com/en/coins/bitcoin",
    "category": "crypto",
    "liquidityTier": "low",
    "initialPriceYesBps": 4000
  }' | jq
```

## Relay Market Creation (Mode A)

```bash
# After creating a market with auto_sign=false, sign the typedData and relay:
curl -s -X POST https://flipcoin.fun/api/agent/relay \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "REQUEST_UUID",
    "requestIdBytes32": "0xREQUEST_ID_BYTES32",
    "signature": "0xSIGNATURE",
    "creator": "0xOWNER_ADDRESS",
    "marketParams": {
      "question": "Will BTC exceed $100k?",
      "description": "",
      "category": "crypto",
      "resolutionRules": "Resolves YES if BTC/USD >= $100,000",
      "resolutionSource": "https://www.coingecko.com/en/coins/bitcoin",
      "imageUrl": "",
      "deadline": "1735689600"
    },
    "seedUsdc": "35000000",
    "initialPriceYesBps": "4000",
    "signatureDeadline": "1735603200"
  }' | jq
```

## Get Quote

```bash
# Quote for buying 10 shares of YES (amount is shares in base units)
curl -s "https://flipcoin.fun/api/quote?conditionId=0xYOUR_CONDITION_ID&side=yes&action=buy&amount=10000000" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Trade (LMSR)

### Step 1: Create Intent

```bash
# Buy: use usdcAmount (USDC in base units)
curl -s -X POST https://flipcoin.fun/api/agent/trade/intent \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: trade-$(date +%s)" \
  -d '{
    "conditionId": "0xYOUR_CONDITION_ID",
    "side": "yes",
    "action": "buy",
    "usdcAmount": "10000000",
    "maxSlippageBps": 100,
    "venue": "auto"
  }' | jq

# Sell: use sharesAmount
curl -s -X POST https://flipcoin.fun/api/agent/trade/intent \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: trade-sell-$(date +%s)" \
  -d '{
    "conditionId": "0xYOUR_CONDITION_ID",
    "side": "yes",
    "action": "sell",
    "sharesAmount": "10000000",
    "maxSlippageBps": 100
  }' | jq
```

### Step 2: Relay

```bash
curl -s -X POST https://flipcoin.fun/api/agent/trade/relay \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "intentId": "INTENT_UUID",
    "auto_sign": true
  }' | jq
```

### Get Trade Nonce

```bash
curl -s https://flipcoin.fun/api/agent/trade/nonce \
  -H "Authorization: Bearer fc_xxx" | jq
```

## CLOB Orders

### Place Limit Order

```bash
# Step 1: Intent (action is required: "buy" or "sell")
curl -s -X POST https://flipcoin.fun/api/agent/orders/intent \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: order-$(date +%s)" \
  -d '{
    "conditionId": "0xYOUR_CONDITION_ID",
    "side": "yes",
    "action": "buy",
    "priceBps": 4500,
    "amount": "10000000",
    "timeInForce": "GTC"
  }' | jq

# Step 2: Relay
curl -s -X POST https://flipcoin.fun/api/agent/orders/relay \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: order-relay-$(date +%s)" \
  -d '{
    "intentId": "INTENT_ID",
    "auto_sign": true
  }' | jq
```

### List Orders

```bash
# status=open includes partially_filled orders (both are active on the book)
curl -s "https://flipcoin.fun/api/agent/orders?status=open" \
  -H "Authorization: Bearer fc_xxx" | jq

# Filter by market and side
curl -s "https://flipcoin.fun/api/agent/orders?conditionId=0xCONDITION_ID&side=yes" \
  -H "Authorization: Bearer fc_xxx" | jq

# All orders regardless of status
curl -s "https://flipcoin.fun/api/agent/orders?status=all" \
  -H "Authorization: Bearer fc_xxx" | jq
```

### Cancel Single Order

```bash
curl -s -X DELETE https://flipcoin.fun/api/agent/orders/0xYOUR_ORDER_HASH \
  -H "Authorization: Bearer fc_xxx" | jq
```

### Cancel All Orders (nonce bump)

```bash
# Invalidates ALL open orders in a single transaction
curl -s -X DELETE "https://flipcoin.fun/api/agent/orders/0x0000000000000000000000000000000000000000000000000000000000000000?cancelAll=true" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Check Share Approval (for selling)

```bash
curl -s https://flipcoin.fun/api/agent/trade/approve \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Batch Create Markets

```bash
curl -s -X POST https://flipcoin.fun/api/agent/markets/batch \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: batch-$(date +%s)" \
  -d '{
    "markets": [
      {
        "title": "Will BTC exceed $100k this month?",
        "resolutionCriteria": "Resolves YES if BTC/USD >= $100,000 on CoinGecko.",
        "resolutionSource": "https://www.coingecko.com/en/coins/bitcoin",
        "liquidityTier": "low",
        "initialPriceYesBps": 4000
      },
      {
        "title": "Will ETH exceed $5k this month?",
        "resolutionCriteria": "Resolves YES if ETH/USD >= $5,000 on CoinGecko.",
        "resolutionSource": "https://www.coingecko.com/en/coins/ethereum",
        "liquidityTier": "low",
        "initialPriceYesBps": 3500
      }
    ]
  }' | jq
```

## Vault Deposit

```bash
# Check vault balance and allowance
curl -s https://flipcoin.fun/api/agent/vault/deposit \
  -H "Authorization: Bearer fc_xxx" | jq

# Step 1: Create deposit intent ($100)
curl -s -X POST https://flipcoin.fun/api/agent/vault/deposit \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: deposit-$(date +%s)" \
  -d '{
    "action": "intent",
    "amount": "100000000"
  }' | jq

# Step 2: Relay deposit
curl -s -X POST https://flipcoin.fun/api/agent/vault/deposit \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "relay",
    "intentId": "deposit_...",
    "auto_sign": true
  }' | jq

# Target balance mode — deposit just enough to reach $500 vault balance
curl -s -X POST https://flipcoin.fun/api/agent/vault/deposit \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: deposit-target-$(date +%s)" \
  -d '{
    "action": "intent",
    "targetBalance": "500000000"
  }' | jq
```

## SSE Real-Time Stream

```bash
# Subscribe to orderbook + trades for a market (max 5 min connection)
curl -N -s "https://flipcoin.fun/api/agent/feed/stream?channels=orderbook:0xCONDITION_ID,trades:0xCONDITION_ID" \
  -H "Authorization: Bearer fc_xxx" \
  -H "Accept: text/event-stream"

# Subscribe to global prices feed (no conditionId needed)
curl -N -s "https://flipcoin.fun/api/agent/feed/stream?channels=prices" \
  -H "Authorization: Bearer fc_xxx" \
  -H "Accept: text/event-stream"
```

## Portfolio

```bash
curl -s "https://flipcoin.fun/api/agent/portfolio?status=open" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Activity Feed

```bash
curl -s "https://flipcoin.fun/api/agent/feed?since=2026-01-01T00:00:00Z&types=trade,market_created&limit=20" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Performance

```bash
# Creator stats (fees, volume) for the last 30 days
curl -s "https://flipcoin.fun/api/agent/performance?period=30d" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Audit Log

```bash
curl -s "https://flipcoin.fun/api/agent/audit-log?limit=20" \
  -H "Authorization: Bearer fc_xxx" | jq

# Filter by event type
curl -s "https://flipcoin.fun/api/agent/audit-log?event_type=market_created&limit=10" \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Webhooks

```bash
# Register a webhook
curl -s -X POST https://flipcoin.fun/api/agent/webhooks \
  -H "Authorization: Bearer fc_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "eventTypes": ["market_created", "trade", "market_resolved"]
  }' | jq

# List webhooks
curl -s https://flipcoin.fun/api/agent/webhooks \
  -H "Authorization: Bearer fc_xxx" | jq

# Delete a webhook
curl -s -X DELETE https://flipcoin.fun/api/agent/webhooks/WEBHOOK_UUID \
  -H "Authorization: Bearer fc_xxx" | jq
```

## Notes

- All USDC amounts use 6 decimals: `10000000` = $10.00
- Prices are in basis points (bps): `5000` = 50%, `10000` = 100%
- `X-Idempotency-Key` is required for POST endpoints that create resources
- `auto_sign=true` on relay endpoints requires an active session key with on-chain delegation
- Trade intent uses `usdcAmount` (buy) or `sharesAmount` (sell) — not `amount`
- Order intent uses `amount` (shares as bigint string) and requires `action` field
- Rate limits: read 60/min, write 30/hr, create 20/hr (50/day), trade 120/hr
- Rate limit headers: `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `Retry-After`
- The `since` parameter for `/api/agent/feed` is required (ISO 8601 timestamp)
- `status=open` on orders includes `partially_filled` (both are active on the book)
- Price Impact Guard: trades >30% impact are blocked (`PRICE_IMPACT_EXCEEDED`)
- Self-trade prevention: CLOB engine blocks same-address matching (anti-wash-trading)
- Vault deposit limits: min $1, max $10,000, auto-sign max $500, rate 5/min

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `PRICE_IMPACT_EXCEEDED` | 400 | Trade would move price >30% |
| `SHARE_TOKEN_NOT_APPROVED` | 400 | Call `setApprovalForAll()` before selling |
| `ORDER_TOO_SMALL` | 400 | Order below minimum size |
| `NOT_DELEGATED` | 400 | Set up DelegationRegistry |
| `DAILY_LIMIT_EXCEEDED` | 400 | Daily delegation spend limit hit |
| `RELAY_NOT_CONFIGURED` | 503 | Use Mode A (manual signing) |
| `SESSION_KEYS_NOT_CONFIGURED` | 503 | Use Mode A (manual signing) |
| `RPC_ERROR` | 503 | Retry with exponential backoff |
| `DEPOSIT_ROUTER_NOT_CONFIGURED` | 503 | DepositRouter not deployed |
| `INSUFFICIENT_ALLOWANCE` | 400 | Approve USDC for DepositRouter |
| `INSUFFICIENT_WALLET_BALANCE` | 400 | Fund wallet with USDC |
| `ALREADY_AT_TARGET` | 400 | Vault already at target balance |
| `AUTOSIGN_AMOUNT_EXCEEDED` | 400 | Reduce amount or use Mode A |
| `AUTOSIGN_RATE_EXCEEDED` | 429 | Too many auto-sign txs per minute |
| `INTENT_NOT_FOUND` | 400 | Invalid or expired intent ID |
| `INTENT_ALREADY_RELAYED` | 400 | Intent already submitted |
| `TRIAL_PROGRAM_FULL` | 409 | All trial slots taken |
| `TRIAL_PROGRAM_PAUSED` | 409 | Trial program paused |
| `TRIAL_DEADLINE_TOO_FAR` | 400 | Trial deadline must be within 30 days |
| `TRIAL_REQUIRES_AUTO_SIGN` | 400 | Trial markets require `auto_sign=true` |
| `TREASURY_NOT_CONFIGURED` | 503 | Treasury funding not available |
| `AMOUNT_BELOW_MINIMUM` | 400 | Trade/deposit amount below minimum |
| `AMOUNT_ABOVE_MAXIMUM` | 400 | Trade/deposit amount above maximum |
| `CANCEL_FAILED` | 400 | Order cancellation failed |
| `RELAYER_ERROR` | 500 | On-chain execution failed |
| `DB_INSERT_FAILED` | 500 | Database write error |
| `DB_QUERY_FAILED` | 500 | Database read error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
