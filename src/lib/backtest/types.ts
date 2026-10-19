export interface BacktestConfig {
  symbol: string;
  timeframe?: '1H' | '1D';
  initialCapitalUsd?: number;
  feeBps?: number;           // e.g. 10 = 0.10%
  slippageBps?: number;      // e.g. 5 = 0.05%
  maxAllocationPct?: number; // e.g. 25%
  stopLossPct?: number;      // e.g. -5.0%
  takeProfitPct?: number;    // e.g. 7.0%
  rsiBuyThreshold?: number;  // e.g. 55
  minMomentumScore?: number; // e.g. 60
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryTimestamp: string;
  entryPrice: number;
  exitTimestamp: string;
  exitPrice: number;
  quantity: number;
  notionalUsd: number;
  grossPnlUsd: number;
  netPnlUsd: number;
  pnlPct: number;
  feeUsd: number;
  slippageCostUsd: number;
  exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'MOMENTUM_BREAKDOWN' | 'END_OF_SERIES';
  holdingBars: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdownPct: number;
}

export interface BacktestResult {
  symbol: string;
  evaluationPeriod: {
    start: string;
    end: string;
    totalBars: number;
  };
  initialCapital: number;
  finalEquity: number;
  netProfitUsd: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  averageTradePnlPct: number;
  totalFeesPaidUsd: number;
  totalSlippageCostUsd: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  limitations: string[];
  disclaimer: string;
}
