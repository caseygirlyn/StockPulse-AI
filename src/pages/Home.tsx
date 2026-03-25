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
  Trash2
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
import { cn, formatCurrency } from '../utils';
import { usePortfolio } from '../context/PortfolioContext';

export default function Home() {
  const [searchParams] = useSearchParams();
  const { savedPositions, savePosition, deletePosition } = usePortfolio();
  
  const [ticker, setTicker] = useState('');
  const [avgPrice, setAvgPrice] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockData | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent, overridePos?: { ticker: string, avgPrice: string, shares: string, currency: string }) => {
    e.preventDefault();
    const currentTicker = overridePos?.ticker || ticker;
    const currentAvgPrice = overridePos?.avgPrice || avgPrice;
    const currentCurrency = overridePos?.currency || currency;

    if (!currentTicker || !currentAvgPrice) return;

    setLoading(true);
    setError(null);
    setLoadingStep(0);
    
    // Simulate progress for better UX
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const result = await analyzeStock(currentTicker.toUpperCase(), parseFloat(currentAvgPrice), currentCurrency);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ticker || !avgPrice) return;
    await savePosition(ticker, avgPrice, shares, currency);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
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
    return ((current - avg) / avg) * 100;
  }, [data, avgPrice]);

  const portfolioStats = useMemo(() => {
    if (!data || !avgPrice || !shares) return null;
    const current = data.currentPrice;
    const avg = parseFloat(avgPrice);
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

  // Real-time polling
  useEffect(() => {
    if (!data || loading) return;

    const pollInterval = setInterval(async () => {
      const isDataSaver = localStorage.getItem('data_saver_mode') === 'true';
      if (document.hidden || !data || loading || isDataSaver) return;
      
      setIsUpdating(true);
      try {
        const { currentPrice } = await getLatestPrice(data.ticker, currency);
        
        setData(prev => {
          if (!prev) return null;
          
          const newData = { ...prev, currentPrice };
          const today = new Date().toISOString().split('T')[0];
          const history = [...prev.dailyHistory];
          const lastEntry = history[history.length - 1];
          
          if (lastEntry && lastEntry.date.startsWith(today)) {
            history[history.length - 1] = { ...lastEntry, price: currentPrice };
            newData.dailyHistory = history;
          }
          
          return newData;
        });
        setLastUpdated(new Date());
      } catch (err: any) {
        if (err?.status === 429 || err?.message?.includes('quota')) {
          console.warn("Polling paused: Quota exceeded");
        } else {
          console.error("Failed to poll price:", err);
        }
      } finally {
        setIsUpdating(false);
      }
    }, 900000);

    return () => clearInterval(pollInterval);
  }, [data?.ticker, currency, loading]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!data && !loading && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-4xl mx-auto py-20"
            >
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 mb-8 shadow-sm">
                  <BarChart3 className="w-10 h-10" />
                </div>
                <h2 className="text-5xl font-black tracking-tight mb-6 leading-tight">Professional Grade <br/>Stock Intelligence</h2>
                <p className="text-black/60 text-xl max-w-lg mx-auto">Connect your portfolio data to get institutional-level technical analysis and real-time news sentiment.</p>
              </div>
              
              <div className="flex justify-center">
                <form onSubmit={(e) => handleSubmit(e)} className="w-full max-w-xl bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-2xl space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-black/40">New Analysis</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-1">Ticker Symbol</label>
                      <input 
                        type="text" 
                        placeholder="e.g. NVDA" 
                        className="w-full bg-[#F5F5F5] border border-black/5 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold uppercase"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-1">Avg Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        className="w-full bg-[#F5F5F5] border border-black/5 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold"
                        value={avgPrice}
                        onChange={(e) => setAvgPrice(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-1">Number of Shares (Optional)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        placeholder="e.g. 10" 
                        className="w-full bg-[#F5F5F5] border border-black/5 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-1">Currency</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-[#F5F5F5] border border-black/5 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-emerald-600 shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 text-lg"
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
            </motion.div>
          )}

        {error && (
          <div className="max-w-md mx-auto bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 items-start">
            <AlertCircle className="text-red-600 w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900">Analysis Failed</h4>
              <p className="text-red-700 text-sm">{error}</p>
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
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter flex items-center gap-3">
                    {data.ticker}
                    <span className="text-sm font-bold text-black/20 uppercase tracking-widest hidden sm:inline">Analysis Report</span>
                  </h2>
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shrink-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isUpdating ? "bg-emerald-400 animate-ping" : "bg-emerald-500"
                    )} />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
                    <span className="text-[10px] font-bold text-emerald-600/60 ml-1">
                      {format(lastUpdated, 'HH:mm:ss')}
                    </span>
                  </div>
                </div>
                  <div className="relative flex items-center gap-3">
                    <AnimatePresence>
                      {showSaveSuccess && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="absolute right-full mr-3 whitespace-nowrap bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm"
                        >
                          Successfully saved
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button 
                      onClick={() => setData(null)}
                      className="bg-white border border-black/5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm"
                    >
                      New Analysis
                    </button>
                    <button 
                      onClick={handleSave}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Save className="w-3 h-3" />
                      Save Position
                    </button>
                  </div>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Current Price', value: formatCurrency(data.currentPrice, currency), sub: `${unrealizedGainLoss >= 0 ? '+' : ''}${unrealizedGainLoss.toFixed(2)}%`, gain: unrealizedGainLoss >= 0 },
                  ...(portfolioStats ? [{ 
                    label: 'Portfolio Value', 
                    value: formatCurrency(portfolioStats.marketValue, currency), 
                    sub: `${portfolioStats.profit >= 0 ? '+' : ''}${formatCurrency(portfolioStats.profit, currency)}`,
                    gain: portfolioStats.profit >= 0
                  }] : []),
                  { label: 'Stock Trend', value: data.ticker, sub: data.analysis.trend, trend: true },
                  { label: 'MA5 Indicator', value: formatCurrency(data.ma5, currency), sub: data.currentPrice > data.ma5 ? 'ABOVE' : 'BELOW', indicator: true },
                  { label: 'Avg Purchase', value: formatCurrency(parseFloat(avgPrice), currency), sub: 'Entry Point' },
                  ...(data.marketCap ? [{ label: 'Market Cap', value: data.marketCap, sub: 'Valuation' }] : []),
                  ...(data.peRatio ? [{ label: 'P/E Ratio', value: data.peRatio.toFixed(2), sub: 'Earnings' }] : []),
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    variants={itemVariants}
                    className="bg-white p-5 md:p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                    <div className="flex items-end justify-between flex-wrap gap-1">
                      <motion.h3 
                        key={stat.value}
                        initial={{ opacity: 0.5, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl md:text-2xl xl:text-3xl font-black tracking-tighter"
                      >
                        {stat.value}
                      </motion.h3>
                      {stat.trend ? (
                        <div className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase",
                          data.analysis.trend === 'Bullish' ? "bg-emerald-100 text-emerald-700" : 
                          data.analysis.trend === 'Bearish' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                        )}>
                          {stat.sub}
                        </div>
                      ) : stat.indicator ? (
                        <div className={cn(
                          "text-[10px] font-black px-1.5 py-0.5 rounded",
                          data.currentPrice > data.ma5 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          {stat.sub}
                        </div>
                      ) : stat.sub && (
                        <span className={cn(
                          "text-xs font-bold flex items-center",
                          stat.gain === true ? "text-emerald-600" : stat.gain === false ? "text-red-600" : "text-black/40"
                        )}>
                          {stat.gain === true && <ArrowUpRight className="w-3 h-3" />}
                          {stat.gain === false && <ArrowDownRight className="w-3 h-3" />}
                          {stat.sub}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                  {/* Chart Section */}
                  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-xl tracking-tight">Price Performance</h4>
                        <p className="text-xs font-medium text-black/30">30-Day Historical Trend & Moving Average</p>
                      </div>
                      <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest flex-wrap shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Price</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <span>MA5</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-0.5 bg-black/40 border-t border-dashed border-black" />
                          <span>Entry</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[350px] md:h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000005" />
                          <XAxis 
                            dataKey="displayDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 800, fill: '#00000030' }}
                            dy={10}
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            domain={['auto', 'auto']} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 800, fill: '#00000030' }}
                            tickFormatter={(val) => formatCurrency(val, currency)}
                          />
                          <Tooltip 
                            cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              borderRadius: '20px', 
                              border: 'none',
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ fontSize: '11px', fontWeight: '800', padding: '2px 0' }}
                            labelStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: '#00000030', letterSpacing: '0.1em', marginBottom: '8px' }}
                          />
                          <ReferenceLine 
                            y={parseFloat(avgPrice)} 
                            stroke="#000" 
                            strokeDasharray="6 6" 
                            strokeOpacity={0.2}
                            label={{ position: 'right', value: 'ENTRY', fill: '#000', fontSize: 9, fontWeight: 900, opacity: 0.3 }}
                          />
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

                  {/* News Section */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center">
                          <Newspaper className="w-5 h-5 text-black/60" />
                        </div>
                        <h4 className="font-black text-xl tracking-tight">Market Sentiment</h4>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.news.map((item, i) => (
                        <motion.a 
                          key={i} 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          whileHover={{ y: -4 }}
                          className="p-5 rounded-3xl border border-black/5 hover:border-emerald-500/20 hover:bg-emerald-50/10 transition-all group flex flex-col justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between mb-3">
                              <span className={cn(
                                "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest",
                                item.sentiment === 'positive' ? "bg-emerald-100 text-emerald-700" :
                                item.sentiment === 'negative' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                              )}>
                                {item.sentiment}
                              </span>
                              <ArrowUpRight className="w-4 h-4 text-black/10 group-hover:text-emerald-500 transition-colors shrink-0" />
                            </div>
                            <p className="text-sm font-bold leading-snug line-clamp-3 group-hover:text-emerald-900 transition-colors break-words">{item.title}</p>
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Sidebar Analysis */}
                <motion.div variants={itemVariants} className="space-y-6">
                  {/* Recommendation Card */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "p-8 md:p-10 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-500",
                      data.recommendation.action === 'Buy More' ? "bg-emerald-600 border-emerald-500 text-white" :
                      data.recommendation.action === 'Sell' ? "bg-red-600 border-red-500 text-white" : "bg-white border-black/5 text-black"
                    )}
                  >
                    <div className="relative z-10 min-w-0">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-60",
                        data.recommendation.action === 'Hold' ? "text-black/40" : "text-white/70"
                      )}>
                        AI Intelligence
                      </p>
                      <h3 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">{data.recommendation.action}</h3>
                      
                      <div className={cn(
                        "mb-8 p-4 rounded-2xl border",
                        data.recommendation.action === 'Hold' ? "bg-black/5 border-black/5" : "bg-white/10 border-white/20"
                      )}>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Ideal Entry</p>
                            <p className="text-lg font-black tracking-tight">{formatCurrency(data.recommendation.idealEntryPrice, currency)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Stop Loss</p>
                            <p className="text-lg font-black tracking-tight text-red-500">{formatCurrency(data.recommendation.stopLoss, currency)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Take Profit</p>
                            <p className="text-lg font-black tracking-tight text-emerald-500">{formatCurrency(data.recommendation.profitTarget, currency)}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-white/10">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Risk/Reward</p>
                            <p className="text-lg font-black tracking-tight">1:{data.recommendation.riskRewardRatio.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Position Size</p>
                            <p className="text-sm font-bold tracking-tight opacity-90">{data.recommendation.positionSizing}</p>
                          </div>
                        </div>

                        <p className="text-xs font-medium opacity-80 leading-relaxed border-t border-white/10 pt-3">{data.recommendation.entryExplanation}</p>
                      </div>
                      
                      <ul className="space-y-4">
                        {data.recommendation.reasons.map((reason, i) => (
                          <motion.li 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            key={i} 
                            className="flex gap-4 text-sm font-bold leading-relaxed break-words"
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              data.recommendation.action === 'Hold' ? "bg-emerald-500" : "bg-white/30"
                            )} />
                            <span className="flex-1">{reason}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>

                  {/* Technical Analysis Details */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-8">
                    <div className="min-w-0">
                      <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-black/30 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 shrink-0" />
                        Technical Profile
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1">Trend Analysis</p>
                          <p className="text-sm font-bold leading-relaxed">{data.analysis.trendExplanation}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-[#F5F5F5] rounded-2xl">
                            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest mb-1">Support</p>
                            <p className="text-sm font-black">{formatCurrency(data.analysis.support, currency)}</p>
                          </div>
                          <div className="p-4 bg-[#F5F5F5] rounded-2xl">
                            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest mb-1">Resistance</p>
                            <p className="text-sm font-black">{formatCurrency(data.analysis.resistance, currency)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1">Volume Insight</p>
                          <p className="text-sm font-bold leading-relaxed">{data.analysis.volumeInsight}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1">Momentum</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
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
                            <span className="text-xs font-black">{data.analysis.momentumStrength}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
