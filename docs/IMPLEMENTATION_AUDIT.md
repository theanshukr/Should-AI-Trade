# Implementation Audit: Should AI Trade?

**Date:** October 2026  
**Auditor:** Quantitative Systems Architect & Senior Full-Stack Reviewer  
**Target:** Conversion of base repository into audited MVP: **Should AI Trade?**  
**Tagline:** *Every Trade Must Earn Its Yes.*  

---

## 1. Executive Summary & Baseline Verification

The codebase was cloned and audited against the requirements outlined in the Antigravity Master Prompt.

### Baseline Command Execution Results

1. **Initial Test Suite (`npm test`):**
   - **Pre-install Failure:** `MODULE_NOT_FOUND ('openai')` in Suite 44 due to missing `node_modules` on fresh clone.
   - **Post `npm install` Result:** **897 / 897 tests passed (0 failed)** across 53 test suites (`tests/run-tests.js`).
   - **Webhook Test Suite (`node tests/webhook-dispatcher.test.js`):** **6 / 6 tests passed (0 failed)**.
   - **Total Verified Tests:** **903 passing assertions**. Stated test counts in the base repository are reproducible once dependencies are installed.

2. **Production Build (`npm run build`):**
   - **Result:** Successfully compiled with 0 TypeScript and 0 ESLint errors.
   - **Next.js Version:** 14.2.15 (Next.js App Router).
   - **Security Warning:** `npm warn deprecated next@14.2.15` (CVE-2025-12-11 security notice noted; operational in paper environment).

---

## 2. Architecture & Subsystems Audit

| Subsystem | File Locations | Implementation Status | Notes & Preserved Features |
| :--- | :--- | :--- | :--- |
| **Presentation / UI** | `src/app/`, `src/components/` | Implemented (Requires Rebranding & Trade Review Enhancement) | Dark terminal theme, real-time polling with bounded backoff, animated nav, tabs for Dashboard, Command Lab, Council, Discovery, Portfolio, Auditor. |
| **API Controllers** | `src/app/api/` | Implemented | Routes for `/api/investigations`, `/api/market-data`, `/api/portfolio`, `/api/trading/paper/*`, `/api/automation`, `/api/monitoring`. |
| **Market Data** | `src/lib/market-data/` | Implemented | Alpaca v2 Market Data REST client for Equities and Crypto. Computes RSI-14, ATR, RVOL, Momentum. Stale data detection. Clean fallback for demo mode. |
| **AI Council Hub** | `src/lib/council/`, `src/lib/agents/` | Implemented | 7-stage pipeline (Discovery, Quant, Intelligence, Risk, Red Team, Decision, Risk Gate). Fallback deterministic logic + Featherless / OpenAI SDK provider interface. |
| **Adversarial Red Team** | `src/lib/agents/` (`runRedTeamAgent`) | Implemented | Challenges bull hypotheses, checks liquidity/spread/volatility, flags critical refutations. Fatal flaws block execution. |
| **Deterministic Risk Gate** | `src/lib/risk-gate/`, `src/lib/audit/rules.ts` | Implemented (Requires Policy Unification) | Hard-coded non-bypassable constraints (max 25% allocation, spread <= 100 bps, min evidence >= 3). Discrepancy between $250k and $500k liquidity floor identified. |
| **Alpaca Paper Adapter** | `src/lib/trading/alpaca-paper-adapter.ts` | Implemented | Strict paper endpoint enforcement (`https://paper-api.alpaca.markets/v2`). Idempotency keys (`EXEC-{asset}-{timestamp}`). Broker state reconciliation. No live trading. |
| **Thesis Health Monitor** | `src/lib/monitoring/` | Implemented (Requires Formal Weighted Model) | Background daemon checks price drawdown, momentum decay, liquidity, and volatility. Statuses: `HEALTHY`, `DEGRADED`, `INVALIDATED`. |
| **Persistence & Audit** | `src/lib/audit/`, `src/lib/storage/` | Implemented | In-memory ring buffer + storage adapter tracking all decision events, broker transactions, and telemetry lineage. |
| **Backtesting Engine** | *None* | **MISSING** | Base repository lacked a dedicated historical backtesting engine with realistic transaction costs and slippage. Must be implemented. |

---

## 3. Detailed Component Audit

### A. Market Scanner & Indicator Engine
- **Assets Supported:** Bounded universe (20 liquid US equities like AAPL, NVDA, TSLA, SPY, QQQ + major crypto pairs BTC/USD, ETH/USD, SOL/USD).
- **Indicators:** RSI-14, Realized Volatility, Relative Volume (RVOL), Volume Acceleration, Momentum Score.
- **Freshness & Error Handling:** Fallback when market is closed or keys are missing. Data freshness timestamps tracked.

