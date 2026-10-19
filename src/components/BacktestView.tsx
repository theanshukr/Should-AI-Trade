'use client';
import React, { useState, useEffect } from 'react';
import { BacktestResult } from '@/lib/backtest/types';
import { useCurrency } from './CurrencyProvider';

export const BacktestView: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [symbol, setSymbol] = useState<string>('BTC');
  const [timeframe, setTimeframe] = useState<'1H' | '1D'>('1D');
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [feeBps, setFeeBps] = useState<number>(10);
  const [slippageBps, setSlippageBps] = useState<number>(5);
  const [stopLossPct, setStopLossPct] = useState<number>(-5.0);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(7.0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunBacktest = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          initialCapital,
          feeBps,
          slippageBps,
          stopLoss: stopLossPct,
          takeProfit: takeProfitPct
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to execute historical backtest');
      } else {
        setResult(data.result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Backtest service unreachable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRunBacktest();
  }, []);

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-xl bg-[#17161d] border border-[#28272e] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Quantitative Strategy Backtester</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
              No Look-Ahead Bias
            </span>
          </div>
          <p className="text-xs text-[#848388] mt-1">
            Simulate historical council decision rules against timestamped OHLCV market candles with modeled fee drag &amp; slippage friction.
          </p>
        </div>

        <button
          onClick={handleRunBacktest}
          disabled={isLoading}
          className="px-5 py-2.5 rounded-lg bg-[#00ff84] text-[#121117] text-xs font-extrabold uppercase tracking-wider hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-[#00ff84]/10"
        >
          {isLoading ? 'Simulating Strategy...' : 'Run Historical Evaluation'}
        </button>
      </div>

      {/* 2. Configuration Parameters Bar */}
      <div className="p-4 rounded-xl bg-[#17161d] border border-[#28272e] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <label className="text-[10px] font-bold text-[#848388] uppercase block mb-1">Asset Symbol</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-[#121117] border border-[#28272e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-[#00ff84] outline-none"
          >
            <option value="BTC">BTC (Crypto)</option>
            <option value="ETH">ETH (Crypto)</option>
            <option value="SOL">SOL (Crypto)</option>
            <option value="AAPL">AAPL (Equity)</option>
            <option value="NVDA">NVDA (Equity)</option>
            <option value="TSLA">TSLA (Equity)</option>
            <option value="SPY">SPY (ETF)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#848388] uppercase block mb-1">Candle Interval</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="w-full bg-[#121117] border border-[#28272e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-[#00ff84] outline-none"
          >
            <option value="1D">1D (Daily Candles)</option>
            <option value="1H">1H (Hourly Candles)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#848388] uppercase block mb-1">Fee (Basis Points)</label>
          <input
            type="number"
            value={feeBps}
            onChange={(e) => setFeeBps(Number(e.target.value))}
            className="w-full bg-[#121117] border border-[#28272e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-[#00ff84] outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#848388] uppercase block mb-1">Slippage (BPS)</label>
          <input
            type="number"
            value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))}
            className="w-full bg-[#121117] border border-[#28272e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-[#00ff84] outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#848388] uppercase block mb-1">Stop Loss %</label>
          <input
            type="number"
            step="0.5"
            value={stopLossPct}
            onChange={(e) => setStopLossPct(Number(e.target.value))}
            className="w-full bg-[#121117] border border-[#28272e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-[#00ff84] outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#848388] uppercase block mb-1">Take Profit %</label>
          <input
            type="number"
            step="0.5"
            value={takeProfitPct}
            onChange={(e) => setTakeProfitPct(Number(e.target.value))}
            className="w-full bg-[#121117] border border-[#28272e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-[#00ff84] outline-none"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#ff3b5c]/10 border border-[#ff3b5c]/30 text-[#ff3b5c] text-xs">
          {errorMsg}
        </div>
      )}

      {/* 3. Performance Summary Metrics Cards */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-[#17161d] border border-[#28272e]">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">Total Net Return</span>
            <span className={`text-xl font-mono font-extrabold ${result.totalReturnPct >= 0 ? 'text-[#00ff84]' : 'text-[#ff3b5c]'}`}>
              {result.totalReturnPct >= 0 ? '+' : ''}{result.totalReturnPct}%
            </span>
            <span className="text-[10px] text-[#848388] block mt-0.5">{formatCurrency(result.netProfitUsd)}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#17161d] border border-[#28272e]">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">Max Drawdown</span>
            <span className="text-xl font-mono font-extrabold text-[#ff3b5c]">
              -{result.maxDrawdownPct}%
            </span>
            <span className="text-[10px] text-[#848388] block mt-0.5">Peak-to-Trough drop</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#17161d] border border-[#28272e]">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">Win Rate</span>
            <span className="text-xl font-mono font-extrabold text-white">
              {result.winRatePct}%
            </span>
            <span className="text-[10px] text-[#848388] block mt-0.5">{result.winningTrades}W / {result.losingTrades}L</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#17161d] border border-[#28272e]">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">Profit Factor</span>
            <span className="text-xl font-mono font-extrabold text-white">
              {result.profitFactor}x
            </span>
            <span className="text-[10px] text-[#848388] block mt-0.5">Gross gains / losses</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#17161d] border border-[#28272e]">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">Sharpe Ratio</span>
            <span className="text-xl font-mono font-extrabold text-white">
              {result.sharpeRatio}
            </span>
            <span className="text-[10px] text-[#848388] block mt-0.5">Risk-adjusted return</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#17161d] border border-[#28272e]">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">Total Friction Cost</span>
            <span className="text-xl font-mono font-extrabold text-amber-300">
              {formatCurrency(result.totalFeesPaidUsd + result.totalSlippageCostUsd)}
            </span>
            <span className="text-[10px] text-[#848388] block mt-0.5">{formatCurrency(result.totalFeesPaidUsd)} fees + slippage</span>
          </div>
        </div>
      )}

      {/* 4. Equity Curve Visualizer */}
      {result && result.equityCurve && result.equityCurve.length > 0 && (
        <div className="p-5 rounded-xl bg-[#17161d] border border-[#28272e] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#28272e]">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Simulated Equity Curve</h4>
              <span className="text-[10px] text-[#848388]">Initial: {formatCurrency(result.initialCapital)} → Final: {formatCurrency(result.finalEquity)}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{result.evaluationPeriod.totalBars} Bars Analyzed</span>
          </div>

          <div className="h-44 w-full flex items-end gap-1 pt-4 pb-2 px-2 bg-[#121117] rounded-lg border border-[#28272e] overflow-hidden">
            {result.equityCurve.map((pt, i) => {
              const minEq = Math.min(...result.equityCurve.map(p => p.equity)) * 0.98;
              const maxEq = Math.max(...result.equityCurve.map(p => p.equity)) * 1.02;
              const range = maxEq - minEq || 1;
              const heightPct = Math.max(5, Math.min(100, ((pt.equity - minEq) / range) * 100));
              const isProfit = pt.equity >= result.initialCapital;

              return (
                <div
                  key={i}
                  title={`${new Date(pt.timestamp).toLocaleDateString()}: ${formatCurrency(pt.equity)} (DD: ${pt.drawdownPct}%)`}
                  className="flex-1 rounded-t transition-all hover:opacity-80"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: isProfit ? '#00ff84' : '#ff3b5c',
                    opacity: 0.75
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Trade Ledger Log Table */}
      {result && (
        <div className="p-5 rounded-xl bg-[#17161d] border border-[#28272e] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#28272e]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historical Trade Executions ({result.trades.length})</h4>
            <span className="text-[10px] text-[#848388]">Chronological Strategy Executions</span>
          </div>

          {result.trades.length === 0 ? (
            <div className="p-8 text-center text-[#848388] text-xs">
              No trades met the entry and risk gate criteria during this historical window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#28272e] text-[10px] text-[#848388] uppercase">
                    <th className="py-2 px-2">Trade ID</th>
                    <th className="py-2 px-2">Side</th>
                    <th className="py-2 px-2">Entry Price</th>
                    <th className="py-2 px-2">Exit Price</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Net P&amp;L</th>
                    <th className="py-2 px-2">Fees + Slip</th>
                    <th className="py-2 px-2">Exit Trigger</th>
                    <th className="py-2 px-2">Holding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#28272e]/60 text-slate-300">
                  {result.trades.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1f1e28] transition">
                      <td className="py-2 px-2 text-white font-bold">{t.id}</td>
                      <td className="py-2 px-2 text-[#00ff84]">{t.side}</td>
                      <td className="py-2 px-2">${t.entryPrice.toLocaleString()}</td>
                      <td className="py-2 px-2">${t.exitPrice.toLocaleString()}</td>
                      <td className="py-2 px-2">{t.quantity}</td>
                      <td className={`py-2 px-2 font-bold ${t.netPnlUsd >= 0 ? 'text-[#00ff84]' : 'text-[#ff3b5c]'}`}>
                        {t.netPnlUsd >= 0 ? '+' : ''}{formatCurrency(t.netPnlUsd)} ({t.pnlPct >= 0 ? '+' : ''}{t.pnlPct}%)
                      </td>
                      <td className="py-2 px-2 text-amber-300/80">${(t.feeUsd + t.slippageCostUsd).toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          t.exitReason === 'TAKE_PROFIT' ? 'bg-[#00ff84]/10 text-[#00ff84]' :
                          t.exitReason === 'STOP_LOSS' ? 'bg-[#ff3b5c]/10 text-[#ff3b5c]' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {t.exitReason}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[#848388]">{t.holdingBars} bars</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Regulatory Limitations & Methodology Disclaimer */}
      {result && (
        <div className="p-4 rounded-xl bg-[#121117] border border-[#28272e] space-y-2 text-[11px] text-[#848388]">
          <strong className="text-white block uppercase text-[10px] tracking-wider">Methodology &amp; Evaluation Constraints</strong>
          <ul className="list-disc pl-4 space-y-1">
            {result.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
          <p className="pt-1 text-[#ff3b5c]/80 text-[10px] font-medium border-t border-[#28272e]/50">
            {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
};
