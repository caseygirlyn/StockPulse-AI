import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ChevronRight, 
  Trash2, 
  History, 
  BarChart3, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils';
import { getBatchPrices } from '../services/geminiService';

export default function Portfolio() {
  const { savedPositions, deletePosition } = usePortfolio();
  const navigate = useNavigate();
  const [currentPrices, setCurrentPrices] = React.useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [quotaExceeded, setQuotaExceeded] = React.useState(false);
  const [dataSaver, setDataSaver] = React.useState(() => {
    return localStorage.getItem('data_saver_mode') === 'true';
  });

  const toggleDataSaver = () => {
    const newValue = !dataSaver;
    setDataSaver(newValue);
    localStorage.setItem('data_saver_mode', String(newValue));
  };

  const fetchAllPrices = React.useCallback(async () => {
    if (savedPositions.length === 0 || document.hidden) return;
    setIsRefreshing(true);
    setQuotaExceeded(false);
    try {
      const tickers = savedPositions.map(p => p.ticker);
      const prices = await getBatchPrices(tickers, savedPositions[0]?.currency || 'USD');
      
      // Check if we got all prices
      const receivedTickers = Object.keys(prices);
      if (receivedTickers.length < tickers.length && receivedTickers.length > 0) {
        setQuotaExceeded(true);
      } else if (receivedTickers.length === 0 && tickers.length > 0) {
        setQuotaExceeded(true);
      }

      // Merge new prices with existing ones to avoid losing data if some fail
      setCurrentPrices(prev => ({ ...prev, ...prices }));
      if (receivedTickers.length > 0) {
        setLastUpdated(new Date());
      }
    } catch (e: any) {
      console.error("Failed to refresh prices", e);
      if (e?.message?.includes('quota') || e?.status === 429) {
        setQuotaExceeded(true);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [savedPositions]);

  React.useEffect(() => {
    fetchAllPrices();
    
    // Set up 15-minute auto-refresh (900,000 ms) for quota optimization
    const interval = setInterval(() => {
      if (!dataSaver) {
        fetchAllPrices();
      }
    }, 900000);

    return () => clearInterval(interval);
  }, [fetchAllPrices, dataSaver]);

  const totalInvested = savedPositions.reduce((acc, pos) => {
    return acc + (parseFloat(pos.avgPrice) * parseFloat(pos.shares || '0'));
  }, 0);

  const totalCurrentValue = savedPositions.reduce((acc, pos) => {
    const currentPrice = currentPrices[pos.ticker] || parseFloat(pos.avgPrice);
    return acc + (currentPrice * parseFloat(pos.shares || '0'));
  }, 0);

  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const handleLoadPosition = (ticker: string, avgPrice: string, shares: string, currency: string) => {
    navigate(`/?ticker=${ticker}&avgPrice=${avgPrice}&shares=${shares}&currency=${currency}`);
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

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                <History className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter">My Portfolio</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-black/40 text-lg font-medium">Manage your saved positions and track performance.</p>
              {lastUpdated && (
                <span className="text-xs font-mono bg-black/5 px-2 py-1 rounded-full text-black/60">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={toggleDataSaver}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  dataSaver 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-black/5 text-black/40 border border-transparent hover:border-black/10'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${dataSaver ? 'bg-emerald-500 animate-pulse' : 'bg-black/20'}`} />
                Data Saver: {dataSaver ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllPrices()}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
                isRefreshing 
                ? 'bg-black/5 text-black/20 cursor-not-allowed' 
                : 'bg-white text-black border-2 border-black hover:bg-black hover:text-white shadow-sm hover:shadow-xl'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-emerald-200/50"
            >
              <Plus className="w-5 h-5" />
              New Analysis
            </button>
          </div>
        </motion.div>

        {quotaExceeded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center gap-4 text-amber-900"
          >
            <div className="w-10 h-10 bg-amber-200 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">API Quota Reached</p>
              <p className="text-sm opacity-80">We're using cached data to save your Gemini API quota. Real-time updates will resume shortly.</p>
            </div>
          </motion.div>
        )}

        {savedPositions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] shadow-sm">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">Total Market Value</p>
              <h2 className="text-4xl font-black tracking-tighter">
                {formatCurrency(totalCurrentValue, savedPositions[0]?.currency || 'USD')}
              </h2>
            </div>
            <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] shadow-sm">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">Total Cost Basis</p>
              <h2 className="text-4xl font-black tracking-tighter text-black/60">
                {formatCurrency(totalInvested, savedPositions[0]?.currency || 'USD')}
              </h2>
            </div>
            <div className={`bg-white border border-black/5 p-8 rounded-[2.5rem] shadow-sm ${totalProfitLoss >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
              <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">Total Profit / Loss</p>
              <div className="flex items-baseline gap-3">
                <h2 className={`text-4xl font-black tracking-tighter ${totalProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss, savedPositions[0]?.currency || 'USD')}
                </h2>
                <span className={`text-sm font-black ${totalProfitLoss >= 0 ? 'text-emerald-600/60' : 'text-red-600/60'}`}>
                  ({totalProfitLossPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {savedPositions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-dashed border-black/10 rounded-[3rem] p-20 text-center"
          >
            <div className="w-20 h-20 bg-black/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-black/20" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">No positions saved yet</h2>
            <p className="text-black/40 mb-8">Start by analyzing a stock and saving it to your portfolio.</p>
            <button 
              onClick={() => navigate('/')}
              className="text-emerald-600 font-black uppercase tracking-widest text-xs hover:underline"
            >
              Analyze your first stock
            </button>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {savedPositions.map((pos) => {
              const currentPrice = currentPrices[pos.ticker] || parseFloat(pos.avgPrice);
              const costBasis = parseFloat(pos.avgPrice) * parseFloat(pos.shares || '0');
              const marketValue = currentPrice * parseFloat(pos.shares || '0');
              const profitLoss = marketValue - costBasis;
              const profitLossPercentage = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

              return (
                <motion.div
                  key={pos.ticker}
                  variants={itemVariants}
                  onClick={() => handleLoadPosition(pos.ticker, pos.avgPrice, pos.shares, pos.currency)}
                  className="group bg-white border border-black/5 p-8 rounded-[2.5rem] hover:border-emerald-500/30 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePosition(pos.ticker);
                      }}
                      className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-colors">
                      <span className="text-white font-black text-lg">{pos.ticker.slice(0, 2)}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter">{pos.ticker}</h3>
                      <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">
                        {pos.currency} • Added {new Date(pos.lastAnalyzed).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Avg Price</p>
                      <p className="text-xl font-black tracking-tight">{formatCurrency(parseFloat(pos.avgPrice), pos.currency)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Current Price</p>
                      <p className={`text-xl font-black tracking-tight ${currentPrice > parseFloat(pos.avgPrice) ? 'text-emerald-600' : currentPrice < parseFloat(pos.avgPrice) ? 'text-red-600' : ''}`}>
                        {formatCurrency(currentPrice, pos.currency)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Shares</p>
                      <p className="text-xl font-black tracking-tight">{pos.shares || '0'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Profit/Loss</p>
                      <p className={`text-xl font-black tracking-tight ${profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {profitLoss >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Analyze Live</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black/10 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
}
