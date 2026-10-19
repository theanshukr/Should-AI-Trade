# System Architecture: Should AI Trade?

**Product Name:** Should AI Trade?  
**Tagline:** *Every Trade Must Earn Its Yes.*  
**Positioning:** An AI-assisted, multi-agent trading decision and risk-control platform.  

---

## 1. High-Level Pipeline Architecture

The platform enforces a closed-loop, deterministic execution architecture where AI models can only *propose* or *challenge* trade hypotheses, while hard mathematical rules govern execution:

```text
  ┌───────────────────┐
  │  Market Snapshot  │ ──> Alpaca REST Market Data (Equities + Crypto)
  └─────────┬─────────┘     Validates freshness, computes RSI-14, ATR, RVOL, Momentum
            │
            ▼
  ┌───────────────────┐     • Quant Agent: Technical momentum & volatility structure
  │     AI Council    │ ──> • Intelligence Agent: Alpaca News & factual event sentiment
  │  Deliberation Hub │     • Risk Agent: Volatility, beta, and sizing constraints
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │  Adversarial Red  │ ──> Challenges thesis assumptions, flags contradictory evidence,
  │   Team Challenge  │     detects overfitting; fatal flaws immediately block execution
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐     Non-bypassable TypeScript guards:
  │ Deterministic     │ ──> • Max 25% single-asset portfolio allocation
  │   Risk Gate       │     • Spread <= 100 bps | Configurable Liquidity ($500k default)
  └─────────┬─────────┘     • Unresolved Red Team fatal flaws = REJECT
            │
            ▼
  ┌───────────────────┐     • Alpaca REST v2 Paper API strictly enforced
  │ Alpaca Paper      │ ──> • Deterministic Idempotency Key: EXEC-{symbol}-{timestamp}
  │ Execution Layer   │     • Order intent persisted prior to wire dispatch
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Broker            │ ──> Reconciles order state (FILLED, PARTIAL, REJECTED)
  │ Reconciliation    │     Authoritative position state derived from broker
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐     Multi-factor formula:
  │ Thesis Health     │ ──> Score = 0.40*Mom + 0.30*Drawdown + 0.15*Liq + 0.15*Vol
  │ Daemon Monitor    │     HEALTHY (>=70) | DEGRADED (40-69) | INVALIDATED (<40)
  └─────────┬─────────┘     Trigger protective paper exit on thesis invalidation
            │
            ▼
  ┌───────────────────┐
  │ Audit Trail &     │ ──> Immutable chronological ledger of snapshots, agent claims,
  │ Persistence       │     risk checks, order intents, fills, and monitoring actions
  └───────────────────┘
```

---

## 2. Component Separation & Responsibilities

### 2.1 Presentation & UI Layer (`src/components/`, `src/app/`)
- **Visual Aesthetic:** Professional quantitative trading terminal with dark neutral surfaces (`#121117`, `#1f1e23`), restrained status indicators (`#00ff84` green, `#ff3b5c` red, `#f59e0b` amber), compact data tables, accessible contrast, and zero speculative fluff.
- **Views:**
  1. **Overview / Telemetry:** Paper account equity, cash, buying power, risk allocation, system status.
  2. **Market Scanner:** Universe scanning (equities and crypto), RVOL, momentum ranking, real-time filters.
  3. **Trading Council:** Visible deliberation cards across all agents, confidence scores, verifiable claim linking.
  4. **Trade Review:** Explicit trade review panel detailing risk calculations, thesis, and an explicit user confirmation step before paper execution.
  5. **Positions & Orders:** Monitored open positions, broker-reconciled orders, thesis status, and protective exit proposals.
  6. **Audit Log:** Chronological searchable decision history linking every agent run to risk decisions and broker orders.
  7. **Backtesting & Evaluation:** Historical strategy evaluation simulator with slippage, transaction fees, and performance metrics.
  8. **Settings & System Health:** Configurable risk thresholds (e.g. liquidity floor $250k vs $500k), AI provider configuration, and diagnostics.

### 2.2 Market Data & Indicators (`src/lib/market-data/`, `src/lib/quant/`)
- Connects to Alpaca Market Data v2.
- Handles time-series candle generation across 1H, 4H, 1D, 7D, and 30D intervals.
- Calculates deterministic indicators:
  - **RSI-14:** Wilder's smoothed Relative Strength Index.
  - **Relative Volume (RVOL):** Ratio of current volume to historical rolling average.
  - **Momentum Score:** Composite price rate of change and trend alignment.
  - **Realized Volatility:** Annualized standard deviation of log returns.

### 2.3 AI Council Deliberation (`src/lib/council/`, `src/lib/agents/`)
- **Quant Agent:** Produces a structured trade hypothesis based purely on price action, indicators, and volume structure.
- **Intelligence Agent:** Evaluates verified external news articles and signals; does not hallucinate facts.
- **Risk Agent:** Evaluates concentration limits, market liquidity depth, bid-ask spreads, and downside scenarios.
- **Adversarial Red Team:** Independently challenges the bull thesis, looks for overfitting, counter-trends, or stale assumptions.
- **Decision Agent:** Synthesizes council findings into a recommendation (`BUY`, `HOLD`, `REJECT`). Agent recommendations are purely advisory and cannot override the risk gate.

### 2.4 Deterministic Risk Gate (`src/lib/risk-gate/`, `src/lib/audit/rules.ts`)
- The central code-level safety boundary.
- **Configurable Rules:**
  - `maxPortfolioAllocationPct`: Max 25% single-asset exposure.
  - `maxSpreadBps`: Max 100 basis points bid-ask spread.
  - `minLiquidityUsd`: Minimum dollar liquidity ($500,000 default for equities, asset-normalized for crypto; configurable to $250,000).
  - `minEvidenceCount`: Minimum 3 structured evidence items.
  - `hasRedTeamFatalFlaw`: Immediate rejection if Red Team detects an unresolved critical flaw.

### 2.5 Paper Execution & Reconciliation (`src/lib/trading/`, `src/lib/alpaca/`)
- Enforces paper trading exclusively (`https://paper-api.alpaca.markets/v2`).
- Idempotency key derivation prevents duplicate order submission across network retries.
- Reconciles local order state against actual Alpaca broker state.

### 2.6 Post-Trade Thesis Monitor (`src/lib/monitoring/`)
- Continuously re-evaluates open positions against original thesis conditions.
- Weighted health scoring:
  $$\text{Score} = 0.40 \times \text{Momentum} + 0.30 \times \text{Drawdown} + 0.15 \times \text{Liquidity} + 0.15 \times \text{Volatility}$$
- Automatically proposes protective paper exits if thesis becomes `INVALIDATED` (Score < 40 or stop-loss breached).

### 2.7 Backtesting Engine (`src/lib/backtest/`)
- Historical strategy evaluation avoiding look-ahead bias.
- Accounts for realistic transaction fees (10 bps) and execution slippage (5 bps).
- Outputs verifiable metrics: Return %, Max Drawdown %, Win Rate %, Trade Count, Profit Factor, Sharpe Ratio.
