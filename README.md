<p align="center">
  <img src="public/logo.png" width="272" alt="Should AI Trade Logo" />
</p>

<h1 align="center">Should AI Trade?</h1>

<p align="center">
  <strong>Every Trade Must Earn Its Yes.</strong><br />
  An AI-assisted, multi-agent trading decision and risk-control platform.<br />
  Continuous Market Scanning | Adversarial Red Team Audits | Non-Bypassable Risk Gates | Thesis Invalidation Daemon
</p>

<p align="center">
  <a href="tests/run-tests.js"><img src="https://img.shields.io/badge/Tests-Passing%20(900%2B)-00ff84?style=flat-square&labelColor=17161d" alt="Tests Passed" /></a>
  <a href="tsconfig.json"><img src="https://img.shields.io/badge/TypeScript-Strict%200%20Errors-38bdf8?style=flat-square&labelColor=17161d" alt="TypeScript Strict" /></a>
  <a href="src/lib/trading/alpaca-paper-adapter.ts"><img src="https://img.shields.io/badge/Execution-Paper%20Trading%20Only-f59e0b?style=flat-square&labelColor=17161d" alt="Paper Trading Only" /></a>
  <a href="https://paper-api.alpaca.markets/v2"><img src="https://img.shields.io/badge/Broker-Alpaca%20v2-10b981?style=flat-square&labelColor=17161d" alt="Alpaca Broker API" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL%201.1-848388?style=flat-square&labelColor=17161d" alt="License" /></a>
</p>

---

## 1. Overview

Most automated AI trading scripts execute open-loop: single-prompt LLMs generate unverified rationale, submit orders without hard risk boundaries, and abandon positions once filled.

**Should AI Trade?** enforces a closed-loop, verifiable deliberation and execution architecture:

1. **Continuous Discovery:** Scans liquid US equity and crypto assets against volatility, momentum, and relative volume (RVOL) thresholds.
2. **Adversarial Deliberation:** Coordinates quantitative, fundamental, and dedicated Red Team agents to challenge trade theses before execution.
3. **Deterministic Risk Gates:** Non-bypassable TypeScript guards enforcing max 25% single-asset exposure, liquidity minimums, and spread ceilings.
4. **Idempotent Paper Execution:** Submits paper orders via Alpaca REST v2 using deterministic deduplication keys.
5. **Post-Trade Thesis Monitoring:** A background daemon tracks position health, recalculates thesis validity on every market tick, and triggers automated protective exits upon thesis breakdown.
6. **Historical Strategy Backtesting:** Reproducible simulation engine accounting for transaction fees, slippage, and zero look-ahead bias.

---

## 2. Core Decision Pipeline

```text
Market Snapshot ──> Quant Agent ──> Intelligence Agent ──> Risk Agent ──> Red Team Challenge
                                                                                │
                                                                                ▼
Broker Reconciliation <── Alpaca Paper Execution <── Deterministic Risk Gate (Code Enforced)
       │
       ▼
Thesis Monitoring Daemon ──> Audit Trail & Persistence
```

Every stage has typed inputs, outputs, error handling, and observable status. Errors or missing dependencies **fail closed**—they never silently become an approval.

---

## 3. Core Subsystems

### A. Market Scanner & Snapshot
- Real-time and historical bar analysis for 20+ liquid assets (Crypto: `BTC/USD`, `ETH/USD`, `SOL/USD`; Equities: `AAPL`, `NVDA`, `TSLA`, `SPY`, etc.).
- Calculates RSI-14, ATR, RVOL, and annualized realized volatility.
- Tracks data freshness and provides deterministic fallback during market closures or unconfigured states.

### B. AI Council & Adversarial Red Team
- **Quant Agent:** Technical momentum & volatility profile.
- **Intelligence Agent:** Evaluates news disclosures and verifies source provenance (`PRIMARY`, `REPUTABLE`, `MOCK`).
- **Risk Agent:** Assesses exposure, liquidity depth, spread, volatility, and concentration constraints.
- **Adversarial Red Team:** Proactively attempts to refute the trade thesis; unresolved fatal flaws trigger an immediate trade block.

