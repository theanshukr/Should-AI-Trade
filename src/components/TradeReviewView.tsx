'use client';
import React, { useState } from 'react';
import { Investigation, MarketSnapshot } from '@/lib/types';
import { PortfolioSnapshot } from '@/lib/portfolio/types';
import { useCurrency } from './CurrencyProvider';

interface TradeReviewViewProps {
  investigation: Investigation | null;
  snapshot: MarketSnapshot | null;
  portfolio: PortfolioSnapshot | null;
  onNavigateTab: (tab: any) => void;
  onRefreshPortfolio?: () => void;
}

export const TradeReviewView: React.FC<TradeReviewViewProps> = ({
  investigation,
  snapshot,
  portfolio,
  onNavigateTab,
  onRefreshPortfolio
}) => {
  const { formatCurrency } = useCurrency();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(investigation?.execution || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const decision = investigation?.decision;
  const isApproved = decision?.conclusion === 'BUY' && decision.riskGateApproved;
  const currentPrice = snapshot?.price || investigation?.snapshot?.price || 100;
  const availableCash = portfolio?.account?.cash ?? 100000;
  const portfolioEquity = portfolio?.account?.equity ?? 100000;

  // Calculate position sizing assuming 25% max allocation policy
  const maxAllocationPct = 25;
  const proposedNotionalUsd = Math.round(availableCash * 0.15); // standard 15% sizing
  const proposedQty = currentPrice > 0 ? Number((proposedNotionalUsd / currentPrice).toFixed(investigation?.asset?.includes('/') ? 4 : 0)) : 0;
  const actualNotional = Number((proposedQty * currentPrice).toFixed(2));
  const proposedAllocationPct = portfolioEquity > 0 ? Number(((actualNotional / portfolioEquity) * 100).toFixed(1)) : 0;

  const handleConfirmOrder = async () => {
    if (!investigation || !isApproved) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/trading/paper/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId: investigation.id,
          symbol: investigation.asset,
          qty: proposedQty,
          side: 'buy',
          orderType: 'market'
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Paper execution failed');
      } else if (data.order) {
        setExecutionResult(data.order);
        setIsConfirmModalOpen(false);
        if (onRefreshPortfolio) onRefreshPortfolio();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network partition while contacting broker API');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!investigation) {
    return (
      <div className="p-8 rounded-xl bg-[#17161d] border border-[#28272e] text-center space-y-4 max-w-2xl mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-[#1f1e28] border border-[#34333f] flex items-center justify-center mx-auto text-[#848388] text-xl font-bold">
          !
        </div>
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">No Active Trade Candidate Selected</h3>
          <p className="text-xs text-[#848388] mt-1 max-w-md mx-auto">
            Select an opportunity candidate from the Market Scanner or run an analysis in Command Lab to review its trade thesis, exposure, and deterministic risk gate evaluation.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigateTab('discovery')}
            className="px-4 py-2 rounded-lg bg-[#1f1e28] hover:bg-[#282736] border border-[#34333f] text-xs font-semibold text-white transition cursor-pointer"
          >
            Open Market Scanner →
          </button>
          <button
            onClick={() => onNavigateTab('command')}
            className="px-4 py-2 rounded-lg bg-[#00ff84] text-[#121117] text-xs font-bold transition hover:opacity-90 cursor-pointer"
          >
            Run Council Investigation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-xl bg-[#17161d] border border-[#28272e] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-extrabold text-white tracking-tight">${investigation.asset}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isApproved
                ? 'bg-[#00ff84]/10 text-[#00ff84] border border-[#00ff84]/30'
                : 'bg-[#ff3b5c]/10 text-[#ff3b5c] border border-[#ff3b5c]/30'
            }`}>
              {isApproved ? 'ELIGIBLE FOR PAPER EXECUTION' : 'BLOCKED BY RISK GATE'}
            </span>
          </div>
          <p className="text-xs text-[#848388] mt-1">
            Investigation ID: <code className="text-slate-300">{investigation.id}</code> · Evaluated {new Date(investigation.createdAt).toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {executionResult ? (
            <div className="px-3.5 py-2 rounded-lg bg-[#1f1e28] border border-[#28272e] text-right">
              <span className="text-[10px] text-[#848388] block uppercase font-bold">Paper Order State</span>
              <span className="text-xs font-bold text-[#00ff84] uppercase">{executionResult.status}</span>
            </div>
          ) : isApproved ? (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-[#00ff84] text-[#121117] text-xs font-extrabold uppercase tracking-wider hover:opacity-90 active:scale-95 transition shadow-lg shadow-[#00ff84]/10 cursor-pointer"
            >
              Review &amp; Authorize Paper Order →
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2 rounded-lg bg-[#28272e] text-[#848388] text-xs font-bold uppercase tracking-wider cursor-not-allowed opacity-60"
            >
              Execution Disabled (Risk Gate Blocked)
            </button>
          )}
        </div>
      </div>

      {/* 2. Three-Column Technical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Trade Thesis & Rationale */}
        <div className="p-4 rounded-xl bg-[#17161d] border border-[#28272e] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#28272e]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">1. Trade Thesis</h4>
            <span className="text-[10px] text-[#848388]">Council Consensus</span>
          </div>

          <div className="p-3 rounded-lg bg-[#121117] border border-[#28272e] space-y-1.5">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">AI Proposed Action</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black ${
                decision?.conclusion === 'BUY' ? 'text-[#00ff84]' : decision?.conclusion === 'REJECT' ? 'text-[#ff3b5c]' : 'text-amber-400'
              }`}>
                {decision?.conclusion || 'HOLD'}
              </span>
              <span className="text-xs text-[#848388] font-medium">
                (Confidence: {decision?.confidence ?? 0}%)
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <span className="text-[10px] font-bold text-[#848388] uppercase block">Synthesized Rationale</span>
            <p className="p-2.5 rounded-lg bg-[#121117] border border-[#28272e] text-[11px] text-[#9ca3af]">
              {decision?.rationale || 'No rationale available for this investigation.'}
            </p>
          </div>

          {decision?.strongestCounterargument && (
            <div className="p-2.5 rounded-lg bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-[11px] text-[#ff3b5c] space-y-1">
              <span className="font-bold uppercase text-[9px] block">Red Team Counterargument:</span>
              <p>{decision.strongestCounterargument}</p>
            </div>
          )}
        </div>

        {/* Column 2: Order & Exposure Calculation */}
        <div className="p-4 rounded-xl bg-[#17161d] border border-[#28272e] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#28272e]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">2. Exposure &amp; Sizing</h4>
            <span className="text-[10px] text-[#848388]">Deterministic Sizing</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#121117] border border-[#28272e]">
              <span className="text-[10px] text-[#848388] block">Current Spot Price</span>
              <span className="font-mono font-bold text-white">${currentPrice.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#121117] border border-[#28272e]">
              <span className="text-[10px] text-[#848388] block">Proposed Qty</span>
              <span className="font-mono font-bold text-[#00ff84]">{proposedQty} units</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#121117] border border-[#28272e]">
              <span className="text-[10px] text-[#848388] block">Proposed Notional</span>
              <span className="font-mono font-bold text-white">{formatCurrency(actualNotional)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#121117] border border-[#28272e]">
              <span className="text-[10px] text-[#848388] block">Portfolio Allocation</span>
              <span className={`font-mono font-bold ${proposedAllocationPct > maxAllocationPct ? 'text-[#ff3b5c]' : 'text-white'}`}>
                {proposedAllocationPct}% / max {maxAllocationPct}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#121117] border border-[#28272e] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#848388] text-[11px]">
              <span>Available Cash:</span>
              <span className="font-mono text-white">{formatCurrency(availableCash)}</span>
            </div>
            <div className="flex justify-between text-[#848388] text-[11px]">
              <span>Total Equity:</span>
              <span className="font-mono text-white">{formatCurrency(portfolioEquity)}</span>
            </div>
            <div className="flex justify-between text-[#848388] text-[11px]">
              <span>Broker Route:</span>
              <span className="font-mono text-[#00ff84]">Alpaca Paper REST v2</span>
            </div>
          </div>
        </div>

        {/* Column 3: Deterministic Gate Decisions */}
        <div className="p-4 rounded-xl bg-[#17161d] border border-[#28272e] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#28272e]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">3. Risk Gate Verdict</h4>
            <span className={`text-[10px] font-bold ${decision?.riskGateApproved ? 'text-[#00ff84]' : 'text-[#ff3b5c]'}`}>
              {decision?.riskGateApproved ? 'PASS' : 'BLOCKED'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {decision?.riskGateNotes && decision.riskGateNotes.length > 0 ? (
              decision.riskGateNotes.map((note, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-[#121117] border border-[#28272e] flex items-start gap-2">
                  <span className="text-[#00ff84] font-bold">✓</span>
                  <span className="text-[11px] text-[#9ca3af]">{note}</span>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-lg bg-[#121117] border border-[#28272e] text-center text-[#848388] text-xs">
                No risk notes recorded.
              </div>
            )}

            {!decision?.riskGateApproved && (
              <div className="p-2.5 rounded-lg bg-[#ff3b5c]/10 border border-[#ff3b5c]/30 text-[#ff3b5c] text-[11px] font-medium space-y-1">
                <span className="font-bold block">Execution Blocked:</span>
                <span>The candidate failed non-bypassable risk boundaries (insufficient evidence, allocation limit exceeded, or unresolved Red Team objection).</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Explicit User-Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#181722] border border-[#2d2c39] p-6 space-y-5 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#28272e]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Confirm Paper Order Submission</h3>
                <span className="text-[10px] text-[#848388]">Explicit User Authorization Required</span>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-[#848388] hover:text-white transition text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
              <strong className="block font-bold">Paper Trading Notice:</strong>
              <span>This order will be submitted directly to your configured Alpaca Paper Trading account via idempotent API dispatch. No live funds are at risk.</span>
            </div>

            <div className="p-4 rounded-xl bg-[#121117] border border-[#28272e] space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-[#848388]">Asset:</span><span className="font-mono font-bold text-white">${investigation.asset}</span></div>
              <div className="flex justify-between"><span className="text-[#848388]">Side:</span><span className="font-bold text-[#00ff84]">BUY (LONG)</span></div>
              <div className="flex justify-between"><span className="text-[#848388]">Quantity:</span><span className="font-mono font-bold text-white">{proposedQty} units</span></div>
              <div className="flex justify-between"><span className="text-[#848388]">Estimated Price:</span><span className="font-mono font-bold text-white">${currentPrice.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[#848388]">Estimated Notional:</span><span className="font-mono font-bold text-white">{formatCurrency(actualNotional)}</span></div>
              <div className="flex justify-between"><span className="text-[#848388]">Idempotency Guard:</span><span className="font-mono text-slate-400 text-[10px]">EXEC-{investigation.asset}-{Date.now().toString(36)}</span></div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#ff3b5c]/10 border border-[#ff3b5c]/30 text-[#ff3b5c] text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-[#28272e] text-[#9ca3af] hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg bg-[#00ff84] text-[#121117] text-xs font-extrabold uppercase tracking-wider hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isSubmitting ? 'Transmitting Order...' : 'Confirm & Submit Paper Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