### B. AI Council & Red Team
- **Quant Agent:** Technical momentum, RSI, RVOL, volume acceleration analysis.
- **Intelligence Agent:** Alpaca News adapter with provenance verification (`PRIMARY`, `REPUTABLE`, `MOCK`).
- **Risk Agent:** Sizing constraints, portfolio allocation, concentration limit check.
- **Red Team:** Adversarial refutation that explicitly constructs counter-claims targeting bull claims. If a fatal flaw is discovered, `hasRedTeamFatalFlaw` trips the risk gate.

### C. Deterministic Risk Gate Policy Discrepancy Analysis
- **The Liquidity Discrepancy:**
  - `src/lib/risk-gate/index.ts` hardcoded `MIN_LIQUIDITY_USD = 250000` ($250k).
  - `src/lib/audit/rules.ts` set default `minLiquidityUsd = 500000` ($500k).
  - Presentation materials and PRD cited both $250,000 and $500,000 in different sections.
- **Resolution:**
  - Treat this as an **explicit configurable policy decision**.
  - Default MVP setting: **$500,000 USD** for equity average daily volume / notional liquidity, with configurable override down to $250,000 in settings.
  - For Crypto pairs, base token volume is normalized by multiplying base volume by spot price (`base_volume * price = notional_usd`), with a floor threshold adapted for fractional trading.

### D. Thesis Health Model
- **Current State:** The monitor used discrete penalty deductions (`score -= 35` for CRITICAL, `score -= 15` for WARNING).
- **Target Model:** Implement the presentation's documented multi-factor formula:
  $$\text{Health Score} = 0.40 \cdot \text{Momentum} + 0.30 \cdot \text{Drawdown} + 0.15 \cdot \text{Liquidity} + 0.15 \cdot \text{Volatility}$$
  - `HEALTHY`: Score $\ge 70$
  - `DEGRADED`: $40 \le \text{Score} < 70$
  - `INVALIDATED`: Score $< 40$
  - Stop-loss or hard invalidation triggers immediate `INVALIDATED` status and protective exit proposal.

### E. Backtesting Workflow
- **Deficiency:** Base repository lacked an end-to-end historical backtesting simulator.
- **Requirement:** Provide a reproducible historical strategy backtester incorporating:
  - Timestamped historical OHLCV data without look-ahead bias.
  - Transaction costs (e.g. 10 bps fee) and execution slippage (e.g. 5 bps).
  - Comprehensive metrics: Trade count, win rate, total return %, maximum drawdown %, Sharpe ratio, profit factor.
  - Dedicated API route and user-facing terminal interface.

---

## 4. Rebranding Audit: "Should-AI Buy?" → "Should AI Trade?"

1. **Branding Elements to Update:**
   - **Name:** Should AI Trade?
   - **Tagline:** *Every Trade Must Earn Its Yes.*
   - **Positioning:** An AI-assisted, multi-agent trading decision and risk-control platform.
   - **Files with Outdated References:**
     - `src/app/layout.tsx` (title, meta description)
     - `src/components/Header.tsx` (brand text, tooltips)
     - `src/app/page.tsx` (footer, default prompts)
     - `src/components/CommandCenter.tsx` (query placeholders: "Should AI buy $BTC?" → "Should AI trade $BTC?")
     - `package.json`
     - `README.md`
     - Documentation files

---

## 5. Security & Operational Reliability Audit

1. **Credential Safety:**
   - Server-side only: API keys are accessed via `process.env`.
   - Client responses and diagnostics scrub API keys (`[REDACTED]`).
   - `.env.example` contains only empty placeholders.
2. **Fail-Closed Execution:**
   - Missing market data, unverified news, risk violations, or missing API credentials immediately halt execution.
   - Live trading base URLs are rejected by `validatePaperTradingEndpoint()`.
3. **Idempotency:**
   - Order submission uses deterministic idempotency keys (`EXEC-{symbol}-{timestamp}`) to prevent double-execution across network retries.

---

## 6. Implementation Plan

1. **Phase 2 — Product Foundation & Documentation:**
   - Reconcile `.env.example`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`.
2. **Phase 3 — Rebrand Application:**
   - Update metadata, header, footer, placeholders, and UI copy to **Should AI Trade?** / *Every Trade Must Earn Its Yes.*
3. **Phase 4 — Core Architecture Upgrades:**
   - Implement the multi-factor weighted Thesis Health Model (`0.40 * M + 0.30 * D + 0.15 * L + 0.15 * V`).
   - Reconcile and expose configurable Liquidity thresholds ($500k default vs $250k).
4. **Phase 5 — Backtesting Engine:**
   - Build `src/lib/backtest/` engine with historical data, slippage, fees, metrics.
   - Create `/api/backtest` endpoint.
5. **Phase 6 — UI & Dedicated Trade Review Screen:**
   - Enhance the 7 core dashboard views (Overview, Market Scanner, Trading Council, Trade Review with confirmation modal, Positions and Orders, Audit Log, Settings & System Health, Backtesting).
6. **Phase 7 — Verification & Testing:**
   - Add unit tests for backtesting and new health calculations.
   - Run complete test suite and production build.
