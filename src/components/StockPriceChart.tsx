import React, { useState, useMemo, useCallback } from 'react';
import { 
  ComposedChart,
  Area, 
  Line, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  EyeOff, 
  Target, 
  Shield,
  BarChart2,
  Lock,
  ArrowRight,
  Zap,
  Crosshair,
  Layers,
  Anchor,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Minus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { type StockData } from '../services/geminiService';
import { cn, formatCurrency } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { getCanonicalLevels } from '../utils/canonicalLevels';

interface StockPriceChartProps {
  data: StockData;
  chartData: Array<{
    date: string;
    displayDate: string;
    price: number;
    volume: number;
    ma5: number | null;
    ma20?: number | null;
    ma50?: number | null;
    avwapAth?: number | null;
  }>;
  avgPrice: string;
  currency: string;
  lastUpdated: Date;
}

function StockPriceChart({
  data,
  chartData,
  avgPrice,
  currency,
  lastUpdated
}: StockPriceChartProps) {
  const { theme } = useTheme();

  // Chart layer visibility toggles
  // Default active layers: Market Price · S/R Zones · Key Target & Risk Levels · 20D MA · Volume
  // Everything else is toggleable on demand: Cost Basis, 5D MA, ATH VWAP, 50D MA
  const [showZones, setShowZones] = useState(true);
  const [showKeyLevels, setShowKeyLevels] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  const [showMA5, setShowMA5] = useState(false);
  const [showMA50, setShowMA50] = useState(false);
  const [showAVWAP, setShowAVWAP] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const numAvgPrice = parseFloat(avgPrice) || 0;
  const canonicalLevels = useMemo(() => getCanonicalLevels(data, currency), [data, currency]);
  const currentPrice = canonicalLevels.currentPrice;
  
  // Canonical levels & zones
  const support = canonicalLevels.addZone.high;
  const resistance = canonicalLevels.breakout.price;
  const majorSupport = data.analysis?.majorSupport || canonicalLevels.addZone.low;
  const supportZone = { low: canonicalLevels.addZone.low, high: canonicalLevels.addZone.high };
  const resistanceZone = data.analysis?.resistanceZone || { low: Number((resistance * 0.992).toFixed(2)), high: Number((resistance * 1.015).toFixed(2)) };
  
  const idealEntry = canonicalLevels.addZone.high;
  const profitTarget = canonicalLevels.target.price;
  const stopLoss = canonicalLevels.risk.price;
  const avwapAth = data.avwapAth;
  const trend = data.analysis?.trend || (currentPrice >= (data.ma20 || data.ma5) ? "Bullish" : "Bearish");

  // Calculate 30-day statistical highlights (Hard Market Data)
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    let minPrice = chartData[0].price;
    let maxPrice = chartData[0].price;
    let minDate = chartData[0].displayDate;
    let maxDate = chartData[0].displayDate;
    let totalVol = 0;
    let maxVol = 0;

    chartData.forEach(pt => {
      if (pt.price < minPrice) {
        minPrice = pt.price;
        minDate = pt.displayDate;
      }
      if (pt.price > maxPrice) {
        maxPrice = pt.price;
        maxDate = pt.displayDate;
      }
      totalVol += pt.volume;
      if (pt.volume > maxVol) maxVol = pt.volume;
    });

    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const periodChange = lastPrice - firstPrice;
    const periodChangePercent = firstPrice > 0 ? (periodChange / firstPrice) * 100 : 0;
    const avgVol = totalVol / chartData.length;

    return {
      minPrice,
      maxPrice,
      minDate,
      maxDate,
      periodChange,
      periodChangePercent,
      avgVol,
      maxVol: maxVol || 1000000,
      firstPrice,
      lastPrice
    };
  }, [chartData]);

  // Compute padded Y-Axis bounds so price and indicators fit properly
  const yDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return ['auto', 'auto'];

    const prices = chartData.map(d => d.price);
    if (showMA5) {
      chartData.forEach(d => { if (d.ma5) prices.push(d.ma5); });
    }
    if (showMA20) {
      chartData.forEach(d => { if (d.ma20) prices.push(d.ma20); });
    }
    if (showMA50) {
      chartData.forEach(d => { if (d.ma50) prices.push(d.ma50); });
    }
    if (showAVWAP) {
      chartData.forEach(d => { if (d.avwapAth) prices.push(d.avwapAth); });
      if (avwapAth?.avwapPrice) prices.push(avwapAth.avwapPrice);
    }
    if (showEntry && numAvgPrice > 0) {
      prices.push(numAvgPrice);
    }
    if (showKeyLevels) {
      if (profitTarget > 0) prices.push(profitTarget);
      if (stopLoss > 0) prices.push(stopLoss);
      if (support > 0) prices.push(support);
      if (resistance > 0) prices.push(resistance);
      if (idealEntry > 0) prices.push(idealEntry);
    }
    if (showZones) {
      if (supportZone.low > 0) prices.push(supportZone.low);
      if (resistanceZone.high > 0) prices.push(resistanceZone.high);
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.08 || 5;

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, showMA5, showMA20, showMA50, showAVWAP, showEntry, showKeyLevels, showZones, numAvgPrice, profitTarget, stopLoss, support, resistance, idealEntry, avwapAth, supportZone, resistanceZone]);

  // Format compact volume (e.g., 42.5M)
  const formatCompactVol = (vol: number) => {
    if (!vol) return '0';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toString();
  };

  // Custom Chart Tooltip with comprehensive multi-indicator inspection
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentPoint = payload[0]?.payload;
    if (!currentPoint) return null;

    const pointPrice = currentPoint.price;
    const pointMA5 = currentPoint.ma5;
    const pointMA20 = currentPoint.ma20;
    const pointMA50 = currentPoint.ma50;
    const pointAVWAP = currentPoint.avwapAth;
    const pointVol = currentPoint.volume;
    const pointDate = currentPoint.date;

    const diffVsEntry = numAvgPrice > 0 ? ((pointPrice - numAvgPrice) / numAvgPrice) * 100 : null;
    const diffVsMA20 = pointMA20 ? ((pointPrice - pointMA20) / pointMA20) * 100 : null;
    const diffVsAVWAP = pointAVWAP ? ((pointPrice - pointAVWAP) / pointAVWAP) * 100 : null;

    let formattedDate = label;
    try {
      formattedDate = format(parseISO(pointDate), 'EEEE, MMM dd, yyyy');
    } catch {
      formattedDate = label;
    }

    return (
      <div className="bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md p-4 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl space-y-2.5 min-w-[250px]">
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
            {formattedDate}
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">
            {data.ticker}
          </span>
        </div>

        {/* Closing Price */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-black/60 dark:text-white/60 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Closing Price
          </span>
          <span className="text-sm font-black text-black dark:text-white font-mono">
            {formatCurrency(pointPrice, currency)}
          </span>
        </div>

        {/* Moving Averages Inspection */}
        <div className="pt-1 space-y-1.5 border-t border-black/5 dark:border-white/5 text-[11px]">
          {pointMA5 !== null && pointMA5 !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-amber-500" />
                5-Day MA
              </span>
              <span className="font-mono font-bold text-black/80 dark:text-white/80">
                {formatCurrency(pointMA5, currency)}
              </span>
            </div>
          )}

          {pointMA20 !== null && pointMA20 !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-blue-500" />
                20-Day MA
              </span>
              <div className="text-right">
                <span className="font-mono font-bold text-black/80 dark:text-white/80">
                  {formatCurrency(pointMA20, currency)}
                </span>
                {diffVsMA20 !== null && (
                  <span className={cn(
                    "text-[9px] font-bold ml-1.5",
                    diffVsMA20 >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  )}>
                    ({diffVsMA20 >= 0 ? '+' : ''}{diffVsMA20.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          )}

          {pointMA50 !== null && pointMA50 !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-purple-500" />
                50-Day MA
              </span>
              <span className="font-mono font-bold text-black/80 dark:text-white/80">
                {formatCurrency(pointMA50, currency)}
              </span>
            </div>
          )}
        </div>

        {/* ATH Anchored VWAP Row */}
        {pointAVWAP !== null && pointAVWAP !== undefined && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5 dark:border-white/5">
            <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Anchor className="w-3 h-3 text-cyan-500" />
              ATH AVWAP
            </span>
            <div className="text-right">
              <span className="font-bold font-mono text-cyan-700 dark:text-cyan-300">
                {formatCurrency(pointAVWAP, currency)}
              </span>
              {diffVsAVWAP !== null && (
                <span className={cn(
                  "text-[9px] font-bold ml-1.5",
                  diffVsAVWAP >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                )}>
                  ({diffVsAVWAP >= 0 ? '+' : ''}{diffVsAVWAP.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Volume Row */}
        {pointVol > 0 && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5 dark:border-white/5">
            <span className="font-bold text-black/60 dark:text-white/60 flex items-center gap-1.5">
              <BarChart2 className="w-3 h-3 text-emerald-500" />
              Daily Volume
            </span>
            <span className="font-bold font-mono text-black/80 dark:text-white/80">
              {formatCompactVol(pointVol)}
            </span>
          </div>
        )}

        {/* Cost Basis Comparison if User Entered Avg Price */}
        {diffVsEntry !== null && (
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px]">
            <span className="font-bold text-black/40 dark:text-white/40">Vs. Your Cost Basis:</span>
            <span className={cn(
              "font-black font-mono flex items-center gap-0.5",
              diffVsEntry >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            )}>
              {diffVsEntry >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {diffVsEntry >= 0 ? '+' : ''}{diffVsEntry.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    );
  }, [numAvgPrice, currency, data.ticker]);

  return (
    <div className="bg-white dark:bg-[#121212] p-3 sm:p-4 md:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3.5 sm:space-y-4">
      
      {/* ======================================================== */}
      {/* SECTION 1: HEADER & MARKET-OBSERVED CONTEXT (HARD DATA)  */}
      {/* ======================================================== */}
      <div className="space-y-3 pb-3 border-b border-black/5 dark:border-white/5">
        {/* Full-Width Header & Sub-Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-lg tracking-tight text-neutral-900 dark:text-neutral-100">
              Price Performance & Structural Analysis
            </h4>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70">
              30-Day Window
            </span>
            {/* Trend State Pill */}
            <span className={cn(
              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1",
              trend === 'Bullish' 
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                : trend === 'Bearish'
                ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30"
                : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
            )}>
              <Activity className="w-3 h-3" />
              Trend: {trend}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Transparent quantitative framework distinguishing hard market range from modeled support/resistance zones
          </p>
        </div>

        {/* 30D Price Highlights Badges (Placed below description in a responsive 3-column grid) */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs pt-0.5">
            {/* Explicit 30D Change Presentation */}
            <div className="p-3 rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/5 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block">
                30D Price Change
              </span>
              <div className={cn(
                "font-black font-mono text-sm flex items-center gap-1",
                stats.periodChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}>
                {stats.periodChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {stats.periodChange >= 0 ? '+' : ''}{formatCurrency(stats.periodChange, currency)} ({stats.periodChange >= 0 ? '+' : ''}{stats.periodChangePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                <span>{formatCurrency(stats.firstPrice, currency)}</span>
                <ArrowRight className="w-2.5 h-2.5" />
                <span className="font-bold text-neutral-800 dark:text-neutral-200">{formatCurrency(stats.lastPrice, currency)}</span>
              </div>
              <div className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Market Data · 30D Close Delta</span>
              </div>
            </div>

            {/* 30D Hard Market Range */}
            <div className="p-3 rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/5 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block">
                30D Market Range
              </span>
              <div className="text-sm font-black font-mono text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <span className="text-red-500">{formatCurrency(stats.minPrice, currency)}</span>
                <span className="text-neutral-300 dark:text-neutral-600 font-sans text-xs">to</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.maxPrice, currency)}</span>
              </div>
              <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                Low on {stats.minDate} • High on {stats.maxDate}
              </div>
              <div className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Market Data · High/Low Observed</span>
              </div>
            </div>

            {/* Volume Liquidity Context */}
            <div className="p-3 rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/5 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block">
                20D Avg Volume
              </span>
              <div className="text-sm font-black font-mono text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{formatCompactVol(data.avgVolume20d || stats.avgVol)}</span>
                {data.relativeVolume !== undefined && (
                  <span className={cn(
                    "text-[9px] px-1 py-0.2 rounded font-mono font-bold",
                    data.relativeVolume >= 1.2 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  )}>
                    {data.relativeVolume}x vol
                  </span>
                )}
              </div>
              <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                Daily participation
              </div>
              <div className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Market Data · 20D Exchange Volume</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: INTERACTIVE LAYER & INDICATOR CONTROLS         */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* 1. Market Price (Base layer indicator) */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Market Price</span>
          </div>

          {/* 2. S/R Dynamic Corridor Zones (Default ON) */}
          <button
            onClick={() => setShowZones(!showZones)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
              showZones
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
            )}
            title="Toggle Visual Support and Resistance Corridor Zones"
          >
            <Layers className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <span>S/R Zones</span>
            {showZones ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* 3. Key Reference Lines (Default ON) */}
          <button
            onClick={() => setShowKeyLevels(!showKeyLevels)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
              showKeyLevels
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
            )}
            title="Toggle Key Levels (Target, Support, Resistance, Stop Loss)"
          >
            <Target className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <span>Key Levels</span>
            {showKeyLevels ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* 4. 20-Day MA (Default ON) */}
          <button
            onClick={() => setShowMA20(!showMA20)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
              showMA20
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
            )}
            title="Toggle 20-Day Swing Moving Average Line"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span>20D MA</span>
            {showMA20 ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* 5. Volume Histogram (Default ON) */}
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
              showVolume
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
            )}
            title="Toggle Volume Histogram Bars"
          >
            <BarChart2 className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <span>Volume</span>
            {showVolume ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* --- Toggleable On-Demand Layers --- */}

          {/* Cost Basis Toggle */}
          {numAvgPrice > 0 && (
            <button
              onClick={() => setShowEntry(!showEntry)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
                showEntry
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                  : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
              )}
              title="Toggle Cost Basis (Avg Entry) Line"
            >
              <div className="w-2 h-0.5 bg-blue-500 shrink-0" />
              <span>Cost Basis</span>
              {showEntry ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
            </button>
          )}

          {/* 5-Day MA Toggle */}
          <button
            onClick={() => setShowMA5(!showMA5)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
              showMA5
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
            )}
            title="Toggle 5-Day Moving Average Line"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
            <span>5D MA</span>
            {showMA5 ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* ATH VWAP Toggle */}
          {avwapAth && (
            <button
              onClick={() => setShowAVWAP(!showAVWAP)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
                showAVWAP
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                  : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
              )}
              title="Toggle Anchored Volume Weighted Average Price from ATH"
            >
              <Anchor className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <span>ATH VWAP</span>
              {showAVWAP ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
            </button>
          )}

          {/* 50-Day MA Toggle */}
          <button
            onClick={() => setShowMA50(!showMA50)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer",
              showMA50
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium shadow-2xs"
                : "bg-transparent text-neutral-400 dark:text-neutral-500 border-neutral-200/60 dark:border-neutral-800 opacity-60 hover:opacity-100"
            )}
            title="Toggle 50-Day Intermediate Moving Average Line"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-700 shrink-0" />
            <span>50D MA</span>
            {showMA50 ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>
        </div>

        {/* Expandable Methodology Toggle Button */}
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-all cursor-pointer"
        >
          <HelpCircle className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
          <span>Why These Levels?</span>
          {showMethodology ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: CHARTS (PRICE + HISTOGRAM INTEGRATED)          */}
      {/* ======================================================== */}
      <div className="h-[320px] sm:h-[360px] md:h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
          <ComposedChart 
            data={chartData} 
            margin={{ top: 8, right: 12, left: -10, bottom: 4 }}
          >
            <defs>
              <linearGradient id="colorPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="supportZoneGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="resistanceZoneGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.06} />
              </linearGradient>
            </defs>

            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={theme === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} 
            />

            {/* X-Axis */}
            <XAxis 
              dataKey="displayDate" 
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} 
              tickLine={false} 
              tick={{ 
                fontSize: 10, 
                fontWeight: 700, 
                fill: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' 
              }}
              dy={4}
              interval="preserveStartEnd"
            />

            {/* Primary Y-Axis (Price) */}
            <YAxis 
              yAxisId="price"
              domain={yDomain as any} 
              axisLine={false} 
              tickLine={false} 
              width={60}
              tickCount={6}
              tick={{ 
                fontSize: 10, 
                fontWeight: 700, 
                fill: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' 
              }}
              tickFormatter={(val) => formatCurrency(val, currency)}
            />

            {/* Secondary Y-Axis (Volume Histogram - Occupies bottom 20% of canvas) */}
            <YAxis 
              yAxisId="volume"
              orientation="right"
              domain={[0, (stats?.maxVol || 1000000) * 4.5]} 
              hide
            />

            <Tooltip 
              content={CustomTooltip} 
              isAnimationActive={false}
              cursor={{ 
                stroke: '#10b981', 
                strokeWidth: 1.5, 
                strokeDasharray: '4 4' 
              }} 
            />

            {/* Support Zone Shading (Low to High band) */}
            {showZones && supportZone && supportZone.high > supportZone.low && (
              <ReferenceArea
                yAxisId="price"
                y1={supportZone.low}
                y2={supportZone.high}
                fill="#10b981"
                fillOpacity={0.10}
                {...({
                  stroke: "#10b981",
                  strokeOpacity: 0.35,
                  strokeDasharray: "2 2",
                } as any)}
              />
            )}

            {/* Resistance Zone Shading (Low to High band) */}
            {showZones && resistanceZone && resistanceZone.high > resistanceZone.low && (
              <ReferenceArea
                yAxisId="price"
                y1={resistanceZone.low}
                y2={resistanceZone.high}
                fill="#6366f1"
                fillOpacity={0.10}
                {...({
                  stroke: "#6366f1",
                  strokeOpacity: 0.35,
                  strokeDasharray: "2 2",
                } as any)}
              />
            )}

            {/* Breakout Confirmation Reference Line */}
            {showKeyLevels && canonicalLevels.breakout.price > 0 && (
              <ReferenceLine 
                yAxisId="price"
                y={canonicalLevels.breakout.price} 
                stroke="#2563eb" 
                strokeDasharray="4 4" 
                strokeWidth={1}
                label={{ 
                  position: 'insideTopRight', 
                  value: `BREAKOUT: ${canonicalLevels.breakout.priceDisplay} · ${canonicalLevels.breakout.distanceDisplay}`, 
                  fill: '#2563eb', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Profit Target Reference Line */}
            {showKeyLevels && canonicalLevels.target.price > 0 && Math.abs(canonicalLevels.target.price - canonicalLevels.breakout.price) > 2 && (
              <ReferenceLine 
                yAxisId="price"
                y={canonicalLevels.target.price} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                strokeWidth={1}
                label={{ 
                  position: 'insideTopRight', 
                  value: `TARGET: ${canonicalLevels.target.priceDisplay} · ${canonicalLevels.target.distanceDisplay}`, 
                  fill: '#10b981', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* User Cost Basis Reference Line */}
            {showEntry && numAvgPrice > 0 && (
              <ReferenceLine 
                yAxisId="price"
                y={numAvgPrice} 
                stroke="#3b82f6" 
                strokeDasharray="5 5" 
                strokeWidth={1}
                label={{ 
                  position: 'insideTopLeft', 
                  value: `MY ENTRY: ${formatCurrency(numAvgPrice, currency)}${currentPrice > 0 ? ` · ${numAvgPrice >= currentPrice ? '+' : '−'}${Math.abs(((numAvgPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%` : ''}`, 
                  fill: '#3b82f6', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Canonical Add Zone Reference Line */}
            {showKeyLevels && canonicalLevels.addZone.high > 0 && (
              <ReferenceLine 
                yAxisId="price"
                y={canonicalLevels.addZone.high} 
                stroke="#059669" 
                strokeDasharray="4 4" 
                strokeWidth={1}
                label={{ 
                  position: 'insideBottomLeft', 
                  value: `ADD ZONE: ${canonicalLevels.addZone.display} · ${canonicalLevels.addZone.distanceDisplay}`, 
                  fill: '#059669', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Stop Loss (Risk) Reference Line */}
            {showKeyLevels && canonicalLevels.risk.price > 0 && (
              <ReferenceLine 
                yAxisId="price"
                y={canonicalLevels.risk.price} 
                stroke="#f43f5e" 
                strokeDasharray="5 5" 
                strokeWidth={1}
                label={{ 
                  position: 'insideBottomRight', 
                  value: `STOP: ${canonicalLevels.risk.priceDisplay} · ${canonicalLevels.risk.distanceDisplay}`, 
                  fill: '#f43f5e', 
                  fontSize: 8, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* ATH Anchored VWAP Reference Line */}
            {showAVWAP && avwapAth && (
              <ReferenceLine 
                yAxisId="price"
                y={avwapAth.avwapPrice} 
                stroke="#06b6d4" 
                strokeDasharray="4 4" 
                strokeWidth={1}
                label={{ 
                  position: 'insideBottomRight', 
                  value: `ATH AVWAP: ${formatCurrency(avwapAth.avwapPrice, currency)}`, 
                  fill: '#06b6d4', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Volume Histogram Bars (sub-chart inside lower quartile) */}
            {showVolume && (
              <Bar 
                yAxisId="volume"
                dataKey="volume" 
                name="Volume"
                fill={theme === 'dark' ? "rgba(16, 185, 129, 0.22)" : "rgba(16, 185, 129, 0.28)"}
                isAnimationActive={false}
                radius={[2, 2, 0, 0]}
              />
            )}

            {/* Price Area Series */}
            <Area 
              yAxisId="price"
              type="monotone" 
              dataKey="price" 
              name="Market Price"
              stroke="#10b981" 
              strokeWidth={1.5} 
              fillOpacity={1} 
              fill="url(#colorPriceGradient)" 
              isAnimationActive={false}
            />

            {/* 5-Day MA Line */}
            {showMA5 && (
              <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="ma5" 
                name="5-Day MA"
                stroke="#38bdf8" 
                strokeWidth={1} 
                dot={false} 
                strokeDasharray="4 4"
                isAnimationActive={false}
              />
            )}

            {/* 20-Day MA Line */}
            {showMA20 && (
              <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="ma20" 
                name="20-Day MA"
                stroke="#0284c7" 
                strokeWidth={1.1} 
                dot={false} 
                isAnimationActive={false}
              />
            )}

            {/* 50-Day MA Line */}
            {showMA50 && (
              <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="ma50" 
                name="50-Day MA"
                stroke="#1d4ed8" 
                strokeWidth={1} 
                dot={false} 
                strokeDasharray="6 3"
                isAnimationActive={false}
              />
            )}

            {/* ATH Anchored VWAP Trend Line */}
            {showAVWAP && (
              <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="avwapAth" 
                name="ATH Anchored VWAP"
                stroke="#0284c7" 
                strokeWidth={1.1} 
                dot={false} 
                strokeDasharray="4 4"
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: EXPANDABLE LEVEL METHODOLOGY DRAWER           */}
      {/* ======================================================== */}
      {showMethodology && (
        <div className="p-4 md:p-5 rounded-2xl bg-neutral-50 dark:bg-[#141414] border border-neutral-200/80 dark:border-neutral-800 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              Quantitative Methodology: Why These Exact Levels?
            </h5>
            <span className="text-[9px] font-semibold text-neutral-400 dark:text-neutral-500">
              Institutional Analytical Logic
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Immediate Support Methodology - Green (Actionable Positive) */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-black/5 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Support Corridor Logic</span>
              </div>
              <p className="text-[10px] text-black/60 dark:text-white/60 leading-relaxed">
                {data.analysis?.supportMethodology || `Derived from recent consolidation demand cluster and 20-Day SMA dynamic shelf beneath current trading range.`}
              </p>
            </div>

            {/* Resistance Methodology - Blue (Confirmation / Technical) */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-black/5 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Resistance Zone Logic</span>
              </div>
              <p className="text-[10px] text-black/60 dark:text-white/60 leading-relaxed">
                {data.analysis?.resistanceMethodology || `Derived from upper channel supply bounds and swing high rejection wick clusters across recent trading sessions.`}
              </p>
            </div>

            {/* Risk Boundary (Stop Loss) Methodology - Red (Hard Risk / Invalidation) */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-black/5 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Stop Loss Rationale</span>
              </div>
              <p className="text-[10px] text-black/60 dark:text-white/60 leading-relaxed">
                {data.recommendation?.stopLossMethodology || `Calibrated underneath the primary support floor. Invalidation of this structural boundary invalidates the current bullish geometry.`}
              </p>
            </div>

            {/* Ideal Entry Methodology - Green (Actionable Positive) */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-black/5 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <Crosshair className="w-3.5 h-3.5" />
                <span>Entry Geometry</span>
              </div>
              <p className="text-[10px] text-black/60 dark:text-white/60 leading-relaxed">
                {data.recommendation?.entryMethodology || `Targets pullback buy confluence toward the dynamic moving average corridor rather than chasing breakouts at highs.`}
              </p>
            </div>

            {/* Profit Target Methodology - Green (Actionable Positive) */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-black/5 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <Target className="w-3.5 h-3.5" />
                <span>Profit Target Rationale</span>
              </div>
              <p className="text-[10px] text-black/60 dark:text-white/60 leading-relaxed">
                {data.recommendation?.targetMethodology || `Projected Fibonacci expansion extension upon confirmed breakout above the current resistance ceiling.`}
              </p>
            </div>

            {/* Moving Average Hierarchy - Blue (Confirmation / Technical) */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-black/5 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                <Activity className="w-3.5 h-3.5" />
                <span>Moving Average Alignment</span>
              </div>
              <p className="text-[10px] text-black/60 dark:text-white/60 leading-relaxed">
                {data.analysis?.trendExplanation 
                  ? data.analysis.trendExplanation.replace(new RegExp(`${data.ticker}\\s+is\\s+trading\\s+at\\s+[A-Z0-9$€£.,\\s]+?,\\s*`, 'i'), `${data.ticker} is positioned `)
                  : `5D MA reflects short-term momentum; 20D MA guides intermediate swing trend posture.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 6: ANCHORED VWAP (ATH) BENCHMARK                 */}
      {/* ======================================================== */}
      {avwapAth && (
        <div className="p-4 md:p-5 rounded-2xl bg-cyan-500/[0.03] dark:bg-cyan-500/[0.05] border border-cyan-500/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
                <Anchor className="w-3.5 h-3.5" />
              </div>
              <div>
                <h5 className="font-black text-xs tracking-tight flex items-center gap-1.5">
                  Anchored VWAP from All-Time High (ATH)
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded font-mono",
                    avwapAth.status === 'above'
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  )}>
                    Price is {avwapAth.status.toUpperCase()} AVWAP ({avwapAth.diffPercent >= 0 ? '+' : ''}{avwapAth.diffPercent}%)
                  </span>
                </h5>
                <p className="text-[9px] font-medium text-black/40 dark:text-white/40">
                  Volume-weighted aggregate cost basis of all market participants since the peak on {format(parseISO(avwapAth.athDate), 'MMMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-black font-mono">
              <span className="text-black/40 dark:text-white/40">Peak:</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">{formatCurrency(avwapAth.athPrice, currency)}</span>
              <span className="text-black/40 dark:text-white/40 ml-1">AVWAP:</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">{formatCurrency(avwapAth.avwapPrice, currency)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-[#1A1A1A] border border-cyan-500/20 shadow-xs space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
                ATH Peak Benchmark
              </span>
              <div className="text-sm font-black font-mono text-black dark:text-white">
                {formatCurrency(avwapAth.athPrice, currency)}
              </div>
              <p className="text-[9px] text-black/40 dark:text-white/40">
                Peak date: {format(parseISO(avwapAth.athDate), 'MMM dd, yyyy')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1A1A1A] border border-cyan-500/20 shadow-xs space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
                Anchored Breakeven (AVWAP)
              </span>
              <div className="text-sm font-black font-mono text-cyan-600 dark:text-cyan-400">
                {formatCurrency(avwapAth.avwapPrice, currency)}
              </div>
              <p className="text-[9px] text-black/40 dark:text-white/40">
                Market aggregate volume-weighted average
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1A1A1A] border border-cyan-500/20 shadow-xs space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
                Technical Market Role
              </span>
              <div className={cn(
                "text-xs font-black",
                avwapAth.status === 'above' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              )}>
                {avwapAth.status === 'above' ? 'Dynamic Support Floor' : 'Dynamic Overhead Supply'}
              </div>
              <p className="text-[9px] text-black/50 dark:text-white/50 leading-relaxed">
                {avwapAth.status === 'above'
                  ? 'Aggregate volume since the ATH peak is in net profit. Pullbacks to AVWAP tend to act as strong institutional support.'
                  : 'Aggregate volume since the ATH peak is underwater. Recoveries toward AVWAP often face distribution or breakeven selling.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FOOTER: TIME, SOURCE, MULTI-SOURCE EPISTEMIC STATUS      */}
      {/* ======================================================== */}
      <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2 text-[9.5px] font-mono text-neutral-500 dark:text-neutral-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Market Feed: <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{data.priceSource || 'Market Data Feed'}</strong> ({data.exchange || 'Exchange'})</span>
            </span>
            <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
              <span>Timestamp: <strong className="font-semibold text-neutral-700 dark:text-neutral-300">{format(lastUpdated, 'yyyy-MM-dd HH:mm:ss')}</strong> {data.exchangeTimezone ? `(${data.exchangeTimezone})` : ''}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-purple-600/90 dark:text-purple-400/90">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>Model: <strong className="font-semibold">Deterministic ATR & Volatility Corridor Framework</strong></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(StockPriceChart);
