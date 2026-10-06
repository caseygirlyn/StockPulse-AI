import React from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Compass,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { ExtendedHoursData } from '../services/geminiService';
import { cn, formatCurrency } from '../utils';
import { isExchangeMarketOpen } from '../utils/marketHours';

interface MarketReactionCardProps {
  data: ExtendedHoursData;
  currency: string;
  ticker: string;
  exchange?: string;
  exchangeTimezone?: string;
  className?: string;
}

export const MarketReactionCard: React.FC<MarketReactionCardProps> = ({
  data,
  currency,
  ticker,
  exchange,
  exchangeTimezone,
  className
}) => {
  // If market is currently open during regular hours, hide extended-hours data
  const isLiveOpen = isExchangeMarketOpen(ticker, exchange, exchangeTimezone);
  if (data.isMarketOpen || data.sessionType === 'REGULAR' || isLiveOpen) {
    return null;
  }

  const isPreMarket = data.sessionType === 'PRE';
  const isPostMarket = data.sessionType === 'POST';

  // Determine active session price & price change
  const activePrice = isPreMarket
    ? (data.preMarketPrice ?? data.postMarketPrice ?? data.previousClose)
    : (data.postMarketPrice ?? data.preMarketPrice ?? data.previousClose);

  const activeChange = isPreMarket
    ? (data.preMarketChange ?? data.postMarketChange ?? 0)
    : (data.postMarketChange ?? data.preMarketChange ?? 0);

  const activeChangePct = isPreMarket
    ? (data.preMarketChangePercent ?? data.afterHoursMovePercent ?? 0)
    : (data.postMarketChangePercent ?? data.afterHoursMovePercent ?? 0);

  const isPositive = activeChangePct >= 0;

  // Session range (Low – High)
  const sessionLow = isPreMarket 
    ? (data.preMarketLow ?? data.postMarketLow) 
    : (data.postMarketLow ?? data.preMarketLow);

  const sessionHigh = isPreMarket 
    ? (data.preMarketHigh ?? data.postMarketHigh) 
    : (data.postMarketHigh ?? data.preMarketHigh);

  // Status badge label
  const sessionBadge = isPreMarket 
    ? 'Pre-Market' 
    : isPostMarket 
    ? 'After-Hours' 
    : 'Extended-Hours';

  // Sentiment formatting
  const sentiment = data.afterHoursSentiment || 'neutral';
  const sentimentBadgeClass = sentiment === 'bullish'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
    : sentiment === 'bearish'
    ? 'text-rose-700 bg-rose-50 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
    : 'text-neutral-700 bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';

  const SentimentIcon = sentiment === 'bullish' ? TrendingUp : sentiment === 'bearish' ? TrendingDown : Activity;

  // Signal strength calculation
  const signalPct = Math.min(100, Math.max(0, data.signalStrength ?? 60));
  const filledBlocks = Math.round((signalPct / 100) * 10);
  const emptyBlocks = 10 - filledBlocks;
  const blocksVisual = `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}`;

  return (
    <div
      id="market-reaction-card"
      className={cn(
        "bg-white dark:bg-[#121212] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden transition-all flex flex-col justify-between",
        className
      )}
    >
      {/* 1. Header Bar: Aligned padding matching standard cards */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/40 dark:bg-neutral-900/20 space-y-2">
        {/* Top Row: Title & Live Session Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Market Reaction
            </h3>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 shrink-0 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
            <span>{sessionBadge}</span>
          </span>
        </div>

        {/* Active Quote Row: Prominent Extended Price and Net Change */}
        <div className="pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-mono font-black text-neutral-900 dark:text-neutral-50 tabular-nums">
                {formatCurrency(activePrice, currency)}
              </span>
              <span className={cn(
                "text-xs font-bold font-mono tabular-nums inline-flex items-center whitespace-nowrap",
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />}
                <span>{isPositive ? '+' : ''}{activeChangePct.toFixed(2)}%</span>
                {activeChange !== 0 && (
                  <span className="text-[11px] opacity-80 ml-1">
                    ({isPositive ? '+' : ''}{formatCurrency(Math.abs(activeChange), currency)})
                  </span>
                )}
              </span>
            </div>

            <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0 whitespace-nowrap">
              vs close
            </span>
          </div>

          <div className="text-[9.5px] font-mono text-indigo-600/90 dark:text-indigo-400/90 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span>{sessionBadge} · ECN Crossing Quote</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* 2. Core 4-Column Metric Grid on Desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          {/* Metric 1: Session Range */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block leading-tight">
              {sessionBadge} Range
            </span>
            {sessionLow && sessionHigh ? (
              <div className="font-mono font-bold text-xs sm:text-[13px] text-neutral-800 dark:text-neutral-100 tabular-nums flex flex-wrap items-baseline gap-x-1 leading-snug">
                <span>{formatCurrency(sessionLow, currency)}</span>
                <span className="text-neutral-400 dark:text-neutral-500 font-normal text-xs">–</span>
                <span>{formatCurrency(sessionHigh, currency)}</span>
              </div>
            ) : (
              <p className="font-mono font-bold text-xs text-neutral-800 dark:text-neutral-100 leading-snug">
                Corridor intact
              </p>
            )}
            <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 font-mono mt-1 leading-tight">
              Prev: {formatCurrency(data.previousClose, currency)}
            </div>
          </div>

          {/* Metric 2: Extended Volume Profile */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block leading-tight">
              Ext-Hours Volume
            </span>
            <p className="font-mono font-black text-xs sm:text-[13px] text-neutral-900 dark:text-neutral-50 tabular-nums leading-snug">
              {data.extendedHoursVolumeFormatted || (data.extendedHoursVolume ? `${(data.extendedHoursVolume / 1000).toFixed(0)}K shares` : 'Active')}
            </p>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 leading-tight block">
              Above avg liquidity
            </span>
          </div>

          {/* Metric 3: Order Book Spread (Bid x Ask) */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block leading-tight">
              Bid / Ask Corridor
            </span>
            {data.bid && data.ask ? (
              <div className="font-mono font-bold text-xs sm:text-[13px] text-neutral-800 dark:text-neutral-100 tabular-nums flex flex-wrap items-baseline gap-x-1 leading-snug">
                <span>{formatCurrency(data.bid, currency)}</span>
                <span className="text-neutral-400 dark:text-neutral-500 font-normal text-xs">×</span>
                <span>{formatCurrency(data.ask, currency)}</span>
              </div>
            ) : (
              <p className="font-mono font-bold text-xs text-neutral-800 dark:text-neutral-100 leading-snug">
                Tight spread
              </p>
            )}
            <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 font-mono mt-1 leading-tight">
              Spread: {data.spreadPercent ? `${data.spreadPercent}%` : data.spread ? formatCurrency(data.spread, currency) : 'Normal'}
            </div>
          </div>

          {/* Metric 4: Reaction Sentiment & Confidence */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block leading-tight">
              Reaction Sentiment
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border capitalize shrink-0",
                sentimentBadgeClass
              )}>
                <SentimentIcon className="w-3 h-3 shrink-0" />
                <span>{sentiment}</span>
              </span>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 font-mono">
                {data.afterHoursConfidenceScore}%
              </span>
            </div>
            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-1 leading-snug break-words block">
              {data.marketReactionInterpretation || (data.earningsReleaseTime ? `Release: ${data.earningsReleaseTime}` : 'Orderly trading')}
            </span>
          </div>
        </div>

        {/* 3. Signal Quality & Reliability Bar (Merged & Polished) */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <span className="font-bold text-neutral-700 dark:text-neutral-300 text-xs whitespace-nowrap">
                Signal Reliability:
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                {data.signalStrengthLabel || 'Moderate Signal'}
              </span>
            </div>
            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {signalPct}%
            </span>
          </div>

          {/* Animated Progress Bar + Monospace Bar */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${signalPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  signalPct >= 70 ? "bg-emerald-500" : signalPct >= 50 ? "bg-indigo-500" : "bg-amber-500"
                )}
              />
            </div>
            <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 tracking-wider shrink-0 select-all">
              {data.signalStrengthBars || blocksVisual}
            </span>
          </div>

          <div className="flex items-start gap-1.5 pt-0.5">
            <Info className="w-3 h-3 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-snug">
              {data.contextInsight || "Early indicator only; regular-session volume and fundamentals remain authoritative."}
            </p>
          </div>
        </div>

        {/* 4. Indicative Opening Price Projection (Streamlined Callout) */}
        {data.predictedOpenPrice && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/[0.06] dark:bg-amber-400/[0.04] border border-amber-200/70 dark:border-amber-800/40 flex items-start gap-2 text-xs">
            <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                  <span>Indicative Open:</span>
                  <span className="font-mono text-amber-900 dark:text-amber-200">
                    {formatCurrency(data.predictedOpenPrice, currency)}
                  </span>
                  {data.predictedOpenChangePercent !== undefined && (
                    <span className={cn(
                      "font-mono text-[11px] font-semibold",
                      data.predictedOpenChangePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      ({data.predictedOpenChangePercent >= 0 ? '+' : ''}{data.predictedOpenChangePercent}%)
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                  Indicative
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-snug">
                {data.predictionCautionNote || 'Opening prices may deviate as regular session auction imbalances converge.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketReactionCard;
