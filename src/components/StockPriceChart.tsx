import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  Line, 
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
  ShieldAlert, 
  Shield,
  Volume2,
  Lock,
  ArrowRight,
  Zap,
  Crosshair,
  Layers,
  ArrowUpRight,
  Anchor
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { type StockData } from '../services/geminiService';
import { cn, formatCurrency } from '../utils';
import { useTheme } from '../context/ThemeContext';

interface StockPriceChartProps {
  data: StockData;
  chartData: Array<{
    date: string;
    displayDate: string;
    price: number;
    volume: number;
    ma5: number | null;
    avwapAth?: number | null;
  }>;
  avgPrice: string;
  currency: string;
  lastUpdated: Date;
}

export default function StockPriceChart({
  data,
  chartData,
  avgPrice,
  currency,
  lastUpdated
}: StockPriceChartProps) {
  const { theme } = useTheme();

  // Chart display toggles
  const [showMA5, setShowMA5] = useState(true);
  const [showAVWAP, setShowAVWAP] = useState(true);
  const [showChannelBands, setShowChannelBands] = useState(true);
  const [showKeyLevels, setShowKeyLevels] = useState(true);
  const [showEntry, setShowEntry] = useState(true);

  const numAvgPrice = parseFloat(avgPrice) || 0;
  const currentPrice = data.currentPrice || 0;
  const support = data.analysis?.support || 0;
  const resistance = data.analysis?.resistance || 0;
  const idealEntry = data.recommendation?.idealEntryPrice || 0;
  const profitTarget = data.recommendation?.profitTarget || 0;
  const stopLoss = data.recommendation?.stopLoss || 0;
  const avwapAth = data.avwapAth;

  // Calculate 30-day statistical highlights
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    let minPrice = chartData[0].price;
    let maxPrice = chartData[0].price;
    let minDate = chartData[0].displayDate;
    let maxDate = chartData[0].displayDate;
    let totalVol = 0;

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
    });

    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const periodChange = lastPrice - firstPrice;
    const periodChangePercent = (periodChange / firstPrice) * 100;
    const avgVol = totalVol / chartData.length;

    return {
      minPrice,
      maxPrice,
      minDate,
      maxDate,
      periodChange,
      periodChangePercent,
      avgVol,
      firstPrice,
      lastPrice
    };
  }, [chartData]);

  // Key Technical Levels Metrics
  const channelMetrics = useMemo(() => {
    const channelSpan = resistance > support ? resistance - support : 0;
    const channelPercent = support > 0 ? ((resistance - support) / support) * 100 : 0;

    // Current price position within Support -> Resistance (0% to 100%)
    let currentInChannelPercent = 50;
    if (channelSpan > 0) {
      currentInChannelPercent = Math.min(100, Math.max(0, ((currentPrice - support) / channelSpan) * 100));
    }

    // Distance to Support and Resistance
    const distToSupport = currentPrice - support;
    const distToSupportPercent = support > 0 ? ((currentPrice - support) / support) * 100 : 0;

    const distToResistance = resistance - currentPrice;
    const distToResistancePercent = currentPrice > 0 ? ((resistance - currentPrice) / currentPrice) * 100 : 0;

    // Entry position (either user entry or ideal entry)
    const effectiveEntry = numAvgPrice > 0 ? numAvgPrice : idealEntry;
    let entryInChannelPercent = 50;
    if (channelSpan > 0 && effectiveEntry > 0) {
      entryInChannelPercent = Math.min(100, Math.max(0, ((effectiveEntry - support) / channelSpan) * 100));
    }

    const distFromEntry = effectiveEntry > 0 ? currentPrice - effectiveEntry : 0;
    const distFromEntryPercent = effectiveEntry > 0 ? ((currentPrice - effectiveEntry) / effectiveEntry) * 100 : 0;

    return {
      channelSpan,
      channelPercent,
      currentInChannelPercent,
      distToSupport,
      distToSupportPercent,
      distToResistance,
      distToResistancePercent,
      effectiveEntry,
      entryInChannelPercent,
      distFromEntry,
      distFromEntryPercent
    };
  }, [currentPrice, support, resistance, numAvgPrice, idealEntry]);

  // Compute padded Y-Axis bounds so all key levels fit nicely
  const yDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return ['auto', 'auto'];

    const prices = chartData.map(d => d.price);
    if (showMA5) {
      chartData.forEach(d => { if (d.ma5) prices.push(d.ma5); });
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

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.08 || 5;

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, showMA5, showAVWAP, showEntry, showKeyLevels, numAvgPrice, profitTarget, stopLoss, support, resistance, idealEntry, avwapAth]);

  // Format compact volume (e.g., 42.5M)
  const formatCompactVol = (vol: number) => {
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toString();
  };

  // Custom Chart Tooltip with detailed breakdown
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentPoint = payload[0]?.payload;
    if (!currentPoint) return null;

    const pointPrice = currentPoint.price;
    const pointMA5 = currentPoint.ma5;
    const pointAVWAP = currentPoint.avwapAth;
    const pointVol = currentPoint.volume;
    const pointDate = currentPoint.date;

    const diffVsEntry = numAvgPrice > 0 ? ((pointPrice - numAvgPrice) / numAvgPrice) * 100 : null;
    const diffVsMA5 = pointMA5 ? ((pointPrice - pointMA5) / pointMA5) * 100 : null;
    const diffVsAVWAP = pointAVWAP ? ((pointPrice - pointAVWAP) / pointAVWAP) * 100 : null;

    let formattedDate = label;
    try {
      formattedDate = format(parseISO(pointDate), 'EEEE, MMM dd, yyyy');
    } catch {
      formattedDate = label;
    }

    return (
      <div className="bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md p-4 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl space-y-2.5 min-w-[230px]">
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
            {formattedDate}
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">
            {data.ticker}
          </span>
        </div>

        {/* Price Row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-black/60 dark:text-white/60 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Closing Price
          </span>
          <span className="text-sm font-black text-black dark:text-white font-mono">
            {formatCurrency(pointPrice, currency)}
          </span>
        </div>

        {/* MA5 Row */}
        {pointMA5 !== null && pointMA5 !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-black/60 dark:text-white/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              5-Day MA
            </span>
            <div className="text-right">
              <span className="font-bold font-mono text-black/80 dark:text-white/80">
                {formatCurrency(pointMA5, currency)}
              </span>
              {diffVsMA5 !== null && (
                <span className={cn(
                  "text-[9px] font-bold ml-1.5",
                  diffVsMA5 >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                )}>
                  ({diffVsMA5 >= 0 ? '+' : ''}{diffVsMA5.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* ATH Anchored VWAP Row */}
        {pointAVWAP !== null && pointAVWAP !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              ATH Anchored VWAP
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-black/60 dark:text-white/60 flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-blue-500" />
              Trading Volume
            </span>
            <span className="font-bold font-mono text-black/80 dark:text-white/80">
              {formatCompactVol(pointVol)} shares
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
  };

  return (
    <div className="bg-white dark:bg-[#141414] p-5 md:p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm space-y-5">
      {/* Chart Header & Statistical Highlights */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-black text-lg tracking-tight">Price Performance & Key Technical Levels</h4>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              30-Day
            </span>
          </div>
          <p className="text-[10px] font-medium text-black/40 dark:text-white/40">
            Interactive technical chart with connected Support, Entry, and Resistance corridor bands
          </p>
        </div>

        {/* Period Highlights Badges */}
        {stats && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Period Range Change */}
            <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <span className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
                30D Return
              </span>
              <span className={cn(
                "font-black font-mono flex items-center gap-0.5",
                stats.periodChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}>
                {stats.periodChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stats.periodChange >= 0 ? '+' : ''}{stats.periodChangePercent.toFixed(2)}% ({formatCurrency(stats.periodChange, currency)})
              </span>
            </div>

            {/* Period High */}
            <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <span className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
                Period High
              </span>
              <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.maxPrice, currency)}
              </span>
            </div>

            {/* Period Low */}
            <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <span className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
                Period Low
              </span>
              <span className="font-black font-mono text-red-500">
                {formatCurrency(stats.minPrice, currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend & Layer Visibility Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Price Toggle */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Market Price</span>
          </div>

          {/* Support / Resistance Connected Corridor Toggle */}
          {support > 0 && resistance > 0 && (
            <button
              onClick={() => setShowChannelBands(!showChannelBands)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer",
                showChannelBands
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
                  : "bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40 border-black/5 dark:border-white/5 opacity-50"
              )}
              title="Toggle Connected Support & Resistance Corridor Band"
            >
              <Layers className="w-3 h-3" />
              <span>Channel Corridor Band</span>
              {showChannelBands ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
            </button>
          )}

          {/* Key Targets & Lines Toggle */}
          <button
            onClick={() => setShowKeyLevels(!showKeyLevels)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer",
              showKeyLevels
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                : "bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40 border-black/5 dark:border-white/5 opacity-50"
            )}
            title="Toggle Support, Resistance, Stop Loss, and Target Price Lines"
          >
            <Target className="w-3 h-3" />
            <span>Support & Resistance Lines</span>
            {showKeyLevels ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* User Entry Price Toggle */}
          {numAvgPrice > 0 && (
            <button
              onClick={() => setShowEntry(!showEntry)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer",
                showEntry
                  ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
                  : "bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40 border-black/5 dark:border-white/5 opacity-50"
              )}
              title="Toggle Cost Basis (Avg Entry) Line"
            >
              <div className="w-3 h-0.5 bg-purple-500 border-t border-dashed border-purple-500" />
              <span>Cost Basis ({formatCurrency(numAvgPrice, currency)})</span>
              {showEntry ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
            </button>
          )}

          {/* MA5 Toggle */}
          <button
            onClick={() => setShowMA5(!showMA5)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer",
              showMA5
                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                : "bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40 border-black/5 dark:border-white/5 opacity-50"
            )}
            title="Toggle 5-Day Moving Average Line"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>5-Day MA</span>
            {showMA5 ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* Anchored VWAP (ATH) Toggle */}
          {avwapAth && (
            <button
              onClick={() => setShowAVWAP(!showAVWAP)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer",
                showAVWAP
                  ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30"
                  : "bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40 border-black/5 dark:border-white/5 opacity-50"
              )}
              title="Toggle Anchored Volume Weighted Average Price from All-Time High"
            >
              <Anchor className="w-3 h-3 text-cyan-500" />
              <span>ATH AVWAP ({formatCurrency(avwapAth.avwapPrice, currency)})</span>
              {showAVWAP ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
            </button>
          )}
        </div>

        <span className="text-[9px] font-bold text-black/30 dark:text-white/30 hidden sm:inline">
          Hover candles for live metrics
        </span>
      </div>

      {/* Chart Canvas */}
      <div className="h-[320px] md:h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="colorPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="channelCorridorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                <stop offset="50%" stopColor="#6366f1" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.12} />
              </linearGradient>
            </defs>

            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={theme === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} 
            />

            {/* Support-to-Resistance Shaded Channel Corridor Area */}
            {showChannelBands && support > 0 && resistance > 0 && resistance > support && (
              <ReferenceArea
                y1={support}
                y2={resistance}
                fillOpacity={0.08}
                {...({
                  stroke: "#6366f1",
                  strokeOpacity: 0.2,
                  strokeDasharray: "2 2",
                  fill: "url(#channelCorridorGradient)"
                } as any)}
              />
            )}

            {/* X-Axis with clean date labeling */}
            <XAxis 
              dataKey="displayDate" 
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} 
              tickLine={false} 
              tick={{ 
                fontSize: 10, 
                fontWeight: 800, 
                fill: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' 
              }}
              dy={8}
              interval="preserveStartEnd"
            />

            {/* Y-Axis with padded width and proper currency formatting */}
            <YAxis 
              domain={yDomain as any} 
              axisLine={false} 
              tickLine={false} 
              width={75}
              tickCount={6}
              tick={{ 
                fontSize: 10, 
                fontWeight: 800, 
                fill: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' 
              }}
              tickFormatter={(val) => formatCurrency(val, currency)}
            />

            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ 
                stroke: '#10b981', 
                strokeWidth: 1.5, 
                strokeDasharray: '4 4' 
              }} 
            />

            {/* Resistance Reference Line (Ceiling) */}
            {showKeyLevels && resistance > 0 && (
              <ReferenceLine 
                y={resistance} 
                stroke="#6366f1" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ 
                  position: 'insideTopRight', 
                  value: `RESISTANCE: ${formatCurrency(resistance, currency)}`, 
                  fill: '#6366f1', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Target Price Reference Line */}
            {showKeyLevels && profitTarget > 0 && Math.abs(profitTarget - resistance) > 2 && (
              <ReferenceLine 
                y={profitTarget} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                strokeWidth={1.5}
                label={{ 
                  position: 'insideTopRight', 
                  value: `TARGET: ${formatCurrency(profitTarget, currency)}`, 
                  fill: '#10b981', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Cost Basis (User Entry Price) Reference Line */}
            {showEntry && numAvgPrice > 0 && (
              <ReferenceLine 
                y={numAvgPrice} 
                stroke="#a855f7" 
                strokeDasharray="6 6" 
                strokeWidth={1.5}
                label={{ 
                  position: 'insideTopLeft', 
                  value: `MY ENTRY: ${formatCurrency(numAvgPrice, currency)}`, 
                  fill: '#a855f7', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Ideal AI Entry Reference Line (if user hasn't set entry) */}
            {showKeyLevels && numAvgPrice === 0 && idealEntry > 0 && Math.abs(idealEntry - support) > 2 && (
              <ReferenceLine 
                y={idealEntry} 
                stroke="#8b5cf6" 
                strokeDasharray="4 4" 
                strokeWidth={1.2}
                label={{ 
                  position: 'insideTopLeft', 
                  value: `IDEAL ENTRY: ${formatCurrency(idealEntry, currency)}`, 
                  fill: '#8b5cf6', 
                  fontSize: 8, 
                  fontWeight: 800,
                  offset: 8
                }}
              />
            )}

            {/* Support Reference Line (Floor) */}
            {showKeyLevels && support > 0 && (
              <ReferenceLine 
                y={support} 
                stroke="#059669" 
                strokeDasharray="4 4" 
                strokeWidth={2}
                label={{ 
                  position: 'insideBottomLeft', 
                  value: `SUPPORT: ${formatCurrency(support, currency)}`, 
                  fill: '#059669', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Stop Loss Reference Line */}
            {showKeyLevels && stopLoss > 0 && Math.abs(stopLoss - support) > 2 && (
              <ReferenceLine 
                y={stopLoss} 
                stroke="#f43f5e" 
                strokeDasharray="5 5" 
                strokeWidth={1.5}
                label={{ 
                  position: 'insideBottomRight', 
                  value: `STOP LOSS: ${formatCurrency(stopLoss, currency)}`, 
                  fill: '#f43f5e', 
                  fontSize: 8, 
                  fontWeight: 900,
                  offset: 8
                }}
              />
            )}

            {/* Price Area Series */}
            <Area 
              type="monotone" 
              dataKey="price" 
              name="Market Price"
              stroke="#10b981" 
              strokeWidth={3.5} 
              fillOpacity={1} 
              fill="url(#colorPriceGradient)" 
              animationDuration={1500}
            />

            {/* 5-Day Moving Average Line */}
            {showMA5 && (
              <Line 
                type="monotone" 
                dataKey="ma5" 
                name="5-Day MA"
                stroke="#f59e0b" 
                strokeWidth={2} 
                dot={false} 
                strokeDasharray="4 4"
                animationDuration={1800}
              />
            )}

            {/* ATH Anchored VWAP Reference Line */}
            {showAVWAP && avwapAth && (
              <ReferenceLine 
                y={avwapAth.avwapPrice} 
                stroke="#06b6d4" 
                strokeDasharray="4 4" 
                strokeWidth={2}
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

            {/* ATH Anchored VWAP Trend Line */}
            {showAVWAP && (
              <Line 
                type="monotone" 
                dataKey="avwapAth" 
                name="ATH Anchored VWAP"
                stroke="#06b6d4" 
                strokeWidth={2.5} 
                dot={false} 
                strokeDasharray="5 5"
                animationDuration={2000}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ======================================================== */}
      {/* CONNECTED TECHNICAL CORRIDOR: SUPPORT ➔ ENTRY ➔ RESISTANCE */}
      {/* ======================================================== */}
      {support > 0 && resistance > 0 && (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/[0.03] via-purple-500/[0.03] to-indigo-500/[0.03] border border-black/5 dark:border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Crosshair className="w-3.5 h-3.5" />
              </div>
              <div>
                <h5 className="font-black text-xs tracking-tight flex items-center gap-1.5">
                  Connected Technical Price Corridor
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                    Channel Span: {formatCurrency(channelMetrics.channelSpan, currency)} ({channelMetrics.channelPercent.toFixed(1)}%)
                  </span>
                </h5>
                <p className="text-[9px] font-medium text-black/40 dark:text-white/40">
                  Visual relationship between key floor, your entry position, and resistance barrier
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-black">
              <span className="text-black/40 dark:text-white/40">Channel Position:</span>
              <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-mono text-black dark:text-white">
                {channelMetrics.currentInChannelPercent.toFixed(0)}% from Support
              </span>
            </div>
          </div>

          {/* Connected Corridor Visual Track Bar */}
          <div className="relative pt-6 pb-4">
            {/* Background Track Line */}
            <div className="h-3 w-full rounded-full bg-gradient-to-r from-emerald-500 via-purple-500 to-indigo-500 opacity-20 dark:opacity-30 relative" />
            
            {/* Active Position Fill */}
            <div 
              className="absolute top-6 left-0 h-3 rounded-l-full bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-80"
              style={{ width: `${Math.max(4, Math.min(100, channelMetrics.currentInChannelPercent))}%` }}
            />

            {/* Node 1: Support Floor Pin */}
            <div className="absolute left-0 top-3 -translate-x-1/2 flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#141414] shadow-md flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Node 2: Entry / Cost Basis Pin (if exists) */}
            {channelMetrics.effectiveEntry > 0 && (
              <div 
                className="absolute top-3 -translate-x-1/2 flex flex-col items-center z-10"
                style={{ left: `${Math.max(8, Math.min(92, channelMetrics.entryInChannelPercent))}%` }}
              >
                <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-[#141414] shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <div className="absolute -top-5 whitespace-nowrap px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono font-black text-[8px]">
                  {numAvgPrice > 0 ? 'ENTRY' : 'IDEAL'}
                </div>
              </div>
            )}

            {/* Node 3: Current Market Price Pin (Glowing) */}
            <div 
              className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-20"
              style={{ left: `${Math.max(5, Math.min(95, channelMetrics.currentInChannelPercent))}%` }}
            >
              <div className="relative">
                <span className="absolute -inset-1 rounded-full bg-emerald-500 animate-ping opacity-30" />
                <div className="relative w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black border-2 border-emerald-500 shadow-xl flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-emerald-400" />
                </div>
              </div>
              <div className="absolute -top-5 whitespace-nowrap px-1.5 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black font-mono font-black text-[8px] shadow-md">
                LIVE {formatCurrency(currentPrice, currency)}
              </div>
            </div>

            {/* Node 4: Resistance Ceiling Pin */}
            <div className="absolute right-0 top-3 translate-x-1/2 flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white dark:border-[#141414] shadow-md flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Connected Level Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Support Card */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#1A1A1A] border border-emerald-500/20 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Support Floor
                </span>
                <span className="text-[8px] font-bold text-black/40 dark:text-white/40">Safety Cushion</span>
              </div>
              <div className="text-sm font-black font-mono text-black dark:text-white">
                {formatCurrency(support, currency)}
              </div>
              <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                {channelMetrics.distToSupport >= 0 ? `+${formatCurrency(channelMetrics.distToSupport, currency)} (${channelMetrics.distToSupportPercent.toFixed(1)}%) buffer` : `${formatCurrency(channelMetrics.distToSupport, currency)} below floor`}
              </div>
            </div>

            {/* Entry / Cost Basis Card */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#1A1A1A] border border-purple-500/20 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  {numAvgPrice > 0 ? 'Your Cost Basis' : 'AI Ideal Entry'}
                </span>
                <span className="text-[8px] font-bold text-black/40 dark:text-white/40">Reference</span>
              </div>
              <div className="text-sm font-black font-mono text-black dark:text-white">
                {formatCurrency(channelMetrics.effectiveEntry, currency)}
              </div>
              <div className={cn(
                "text-[9px] font-bold",
                channelMetrics.distFromEntry >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}>
                {channelMetrics.effectiveEntry > 0 ? (
                  `${channelMetrics.distFromEntry >= 0 ? '+' : ''}${formatCurrency(channelMetrics.distFromEntry, currency)} (${channelMetrics.distFromEntryPercent.toFixed(1)}% vs. current)`
                ) : 'Not configured'}
              </div>
            </div>

            {/* Resistance Card */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#1A1A1A] border border-indigo-500/20 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Resistance Ceiling
                </span>
                <span className="text-[8px] font-bold text-black/40 dark:text-white/40">Upper Barrier</span>
              </div>
              <div className="text-sm font-black font-mono text-black dark:text-white">
                {formatCurrency(resistance, currency)}
              </div>
              <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                {channelMetrics.distToResistance >= 0 ? `${formatCurrency(channelMetrics.distToResistance, currency)} (${channelMetrics.distToResistancePercent.toFixed(1)}%) room to run` : `Breakout above ceiling (+${Math.abs(channelMetrics.distToResistance).toFixed(2)})`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ANCHORED VWAP (FROM ALL-TIME HIGH) TECHNICAL INTELLIGENCE */}
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
                ATH Benchmark
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
                Aggregate volume-weighted average price
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1A1A1A] border border-cyan-500/20 shadow-xs space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
                Technical Role
              </span>
              <div className={cn(
                "text-xs font-black",
                avwapAth.status === 'above' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              )}>
                {avwapAth.status === 'above' ? 'Dynamic Support Floor' : 'Supply / Overhead Resistance'}
              </div>
              <p className="text-[9px] text-black/50 dark:text-white/50 leading-relaxed">
                {avwapAth.status === 'above'
                  ? 'Bulls are in net profit since the ATH peak. Pullbacks to AVWAP tend to be actively defended.'
                  : 'Bears and trapped peak buyers are underwater. Recoveries toward AVWAP often face supply.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Footer with Source, Timezone & Indicator Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[9px] font-bold text-black/40 dark:text-white/40 pt-3 border-t border-black/5 dark:border-white/5 gap-1.5">
        <div className="flex items-center gap-2">
          <span>Feed: <strong className="text-black/70 dark:text-white/70">{data.priceSource || 'Yahoo Finance Live'}</strong></span>
          {data.exchange && <span>• Exchange: <strong className="text-black/70 dark:text-white/70">{data.exchange}</strong></span>}
        </div>
        <div className="flex items-center gap-2">
          <span>Quote Timestamp: <strong className="text-black/70 dark:text-white/70">{format(lastUpdated, 'yyyy-MM-dd HH:mm:ss')}</strong> {data.exchangeTimezone ? `(${data.exchangeTimezone})` : ''}</span>
        </div>
      </div>
    </div>
  );
}
