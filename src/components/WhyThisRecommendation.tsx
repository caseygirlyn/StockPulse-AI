import React from 'react';
import { 
  Sparkles, 
  TrendingUp,
  Activity, 
  Scale, 
  BarChart2, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { StockData } from '../services/geminiService';
import { cn } from '../utils';

interface WhyThisRecommendationProps {
  data: StockData;
  currency?: string;
  className?: string;
}

export const WhyThisRecommendation: React.FC<WhyThisRecommendationProps> = ({ 
  data, 
  className 
}) => {
  const currentPx = data.currentPrice || 0;
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

  // Trade Geometry: Risk/Reward calculation
  const stopLoss = rec.stopLoss || currentPx * 0.95;
  const profitTarget = rec.profitTarget || currentPx * 1.15;
  const riskAmount = Math.max(0.01, currentPx - stopLoss);
  const rewardAmount = Math.max(0.01, profitTarget - currentPx);
  const riskPercent = currentPx > 0 ? ((currentPx - stopLoss) / currentPx) * 100 : 5;
  const rewardPercent = currentPx > 0 ? ((profitTarget - currentPx) / currentPx) * 100 : 15;
  const rrRatio = rec.riskRewardRatio || Number((rewardAmount / riskAmount).toFixed(1));

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
  const biasLabel = trend === 'Bullish' && rrRatio >= 2.0 ? 'Asymmetric Setup' :
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
        </div>
      </div>

      {/* Trade Geometry Bar: Asymmetric Risk-Reward Visual (No redundant dollar prices) */}
      <div className="p-2.5 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Trade Asymmetry
          </span>
          <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {rrRatio}:1 Risk / Reward
          </span>
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
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              Downside Risk: -{riskPercent.toFixed(1)}%
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Upside Target: +{rewardPercent.toFixed(1)}%
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
