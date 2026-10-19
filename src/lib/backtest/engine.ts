import type { Candle } from '../types';
import type { BacktestConfig, BacktestResult, BacktestTrade, EquityPoint } from './types';

/**
 * Calculates Wilder's smoothed RSI-14 up to bar `currentIndex`.
 * Look-ahead safe: accesses only bars from 0 to `currentIndex`.
 */
export function calculateBarRSI(candles: Candle[], currentIndex: number, period: number = 14): number {
  if (currentIndex < period) return 50.0;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i <= currentIndex; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100.0;
  if (avgGain === 0) return 0.0;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Calculates momentum score up to bar `currentIndex`.
 * Look-ahead safe: accesses only bars from 0 to `currentIndex`.
 */
export function calculateBarMomentum(candles: Candle[], currentIndex: number, lookback: number = 10): number {
  if (currentIndex < lookback) return 50.0;
  const current = candles[currentIndex].close;
  const past = candles[currentIndex - lookback].close;
  if (past <= 0) return 50.0;

  const pctChange = ((current - past) / past) * 100;
  // Normalized 0-100 where 0% change = 50, +5% change = 75, -5% change = 25
  const score = 50 + pctChange * 5;
  return Math.max(0, Math.min(100, Number(score.toFixed(1))));
}

/**
 * Runs a deterministic historical backtest over supplied candles.
 * Strictly avoids look-ahead bias by evaluating decisions chronologically.
 */
export function runBacktest(candles: Candle[], config: BacktestConfig): BacktestResult {
  const symbol = config.symbol.toUpperCase().replace(/^\$/, '');
  const initialCapital = config.initialCapitalUsd ?? 100000;
  const feeBps = config.feeBps ?? 10;           // 0.10%
  const slippageBps = config.slippageBps ?? 5;   // 0.05%
  const maxAllocationPct = config.maxAllocationPct ?? 25; // 25% single trade
  const stopLossPct = config.stopLossPct ?? -5.0; // -5%
  const takeProfitPct = config.takeProfitPct ?? 7.0; // +7%
  const rsiBuyThreshold = config.rsiBuyThreshold ?? 55;
  const minMomentum = config.minMomentumScore ?? 58;

  const feeRate = feeBps / 10000;
  const slippageRate = slippageBps / 10000;

  const limitations = [
    'Past performance is not indicative of future market returns.',
    'Assumes continuous fills at slippage-adjusted close prices without order book queue latency.',
    `Transaction fee modeled at ${feeBps} bps per trade side.`,
    `Execution slippage modeled at ${slippageBps} bps per fill.`,
    `Single position maximum exposure enforced at ${maxAllocationPct}% of capital.`
  ];

  const disclaimer = 'SIMULATED HISTORICAL BACKTEST ONLY. NOT FINANCIAL ADVICE. All results represent hypothetical execution under modeled friction and do not guarantee live trading profitability.';

  if (!candles || candles.length < 20) {
    return {
      symbol,
      evaluationPeriod: { start: '', end: '', totalBars: candles?.length || 0 },
      initialCapital,
      finalEquity: initialCapital,
      netProfitUsd: 0,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      winRatePct: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      averageTradePnlPct: 0,
      totalFeesPaidUsd: 0,
      totalSlippageCostUsd: 0,
      trades: [],
      equityCurve: [{ timestamp: new Date().toISOString(), equity: initialCapital, drawdownPct: 0 }],
      limitations,
      disclaimer
    };
  }

  // Sort candles strictly chronologically to eliminate order bias
  const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);

  let cash = initialCapital;
  let peakEquity = initialCapital;
  let maxDrawdownPct = 0;
  let totalFeesPaidUsd = 0;
  let totalSlippageCostUsd = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];

  interface ActivePosition {
    entryBarIndex: number;
    entryTimestamp: string;
    entryRawPrice: number;
    effectiveEntryPrice: number;
    quantity: number;
    notionalUsd: number;
    entryFeeUsd: number;
    entrySlippageUsd: number;
  }

  let activePosition: ActivePosition | null = null;
  let tradeCounter = 0;

  for (let i = 15; i < sorted.length; i++) {
    const bar = sorted[i];
    const rawPrice = bar.close;

    // Current bar signals (computed strictly from past & current bar)
    const rsi = calculateBarRSI(sorted, i);
    const momentum = calculateBarMomentum(sorted, i);

    // 1. If currently in a position, evaluate exit criteria
    if (activePosition) {
      const pnlPct = ((rawPrice - activePosition.effectiveEntryPrice) / activePosition.effectiveEntryPrice) * 100;
      let shouldExit = false;
      let exitReason: BacktestTrade['exitReason'] = 'END_OF_SERIES';

      if (pnlPct <= stopLossPct) {
        shouldExit = true;
        exitReason = 'STOP_LOSS';
      } else if (pnlPct >= takeProfitPct) {
        shouldExit = true;
        exitReason = 'TAKE_PROFIT';
      } else if (momentum < 40 && pnlPct < 0) {
        shouldExit = true;
        exitReason = 'MOMENTUM_BREAKDOWN';
      } else if (i === sorted.length - 1) {
        shouldExit = true;
        exitReason = 'END_OF_SERIES';
      }

      if (shouldExit) {
        tradeCounter++;
        const effectiveExitPrice = rawPrice * (1 - slippageRate);
        const exitSlippageUsd = (rawPrice - effectiveExitPrice) * activePosition.quantity;
        const exitNotional = effectiveExitPrice * activePosition.quantity;
        const exitFeeUsd = exitNotional * feeRate;

        const grossPnlUsd = (rawPrice - activePosition.entryRawPrice) * activePosition.quantity;
        const totalTradeFee = activePosition.entryFeeUsd + exitFeeUsd;
        const totalTradeSlippage = activePosition.entrySlippageUsd + exitSlippageUsd;
        const netPnlUsd = (effectiveExitPrice - activePosition.effectiveEntryPrice) * activePosition.quantity - (activePosition.entryFeeUsd + exitFeeUsd);
        const netPnlPct = Number(((netPnlUsd / activePosition.notionalUsd) * 100).toFixed(2));

        cash += exitNotional - exitFeeUsd;
        totalFeesPaidUsd += totalTradeFee;
        totalSlippageCostUsd += totalTradeSlippage;

        trades.push({
          id: `BT-${symbol}-${tradeCounter}`,
          symbol,
          side: 'BUY',
          entryTimestamp: activePosition.entryTimestamp,
          entryPrice: Number(activePosition.effectiveEntryPrice.toFixed(4)),
          exitTimestamp: bar.isoString || new Date(bar.timestamp).toISOString(),
          exitPrice: Number(effectiveExitPrice.toFixed(4)),
          quantity: Number(activePosition.quantity.toFixed(4)),
          notionalUsd: Number(activePosition.notionalUsd.toFixed(2)),
          grossPnlUsd: Number(grossPnlUsd.toFixed(2)),
          netPnlUsd: Number(netPnlUsd.toFixed(2)),
          pnlPct: netPnlPct,
          feeUsd: Number(totalTradeFee.toFixed(2)),
          slippageCostUsd: Number(totalTradeSlippage.toFixed(2)),
          exitReason,
          holdingBars: i - activePosition.entryBarIndex
        });

        activePosition = null;
      }
    }

    // 2. If flat, evaluate entry signal
    if (!activePosition && i < sorted.length - 1) {
      const isBullishSignal = rsi >= rsiBuyThreshold && momentum >= minMomentum;

      if (isBullishSignal) {
        const totalCurrentEquity = cash;
        const maxPositionSizeUsd = totalCurrentEquity * (maxAllocationPct / 100);

        if (maxPositionSizeUsd > 100 && rawPrice > 0) {
          const effectiveEntryPrice = rawPrice * (1 + slippageRate);
          const quantity = maxPositionSizeUsd / effectiveEntryPrice;
          const notionalUsd = effectiveEntryPrice * quantity;
          const entrySlippageUsd = (effectiveEntryPrice - rawPrice) * quantity;
          const entryFeeUsd = notionalUsd * feeRate;

          if (cash >= notionalUsd + entryFeeUsd) {
            cash -= (notionalUsd + entryFeeUsd);
            activePosition = {
              entryBarIndex: i,
              entryTimestamp: bar.isoString || new Date(bar.timestamp).toISOString(),
              entryRawPrice: rawPrice,
              effectiveEntryPrice,
              quantity,
              notionalUsd,
              entryFeeUsd,
              entrySlippageUsd
            };
          }
        }
      }
    }

    // Calculate Mark-to-Market Equity at current bar
    const currentPositionValue = activePosition ? activePosition.quantity * rawPrice : 0;
    const currentEquity = cash + currentPositionValue;

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const currentDrawdownPct = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
    if (currentDrawdownPct > maxDrawdownPct) {
      maxDrawdownPct = currentDrawdownPct;
    }

    equityCurve.push({
      timestamp: bar.isoString || new Date(bar.timestamp).toISOString(),
      equity: Number(currentEquity.toFixed(2)),
      drawdownPct: Number(currentDrawdownPct.toFixed(2))
    });
  }

  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const netProfitUsd = Number((finalEquity - initialCapital).toFixed(2));
  const totalReturnPct = Number((((finalEquity - initialCapital) / initialCapital) * 100).toFixed(2));

  const winningTrades = trades.filter(t => t.netPnlUsd > 0).length;
  const losingTrades = trades.filter(t => t.netPnlUsd <= 0).length;
  const totalTrades = trades.length;
  const winRatePct = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

  const totalGains = trades.filter(t => t.netPnlUsd > 0).reduce((acc, t) => acc + t.netPnlUsd, 0);
  const totalLosses = Math.abs(trades.filter(t => t.netPnlUsd < 0).reduce((acc, t) => acc + t.netPnlUsd, 0));
  const profitFactor = totalLosses > 0 ? Number((totalGains / totalLosses).toFixed(2)) : totalGains > 0 ? 99.0 : 0;

  const averageTradePnlPct = totalTrades > 0
    ? Number((trades.reduce((acc, t) => acc + t.pnlPct, 0) / totalTrades).toFixed(2))
    : 0;

  // Calculate Sharpe Ratio (daily/hourly returns annualized)
  let sharpeRatio = 0;
  if (equityCurve.length > 2) {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      const curr = equityCurve[i].equity;
      if (prev > 0) returns.push((curr - prev) / prev);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      // Annualize assuming daily periods (~252 trading days)
      sharpeRatio = Number(((mean / stdDev) * Math.sqrt(252)).toFixed(2));
    }
  }

  return {
    symbol,
    evaluationPeriod: {
      start: sorted[0].isoString || new Date(sorted[0].timestamp).toISOString(),
      end: sorted[sorted.length - 1].isoString || new Date(sorted[sorted.length - 1].timestamp).toISOString(),
      totalBars: sorted.length
    },
    initialCapital,
    finalEquity,
    netProfitUsd,
    totalReturnPct,
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    winRatePct,
    totalTrades,
    winningTrades,
    losingTrades,
    profitFactor,
    sharpeRatio,
    averageTradePnlPct,
    totalFeesPaidUsd: Number(totalFeesPaidUsd.toFixed(2)),
    totalSlippageCostUsd: Number(totalSlippageCostUsd.toFixed(2)),
    trades,
    equityCurve,
    limitations,
    disclaimer
  };
}
