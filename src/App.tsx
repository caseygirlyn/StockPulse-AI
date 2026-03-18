/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  ChevronRight
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
import { analyzeStock, getLatestPrice, type StockData } from './services/geminiService';
import { cn, formatCurrency } from './utils';

export default function App() {
  const [ticker, setTicker] = useState('');
  const [avgPrice, setAvgPrice] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockData | null>(null);

  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Identifying stock ticker...",
    "Retrieving 30-day market data...",
    "Calculating technical indicators...",
    "Analyzing recent news sentiment...",
    "Generating final recommendation..."
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !avgPrice) return;

    setLoading(true);
    setError(null);
    setLoadingStep(0);
    
    // Simulate progress for better UX
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const result = await analyzeStock(ticker.toUpperCase(), parseFloat(avgPrice), currency);
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
    return data.dailyHistory.map((item, index) => {
      // Calculate MA5 for each point if not provided in history
      // (Gemini returns ma5 as a single value, but for the chart we might want a moving line)
      // For simplicity, we'll use the provided history and calculate a rolling MA5
      const slice = data.dailyHistory.slice(Math.max(0, index - 4), index + 1);
      const ma5 = slice.reduce((sum, curr) => sum + curr.price, 0) / slice.length;
      
      return {
        ...item,
        displayDate: format(parseISO(item.date), 'MMM dd'),
        ma5: index >= 4 ? ma5 : null,
      };
    });
  }, [data]);

  // Real-time polling
  React.useEffect(() => {
    if (!data || loading) return;

    const pollInterval = setInterval(async () => {
      setIsUpdating(true);
      try {
        const { currentPrice } = await getLatestPrice(data.ticker, currency);
        
        setData(prev => {
          if (!prev) return null;
          
          // Update current price
          const newData = { ...prev, currentPrice };
          
          // Optionally update the last entry in dailyHistory if it's today
          const today = new Date().toISOString().split('T')[0];
          const history = [...prev.dailyHistory];
          const lastEntry = history[history.length - 1];
          
          if (lastEntry && lastEntry.date.startsWith(today)) {
            history[history.length - 1] = { ...lastEntry, price: currentPrice };
            newData.dailyHistory = history;
          } else if (lastEntry && lastEntry.date < today) {
            // If it's a new day, we could push a new entry, but for simplicity we'll just update currentPrice
            // and let the next full refresh handle the history structure
          }
          
          return newData;
        });
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to poll price:", err);
      } finally {
        setIsUpdating(false);
      }
    }, 60000); // Poll every 60 seconds

    return () => clearInterval(pollInterval);
  }, [data?.ticker, currency, loading]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">StockPulse <span className="text-emerald-600">AI</span></h1>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-full px-3 py-1 border border-black/5">
              <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Currency</span>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <form onSubmit={handleSubmit} className="hidden md:flex items-center gap-2 bg-[#F5F5F5] rounded-full px-4 py-1.5 border border-black/5 focus-within:border-emerald-500/50 transition-all shadow-inner">
            <Search className="w-4 h-4 text-black/40" />
            <input 
              type="text" 
              placeholder="Ticker" 
              className="bg-transparent border-none outline-none text-sm w-20 uppercase font-medium placeholder:text-black/20"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              required
            />
            <div className="w-px h-4 bg-black/10 mx-1" />
            <input 
              type="number" 
              step="0.01"
              placeholder="Avg Price" 
              className="bg-transparent border-none outline-none text-sm w-24 font-medium placeholder:text-black/20"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'ANALYZE'}
            </button>
          </form>
          </div>

          {data && !loading && (
            <button 
              onClick={() => setData(null)}
              className="md:hidden p-2 text-black/40 hover:text-black"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!data && !loading && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-2xl mx-auto text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 mb-8 shadow-sm">
                <BarChart3 className="w-10 h-10" />
              </div>
              <h2 className="text-5xl font-black tracking-tight mb-6 leading-tight">Professional Grade <br/>Stock Intelligence</h2>
              <p className="text-black/60 text-xl mb-12 max-w-lg mx-auto">Connect your portfolio data to get institutional-level technical analysis and real-time news sentiment.</p>
              
              <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-1">Ticker Symbol</label>
                  <input 
                    type="text" 
                    placeholder="e.g. NVDA" 
                    className="w-full bg-white border border-black/5 shadow-sm rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold uppercase"
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
                    className="w-full bg-white border border-black/5 shadow-sm rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold"
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
                  className="w-full bg-white border border-black/5 shadow-sm rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                />
              </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-emerald-600 shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 text-lg"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Generate Report'}
                </button>
              </form>
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
                <button 
                  onClick={() => setData(null)}
                  className="bg-white border border-black/5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm"
                >
                  New Analysis
                </button>
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
                      <h3 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter">{data.recommendation.action}</h3>
                      
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
                    {/* Decorative Background Icon */}
                    <div className="absolute -bottom-8 -right-8 opacity-10 rotate-12">
                      {data.recommendation.action === 'Buy More' ? <TrendingUp size={240} /> : 
                       data.recommendation.action === 'Sell' ? <TrendingDown size={240} /> : <Minus size={240} />}
                    </div>
                  </motion.div>

                  {/* Technical Analysis Details */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-8">
                    <div className="min-w-0">
                      <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-black/30 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 shrink-0" />
                        Technical Profile
                      </h4>
                      <div className="space-y-5">
                        <div className="bg-[#F5F5F5] p-5 rounded-3xl">
                          <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">Trend Context</p>
                          <p className="text-sm font-bold leading-relaxed text-black/80 break-words">{data.analysis.trendExplanation}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#F5F5F5] p-5 rounded-3xl">
                            <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1">Support</p>
                            <p className="font-black text-lg md:text-xl tracking-tight">{formatCurrency(data.analysis.support, currency)}</p>
                          </div>
                          <div className="bg-[#F5F5F5] p-5 rounded-3xl">
                            <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1">Resistance</p>
                            <p className="font-black text-lg md:text-xl tracking-tight">{formatCurrency(data.analysis.resistance, currency)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-black/5 min-w-0">
                      <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-black/30 mb-6 flex items-center gap-2">
                        <Info className="w-4 h-4 shrink-0" />
                        Market Dynamics
                      </h4>
                      <div className="space-y-6">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">Momentum Strength</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden shrink-0">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: data.analysis.momentumStrength.toLowerCase().includes('strong') ? '90%' : data.analysis.momentumStrength.toLowerCase().includes('moderate') ? '60%' : '30%' }}
                                className={cn(
                                  "h-full rounded-full",
                                  data.analysis.momentumStrength.toLowerCase().includes('strong') ? "bg-emerald-500" : "bg-amber-500"
                                )}
                              />
                            </div>
                            <p className="text-xs font-black text-black/80">{data.analysis.momentumStrength}</p>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">Volume Insight</p>
                          <p className="text-sm font-bold leading-relaxed text-black/80 break-words">{data.analysis.volumeInsight}</p>
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

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-black/5 mt-12 text-center">
        <p className="text-xs font-bold text-black/20 uppercase tracking-[0.3em]">
          Powered by Gemini 3.1 Pro & Real-time Market Data
        </p>
        <p className="text-[10px] text-black/20 mt-2 max-w-md mx-auto">
          Financial analysis provided by AI is for informational purposes only. Always consult with a professional financial advisor before making investment decisions.
        </p>
      </footer>
    </div>
  );
}
