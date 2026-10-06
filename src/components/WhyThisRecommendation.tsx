import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Scale, 
  BarChart2, 
  CheckCircle2, 
  ShieldCheck,
  HelpCircle,
  Info,
  Calculator
} from 'lucide-react';
import { motion } from 'motion/react';
import { StockData } from '../services/geminiService';
import { cn, formatCurrency } from '../utils';
import { computeCanonicalTradeGeometry } from '../utils/canonicalLevels';

interface WhyThisRecommendationProps {
  data: StockData;
  currency?: string;
  className?: string;
}

export const WhyThisRecommendation: React.FC<WhyThisRecommendationProps> = ({ 
  data, 
  currency,
  className 
}) => {
  const currentPx = data.currentPrice || 0;
  const effectiveCurrency = currency || 'USD';
  const analysis = data.analysis;
  const rec = data.recommendation;

  // Technical trend & moving average status
  const trend = analysis.trend || 'Neutral';
  const ma20 = data.ma20 || data.ma5;
  const isAboveMa20 = ma20 ? currentPx >= ma20 : true;

  // RSI Momentum
  const rsi = typeof analysis.rsi14 === 'number' 
    ? analysis.rsi14 
    : (typeof analysis.momentumScore === 'number' ? analysis.momentumScore : 50);
  const momentumStatus = rsi >= 60 ? 'Strong Expansion' : rsi >= 42 ? 'Healthy Momentum' : 'Consolidating';

  // Volume participation
  const relVol = typeof analysis.relativeVolume === 'number' 
    ? analysis.relativeVolume 
    : (typeof data.relativeVolume === 'number' ? data.relativeVolume : 1.0);
  const volStatus = relVol >= 1.15 ? 'Institutional Flow' : relVol >= 0.85 ? 'Normal Liquidity' : 'Light Volume';

  // Valuation
  const pe = data.peRatio;
  const valuationLabel = pe && pe > 35 ? 'Premium Multiple' : pe && pe < 18 && pe > 0 ? 'Attractive Multiple' : pe ? 'Fair Value Multiple' : 'Growth Multiple';

  // Canonical Trade Geometry: mathematically unified single source of truth
  const stopLoss = rec.stopLoss || currentPx * 0.95;
  const profitTarget = rec.profitTarget || currentPx * 1.15;
  const tradeGeometry = computeCanonicalTradeGeometry(currentPx, stopLoss, profitTarget, effectiveCurrency);

  // Progress percentage between stop and target
  const totalSpan = Math.max(0.01, profitTarget - stopLoss);
  const currentPosPercent = Math.min(92, Math.max(8, ((currentPx - stopLoss) / totalSpan) * 100));

  // Clean qualitative thesis reasons (remove any raw duplicated currency numbers)
  const rawReasons = rec.reasons || [];
  const cleanReasons = rawReasons
    .filter(r => {
      const lower = r.toLowerCase();
      return (
        !lower.includes('verified live price') &&
        !lower.includes('currently trading at') &&
        !lower.includes('support floor established at') &&
        !lower.includes('profit target set at') &&
        !lower.includes('structural support zone at')
      );
    })
    .map(r => {
      return r
        .replace(/(\$|£|€)\s*\d+(\.\d+)?(\s*[-–—]\s*(\$|£|€)?\s*\d+(\.\d+)?)?/g, '')
        .replace(/\(\s*major structural floor:\s*\)/gi, '')
        .replace(/\(\s*\)/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    })
    .filter(r => r.length > 10)
    .slice(0, 3);

  // Overall qualitative setup bias badge
  const biasLabel = trend === 'Bullish' && tradeGeometry.rewardRiskRatio >= 1.8 ? 'Asymmetric Setup' :
    trend === 'Bullish' ? 'Constructive' :
    trend === 'Bearish' ? 'Defensive' : 'Balanced Setup';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      id="why-this-recommendation-box"
      className={cn(
        "bg-white dark:bg-[#121212] p-4 sm:p-5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xs flex flex-col gap-3",
        className
      )}
    >
      {/* Header: Focused on Thesis Identity with Bias Badge */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 stroke-[2.25]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Recommendation Thesis
          </h2>
        </div>

        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {biasLabel}
        </span>
      </div>

      {/* 2x2 Factor Telemetry Matrix */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Tile 1: Trend */}
        <div className="p-2 rounded-xl bg-neutral-50/80 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
              Trend
            </span>
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.2 rounded font-mono",
              trend === 'Bullish' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
              trend === 'Bearish' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
              "bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            )}>
              {trend}
            </span>
          </div>
          <p className="text-[11px] text-neutral-700 dark:text-neutral-300 font-medium leading-snug break-words">
            {isAboveMa20 ? 'Above 20D MA' : 'Testing 20D MA'}
          </p>
          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Market · 20D MA</span>
          </div>
        </div>

        {/* Tile 2: Momentum (RSI) */}
        <div className="p-2 rounded-xl bg-neutral-50/80 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-500 shrink-0" />
              RSI (14)
            </span>
            <span className="text-[10px] font-bold font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1.5 py-0.2 rounded">
              {rsi.toFixed(1)}
            </span>
          </div>
          <p className="text-[11px] text-neutral-700 dark:text-neutral-300 font-medium leading-snug break-words">
            {momentumStatus}
          </p>
          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Market · 14D RSI</span>
          </div>
        </div>

        {/* Tile 3: Volume Confirmation */}
        <div className="p-2 rounded-xl bg-neutral-50/80 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
              <BarChart2 className="w-3 h-3 text-purple-500 shrink-0" />
              Volume
            </span>
            <span className="text-[10px] font-bold font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:border-neutral-800 px-1.5 py-0.2 rounded">
              {relVol.toFixed(2)}x
            </span>
          </div>
          <p className="text-[11px] text-neutral-700 dark:text-neutral-300 font-medium leading-snug break-words">
            {volStatus}
          </p>
          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Market · 20D Relative Flow</span>
          </div>
        </div>

        {/* Tile 4: Valuation Profile */}
        <div className="p-2 rounded-xl bg-neutral-50/80 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
              <Scale className="w-3 h-3 text-amber-500 shrink-0" />
              Valuation
            </span>
            <span className="text-[10px] font-bold font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1.5 py-0.2 rounded">
              {pe ? `${pe}x` : 'P/E N/A'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-700 dark:text-neutral-300 font-medium leading-snug break-words">
            {valuationLabel}
          </p>
          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 shrink-0" />
            <span>Reported GAAP · TTM</span>
          </div>
        </div>
      </div>

      {/* Trade Geometry Bar: Asymmetric Risk-Reward Visual */}
      <div className="p-3 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Trade Asymmetry
            </span>
            <span className="text-[9px] font-mono text-purple-600/80 dark:text-purple-400/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>Model Geometry</span>
            </span>
          </div>

          {/* Canonical R:R Badge with Interactive Hover Formula */}
          <div className="relative group/rr cursor-help">
            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition-colors">
              <span>{tradeGeometry.multiplierFormatted}</span>
              <span className="text-[10px] font-bold opacity-80">({tradeGeometry.ratioFormatted}) Payoff</span>
              <HelpCircle className="w-3 h-3 opacity-60 group-hover/rr:opacity-100 transition-opacity" />
            </span>

            {/* Hover Tooltip: Formula Breakdown & EV Distinction */}
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-84 p-3 rounded-xl bg-neutral-900/95 dark:bg-black/95 text-white backdrop-blur-md shadow-2xl border border-neutral-700/80 dark:border-neutral-800 text-[11px] leading-relaxed opacity-0 pointer-events-none group-hover/rr:opacity-100 group-hover/rr:pointer-events-auto transition-all duration-200 z-50">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2 font-sans">
                <span className="font-bold text-xs text-neutral-200 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  Canonical Formula Breakdown
                </span>
                <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                  {tradeGeometry.multiplierFormatted}
                </span>
              </div>

              {/* Exact Formula Lines */}
              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="flex justify-between items-center text-rose-300">
                  <span>Risk (Downside):</span>
                  <span className="font-bold">−{Math.abs(tradeGeometry.downsidePct).toFixed(1)}% ({formatCurrency(tradeGeometry.riskAmount, effectiveCurrency)})</span>
                </div>
                <div className="flex justify-between items-center text-emerald-300">
                  <span>Reward (Upside):</span>
                  <span className="font-bold">+{tradeGeometry.upsidePct.toFixed(1)}% ({formatCurrency(tradeGeometry.rewardAmount, effectiveCurrency)})</span>
                </div>
                <div className="border-t border-neutral-800 pt-1 flex justify-between items-center text-neutral-100 font-bold">
                  <span>Reward / Risk:</span>
                  <span className="text-emerald-400">
                    +{tradeGeometry.upsidePct.toFixed(1)}% ÷ {Math.abs(tradeGeometry.downsidePct).toFixed(1)}% = {tradeGeometry.multiplierFormatted}
                  </span>
                </div>
                <div className="text-[9.5px] text-neutral-400 font-sans pt-0.5">
                  Calculation: ({formatCurrency(tradeGeometry.rewardAmount, effectiveCurrency)} ÷ {formatCurrency(tradeGeometry.riskAmount, effectiveCurrency)})
                </div>
              </div>

              {/* EV Distinction Reality Check */}
              <div className="mt-2.5 pt-2 border-t border-neutral-800/80 text-[10px] font-sans text-neutral-300 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <Info className="w-3 h-3 text-amber-400 shrink-0" />
                  R:R vs Expected Value (EV):
                </div>
                <p className="text-neutral-300 leading-snug">
                  {tradeGeometry.multiplierFormatted} is the geometric payoff ratio, not probability-adjusted Expected Value (EV). A {tradeGeometry.ratioFormatted} payoff requires a win rate &gt; {tradeGeometry.breakEvenWinRate}% to break even.
                </p>
                <p className="text-neutral-400 leading-snug">
                  Viability depends on multi-factor confluence (Signal Agreement &amp; moving average alignment).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Scale */}
        <div className="space-y-1">
          <div className="relative h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            {/* Left risk region */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-rose-500/40 rounded-l-full"
              style={{ width: `${currentPosPercent}%` }}
            />
            {/* Right reward region */}
            <div 
              className="absolute top-0 bottom-0 right-0 bg-emerald-500/50 rounded-r-full"
              style={{ width: `${100 - currentPosPercent}%` }}
            />
            {/* Current Price Pin */}
            <div 
              className="absolute top-0 bottom-0 w-1.5 bg-neutral-900 dark:bg-white rounded-full -ml-0.5 shadow-sm"
              style={{ left: `${currentPosPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
            <span 
              className="text-rose-600 dark:text-rose-400 font-medium cursor-help"
              title={tradeGeometry.formulaDisplay.riskFormula}
            >
              Stop {formatCurrency(tradeGeometry.stopPrice, effectiveCurrency)} · {tradeGeometry.downsidePct < 0 ? '−' : '+'}{Math.abs(tradeGeometry.downsidePct).toFixed(1)}%
            </span>
            <span 
              className="text-emerald-600 dark:text-emerald-400 font-medium cursor-help"
              title={tradeGeometry.formulaDisplay.rewardFormula}
            >
              Target {formatCurrency(tradeGeometry.targetPrice, effectiveCurrency)} · +{tradeGeometry.upsidePct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Key Qualitative Catalysts & Drivers (Grouped cohesively without artificial vertical gaps) */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
          Key Structural Drivers
        </div>
        <div className="space-y-2">
          {cleanReasons.length > 0 ? (
            cleanReasons.map((reason, i) => (
              <div 
                key={i} 
                className="flex items-start gap-2 text-[11px] font-medium leading-snug text-neutral-600 dark:text-neutral-300 p-2 rounded-lg bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/60"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="flex-1">{reason}</span>
              </div>
            ))
          ) : (
            <div className="p-2.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/60 text-[11px] text-neutral-600 dark:text-neutral-400">
              Technical posture supported by moving average baseline and disciplined risk invalidation geometry.
            </div>
          )}
        </div>
      </div>

      {/* Subtle Anchor Footer: Cohesive baseline right below drivers */}
      <div className="pt-2.5 mt-1 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Multi-Factor Confluence</span>
        </span>
        <span className="font-mono text-neutral-500 dark:text-neutral-400">
          Risk-Calibrated
        </span>
      </div>
    </motion.div>
  );
};