### C. Deterministic Risk Gate
- Central code-level safety boundary independent of LLM output.
- **Rules Enforced:**
  - Maximum single-asset exposure: **25%** of equity.
  - Maximum spread ceiling: **100 basis points**.
  - Minimum liquidity floor: Configurable with a **$500,000 USD** default for equities (normalized base volume $\times$ price for crypto).
  - Minimum verifiable evidence records: $\ge 3$.
  - Rejection of any candidate with an unresolved Red Team critical refutation.

### D. Alpaca Paper Broker Adapter
- Paper trading only (`https://paper-api.alpaca.markets/v2`).
- Idempotency key generation: `EXEC-{asset}-{timestamp}`.
- Reconciles local state against authoritative broker order IDs and positions.
- **Strict Guard:** Live trading endpoints fail closed and throw immediate exceptions.

### E. Thesis Health Monitor
- Multi-factor weighted health scoring:
  $$\text{Score} = 0.40 \times \text{Momentum} + 0.30 \times \text{Drawdown} + 0.15 \times \text{Liquidity} + 0.15 \times \text{Volatility}$$
- Status thresholds:
  - `HEALTHY`: Score $\ge 70$
  - `DEGRADED`: $40 \le \text{Score} < 70$
  - `INVALIDATED`: Score $< 40$ (or stop-loss breached)
- Generates protective exit proposals when a thesis is invalidated.

### F. Quantitative Strategy Backtester
- Located in `src/lib/backtest/` and available via `/api/backtest` and the **Backtest** dashboard view.
- Evaluates strategies over historical bars without look-ahead bias.
- Models execution friction: 10 bps transaction fees and 5 bps execution slippage.
- Computes Net Return %, Max Drawdown %, Win Rate %, Profit Factor, and Sharpe Ratio.

---

## 4. Setup & Local Development Workflow

### Prerequisites
- Node.js $\ge 18.17.0$ (Node.js v20+ recommended)
- npm $\ge 9.0.0$

### Installation
```bash
# Clone the repository
git clone https://github.com/theanshukr/Should-AI-Trade.git
cd Should-AI-Trade

# Install dependencies
npm install
```

### Environment Configuration
Copy the `.env.example` template to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your credentials in `.env.local`:
```env
# Alpaca Paper Trading Credentials (Paper sandbox only)
ALPACA_API_KEY=your_alpaca_paper_api_key_here
ALPACA_SECRET_KEY=your_alpaca_paper_secret_key_here
ALPACA_PAPER_BASE_URL=https://paper-api.alpaca.markets/v2
ALPACA_DATA_BASE_URL=https://data.alpaca.markets

# Optional: LLM Providers (system falls back to deterministic rule synthesis if omitted)
FEATHERLESS_API_KEY=your_featherless_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Access Passphrase for Dashboard Operator
OPERATOR_PASSPHRASE=alpaca2026
```

### Running the Application
```bash
# Run the Next.js development server
npm run dev

# Run the production build
npm run build
npm start
```

Access the terminal dashboard at `http://localhost:3000`.

---

## 5. Verification & Testing

Execute the comprehensive test suites:
```bash
# Run unit & integration test suites
npm test

# Run outbound webhook dispatcher suite
node tests/webhook-dispatcher.test.js
```

---

## 6. Architecture & Security Documentation

- Detailed architecture specification: [docs/ARCHITECTURE.md](file:///d:/Projects/Should-AI-Trade/docs/ARCHITECTURE.md)
- Security safeguards & threat model: [docs/SECURITY.md](file:///d:/Projects/Should-AI-Trade/docs/SECURITY.md)
- Implementation audit & verification: [docs/IMPLEMENTATION_AUDIT.md](file:///d:/Projects/Should-AI-Trade/docs/IMPLEMENTATION_AUDIT.md)

---

## 7. Legal Attribution & License

- Based on the hackathon project base *Should-AI-Buy?* (Awarded 2nd Place at Alpaca $\times$ Lablab.ai Autonomous Trading Hackathon).
- Licensed under the Business Source License 1.1 (BSL 1.1). See [`LICENSE`](file:///d:/Projects/Should-AI-Trade/LICENSE) for terms.
