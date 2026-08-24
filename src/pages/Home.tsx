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
  Filter,
  Shield,
  ShieldAlert,
  Target,
  Lock,
  Crosshair,
  PieChart,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ChevronRight,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { analyzeStock, getLatestPrice, type StockData } from '../services/geminiService';
import { 
  fetchPortfolio, 
  savePortfolioPosition, 
  getLocalPortfolio, 
  type PortfolioPosition 
} from '../services/portfolioService';
import MultiCurrencyValuation from '../components/MultiCurrencyValuation';
import StockPriceChart from '../components/StockPriceChart';
import { cn, formatCurrency } from '../utils';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const [savedPortfolio, setSavedPortfolio] = useState<PortfolioPosition[]>([]);
  const [justSavedNotification, setJustSavedNotification] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'price' | 'volume'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [filterQuery, setFilterQuery] = useState('');
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish' | 'neutral' | 'bearish'>('all');

  // Load saved portfolio positions
  useEffect(() => {
    const loadSaved = () => {
      const local = getLocalPortfolio();
      setSavedPortfolio(local);
      fetchPortfolio().then(setSavedPortfolio).catch(() => {});
    };

    loadSaved();
    window.addEventListener('portfolio_updated', loadSaved);
    return () => window.removeEventListener('portfolio_updated', loadSaved);
  }, []);

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

  // Handle ticker change and autofill saved average price if known
  const handleTickerChange = (val: string) => {
    setTicker(val);
    const clean = val.trim().toUpperCase();
    const matched = savedPortfolio.find(p => p.ticker.toUpperCase() === clean);
    if (matched) {
      if (!avgPrice || avgPrice === '0') {
        setAvgPrice(matched.avgPrice.toString());
      }
      if (matched.shares && !shares) {
        setShares(matched.shares.toString());
      }
      if (matched.currency) {
        setCurrency(matched.currency);
      }
    }
  };

  // Quick load from portfolio position
  const handleSelectPortfolioPosition = (pos: PortfolioPosition) => {
    setTicker(pos.ticker);
    setAvgPrice(pos.avgPrice.toString());
    setShares(pos.shares ? pos.shares.toString() : '');
    setCurrency(pos.currency || 'USD');

    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent, {
      ticker: pos.ticker,
      avgPrice: pos.avgPrice.toString(),
      shares: pos.shares ? pos.shares.toString() : '',
      currency: pos.currency || 'USD'
    });
  };

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
      const canonicalDate = result.canonicalTimestamp || result.marketTimestamp || result.lastUpdated;
      setLastUpdated(canonicalDate ? new Date(canonicalDate) : new Date());

      // Automatically store/update this stock and average price in Portfolio
      const numAvg = parseFloat(currentAvgPrice);
      if (!isNaN(numAvg) && numAvg > 0) {
        savePortfolioPosition({
          ticker: result.ticker.toUpperCase(),
          avgPrice: numAvg,
          shares: (overridePos?.shares || shares) ? parseFloat(overridePos?.shares || shares) : undefined,
          currency: currentCurrency,
          exchange: result.exchange,
          lastAnalyzedPrice: result.currentPrice,
          currentPrice: result.currentPrice,
          previousClose: result.previousClose,
          priceChange: result.priceChange,
          priceChangePercent: result.priceChangePercent,
          trend: result.analysis.trend,
          recommendationAction: result.recommendation.action,
          ma5: result.ma5,
          avwapAthPrice: result.avwapAth?.avwapPrice,
          dividendYield: result.dividendYield,
          dividendRate: result.dividendRate,
          dividendAmount: result.dividendAmount,
          exDividendDate: result.exDividendDate,
          paymentDate: result.paymentDate,
          idealEntry: result.recommendation.idealEntryPrice,
          stopLoss: result.recommendation.stopLoss,
          takeProfit: result.recommendation.profitTarget,
          logoUrl: result.logoUrl,
          date: new Date().toISOString()
        }).then(() => {
          setJustSavedNotification(true);
          setTimeout(() => setJustSavedNotification(false), 4000);
        }).catch(err => {
          console.warn('Portfolio auto-save error:', err);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (forceRefresh: boolean = true) => {
    if (!data || isUpdating) return;
    setIsUpdating(true);
    try {
      const latest = await getLatestPrice(data.ticker, currency, forceRefresh);
      const canonicalIso = latest.canonicalTimestamp || latest.marketTimestamp || latest.lastUpdated || new Date().toISOString();

      setData(prev => {
        if (!prev) return null;
        const updatedData = { 
          ...prev, 
          currentPrice: latest.currentPrice,
          previousClose: latest.previousClose ?? prev.previousClose,
          priceChange: latest.priceChange ?? prev.priceChange,
          priceChangePercent: latest.priceChangePercent ?? prev.priceChangePercent,
          priceSource: latest.priceSource ?? prev.priceSource,
          exchange: latest.exchange ?? prev.exchange,
          exchangeTimezone: latest.exchangeTimezone ?? prev.exchangeTimezone,
          marketTimestamp: latest.marketTimestamp ?? canonicalIso,
          canonicalTimestamp: canonicalIso,
          lastUpdated: canonicalIso
        };

        const today = new Date(canonicalIso).toISOString().split('T')[0];
        const history = [...prev.dailyHistory];
        const lastEntry = history[history.length - 1];
        
        if (lastEntry && lastEntry.date.startsWith(today)) {
          history[history.length - 1] = { ...lastEntry, price: latest.currentPrice };
          updatedData.dailyHistory = history;
        }
        
        return updatedData;
      });
      
      setLastUpdated(new Date(canonicalIso));
    } catch (err) {
      console.error("Price update failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === currency) return;
    setCurrency(newCurrency);
    if (data) {
      setLoading(true);
      setError(null);
      try {
        const result = await analyzeStock(data.ticker, parseFloat(avgPrice || '0'), newCurrency, false);
        setData(result);
        const canonicalDate = result.canonicalTimestamp || result.marketTimestamp || result.lastUpdated;
        setLastUpdated(canonicalDate ? new Date(canonicalDate) : new Date());
      } catch (err) {
        console.error("Currency switch error:", err);
      } finally {
        setLoading(false);
      }
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
        avwapAth: item.avwapAth ?? null,
      };
    });
  }, [data]);

  // Real-time polling for latest stock price from canonical feed
  useEffect(() => {
    if (!data || loading) return;

    const pollInterval = setInterval(async () => {
      const isDataSaver = localStorage.getItem('data_saver_mode') === 'true';
      if (document.hidden || !data || loading || isDataSaver) return;
      await handleUpdatePrice(true);
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
                  <div className="grid grid-cols-2 gap-3 md:gap-4 items-start">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                          Ticker Symbol
                        </label>
                        {savedPortfolio.some(p => p.ticker.toUpperCase() === ticker.trim().toUpperCase()) && (
                          <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Saved
                          </span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g. NVDA" 
                        className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 md:px-5 outline-none focus:border-emerald-500 transition-all font-bold uppercase text-sm"
                        value={ticker}
                        onChange={(e) => handleTickerChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                          Avg Price ({currency})
                        </label>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 md:px-5 outline-none focus:border-emerald-500 transition-all font-bold text-sm font-mono"
                        value={avgPrice}
                        onChange={(e) => setAvgPrice(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4 items-start">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                          Shares (Optional)
                        </label>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g. 10" 
                        className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 md:px-5 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                          Currency
                        </label>
                      </div>
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 md:px-5 outline-none focus:border-emerald-500 transition-all font-bold cursor-pointer text-sm"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-black dark:bg-white text-white dark:text-black font-black py-3.5 md:py-4 rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xl transition-all flex items-center justify-center gap-3 text-sm md:text-base cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Generate Report'}
                  </button>
                </form>
              </div>

              {/* Quick Load Saved Portfolio Stocks */}
              {savedPortfolio.length > 0 && (
                <div className="mt-8 max-w-xl mx-auto">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Quick Load Stored Stocks ({savedPortfolio.length})
                      </span>
                    </div>
                    <Link 
                      to="/portfolio" 
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>Manage Portfolio</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {savedPortfolio.map((pos) => {
                      const cur = pos.currency || 'USD';
                      const pnl = pos.currentPrice ? ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100 : null;
                      return (
                        <button
                          key={pos.ticker}
                          type="button"
                          onClick={() => handleSelectPortfolioPosition(pos)}
                          className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 hover:border-emerald-500/50 p-3 rounded-2xl text-left transition-all hover:shadow-md flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center font-black text-xs group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors">
                              {pos.ticker.slice(0, 3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-sm tracking-tight">{pos.ticker}</span>
                                {pos.shares && (
                                  <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">
                                    {pos.shares} sh
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-black/50 dark:text-white/50 font-medium">
                                Stored Avg: <span className="font-bold text-black/70 dark:text-white/70">{formatCurrency(pos.avgPrice, cur)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            {pnl !== null && (
                              <span className={cn(
                                "text-[11px] font-black font-mono px-2 py-0.5 rounded-lg",
                                pnl >= 0 
                                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                  : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              )}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-black/20 dark:text-white/20 group-hover:text-emerald-500 transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                      {data.exchange ? `${data.exchange} Live` : 'Live'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-500/60 ml-1">
                      {format(lastUpdated, 'HH:mm:ss')}
                    </span>
                    <button 
                      onClick={() => handleUpdatePrice(true)}
                      disabled={isUpdating}
                      className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-full transition-colors group ml-0.5"
                      title="Refresh Canonical Price"
                    >
                      <RefreshCw className={cn("w-2.5 h-2.5 text-emerald-600/40 dark:text-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-500", isUpdating && "animate-spin")} />
                    </button>
                  </div>
                </div>
                  <div className="relative flex items-center gap-2 md:gap-3">
                    {justSavedNotification && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl border border-emerald-500/20"
                      >
                        <Check className="w-3 h-3" /> Stored in Portfolio
                      </motion.span>
                    )}
                    <Link
                      to="/portfolio"
                      className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 p-2 md:px-3 md:py-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-sm flex items-center gap-1.5"
                      title="View all saved positions"
                    >
                      <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      <span className="hidden sm:inline text-[10px]">Portfolio</span>
                    </Link>
                    <button 
                      onClick={() => handleUpdatePrice(true)}
                      disabled={isUpdating}
                      className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 p-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      title="Refresh Canonical Price"
                    >
                      <RefreshCw className={cn("w-4 h-4 text-emerald-600 dark:text-emerald-500", isUpdating && "animate-spin")} />
                      <span className="hidden sm:inline text-[10px]">Refresh</span>
                    </button>
                    <button 
                      onClick={() => setData(null)}
                      className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 px-3 md:px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-sm cursor-pointer"
                    >
                      New
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
                      ...(data.avwapAth ? [{
                        label: 'ATH Anchored VWAP',
                        value: formatCurrency(data.avwapAth.avwapPrice, currency),
                        sub: `${data.avwapAth.diffPercent >= 0 ? '+' : ''}${data.avwapAth.diffPercent}% (${data.avwapAth.status.toUpperCase()})`,
                        gain: data.avwapAth.status === 'above'
                      }] : []),
                      ...(data.priceSource ? [{ label: 'Canonical Feed', value: data.exchange || 'Live Feed', sub: 'Verified Quote', badge: true }] : []),
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
                          {stat.badge ? (
                            <div className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {stat.sub}
                            </div>
                          ) : stat.trend ? (
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
                  <StockPriceChart 
                    data={data}
                    chartData={chartData}
                    avgPrice={avgPrice}
                    currency={currency}
                    lastUpdated={lastUpdated}
                  />

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
                  {(() => {
                    const currentPx = data.currentPrice || 0;
                    const stopLossVal = data.recommendation.stopLoss;
                    const takeProfitVal = data.recommendation.profitTarget;
                    const stopLossDistance = currentPx > 0 ? ((stopLossVal - currentPx) / currentPx) * 100 : -5;
                    const takeProfitDistance = currentPx > 0 ? ((takeProfitVal - currentPx) / currentPx) * 100 : 10;

                    return (
                      <motion.div 
                        whileHover={{ scale: 1.005 }}
                        className="bg-white dark:bg-[#141414] p-6 md:p-7 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm space-y-5 relative overflow-hidden"
                      >
                        {/* Header & Action Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40 flex items-center gap-1.5 mb-1">
                              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              AI Intelligence
                            </p>
                            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-black dark:text-white">
                              {data.recommendation.action}
                            </h3>
                          </div>
                          <div className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 shrink-0",
                            data.recommendation.action === 'Buy More' ? "bg-emerald-600 text-white" :
                            data.recommendation.action === 'Sell' ? "bg-rose-600 text-white" :
                            "bg-amber-500 text-white"
                          )}>
                            {data.recommendation.action === 'Buy More' && <TrendingUp className="w-3.5 h-3.5" />}
                            {data.recommendation.action === 'Sell' && <TrendingDown className="w-3.5 h-3.5" />}
                            {data.recommendation.action === 'Hold' && <Minus className="w-3.5 h-3.5" />}
                            <span>{data.recommendation.action}</span>
                          </div>
                        </div>

                        {/* Stop Loss & Take Profit Target Cards (High Contrast & Clear Readability) */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Take Profit Target */}
                          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/90 dark:border-emerald-500/30 text-left space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                <Target className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Take Profit
                              </span>
                              <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300">
                                +{takeProfitDistance >= 0 ? takeProfitDistance.toFixed(1) : ''}%
                              </span>
                            </div>
                            <p className="text-base md:text-lg font-black font-mono tracking-tight text-emerald-950 dark:text-emerald-100">
                              {formatCurrency(takeProfitVal, currency)}
                            </p>
                            <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
                              Upside Target
                            </p>
                          </div>

                          {/* Stop Loss Target */}
                          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/90 dark:border-rose-500/30 text-left space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                Stop Loss
                              </span>
                              <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded bg-rose-200/80 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300">
                                {stopLossDistance.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-base md:text-lg font-black font-mono tracking-tight text-rose-950 dark:text-rose-100">
                              {formatCurrency(stopLossVal, currency)}
                            </p>
                            <p className="text-[8px] font-bold uppercase tracking-wider text-rose-700/80 dark:text-rose-400/80">
                              Capital Guard
                            </p>
                          </div>
                        </div>

                        {/* Entry Zone & Risk/Reward Metrics */}
                        <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#0D0D0D] border border-black/5 dark:border-white/5 space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-left">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 flex items-center gap-1">
                                <Crosshair className="w-2.5 h-2.5 text-blue-500" /> Entry Zone
                              </p>
                              <p className="text-xs font-black font-mono text-black dark:text-white mt-0.5">
                                {formatCurrency(data.recommendation.idealEntryPrice, currency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                                Risk/Reward
                              </p>
                              <p className="text-xs font-black font-mono text-black dark:text-white mt-0.5">
                                1:{data.recommendation.riskRewardRatio.toFixed(1)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                                Position Size
                              </p>
                              <p className="text-xs font-bold text-black/80 dark:text-white/80 mt-0.5 truncate">
                                {data.recommendation.positionSizing}
                              </p>
                            </div>
                          </div>

                          {/* Entry Explanation Note */}
                          {data.recommendation.entryExplanation && (
                            <p className="text-[11px] font-medium text-black/70 dark:text-white/70 leading-relaxed border-t border-black/5 dark:border-white/5 pt-2.5">
                              {data.recommendation.entryExplanation}
                            </p>
                          )}
                        </div>

                        {/* AI Thesis Key Reasons */}
                        <div className="space-y-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                            Key Catalysts & Thesis
                          </p>
                          <ul className="space-y-2">
                            {data.recommendation.reasons.map((reason, i) => (
                              <motion.li 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + (i * 0.08) }}
                                key={i} 
                                className="flex items-start gap-2.5 text-xs font-medium leading-relaxed text-black/80 dark:text-white/80 bg-black/[0.02] dark:bg-white/[0.02] p-2.5 rounded-xl border border-black/5 dark:border-white/5"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <span className="flex-1">{reason}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    );
                  })()}

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
                        {/* Connected Support / Entry / Resistance Channel */}
                        <div className="p-3.5 bg-[#F5F5F5] dark:bg-[#0A0A0A] rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-black/40 dark:text-white/40 uppercase tracking-widest flex items-center gap-1">
                              <Crosshair className="w-3 h-3 text-indigo-500" />
                              Key Technical Corridor
                            </span>
                            {data.analysis.resistance > data.analysis.support && (
                              <span className="text-[8px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                Span: {formatCurrency(data.analysis.resistance - data.analysis.support, currency)}
                              </span>
                            )}
                          </div>

                          {/* Visual Connected Track */}
                          {data.analysis.resistance > data.analysis.support && (
                            <div className="relative pt-3 pb-2 px-1">
                              <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-purple-500 to-indigo-500 opacity-20 dark:opacity-30 relative" />
                              
                              {/* Current Price Pin */}
                              {(() => {
                                const span = data.analysis.resistance - data.analysis.support;
                                const pos = Math.min(100, Math.max(0, ((data.currentPrice - data.analysis.support) / span) * 100));
                                return (
                                  <div 
                                    className="absolute top-1.5 -translate-x-1/2 flex flex-col items-center z-10"
                                    style={{ left: `${pos}%` }}
                                  >
                                    <div className="w-3.5 h-3.5 rounded-full bg-black dark:bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center" />
                                    <span className="text-[7px] font-black font-mono mt-0.5 whitespace-nowrap bg-black dark:bg-white text-white dark:text-black px-1 rounded">
                                      {pos.toFixed(0)}%
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                            <div className="p-2 rounded-xl bg-white dark:bg-[#141414] border border-emerald-500/20">
                              <p className="text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" />
                                Support Floor
                              </p>
                              <p className="text-xs font-black font-mono">{formatCurrency(data.analysis.support, currency)}</p>
                            </div>
                            <div className="p-2 rounded-xl bg-white dark:bg-[#141414] border border-indigo-500/20">
                              <p className="text-[8px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Resistance
                              </p>
                              <p className="text-xs font-black font-mono">{formatCurrency(data.analysis.resistance, currency)}</p>
                            </div>
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

                  {/* Multi-Currency Valuation & Global FX Pricing */}
                  <MultiCurrencyValuation 
                    currentPrice={data.currentPrice}
                    activeCurrency={currency}
                    shares={shares ? parseFloat(shares) : undefined}
                    ticker={data.ticker}
                    onCurrencyChange={handleCurrencyChange}
                  />
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
