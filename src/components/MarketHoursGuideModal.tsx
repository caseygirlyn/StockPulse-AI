import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Globe2, 
  ShieldAlert, 
  Zap, 
  BarChart2,
  ChevronRight,
  Coins,
  Building2,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';
import { fetchFxRates, type FxDataResponse } from '../services/geminiService';
import { cn } from '../utils';

interface MarketHoursGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MarketHoursGuideModal({ isOpen, onClose }: MarketHoursGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'timing' | 'europe' | 'danger' | 'checklist'>('timing');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [fxData, setFxData] = useState<FxDataResponse | null>(null);
  const [fxLoading, setFxLoading] = useState<boolean>(false);
  const [fxRefreshing, setFxRefreshing] = useState<boolean>(false);

  // Update clock every 10 seconds while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const loadRates = async (mode: 'initial' | 'manual' = 'initial') => {
    if (mode === 'manual') setFxRefreshing(true);
    else setFxLoading(true);

    try {
      const data = await fetchFxRates();
      setFxData(data);
    } catch (err) {
      console.error('Failed to load benchmark FX rates:', err);
    } finally {
      setFxLoading(false);
      setFxRefreshing(false);
    }
  };

  // Fetch benchmark FX rates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRates('initial');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute live LSE status (London time: UTC+1 during BST / UTC during GMT)
  const lseStatus = () => {
    const londonHourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short'
    }).format(currentTime);

    const londonParts = londonHourStr.split(' ');
    const weekday = londonParts[0];
    const [h, m] = londonParts[1].split(':').map(Number);
    const totalMinutes = h * 60 + m;

    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    if (isWeekend) return { state: 'closed', label: 'Closed (Weekend)', color: 'neutral' };

    // LSE Regular: 08:00 (480m) to 16:30 (990m)
    if (totalMinutes >= 480 && totalMinutes < 990) {
      return { state: 'open', label: 'Open', color: 'emerald' };
    }
    // LSE Pre-market: 07:00 (420m) to 08:00 (480m)
    if (totalMinutes >= 420 && totalMinutes < 480) {
      return { state: 'pre', label: 'Pre-Auction', color: 'amber' };
    }
    return { state: 'closed', label: 'Closed', color: 'neutral' };
  };

  // Compute live Continental European status (Euronext, Deutsche Börse XETRA, SIX Swiss Exchange)
  // Time Zone: Europe/Paris (CET: UTC+1 / CEST: UTC+2)
  const europeStatus = () => {
    const euHourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short'
    }).format(currentTime);

    const euParts = euHourStr.split(' ');
    const weekday = euParts[0];
    const [h, m] = euParts[1].split(':').map(Number);
    const totalMinutes = h * 60 + m;

    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    if (isWeekend) return { state: 'closed', label: 'Closed (Weekend)', color: 'neutral' };

    // Euronext/Xetra/SIX continuous: 09:00 (540m) to 17:30 (1050m) CET
    if (totalMinutes >= 540 && totalMinutes < 1050) {
      return { state: 'open', label: 'Open', color: 'emerald' };
    }
    // Pre-market: 08:00 (480m) to 09:00 (540m) CET
    if (totalMinutes >= 480 && totalMinutes < 540) {
      return { state: 'pre', label: 'Pre-Auction', color: 'amber' };
    }
    return { state: 'closed', label: 'Closed', color: 'neutral' };
  };

  // Compute live NYSE status (New York time: UTC-4 EDT / UTC-5 EST)
  const nyseStatus = () => {
    const nyHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short'
    }).format(currentTime);

    const nyParts = nyHourStr.split(' ');
    const weekday = nyParts[0];
    const [h, m] = nyParts[1].split(':').map(Number);
    const totalMinutes = h * 60 + m;

    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    if (isWeekend) return { state: 'closed', label: 'Closed (Weekend)', color: 'neutral' };

    // NYSE Regular: 09:30 (570m) to 16:00 (960m)
    if (totalMinutes >= 570 && totalMinutes < 960) {
      return { state: 'open', label: 'Open', color: 'emerald' };
    }
    // NYSE Pre-market: 04:00 (240m) to 09:30 (570m)
    if (totalMinutes >= 240 && totalMinutes < 570) {
      return { state: 'pre', label: 'Pre-Market', color: 'amber' };
    }
    return { state: 'closed', label: 'Closed', color: 'neutral' };
  };

  const lse = lseStatus();
  const europe = europeStatus();
  const nyse = nyseStatus();

  // Current formatted times
  const londonTimeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(currentTime);

  const cetTimeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(currentTime);

  const nyTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(currentTime);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-[#141414] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg sm:text-xl text-neutral-900 dark:text-neutral-50 tracking-tight">
                      Market Hours & Benchmark Rates Guide
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider font-mono">
                      US · UK · Europe · FX
                    </span>
                  </div>
                  <p className="text-xs text-black/50 dark:text-white/50 font-medium mt-0.5">
                    Optimal trading windows, live status, and benchmark FX rates for US (NYSE/NASDAQ), UK (LSE), Eurozone (EUR), and Switzerland (SIX)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                aria-label="Close timing guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Exchange Status Cards (3-Column Grid) */}
            <div className="px-5 sm:px-6 pt-4 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. London (LSE) */}
                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 truncate">
                        London (LSE)
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-neutral-500 shrink-0 font-mono">GBP</span>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 font-mono whitespace-nowrap shrink-0",
                      lse.state === 'open' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                      lse.state === 'pre' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        lse.state === 'open' ? "bg-emerald-500 animate-pulse" :
                        lse.state === 'pre' ? "bg-amber-500" : "bg-neutral-400"
                      )} />
                      {lse.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-black/50 dark:text-white/50">08:00 – 16:30 BST</div>
                  <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-xs mt-0.5">
                    {londonTimeStr} BST
                  </div>
                </div>

                {/* 2. Continental Europe & Switzerland (EUR & CHF) */}
                <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100 truncate">
                        Europe & SIX
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono shrink-0">EUR/CHF</span>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 font-mono whitespace-nowrap shrink-0",
                      europe.state === 'open' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                      europe.state === 'pre' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        europe.state === 'open' ? "bg-emerald-500 animate-pulse" :
                        europe.state === 'pre' ? "bg-amber-500" : "bg-neutral-400"
                      )} />
                      {europe.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-black/50 dark:text-white/50">09:00–17:30 CET (08:00 UK)</div>
                  <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-xs mt-0.5">
                    {cetTimeStr} CET
                  </div>
                </div>

                {/* 3. New York (NYSE / NASDAQ) */}
                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 truncate">
                        New York (US)
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-neutral-500 shrink-0 font-mono">USD</span>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 font-mono whitespace-nowrap shrink-0",
                      nyse.state === 'open' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                      nyse.state === 'pre' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        nyse.state === 'open' ? "bg-emerald-500 animate-pulse" :
                        nyse.state === 'pre' ? "bg-amber-500" : "bg-neutral-400"
                      )} />
                      {nyse.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-black/50 dark:text-white/50">09:30–16:00 EDT (14:30 UK)</div>
                  <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-xs mt-0.5">
                    {nyTimeStr} EDT
                  </div>
                </div>
              </div>

              {/* Market Benchmark Rates & Change */}
              <div className="mt-3 p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                      Market Benchmark Rates & Change
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[9px] font-mono font-bold text-neutral-500">
                      Live FX
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 hidden sm:inline">
                      Benchmark vs USD
                    </span>
                    <button
                      type="button"
                      onClick={() => loadRates('manual')}
                      disabled={fxRefreshing}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Refresh FX benchmark rates"
                    >
                      <RefreshCw className={cn("w-3 h-3", fxRefreshing && "animate-spin")} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* GBP / USD */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-neutral-900 dark:text-neutral-100">GBP / USD</span>
                        <span className="text-[8px] font-mono text-neutral-400">UK Cable</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                        {fxData ? fxData.gbpToUsd.rate.toFixed(4) : (fxLoading ? 'Loading...' : '1.3320')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-[10px] font-bold font-mono flex items-center justify-end gap-0.5",
                        (fxData?.gbpToUsd.change ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                      )}>
                        {(fxData?.gbpToUsd.change ?? 0) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {(fxData?.gbpToUsd.changePercent ?? 0) >= 0 ? '+' : ''}{(fxData?.gbpToUsd.changePercent ?? 0).toFixed(2)}%
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 block mt-0.5">
                        {(fxData?.gbpToUsd.change ?? 0) >= 0 ? '+' : ''}{(fxData?.gbpToUsd.change ?? 0).toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* EUR / USD */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-neutral-900 dark:text-neutral-100">EUR / USD</span>
                        <span className="text-[8px] font-mono text-neutral-400">Eurozone</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                        {fxData ? fxData.eurToUsd.rate.toFixed(4) : (fxLoading ? 'Loading...' : '1.1410')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-[10px] font-bold font-mono flex items-center justify-end gap-0.5",
                        (fxData?.eurToUsd.change ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                      )}>
                        {(fxData?.eurToUsd.change ?? 0) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {(fxData?.eurToUsd.changePercent ?? 0) >= 0 ? '+' : ''}{(fxData?.eurToUsd.changePercent ?? 0).toFixed(2)}%
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 block mt-0.5">
                        {(fxData?.eurToUsd.change ?? 0) >= 0 ? '+' : ''}{(fxData?.eurToUsd.change ?? 0).toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* CHF / USD */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-neutral-900 dark:text-neutral-100">CHF / USD</span>
                        <span className="text-[8px] font-mono text-neutral-400">Swiss Franc</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                        {fxData?.chfToUsd ? fxData.chfToUsd.rate.toFixed(4) : (fxLoading ? 'Loading...' : '1.2150')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-[10px] font-bold font-mono flex items-center justify-end gap-0.5",
                        (fxData?.chfToUsd?.change ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                      )}>
                        {(fxData?.chfToUsd?.change ?? 0) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {(fxData?.chfToUsd?.changePercent ?? 0) >= 0 ? '+' : ''}{(fxData?.chfToUsd?.changePercent ?? 0).toFixed(2)}%
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 block mt-0.5">
                        {(fxData?.chfToUsd?.change ?? 0) >= 0 ? '+' : ''}{(fxData?.chfToUsd?.change ?? 0).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="px-5 sm:px-6 pt-2">
              <div className="flex items-center gap-1 bg-[#F5F5F5] dark:bg-[#1A1A1A] p-1 rounded-2xl border border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveTab('timing')}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                    activeTab === 'timing'
                      ? "bg-white dark:bg-[#252525] text-black dark:text-white shadow-xs"
                      : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                  )}
                >
                  Best Trading Windows
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('europe')}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1.5",
                    activeTab === 'europe'
                      ? "bg-white dark:bg-[#252525] text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-black/50 dark:text-white/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                  )}
                >
                  <span>EUR & CHF Guide</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('danger')}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                    activeTab === 'danger'
                      ? "bg-white dark:bg-[#252525] text-rose-600 dark:text-rose-400 shadow-xs"
                      : "text-black/50 dark:text-white/50 hover:text-rose-600 dark:hover:text-rose-400"
                  )}
                >
                  When to Avoid
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('checklist')}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                    activeTab === 'checklist'
                      ? "bg-white dark:bg-[#252525] text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-black/50 dark:text-white/50 hover:text-emerald-600 dark:hover:text-emerald-400"
                  )}
                >
                  Pre-Trade Checklist
                </button>
              </div>
            </div>

            {/* Scrollable Tab Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* TAB 1: BEST ENTRY WINDOWS */}
              {activeTab === 'timing' && (
                <div className="space-y-4">
                  {/* Style A: Swing / Position Traders */}
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h4 className="font-black text-sm text-neutral-900 dark:text-neutral-50 tracking-tight">
                          Position & Swing Traders (Days to Months)
                        </h4>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                        Recommended
                      </span>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-xs">
                      Run your analysis during one of two high-conviction windows where institutional volume establishes clean support levels:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C1C] border border-black/5 dark:border-white/5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">
                          Option 1: Pre-Market Analysis
                        </div>
                        <div className="font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                          30–60 mins before the opening bell
                        </div>
                        <ul className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-0.5">
                          <li>• <strong>LSE & Euronext/SIX:</strong> 07:15 – 07:45 BST (08:15–08:45 CET)</li>
                          <li>• <strong>NYSE/NASDAQ:</strong> 13:30 – 14:00 BST (08:30–09:00 EDT)</li>
                          <li className="pt-1 text-black/60 dark:text-white/60">Overnight earnings & macro news are already priced in. 5D/20D MAs and Anchored VWAP lines are clean and steady.</li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C1C] border border-black/5 dark:border-white/5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">
                          Option 2: Into Market Close
                        </div>
                        <div className="font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                          15–30 mins before the closing bell
                        </div>
                        <ul className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-0.5">
                          <li>• <strong>LSE & Euronext/SIX:</strong> 16:00 – 16:25 BST (17:00–17:25 CET)</li>
                          <li>• <strong>NYSE/NASDAQ:</strong> 20:30 – 20:55 BST (15:30–15:55 EDT)</li>
                          <li className="pt-1 text-black/60 dark:text-white/60">Institutional Market-on-Close (MOC) flow confirms whether buyers defended key levels or if overhead sellers took control.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Style B: Intraday Active Traders */}
                  <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="font-black text-sm text-neutral-900 dark:text-neutral-50 tracking-tight">
                        Intraday / Same-Day Active Traders
                      </h4>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-xs">
                      Wait <strong>30 to 45 minutes after the open</strong> before submitting fresh limit or market orders:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                      <span className="p-2 rounded-lg bg-black/5 dark:bg-white/5 font-bold flex flex-col gap-0.5">
                        <span className="text-black/50 dark:text-white/50 text-[10px] font-normal uppercase">UK & European Equities</span>
                        <span>08:30 – 09:15 BST / 09:30 – 10:15 CET</span>
                      </span>
                      <span className="p-2 rounded-lg bg-black/5 dark:bg-white/5 font-bold flex flex-col gap-0.5">
                        <span className="text-black/50 dark:text-white/50 text-[10px] font-normal uppercase">US Equities</span>
                        <span>15:00 – 15:45 BST / 10:00 – 10:45 EDT</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-black/50 dark:text-white/50 pt-1">
                      This allows initial opening price discovery imbalances and wide bid-ask spreads to clear, establishing a true intraday session trend.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: EUR & CHF DEEP-DIVE (NEW DEDICATED SECTION) */}
              {activeTab === 'europe' && (
                <div className="space-y-4">
                  {/* Summary Callout: Do EUR & CHF fall into NYSE or LSE? */}
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-indigo-950 dark:text-indigo-100 tracking-tight">
                          Where Do EUR & CHF Stocks Actually Trade?
                        </h4>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                          They do <strong>not</strong> trade on NYSE or LSE (unless held as dual-listed US ADRs)
                        </p>
                      </div>
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-[11px]">
                      Euro-denominated stocks and Swiss Franc (CHF) shares trade on separate primary continental exchanges in Europe. However, because Central European Time (CET) is only 1 hour ahead of the UK, <strong>their active trading hours coincide almost identically with the London Stock Exchange (08:00 – 16:30 UK time)</strong>!
                    </p>
                  </div>

                  {/* Primary Exchanges Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Euro Stocks */}
                    <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-neutral-900 dark:text-neutral-100">
                          <Coins className="w-4 h-4 text-emerald-500" />
                          <span>Euro Stocks (€ EUR)</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          09:00 – 17:30 CET
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        Traded primarily on:
                      </p>
                      <ul className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1">
                        <li>• <strong>Euronext Paris / Amsterdam:</strong> LVMH, ASML, TotalEnergies, Sanofi, Heineken.</li>
                        <li>• <strong>Deutsche Börse (XETRA Frankfurt):</strong> SAP, Siemens, Allianz, Mercedes-Benz, BMW.</li>
                        <li>• <strong>BME Madrid & Borsa Italiana:</strong> Iberdrola, Santander, Ferrari, Enel.</li>
                      </ul>
                      <div className="text-[10px] text-black/50 dark:text-white/50 pt-1 border-t border-black/5 dark:border-white/5">
                        *In UK Time (BST): Exactly <strong>08:00 – 16:30</strong> (same as London LSE).
                      </div>
                    </div>

                    {/* Swiss CHF Stocks */}
                    <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-neutral-900 dark:text-neutral-100">
                          <Globe2 className="w-4 h-4 text-rose-500" />
                          <span>Swiss Stocks (CHF)</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          09:00 – 17:30 CET
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        Traded primarily on:
                      </p>
                      <ul className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1">
                        <li>• <strong>SIX Swiss Exchange (Zurich):</strong> Home to world leaders Nestlé (NESN), Novartis (NOVN), Roche (ROG), UBS, Richemont.</li>
                        <li>• Continuous trading runs until <strong>17:20 CET</strong>, followed by the closing auction until 17:30 CET.</li>
                      </ul>
                      <div className="text-[10px] text-black/50 dark:text-white/50 pt-1 border-t border-black/5 dark:border-white/5">
                        *In UK Time (BST): Exactly <strong>08:00 – 16:30</strong> (closing auction 16:20–16:30).
                      </div>
                    </div>
                  </div>

                  {/* 3 Critical Rules for EUR & CHF Traders */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 space-y-3">
                    <h5 className="font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      3 Golden Rules for European & Swiss Positions
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                        <div className="font-bold text-[11px] text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                          <span>1. Central Bank Clocks</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          • <strong>ECB Rate:</strong> Thursdays at <strong>13:15 BST / 14:15 CET</strong>. Lagarde speaks at 13:45 BST. High EUR equity volatility.<br />
                          • <strong>SNB Rate:</strong> Quarterly Thursdays at <strong>08:30 BST / 09:30 CET</strong>. Sudden spikes in CHF.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                        <div className="font-bold text-[11px] text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                          <span>2. CHF Safe-Haven Risk</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          During market panics, CHF rallies as a safe haven. This strengthens the currency but dampens revenue for Swiss multinationals (Nestlé, Roche earn 95% overseas).
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                        <div className="font-bold text-[11px] text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                          <span>3. The European Lunch Lull</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          Trading volume slumps between <strong>11:30 and 13:30 BST (12:30–14:30 CET)</strong>. True institutional volume surges again once Wall Street opens at 14:30 BST.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: WHEN TO AVOID */}
              {activeTab === 'danger' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-100 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      1. The First 10 Minutes of Opening Bells
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      • <strong>LSE, Euronext & SIX:</strong> 08:00 – 08:10 BST (09:00 – 09:10 CET)<br />
                      • <strong>NYSE / NASDAQ:</strong> 14:30 – 14:40 BST (09:30 – 09:40 EDT)<br />
                      High algorithmic noise and wide bid-ask spreads produce frequent false breakouts. Retail market orders placed here suffer from heavy slippage.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-100 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      2. High-Impact Macro & Central Bank Announcements
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      Never enter a new position 10–15 minutes before scheduled economic releases:<br />
                      • <strong>Swiss SNB Policy:</strong> 08:30 BST / 09:30 CET (quarterly Thursdays)<br />
                      • <strong>ECB Rate Decisions:</strong> 13:15 BST / 14:15 CET (Thursdays) & 13:45 BST Press Conf<br />
                      • <strong>US CPI / Inflation:</strong> Usually 13:30 BST (08:30 EDT)<br />
                      • <strong>US Fed FOMC Decision:</strong> 19:00 BST (14:00 EDT)<br />
                      Sudden multi-percent spikes can trigger stop-losses before fundamentals can take effect.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-100 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      <Clock className="w-4 h-4 shrink-0" />
                      3. Illiquid After-Hours & Lunchtime Lulls
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      • In Europe, avoid opening new aggressive breakout trades during the 11:30–13:30 BST lunch lull.<br />
                      • On US platforms, avoid after-hours sessions (21:00–01:00 BST) where spreads are wide and retail order execution is disadvantaged.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: PRE-TRADE CHECKLIST */}
              {activeTab === 'checklist' && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-xs">
                      1
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        Check Anchored VWAP Confluence
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        Verify if price is trading near or slightly above the dynamic Anchored VWAP line from recent highs, ensuring buyers are in aggregate control rather than trapped underneath resistance.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-xs">
                      2
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        Confirm Volume Participation & US Cross-Trading
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        Look for volume at or exceeding the 20-day moving average. For dual-listed stocks (like ASML, SAP, Novartis), European volume surges heavily during the 14:30–16:30 BST US overlap.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-xs">
                      3
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        Verify Cross-Border FX Rates (GBP, EUR, CHF, USD)
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        If holding EUR or CHF assets with a GBP or USD base portfolio, consult the Market Benchmark Rates & Change section above to ensure currency fluctuations aren't eating into your equity gains. Remember Swiss 35% dividend withholding tax rules.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-xs">
                      4
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        Define Invalidation & Stop Distance
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        Consult the automated Stop Loss & Take Profit targets provided in the StockPulse Trade Hub before placing orders with your broker.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:px-6 bg-[#F8F9FA] dark:bg-[#171717] border-t border-black/5 dark:border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">
                Times in BST (London), CET (Paris/Zurich) & EDT (New York)
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Got It
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
