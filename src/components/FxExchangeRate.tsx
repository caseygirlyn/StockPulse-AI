import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, RefreshCw, TrendingUp, TrendingDown, DollarSign, PoundSterling, Euro, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchFxRates, type FxDataResponse, type FxRateDetail } from '../services/geminiService';
import { cn } from '../utils';

interface FxExchangeRateProps {
  onCurrencySelect?: (currency: string) => void;
  selectedCurrency?: string;
}

export default function FxExchangeRate({ onCurrencySelect, selectedCurrency }: FxExchangeRateProps) {
  const [fxData, setFxData] = useState<FxDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculator state
  const [amount, setAmount] = useState<string>('1000');
  const [fromCurr, setFromCurr] = useState<'GBP' | 'USD' | 'EUR'>('GBP');
  const [toCurr, setToCurr] = useState<'GBP' | 'USD' | 'EUR'>('USD');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const loadFxRates = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchFxRates();
      setFxData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load exchange rates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFxRates();
    const interval = setInterval(() => loadFxRates(true), 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getActiveRateDetail = (): FxRateDetail | null => {
    if (!fxData) return null;
    if (fromCurr === 'GBP' && toCurr === 'USD') return fxData.gbpToUsd;
    if (fromCurr === 'USD' && toCurr === 'GBP') return fxData.usdToGbp;
    if (fromCurr === 'EUR' && toCurr === 'USD') return fxData.eurToUsd;
    if (fromCurr === 'USD' && toCurr === 'EUR') return fxData.usdToEur;

    // Cross rates estimation
    if (fromCurr === 'GBP' && toCurr === 'EUR') {
      const rate = fxData.gbpToUsd.rate / fxData.eurToUsd.rate;
      return {
        pair: 'GBP/EUR',
        fromCurrency: 'GBP',
        toCurrency: 'EUR',
        rate: Number(rate.toFixed(4)),
        previousClose: Number((fxData.gbpToUsd.previousClose / fxData.eurToUsd.previousClose).toFixed(4)),
        change: 0,
        changePercent: 0,
        dayHigh: Number((rate * 1.005).toFixed(4)),
        dayLow: Number((rate * 0.995).toFixed(4)),
        fiftyTwoWeekHigh: Number((rate * 1.08).toFixed(4)),
        fiftyTwoWeekLow: Number((rate * 0.92).toFixed(4)),
        history: [],
        lastUpdated: fxData.lastUpdated
      };
    }

    if (fromCurr === 'EUR' && toCurr === 'GBP') {
      const rate = fxData.eurToUsd.rate / fxData.gbpToUsd.rate;
      return {
        pair: 'EUR/GBP',
        fromCurrency: 'EUR',
        toCurrency: 'GBP',
        rate: Number(rate.toFixed(4)),
        previousClose: Number((fxData.eurToUsd.previousClose / fxData.gbpToUsd.previousClose).toFixed(4)),
        change: 0,
        changePercent: 0,
        dayHigh: Number((rate * 1.005).toFixed(4)),
        dayLow: Number((rate * 0.995).toFixed(4)),
        fiftyTwoWeekHigh: Number((rate * 1.08).toFixed(4)),
        fiftyTwoWeekLow: Number((rate * 0.92).toFixed(4)),
        history: [],
        lastUpdated: fxData.lastUpdated
      };
    }

    return fxData.gbpToUsd;
  };

  const activeDetail = getActiveRateDetail();
  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = activeDetail ? (numericAmount * activeDetail.rate).toFixed(2) : '0.00';

  const handleSwapCurrencies = () => {
    setFromCurr(toCurr);
    setToCurr(fromCurr);
  };

  const getCurrencySymbol = (c: string) => {
    switch (c) {
      case 'GBP': return '£';
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '$';
    }
  };

  return (
    <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-[2rem] p-4 sm:p-5 md:p-6 shadow-sm space-y-4">
      {/* Top Header & Live Tickers */}
      <div className="flex flex-col gap-3 border-b border-black/5 dark:border-white/5 pb-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-sm tracking-tight text-black dark:text-white">Exchange Rates</h3>
                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  Live
                </span>
              </div>
              <p className="text-[10px] font-medium text-black/40 dark:text-white/40">GBP ⇄ USD Real-time Forex</p>
            </div>
          </div>

          <button
            onClick={() => loadFxRates(true)}
            disabled={refreshing || loading}
            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 transition-all shrink-0"
            title="Refresh FX Rates"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-500")} />
          </button>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 px-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-all shadow-sm"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>{isExpanded ? 'Hide FX Converter' : 'FX Converter'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Pair Quick Cards (Mobile & Sidebar Friendly Layout) */}
      {fxData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* GBP -> USD Card */}
          <div 
            onClick={() => { setFromCurr('GBP'); setToCurr('USD'); setIsExpanded(true); }}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between space-y-1.5",
              fromCurr === 'GBP' && toCurr === 'USD' 
                ? "bg-emerald-500/5 border-emerald-500/40 shadow-sm" 
                : "bg-[#F8F9FA] dark:bg-[#0D0D0D] border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">GBP / USD</span>
              <span className={cn(
                "text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                fxData.gbpToUsd.change >= 0 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
              )}>
                {fxData.gbpToUsd.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {fxData.gbpToUsd.changePercent > 0 ? `+${fxData.gbpToUsd.changePercent}%` : `${fxData.gbpToUsd.changePercent}%`}
              </span>
            </div>

            <div>
              <div className="text-base font-black tracking-tight text-black dark:text-white">
                £1.00 = <span className="text-emerald-600 dark:text-emerald-400">${fxData.gbpToUsd.rate.toFixed(4)}</span>
              </div>
              <div className="text-[9px] font-medium text-black/40 dark:text-white/40">
                Range: ${fxData.gbpToUsd.dayLow.toFixed(4)} - ${fxData.gbpToUsd.dayHigh.toFixed(4)}
              </div>
            </div>
          </div>

          {/* USD -> GBP Card */}
          <div 
            onClick={() => { setFromCurr('USD'); setToCurr('GBP'); setIsExpanded(true); }}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between space-y-1.5",
              fromCurr === 'USD' && toCurr === 'GBP' 
                ? "bg-emerald-500/5 border-emerald-500/40 shadow-sm" 
                : "bg-[#F8F9FA] dark:bg-[#0D0D0D] border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">USD / GBP</span>
              <span className={cn(
                "text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                fxData.usdToGbp.change >= 0 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
              )}>
                {fxData.usdToGbp.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {fxData.usdToGbp.changePercent > 0 ? `+${fxData.usdToGbp.changePercent}%` : `${fxData.usdToGbp.changePercent}%`}
              </span>
            </div>

            <div>
              <div className="text-base font-black tracking-tight text-black dark:text-white">
                $1.00 = <span className="text-emerald-600 dark:text-emerald-400">£{fxData.usdToGbp.rate.toFixed(4)}</span>
              </div>
              <div className="text-[9px] font-medium text-black/40 dark:text-white/40">
                Range: £{fxData.usdToGbp.dayLow.toFixed(4)} - £{fxData.usdToGbp.dayHigh.toFixed(4)}
              </div>
            </div>
          </div>

          {/* EUR -> USD Card */}
          <div 
            onClick={() => { setFromCurr('EUR'); setToCurr('USD'); setIsExpanded(true); }}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between space-y-1.5",
              fromCurr === 'EUR' && toCurr === 'USD' 
                ? "bg-emerald-500/5 border-emerald-500/40 shadow-sm" 
                : "bg-[#F8F9FA] dark:bg-[#0D0D0D] border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">EUR / USD</span>
              <span className={cn(
                "text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                fxData.eurToUsd.change >= 0 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
              )}>
                {fxData.eurToUsd.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {fxData.eurToUsd.changePercent > 0 ? `+${fxData.eurToUsd.changePercent}%` : `${fxData.eurToUsd.changePercent}%`}
              </span>
            </div>

            <div>
              <div className="text-base font-black tracking-tight text-black dark:text-white">
                €1.00 = <span className="text-emerald-600 dark:text-emerald-400">${fxData.eurToUsd.rate.toFixed(4)}</span>
              </div>
              <div className="text-[9px] font-medium text-black/40 dark:text-white/40">
                Range: ${fxData.eurToUsd.dayLow.toFixed(4)} - ${fxData.eurToUsd.dayHigh.toFixed(4)}
              </div>
            </div>
          </div>

          {/* GBP -> EUR Card */}
          <div 
            onClick={() => { setFromCurr('GBP'); setToCurr('EUR'); setIsExpanded(true); }}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between space-y-1.5",
              fromCurr === 'GBP' && toCurr === 'EUR' 
                ? "bg-emerald-500/5 border-emerald-500/40 shadow-sm" 
                : "bg-[#F8F9FA] dark:bg-[#0D0D0D] border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">GBP / EUR</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                Cross
              </span>
            </div>

            <div>
              <div className="text-base font-black tracking-tight text-black dark:text-white">
                £1.00 = <span className="text-emerald-600 dark:text-emerald-400">€{(fxData.gbpToUsd.rate / fxData.eurToUsd.rate).toFixed(4)}</span>
              </div>
              <div className="text-[9px] font-medium text-black/40 dark:text-white/40">
                1 EUR = £{(fxData.eurToUsd.rate / fxData.gbpToUsd.rate).toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive FX Converter Modal / Expandable Panel */}
      <AnimatePresence>
        {isExpanded && activeDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 border-t border-black/5 dark:border-white/5 space-y-3 overflow-hidden"
          >
            <div className="bg-[#F8F9FA] dark:bg-[#0A0A0A] p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <h4 className="font-black uppercase tracking-wider text-black/60 dark:text-white/60 text-[10px]">
                  Instant Converter
                </h4>
                <span className="text-[9px] font-bold text-black/40 dark:text-white/40">
                  1 {fromCurr} = {getCurrencySymbol(toCurr)}{activeDetail.rate.toFixed(4)}
                </span>
              </div>

              {/* Input row - Vertical stacked for perfect sidebar fitting */}
              <div className="flex flex-col gap-2.5">
                {/* From Amount */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                    You Pay ({fromCurr})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm text-black/40 dark:text-white/40">
                      {getCurrencySymbol(fromCurr)}
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-xl pl-7 pr-20 py-2 font-black text-sm outline-none focus:border-emerald-500 transition-all"
                    />
                    <select
                      value={fromCurr}
                      onChange={(e) => setFromCurr(e.target.value as any)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/5 dark:bg-white/10 border-0 rounded-lg px-2 py-1 font-black text-[10px] cursor-pointer outline-none"
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center -my-1">
                  <button
                    onClick={handleSwapCurrencies}
                    className="p-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-all shadow-sm group"
                    title="Swap Currencies"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                </div>

                {/* To Amount */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                    You Receive ({toCurr})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {getCurrencySymbol(toCurr)}
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={convertedAmount}
                      className="w-full bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl pl-7 pr-20 py-2 font-black text-sm text-emerald-700 dark:text-emerald-400 outline-none"
                    />
                    <select
                      value={toCurr}
                      onChange={(e) => setToCurr(e.target.value as any)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/5 dark:bg-white/10 border-0 rounded-lg px-2 py-1 font-black text-[10px] cursor-pointer outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {['100', '500', '1000', '5000'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black transition-all shrink-0",
                      amount === val 
                        ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" 
                        : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60"
                    )}
                  >
                    {getCurrencySymbol(fromCurr)}{parseInt(val).toLocaleString()}
                  </button>
                ))}
              </div>

              {/* FX Rate Trend Line Chart */}
              {activeDetail.history && activeDetail.history.length > 0 && (
                <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                      {activeDetail.pair} Trend
                    </span>
                    <span className="text-black/50 dark:text-white/50">
                      Range: {getCurrencySymbol(toCurr)}{activeDetail.fiftyTwoWeekLow.toFixed(2)} - {getCurrencySymbol(toCurr)}{activeDetail.fiftyTwoWeekHigh.toFixed(2)}
                    </span>
                  </div>

                  <div className="h-20 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activeDetail.history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 8, fill: '#888' }} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(str) => str.slice(5)}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          tick={{ fontSize: 8, fill: '#888' }} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded-md text-[10px] font-black shadow-lg">
                                  <p>{payload[0].payload.date}: 1 {fromCurr} = {getCurrencySymbol(toCurr)}{payload[0].value}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#10b981" 
                          strokeWidth={1.5} 
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
