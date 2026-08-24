import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe2, 
  ArrowRightLeft, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Coins
} from 'lucide-react';
import { fetchFxRates, type FxDataResponse } from '../services/geminiService';
import { cn, formatCurrency } from '../utils';

interface MultiCurrencyValuationProps {
  currentPrice: number;
  activeCurrency: string;
  shares?: number;
  ticker: string;
  onCurrencyChange: (currency: string) => void;
}

export default function MultiCurrencyValuation({
  currentPrice,
  activeCurrency,
  shares,
  ticker,
  onCurrencyChange
}: MultiCurrencyValuationProps) {
  const [fxData, setFxData] = useState<FxDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showCustomConverter, setShowCustomConverter] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<string>('1000');
  const [customFrom, setCustomFrom] = useState<'USD' | 'GBP' | 'EUR'>('USD');
  const [customTo, setCustomTo] = useState<'USD' | 'GBP' | 'EUR'>('GBP');

  const loadRates = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchFxRates();
      setFxData(data);
    } catch (err) {
      console.error('Failed to load FX rates for valuation:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRates();
    const interval = setInterval(() => loadRates(true), 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute pricing across USD, GBP, EUR based on active currency price
  const convertedPrices = React.useMemo(() => {
    if (!currentPrice) return { USD: 0, GBP: 0, EUR: 0 };
    if (!fxData) {
      return {
        USD: activeCurrency === 'USD' ? currentPrice : 0,
        GBP: activeCurrency === 'GBP' ? currentPrice : 0,
        EUR: activeCurrency === 'EUR' ? currentPrice : 0
      };
    }

    const gbpUsd = fxData.gbpToUsd.rate; // 1 GBP in USD
    const eurUsd = fxData.eurToUsd.rate; // 1 EUR in USD

    let priceInUSD = currentPrice;
    if (activeCurrency === 'GBP') {
      priceInUSD = currentPrice * gbpUsd;
    } else if (activeCurrency === 'EUR') {
      priceInUSD = currentPrice * eurUsd;
    }

    const priceInGBP = priceInUSD / gbpUsd;
    const priceInEUR = priceInUSD / eurUsd;

    return {
      USD: Number(priceInUSD.toFixed(2)),
      GBP: Number(priceInGBP.toFixed(2)),
      EUR: Number(priceInEUR.toFixed(2))
    };
  }, [currentPrice, activeCurrency, fxData]);

  // Compute custom conversion
  const customConversionResult = React.useMemo(() => {
    const amt = parseFloat(customAmount) || 0;
    if (!fxData || amt <= 0) return '0.00';
    if (customFrom === customTo) return amt.toFixed(2);

    const gbpUsd = fxData.gbpToUsd.rate;
    const eurUsd = fxData.eurToUsd.rate;

    let inUSD = amt;
    if (customFrom === 'GBP') inUSD = amt * gbpUsd;
    if (customFrom === 'EUR') inUSD = amt * eurUsd;

    let result = inUSD;
    if (customTo === 'GBP') result = inUSD / gbpUsd;
    if (customTo === 'EUR') result = inUSD / eurUsd;

    return result.toFixed(2);
  }, [customAmount, customFrom, customTo, fxData]);

  const currencyOptions = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'EUR', symbol: '€', name: 'Euro' }
  ];

  return (
    <div className="bg-white dark:bg-[#141414] p-5 md:p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm space-y-5">
      {/* Header with Title & Quick Refresh */}
      <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-sm tracking-tight flex items-center gap-2">
              Multi-Currency Valuation
              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                Live FX
              </span>
            </h4>
            <p className="text-[9px] font-medium text-black/40 dark:text-white/40">Real-time valuation for {ticker}</p>
          </div>
        </div>

        <button
          onClick={() => loadRates(true)}
          disabled={refreshing}
          className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50 transition-colors"
          title="Refresh FX Rates"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-600")} />
        </button>
      </div>

      {/* Active Display Currency Switcher */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            Active Report Currency
          </span>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
            1-Click Switch
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl">
          {currencyOptions.map((c) => {
            const isActive = activeCurrency === c.code;
            return (
              <button
                key={c.code}
                onClick={() => onCurrencyChange(c.code)}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5",
                  isActive
                    ? "bg-white dark:bg-[#1C1C1C] text-black dark:text-white shadow-sm"
                    : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                )}
              >
                <span className="text-[10px] font-bold opacity-60">{c.symbol}</span>
                <span>{c.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Currency Live Valuation Cards */}
      <div className="grid grid-cols-3 gap-2">
        {currencyOptions.map((curr) => {
          const price = convertedPrices[curr.code as keyof typeof convertedPrices];
          const isSelected = activeCurrency === curr.code;
          const posVal = shares && shares > 0 ? price * shares : null;

          return (
            <div
              key={curr.code}
              onClick={() => onCurrencyChange(curr.code)}
              className={cn(
                "p-3 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden",
                isSelected
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30 ring-1 ring-emerald-500/20"
                  : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                  {curr.code}
                </span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>

              <div className="text-xs md:text-sm font-black tracking-tight text-black dark:text-white truncate">
                {loading ? '...' : formatCurrency(price, curr.code)}
              </div>

              {posVal !== null && (
                <div className="mt-1 text-[9px] font-bold text-black/50 dark:text-white/50 truncate">
                  Total: {formatCurrency(posVal, curr.code)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live FX Rates Summary Strip */}
      {fxData && (
        <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            <span>Market Benchmark Rates</span>
            <span className="font-mono text-[8px] opacity-60">24h Change</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-black/70 dark:text-white/70">GBP/USD</span>
                <p className="text-xs font-mono font-bold">{fxData.gbpToUsd.rate.toFixed(4)}</p>
              </div>
              <span className={cn(
                "text-[9px] font-bold flex items-center gap-0.5",
                fxData.gbpToUsd.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}>
                {fxData.gbpToUsd.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {fxData.gbpToUsd.changePercent.toFixed(2)}%
              </span>
            </div>

            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-black/70 dark:text-white/70">EUR/USD</span>
                <p className="text-xs font-mono font-bold">{fxData.eurToUsd.rate.toFixed(4)}</p>
              </div>
              <span className={cn(
                "text-[9px] font-bold flex items-center gap-0.5",
                fxData.eurToUsd.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}>
                {fxData.eurToUsd.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {fxData.eurToUsd.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Quick Custom Converter */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5">
        <button
          onClick={() => setShowCustomConverter(!showCustomConverter)}
          className="w-full flex items-center justify-between py-1 text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <ArrowRightLeft className="w-3 h-3" />
            Custom Amount Converter
          </span>
          {showCustomConverter ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showCustomConverter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3 pt-3"
            >
              <div className="grid grid-cols-5 gap-2 items-center">
                <div className="col-span-2">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                    placeholder="Amount"
                  />
                </div>

                <div className="col-span-1">
                  <select
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value as any)}
                    className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-1.5 py-2 text-[10px] font-bold outline-none cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => {
                      const temp = customFrom;
                      setCustomFrom(customTo);
                      setCustomTo(temp);
                    }}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-black/60 dark:text-white/60" />
                  </button>
                </div>

                <div className="col-span-1">
                  <select
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value as any)}
                    className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-1.5 py-2 text-[10px] font-bold outline-none cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  {customAmount || '0'} {customFrom} =
                </span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {customConversionResult} {customTo}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
