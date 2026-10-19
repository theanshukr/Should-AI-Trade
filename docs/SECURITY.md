# Security & Operational Reliability: Should AI Trade?

**Product Name:** Should AI Trade?  
**Tagline:** *Every Trade Must Earn Its Yes.*  

---

## 1. Threat Model & Security Posture

Should AI Trade? operates on the principle that AI models are non-deterministic and potentially vulnerable to prompt injection, hallucination, or skewed output. Consequently, **no AI agent is ever granted direct execution capability**.

All actions that alter state or capital must pass through non-bypassable, deterministic server-side code boundaries.

```text
  [ AI Model Output ] ──(Untrusted Suggestion)──> [ Server Validation ] ──> [ Deterministic Risk Gate ] ──> [ Paper Broker ]
```

---

## 2. Core Security Safeguards

### 2.1 Credential & Secret Hygiene
- **Server-Side Exclusivity:** API keys (`ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `FEATHERLESS_API_KEY`, `OPENAI_API_KEY`) are accessed strictly on the server via `process.env`. They are never passed to the client bundle or prefixed with `NEXT_PUBLIC_`.
- **Log & Error Sanitization:** The error sanitizer (`src/lib/errors/index.ts`) automatically strips credential patterns from logs, diagnostic buffers, and error messages before persistence or transmission:
  ```typescript
  // Matches Alpaca, Featherless, and generic secret keys and masks with [REDACTED]
  sanitized = sanitized.replace(/(?:APCA-API-KEY-ID|ALPACA_API_KEY|FEATHERLESS_API_KEY|api_key)[\s:=]+[A-Za-z0-9_-]{10,}/gi, '$1=[REDACTED]');
  ```
- **Environment Isolation:** `.env` files are ignored by git; `.env.example` contains only template placeholders.

### 2.2 Paper Trading Sandbox Isolation
- **Hard-coded Paper URL Guard:** The trading adapter validates that `ALPACA_PAPER_BASE_URL` contains `paper-api.alpaca.markets`. Any attempt to configure a live trading endpoint (`api.alpaca.markets`) triggers an immediate, uncatchable fail-closed exception.
- **Idempotency Keys:** Every order generates a deterministic client order identifier (`EXEC-{symbol}-{timestamp}`) to prevent duplicate execution during network retries or connection timeouts.

### 2.3 Deterministic Risk Gate Non-Bypassability
- **Server-Side Enforcement:** Clients cannot dictate execution quantities, risk scores, or bypass gate checks. Every trade intent received by `/api/trading/paper/orders` re-evaluates:
  1. Single-asset concentration limit ($\le 25\%$).
  2. Maximum spread ceiling ($\le 100$ bps).
  3. Minimum liquidity threshold ($\ge \$500,000$ USD default for equities).
  4. Red Team fatal flaws (any unresolved critical refutation blocks trade).
  5. Minimum evidence count ($\ge 3$ verified records).

### 2.4 Model Output Validation & Sanitization
- All LLM outputs are validated against TypeScript schemas before consumption.
- If an LLM response fails to parse, times out, or hallucinates malformed indicators, the council pipeline falls back to deterministic mathematical calculations or returns an explicit `FAILED` stage.
- Prompt injection defenses: User queries are treated as search targets and stripped of prompt-override tokens before dispatching to external LLM providers.

### 2.5 Outbound Alerts & Webhook Security
- Discord and Telegram webhooks validate destination URL schemes (HTTPS only).
- Text payloads are sanitized and HTML-escaped (`escapeHtml`) to prevent injection in chat clients.

---

## 3. Operational Invariants

1. **Fail-Closed Default:** Network timeouts, missing market data, or unverified claims result in `REJECT` or `HOLD`. Never `BUY`.
2. **Authoritative Broker Ground Truth:** Local portfolio and position states are periodically reconciled against Alpaca's authoritative broker state.
3. **No Automated Live Execution:** Live-money execution is completely omitted from the codebase.
