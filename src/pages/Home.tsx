import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  Newspaper, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  Loader2,
  Save,
  Trash2,
  Calendar,
  RefreshCw,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { analyzeStock, getLatestPrice, type StockData } from '../services/geminiService';
import FxExchangeRate from '../components/FxExchangeRate';
import { cn, formatCurrency } from '../utils';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  
  const [ticker, setTicker] = useState('');
  const [avgPrice, setAvgPrice] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockData | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'price' | 'volume'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [filterQuery, setFilterQuery] = useState('');
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish' | 'neutral' | 'bearish'>('all');

  const sortedAndFilteredHistory = useMemo(() => {
    if (!data) return [];
    
    let filtered = data.dailyHistory;
    if (filterQuery) {
      filtered = filtered.filter(item => 
        item.date.includes(filterQuery) || 
        item.price.toString().includes(filterQuery) ||
        item.volume.toString().includes(filterQuery)
      );
    }

    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc' 
          ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime()
          : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
      }

      return sortConfig.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [data, sortConfig, filterQuery]);

  const handleSort = (key: 'date' | 'price' | 'volume') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Identifying stock ticker...",
    "Retrieving 30-day market data...",
    "Calculating technical indicators...",
    "Analyzing recent news sentiment...",
    "Generating final recommendation..."
  ];

  // Handle URL parameters for loading positions
  useEffect(() => {
    const t = searchParams.get('ticker');
    const a = searchParams.get('avgPrice');
    const s = searchParams.get('shares');
    const c = searchParams.get('currency');

    if (t && a) {
      setTicker(t);
      setAvgPrice(a);
      setShares(s || '');
      setCurrency(c || 'USD');
      
      // Trigger analysis automatically
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent, { ticker: t, avgPrice: a, shares: s || '', currency: c || 'USD' });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent, overridePos?: { ticker: string, avgPrice: string, shares: string, currency: string }, forceRefresh: boolean = false) => {
    e.preventDefault();
    const currentTicker = overridePos?.ticker || ticker;
    const currentAvgPrice = overridePos?.avgPrice || avgPrice;
    const currentCurrency = overridePos?.currency || currency;

    if (!currentTicker || !currentAvgPrice) return;

    setLoading(true);
    setError(null);
    setLoadingStep(0);
    setShowHistoryTable(false);
    
    // Simulate progress for better UX
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const result = await analyzeStock(currentTicker.toUpperCase(), parseFloat(currentAvgPrice), currentCurrency, forceRefresh);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const unrealizedGainLoss = useMemo(() => {
    if (!data || !avgPrice) return 0;
    const current = data.currentPrice;
    const avg = parseFloat(avgPrice);
    if (avg === 0) return 0;
    return ((current - avg) / avg) * 100;
  }, [data, avgPrice]);

  const portfolioStats = useMemo(() => {
    if (!data || !avgPrice || !shares) return null;
    const current = data.currentPrice;
    const avg = parseFloat(avgPrice);
    if (isNaN(avg) || avg === 0) return null;
    const qty = parseFloat(shares);
    const costBasis = avg * qty;
    const marketValue = current * qty;
    const profit = marketValue - costBasis;
    return { costBasis, marketValue, profit };
  }, [data, avgPrice, shares]);

  const chartData = useMemo(() => {
    if (!data) return [];
    
    // Ensure data is sorted chronologically (oldest to newest) for left-to-right display
    const sortedHistory = [...data.dailyHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedHistory.map((item, index) => {
      const slice = sortedHistory.slice(Math.max(0, index - 4), index + 1);
      const ma5 = slice.reduce((sum, curr) => sum + curr.price, 0) / slice.length;
      
      return {
        ...item,
        displayDate: format(parseISO(item.date), 'MMM dd'),
        ma5: index >= 4 ? ma5 : null,
      };
    });
  }, [data]);

  // Real-time polling for latest stock price
  useEffect(() => {
    if (!data || loading) return;

    const pollInterval = setInterval(async () => {
      const isDataSaver = localStorage.getItem('data_saver_mode') === 'true';
      if (document.hidden || !data || loading || isDataSaver) return;
      
      setIsUpdating(true);
      try {
        const latest = await getLatestPrice(data.ticker, currency, true);
        
        setData(prev => {
          if (!prev) return null;
          
          const newData = { 
            ...prev, 
            currentPrice: latest.currentPrice,
            previousClose: latest.previousClose ?? prev.previousClose,
            priceChange: latest.priceChange ?? prev.priceChange,
            priceChangePercent: latest.priceChangePercent ?? prev.priceChangePercent
          };
          const today = new Date().toISOString().split('T')[0];
          const history = [...prev.dailyHistory];
          const lastEntry = history[history.length - 1];
          
          if (lastEntry && lastEntry.date.startsWith(today)) {
            history[history.length - 1] = { ...lastEntry, price: latest.currentPrice };
            newData.dailyHistory = history;
          }
          
          return newData;
        });
        setLastUpdated(new Date());
      } catch (err: any) {
        console.error("Failed to poll price:", err);
      } finally {
        setIsUpdating(false);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [data?.ticker, currency, loading]);

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-100 transition-colors duration-300">
      <main className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <AnimatePresence mode="wait">
          {!data && !loading && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-4xl mx-auto py-4 md:py-6"
            >
              <div className="text-center mb-4 md:mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 mb-2 shadow-sm">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-tight">Professional Grade <br/>Stock Intelligence</h2>
                <p className="text-black/60 dark:text-white/60 text-base md:text-lg max-w-lg mx-auto">Connect your portfolio data to get institutional-level technical analysis and real-time news sentiment.</p>
              </div>
              
              <div className="flex justify-center">
                <form onSubmit={(e) => handleSubmit(e)} className="w-full max-w-xl bg-white dark:bg-[#141414] p-5 md:p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-2xl space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">New Analysis</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-0.5 text-left">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Ticker Symbol</label>
                      <input 
                        type="text" 
                        placeholder="e.g. NVDA" 
                        className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 py-2.5 md:px-5 md:py-3 outline-none focus:border-emerald-500 transition-all font-bold uppercase text-sm"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Avg Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 py-2.5 md:px-5 md:py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                        value={avgPrice}
                        onChange={(e) => setAvgPrice(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5 text-left">
                    <label className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Number of Shares (Optional)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        placeholder="e.g. 10" 
                        className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 py-2.5 md:px-5 md:py-3 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                    />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <label className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Currency</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 py-2.5 md:px-5 md:py-3 outline-none focus:border-emerald-500 transition-all font-bold cursor-pointer text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-black text-white font-black py-3.5 md:py-4 rounded-xl hover:bg-emerald-600 shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 text-sm md:text-base"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Generate Report'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 space-y-8"
            >
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-emerald-600 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <AnimatePresence mode="wait">
                  <motion.h3 
                    key={loadingStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="font-black text-2xl tracking-tight"
                  >
                    {loadingMessages[loadingStep]}
                  </motion.h3>
                </AnimatePresence>
                <p className="text-black/40 text-sm font-medium">This usually takes about 10-15 seconds</p>
              </div>
              
              <div className="flex gap-1">
                {loadingMessages.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 w-8 rounded-full transition-all duration-500",
                      i <= loadingStep ? "bg-emerald-600" : "bg-black/5"
                    )} 
                  />
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="max-w-md text-center pt-8 border-t border-black/5 dark:border-white/5"
              >
                <p className="text-[10px] font-bold text-black/20 dark:text-white/20 uppercase tracking-widest leading-relaxed">
                  Financial analysis provided by StockPulse AI is for informational purposes only. 
                  AI models can occasionally provide inaccurate data. Always consult with a 
                  professional financial advisor before making investment decisions.
                </p>
              </motion.div>
            </motion.div>
          )}

        {error && (
          <div className="max-w-md mx-auto bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-2xl flex gap-3 items-start">
            <AlertCircle className="text-red-600 dark:text-red-500 w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900 dark:text-red-400">Analysis Failed</h4>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

          {data && !loading && (
            <motion.div 
              key="dashboard"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6 w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                      <span className="text-white dark:text-black font-black text-lg">{data.ticker.slice(0, 2)}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter flex items-center gap-3">
                      {data.ticker}
                      <span className="text-sm font-bold text-black/20 dark:text-white/20 uppercase tracking-widest hidden sm:inline">Analysis Report</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isUpdating ? "bg-emerald-400 animate-ping" : "bg-emerald-500"
                    )} />
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Live</span>
                    <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-500/60 ml-1">
                      {format(lastUpdated, 'HH:mm:ss')}
                    </span>
                    <button 
                      onClick={async () => {
                        if (isUpdating) return;
                        setIsUpdating(true);
                        try {
                          const latest = await getLatestPrice(data.ticker, currency, true);
                          setData(prev => prev ? { 
                            ...prev, 
                            currentPrice: latest.currentPrice,
                            previousClose: latest.previousClose ?? prev.previousClose,
                            priceChange: latest.priceChange ?? prev.priceChange,
                            priceChangePercent: latest.priceChangePercent ?? prev.priceChangePercent
                          } : null);
                          setLastUpdated(new Date());
                        } catch (err) {
                          console.error("Manual refresh failed:", err);
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-full transition-colors group ml-0.5"
                      title="Refresh Price"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 text-emerald-600/40 dark:text-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-500 ${isUpdating ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                  <div className="relative flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        if (isUpdating) return;
                        setIsUpdating(true);
                        try {
                          const latest = await getLatestPrice(data.ticker, currency, true);
                          setData(prev => prev ? { 
                            ...prev, 
                            currentPrice: latest.currentPrice,
                            previousClose: latest.previousClose ?? prev.previousClose,
                            priceChange: latest.priceChange ?? prev.priceChange,
                            priceChangePercent: latest.priceChangePercent ?? prev.priceChangePercent
                          } : null);
                          setLastUpdated(new Date());
                        } catch (err) {
                          console.error("Price refresh failed:", err);
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      disabled={isUpdating}
                      className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 p-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      title="Refresh Latest Price"
                    >
                      <RefreshCw className={cn("w-4 h-4 text-emerald-600 dark:text-emerald-500", isUpdating && "animate-spin")} />
                      <span className="hidden sm:inline text-[10px]">Refresh Price</span>
                    </button>
                    <button 
                      onClick={() => setData(null)}
                      className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-sm"
                    >
                      New Analysis
                    </button>
                  </div>
              </div>

              {/* Main Content Grid with Sidebar Up */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { 
                        label: 'Current Price', 
                        value: formatCurrency(data.currentPrice, currency), 
                        sub: data.priceChangePercent !== undefined
                          ? `${data.priceChangePercent >= 0 ? '+' : ''}${data.priceChangePercent}% 24h`
                          : (parseFloat(avgPrice) === 0 ? '' : `${unrealizedGainLoss >= 0 ? '+' : ''}${unrealizedGainLoss.toFixed(2)}%`), 
                        gain: data.priceChangePercent !== undefined 
                          ? data.priceChangePercent >= 0 
                          : (parseFloat(avgPrice) === 0 ? undefined : unrealizedGainLoss >= 0) 
                      },
                      ...(portfolioStats ? [{ 
                        label: 'Portfolio Value', 
                        value: formatCurrency(portfolioStats.marketValue, currency), 
                        sub: `${portfolioStats.profit >= 0 ? '+' : ''}${formatCurrency(portfolioStats.profit, currency)}`,
                        gain: portfolioStats.profit >= 0
                      }] : []),
                      { label: 'Stock Trend', value: data.ticker, sub: data.analysis.trend, trend: true },
                      { label: 'MA5 Indicator', value: formatCurrency(data.ma5, currency), sub: data.currentPrice > data.ma5 ? 'ABOVE' : 'BELOW', indicator: true },
                      ...(parseFloat(avgPrice) !== 0 ? [{ label: 'Avg Purchase', value: formatCurrency(parseFloat(avgPrice), currency), sub: `${unrealizedGainLoss >= 0 ? '+' : ''}${unrealizedGainLoss.toFixed(2)}% P/L`, gain: unrealizedGainLoss >= 0 }] : []),
                      ...(data.marketCap ? [{ label: 'Market Cap', value: data.marketCap, sub: 'Valuation' }] : []),
                      ...(data.peRatio ? [{ label: 'P/E Ratio', value: data.peRatio.toFixed(2), sub: 'Earnings' }] : []),
                      ...(data.dividendYield ? [{ label: 'Div Yield', value: `${data.dividendYield.toFixed(2)}%`, sub: data.dividendRate ? formatCurrency(data.dividendRate, currency) : 'Annual' }] : []),
                    ].map((stat, i) => (
                      <motion.div 
                        key={i}
                        variants={itemVariants}
                        className="bg-white dark:bg-[#141414] p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <p className="text-[9px] font-black text-black/30 dark:text-white/30 uppercase tracking-[0.15em] mb-1.5">{stat.label}</p>
                        <div className="flex items-end justify-between flex-wrap gap-1">
                          <motion.h3 
                            key={stat.value}
                            initial={{ opacity: 0.5, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-lg md:text-xl font-black tracking-tighter"
                          >
                            {stat.value}
                          </motion.h3>
                          {stat.trend ? (
                            <div className={cn(
                              "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase",
                              data.analysis.trend === 'Bullish' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : 
                              data.analysis.trend === 'Bearish' ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-400"
                            )}>
                              {stat.sub}
                            </div>
                          ) : stat.indicator ? (
                            <div className={cn(
                              "text-[8px] font-black px-1 py-0.5 rounded",
                              data.currentPrice > data.ma5 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500"
                            )}>
                              {stat.sub}
                            </div>
                          ) : stat.sub && (
                            <span className={cn(
                              "text-[10px] font-bold flex items-center",
                              stat.gain === true ? "text-emerald-600 dark:text-emerald-500" : stat.gain === false ? "text-red-600 dark:text-red-500" : "text-black/40 dark:text-white/40"
                            )}>
                              {stat.gain === true && <ArrowUpRight className="w-2.5 h-2.5" />}
                              {stat.gain === false && <ArrowDownRight className="w-2.5 h-2.5" />}
                              {stat.sub}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Chart Section */}
                  <div className="bg-white dark:bg-[#141414] p-5 md:p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-lg tracking-tight">Price Performance</h4>
                        <p className="text-[10px] font-medium text-black/30 dark:text-white/30">30-Day Historical Trend & Moving Average</p>
                      </div>
                      <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest flex-wrap shrink-0 text-black/60 dark:text-white/60">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Price</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <span>MA5</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-0.5 bg-black/40 dark:bg-white/40 border-t border-dashed border-black dark:border-white" />
                          <span>Entry</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[300px] md:h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                          <XAxis 
                            dataKey="displayDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 800, fill: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                            dy={10}
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            domain={['auto', 'auto']} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 800, fill: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                            tickFormatter={(val) => formatCurrency(val, currency)}
                          />
                          <Tooltip 
                            cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                            contentStyle={{ 
                              backgroundColor: theme === 'dark' ? '#141414' : '#fff', 
                              borderRadius: '20px', 
                              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ fontSize: '11px', fontWeight: '800', padding: '2px 0', color: theme === 'dark' ? '#fff' : '#000' }}
                            labelStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', letterSpacing: '0.1em', marginBottom: '8px' }}
                          />
                          {parseFloat(avgPrice) !== 0 && (
                            <ReferenceLine 
                              y={parseFloat(avgPrice)} 
                              stroke={theme === 'dark' ? "#fff" : "#000"} 
                              strokeDasharray="6 6" 
                              strokeOpacity={0.2}
                              label={{ position: 'right', value: 'ENTRY', fill: theme === 'dark' ? '#fff' : '#000', fontSize: 9, fontWeight: 900, opacity: 0.3 }}
                            />
                          )}
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#10b981" 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                            animationDuration={2000}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="ma5" 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            dot={false} 
                            strokeDasharray="4 4"
                            animationDuration={2500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Market Sentiment & Intelligence Dashboard */}
                  <div className="bg-white dark:bg-[#141414] p-5 md:p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Newspaper className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-lg tracking-tight">Market Sentiment & News Intelligence</h4>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                              Live
                            </span>
                          </div>
                          <p className="text-[10px] font-medium text-black/40 dark:text-white/40">Multi-source news sentiment analytics & quantitative scoring</p>
                        </div>
                      </div>

                      {/* Overall Sentiment Indicator Pill */}
                      {data.overallSentiment && (
                        <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
                          <div className="text-right">
                            <p className="text-[8px] font-black uppercase tracking-widest text-black/30 dark:text-white/30">Overall Index</p>
                            <p className="text-xs font-black">{data.overallSentiment.label}</p>
                          </div>
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-sm",
                            data.overallSentiment.score >= 70 ? "bg-emerald-600" :
                            data.overallSentiment.score >= 55 ? "bg-emerald-500" :
                            data.overallSentiment.score >= 40 ? "bg-amber-500" : "bg-red-500"
                          )}>
                            {data.overallSentiment.score}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Overall Sentiment Distribution Meter */}
                    {data.overallSentiment && (
                      <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#0D0D0D] border border-black/5 dark:border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-black/50 dark:text-white/50 text-[10px] uppercase font-black tracking-widest">Sentiment Distribution</span>
                          <div className="flex items-center gap-4 text-[10px] font-black">
                            <span className="text-emerald-600 dark:text-emerald-400">Bullish {data.overallSentiment.bullishPercent}%</span>
                            <span className="text-amber-600 dark:text-amber-400">Neutral {data.overallSentiment.neutralPercent}%</span>
                            <span className="text-red-600 dark:text-red-400">Bearish {data.overallSentiment.bearishPercent}%</span>
                          </div>
                        </div>

                        {/* Stacked Sentiment Meter Bar */}
                        <div className="h-2.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden flex">
                          <div 
                            style={{ width: `${data.overallSentiment.bullishPercent}%` }} 
                            className="bg-emerald-500 h-full transition-all duration-700" 
                            title={`Bullish: ${data.overallSentiment.bullishPercent}%`}
                          />
                          <div 
                            style={{ width: `${data.overallSentiment.neutralPercent}%` }} 
                            className="bg-amber-400 h-full transition-all duration-700" 
                            title={`Neutral: ${data.overallSentiment.neutralPercent}%`}
                          />
                          <div 
                            style={{ width: `${data.overallSentiment.bearishPercent}%` }} 
                            className="bg-red-500 h-full transition-all duration-700" 
                            title={`Bearish: ${data.overallSentiment.bearishPercent}%`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sentiment Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                      {(['all', 'bullish', 'neutral', 'bearish'] as const).map(tab => {
                        const count = tab === 'all' 
                          ? data.news.length 
                          : tab === 'bullish' 
                            ? data.news.filter(n => n.sentiment === 'very_positive' || n.sentiment === 'positive').length
                            : tab === 'neutral'
                              ? data.news.filter(n => n.sentiment === 'neutral').length
                              : data.news.filter(n => n.sentiment === 'negative' || n.sentiment === 'very_negative').length;

                        return (
                          <button
                            key={tab}
                            onClick={() => setSentimentFilter(tab)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5",
                              sentimentFilter === tab 
                                ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" 
                                : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10"
                            )}
                          >
                            <span>{tab === 'all' ? 'All Sentiments' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded-md text-[8px]",
                              sentimentFilter === tab ? "bg-white/20 dark:bg-black/20 text-white dark:text-black" : "bg-black/10 dark:bg-white/10"
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* News & Sentiment Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {data.news
                        .filter(item => {
                          if (sentimentFilter === 'all') return true;
                          if (sentimentFilter === 'bullish') return item.sentiment === 'very_positive' || item.sentiment === 'positive';
                          if (sentimentFilter === 'neutral') return item.sentiment === 'neutral';
                          if (sentimentFilter === 'bearish') return item.sentiment === 'negative' || item.sentiment === 'very_negative';
                          return true;
                        })
                        .map((item, i) => {
                          const getSentimentBadge = (sentiment: typeof item.sentiment) => {
                            switch (sentiment) {
                              case 'very_positive':
                                return {
                                  label: '🚀 Very Bullish',
                                  className: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black font-extrabold'
                                };
                              case 'positive':
                                return {
                                  label: '📈 Bullish',
                                  className: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                                };
                              case 'neutral':
                                return {
                                  label: '⚡ Neutral / Mixed',
                                  className: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold'
                                };
                              case 'negative':
                                return {
                                  label: '📉 Bearish',
                                  className: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-bold'
                                };
                              case 'very_negative':
                                return {
                                  label: '🚨 Crash Risk',
                                  className: 'bg-red-600 text-white dark:bg-red-500 dark:text-white font-extrabold'
                                };
                              default:
                                return {
                                  label: 'Neutral',
                                  className: 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                };
                            }
                          };

                          const badge = getSentimentBadge(item.sentiment);

                          return (
                            <motion.a 
                              key={i} 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              whileHover={{ y: -3 }}
                              className="p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/40 hover:bg-emerald-50/10 dark:hover:bg-emerald-500/5 transition-all group flex flex-col justify-between space-y-3"
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider", badge.className)}>
                                      {badge.label}
                                    </span>
                                    {item.category && (
                                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
                                        {item.category}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 text-[9px] font-black text-black/30 dark:text-white/30">
                                    {item.score !== undefined && (
                                      <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded text-black/70 dark:text-white/70">
                                        Score: {item.score}
                                      </span>
                                    )}
                                    <ArrowUpRight className="w-3.5 h-3.5 text-black/20 dark:text-white/20 group-hover:text-emerald-500 transition-colors shrink-0" />
                                  </div>
                                </div>

                                <p className="text-xs font-bold leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors break-words">
                                  {item.title}
                                </p>

                                {item.summary && (
                                  <p className="text-[11px] font-medium text-black/60 dark:text-white/60 line-clamp-2 leading-relaxed">
                                    {item.summary}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 pt-2 border-t border-black/5 dark:border-white/5">
                                <span>{item.source || 'Market Intelligence'}</span>
                                <span>{item.timestamp || 'Recent'}</span>
                              </div>
                            </motion.a>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Sidebar Analysis - Moved Up */}
                <motion.div variants={itemVariants} className="space-y-5">
                  {/* Recommendation Card */}
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "p-6 md:p-8 rounded-[2rem] border shadow-xl relative overflow-hidden transition-all duration-500",
                      data.recommendation.action === 'Buy More' ? "bg-emerald-600 border-emerald-500 text-white" :
                      data.recommendation.action === 'Sell' ? "bg-red-600 border-red-500 text-white" : "bg-white dark:bg-[#141414] border-black/5 dark:border-white/5"
                    )}
                  >
                    <div className="relative z-10 min-w-0">
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-[0.25em] mb-2 opacity-60",
                        data.recommendation.action === 'Hold' ? "text-black/40 dark:text-white/40" : "text-white/70"
                      )}>
                        AI Intelligence
                      </p>
                      <h3 className="text-3xl md:text-4xl font-black mb-3 tracking-tighter">{data.recommendation.action}</h3>
                      
                      <div className={cn(
                        "mb-6 p-4 rounded-xl border",
                        data.recommendation.action === 'Hold' ? "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5" : "bg-white/10 border-white/20"
                      )}>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest mb-0.5 opacity-60">Ideal Entry</p>
                            <p className="text-sm font-black tracking-tight">{formatCurrency(data.recommendation.idealEntryPrice, currency)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest mb-0.5 opacity-60">Stop Loss (-5%)</p>
                            <p className="text-sm font-black tracking-tight text-red-500">{formatCurrency(data.recommendation.stopLoss, currency)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest mb-0.5 opacity-60">Take Profit</p>
                            <p className="text-sm font-black tracking-tight text-emerald-500">{formatCurrency(data.recommendation.profitTarget, currency)}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 mb-3 pt-3 border-t border-white/10">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest mb-0.5 opacity-60">Risk/Reward</p>
                            <p className="text-sm font-black tracking-tight">1:{data.recommendation.riskRewardRatio.toFixed(1)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[8px] font-black uppercase tracking-widest mb-0.5 opacity-60">Position Size</p>
                            <p className="text-xs font-bold tracking-tight opacity-90">{data.recommendation.positionSizing}</p>
                          </div>
                        </div>

                        <p className="text-[11px] font-medium opacity-80 leading-relaxed border-t border-white/10 pt-2.5">{data.recommendation.entryExplanation}</p>
                      </div>
                      
                      <ul className="space-y-3">
                        {data.recommendation.reasons.map((reason, i) => (
                          <motion.li 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            key={i} 
                            className="flex gap-3 text-xs font-bold leading-relaxed break-words"
                          >
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                              data.recommendation.action === 'Hold' ? "bg-emerald-500" : "bg-white/30"
                            )} />
                            <span className="flex-1">{reason}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>

                  {/* Dividend Event Notice */}
                  {(data.dividendYield ?? 0) > 0 && (
                    <motion.div 
                      variants={itemVariants} 
                      className="bg-white dark:bg-[#141414] p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg tracking-tight">Dividend Event</h4>
                            <p className="text-[10px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest">Upcoming Schedule</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                            <span className="text-[10px] font-black text-black/40 dark:text-white/40 uppercase tracking-wider">Amount</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-500">{formatCurrency(data.dividendAmount || 0, currency)}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-2xl border border-black/5 dark:border-white/5">
                              <p className="text-[8px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Ex-Dividend</p>
                              <p className="text-xs font-black">{data.exDividendDate ? new Date(data.exDividendDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}</p>
                            </div>
                            <div className="p-3 rounded-2xl border border-black/5 dark:border-white/5">
                              <p className="text-[8px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Payment Date</p>
                              <p className="text-xs font-black">{data.paymentDate ? new Date(data.paymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Technical Analysis Details */}
                  <div className="bg-white dark:bg-[#141414] p-6 md:p-7 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm space-y-6">
                    <div className="min-w-0">
                      <h4 className="font-black text-[9px] uppercase tracking-[0.15em] text-black/30 dark:text-white/30 mb-5 flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                        Technical Profile
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest mb-0.5">Trend Analysis</p>
                          <p className="text-xs font-bold leading-relaxed">{data.analysis.trendExplanation}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-[#F5F5F5] dark:bg-[#0A0A0A] rounded-xl">
                            <p className="text-[8px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest mb-0.5">Support</p>
                            <p className="text-xs font-black">{formatCurrency(data.analysis.support, currency)}</p>
                          </div>
                          <div className="p-3 bg-[#F5F5F5] dark:bg-[#0A0A0A] rounded-xl">
                            <p className="text-[8px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest mb-0.5">Resistance</p>
                            <p className="text-xs font-black">{formatCurrency(data.analysis.resistance, currency)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest mb-0.5">Volume Insight</p>
                          <p className="text-xs font-bold leading-relaxed">{data.analysis.volumeInsight}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest mb-0.5">Momentum</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${data.analysis.momentumStrength}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className={cn(
                                  "h-full rounded-full",
                                  data.analysis.momentumStrength > 70 ? "bg-emerald-500" :
                                  data.analysis.momentumStrength > 40 ? "bg-amber-400" : "bg-red-500"
                                )}
                              />
                            </div>
                            <span className="text-[10px] font-black">{data.analysis.momentumStrength}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live FX Exchange Rate & Currency Converter */}
                  <FxExchangeRate selectedCurrency={currency} onCurrencySelect={setCurrency} />
                </motion.div>
              </div>

              {/* Historical Data Table Section */}
              <motion.div 
                variants={itemVariants}
                className="mt-8 bg-white dark:bg-[#141414] rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm overflow-hidden"
              >
                <div className="p-8 md:p-10 border-b border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                      </div>
                      <h3 className="font-black text-2xl tracking-tight">Historical Data</h3>
                    </div>
                    <p className="text-[10px] font-black text-black/30 dark:text-white/30 uppercase tracking-[0.2em]">Raw Market Records (Last 30 Days)</p>
                  </div>

                  {showHistoryTable && (
                    <div className="relative group max-w-xs w-full">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 dark:text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Filter by date, price or volume..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                {!showHistoryTable ? (
                  <div className="p-8 md:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] dark:bg-white/5 flex items-center justify-center mb-6">
                      <BarChart3 className="w-8 h-8 text-black/40 dark:text-white/40" />
                    </div>
                    <h4 className="font-black text-lg mb-2">30-Day Market Records</h4>
                    <p className="text-sm font-bold text-black/50 dark:text-white/50 mb-6 leading-relaxed">
                      View the exact raw daily closing prices and trading volumes for deeper trend analysis and checking precise support levels.
                    </p>
                    <button
                      onClick={() => setShowHistoryTable(true)}
                      className="px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md hover:shadow-black/10 dark:hover:shadow-white/10"
                    >
                      Show Historical Data
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5">
                          <th 
                            onClick={() => handleSort('date')}
                            className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 cursor-pointer hover:text-emerald-500 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              Date
                              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronUp className={cn("w-2.5 h-2.5 -mb-1", sortConfig.key === 'date' && sortConfig.direction === 'asc' && "text-emerald-500 opacity-100")} />
                                <ChevronDown className={cn("w-2.5 h-2.5", sortConfig.key === 'date' && sortConfig.direction === 'desc' && "text-emerald-500 opacity-100")} />
                              </div>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('price')}
                            className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 cursor-pointer hover:text-emerald-500 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              Price
                              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronUp className={cn("w-2.5 h-2.5 -mb-1", sortConfig.key === 'price' && sortConfig.direction === 'asc' && "text-emerald-500 opacity-100")} />
                                <ChevronDown className={cn("w-2.5 h-2.5", sortConfig.key === 'price' && sortConfig.direction === 'desc' && "text-emerald-500 opacity-100")} />
                              </div>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('volume')}
                            className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 cursor-pointer hover:text-emerald-500 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              Volume
                              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronUp className={cn("w-2.5 h-2.5 -mb-1", sortConfig.key === 'volume' && sortConfig.direction === 'asc' && "text-emerald-500 opacity-100")} />
                                <ChevronDown className={cn("w-2.5 h-2.5", sortConfig.key === 'volume' && sortConfig.direction === 'desc' && "text-emerald-500 opacity-100")} />
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {sortedAndFilteredHistory.length > 0 ? (
                          sortedAndFilteredHistory.map((item, index) => (
                            <tr key={index} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                              <td className="px-8 py-4 text-sm font-bold opacity-80 group-hover:opacity-100">
                                {new Date(item.date).toLocaleDateString(undefined, { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </td>
                              <td className="px-8 py-4 text-sm font-black text-emerald-600 dark:text-emerald-500">
                                {formatCurrency(item.price, currency)}
                              </td>
                              <td className="px-8 py-4 text-sm font-mono opacity-60 group-hover:opacity-100">
                                {item.volume.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-8 py-12 text-center">
                              <div className="flex flex-col items-center gap-3 opacity-30">
                                <Filter className="w-8 h-8" />
                                <p className="text-sm font-bold">No records found matching your filter.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="p-6 border-t border-black/5 dark:border-white/5 flex justify-center bg-black/[0.01] dark:bg-white/[0.01]">
                      <button
                        onClick={() => setShowHistoryTable(false)}
                        className="px-5 py-3 bg-[#F5F5F5] dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Collapse Table
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
