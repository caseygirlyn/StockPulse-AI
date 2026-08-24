import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  BarChart2, 
  DollarSign, 
  PieChart, 
  Shield, 
  Anchor, 
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  fetchPortfolio, 
  savePortfolioPosition, 
  deletePortfolioPosition, 
  type PortfolioPosition 
} from '../services/portfolioService';
import { getBatchPrices } from '../services/geminiService';
import { cn, formatCurrency } from '../utils';

export default function Portfolio() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'gainers' | 'losers' | 'bullish' | 'bearish'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'gain' | 'ticker' | 'value'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states for adding/editing a position
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [formTicker, setFormTicker] = useState('');
  const [formAvgPrice, setFormAvgPrice] = useState('');
  const [formShares, setFormShares] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savingPosition, setSavingPosition] = useState(false);

  // Delete confirmation modal state
  const [deleteConfirmTicker, setDeleteConfirmTicker] = useState<string | null>(null);

  // Load portfolio positions on mount
  const loadPortfolioData = async () => {
    try {
      const data = await fetchPortfolio();
      setPositions(data);
    } catch (e) {
      console.error('Failed to load portfolio:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();

    // Listen to background updates
    const handleUpdate = () => {
      loadPortfolioData();
    };
    window.addEventListener('portfolio_updated', handleUpdate);
    return () => window.removeEventListener('portfolio_updated', handleUpdate);
  }, []);

  // Batch refresh live prices for all portfolio items
  const handleRefreshAllPrices = async () => {
    if (positions.length === 0 || refreshing) return;
    setRefreshing(true);

    try {
      const tickers = positions.map(p => p.ticker);
      const pricesMap = await getBatchPrices(tickers, 'USD', true);

      // Update positions with fresh prices
      const updated = positions.map(pos => {
        const freshPrice = pricesMap[pos.ticker.toUpperCase()];
        if (freshPrice !== undefined) {
          const diff = pos.avgPrice > 0 ? ((freshPrice - pos.avgPrice) / pos.avgPrice) * 100 : undefined;
          return {
            ...pos,
            currentPrice: freshPrice,
            priceChangePercent: diff !== undefined ? parseFloat(diff.toFixed(2)) : pos.priceChangePercent,
            date: new Date().toISOString()
          };
        }
        return pos;
      });

      setPositions(updated);
    } catch (e) {
      console.error('Error refreshing prices:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Open modal for new position
  const handleOpenAddModal = () => {
    setEditingTicker(null);
    setFormTicker('');
    setFormAvgPrice('');
    setFormShares('');
    setFormCurrency('USD');
    setFormNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  // Open modal to edit existing position
  const handleOpenEditModal = (pos: PortfolioPosition) => {
    setEditingTicker(pos.ticker);
    setFormTicker(pos.ticker);
    setFormAvgPrice(pos.avgPrice.toString());
    setFormShares(pos.shares ? pos.shares.toString() : '');
    setFormCurrency(pos.currency || 'USD');
    setFormNotes(pos.notes || '');
    setFormError(null);
    setModalOpen(true);
  };

  // Submit position save / edit
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTicker.trim()) {
      setFormError('Please enter a valid ticker symbol');
      return;
    }
    const numAvg = parseFloat(formAvgPrice);
    if (isNaN(numAvg) || numAvg <= 0) {
      setFormError('Please enter a valid average purchase price');
      return;
    }

    setSavingPosition(true);
    setFormError(null);

    try {
      const cleanTicker = formTicker.trim().toUpperCase();
      const existing = positions.find(p => p.ticker.toUpperCase() === cleanTicker);

      const saved = await savePortfolioPosition({
        ticker: cleanTicker,
        avgPrice: numAvg,
        shares: formShares ? parseFloat(formShares) : undefined,
        currency: formCurrency,
        notes: formNotes.trim() || undefined,
        currentPrice: existing?.currentPrice,
        trend: existing?.trend,
        recommendationAction: existing?.recommendationAction,
        ma5: existing?.ma5,
        avwapAthPrice: existing?.avwapAthPrice,
        dividendYield: existing?.dividendYield,
        logoUrl: existing?.logoUrl
      });

      setPositions(prev => {
        const idx = prev.findIndex(p => p.ticker.toUpperCase() === cleanTicker);
        if (idx > -1) {
          const clone = [...prev];
          clone[idx] = saved;
          return clone;
        }
        return [saved, ...prev];
      });

      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save position');
    } finally {
      setSavingPosition(false);
    }
  };

  // Delete position
  const handleDeletePosition = async (ticker: string) => {
    await deletePortfolioPosition(ticker);
    setPositions(prev => prev.filter(p => p.ticker.toUpperCase() !== ticker.toUpperCase()));
    setDeleteConfirmTicker(null);
  };

  // Navigate to full analysis page with stored average price
  const handleAnalyzeStock = (pos: PortfolioPosition) => {
    const params = new URLSearchParams({
      ticker: pos.ticker,
      avgPrice: pos.avgPrice.toString(),
      currency: pos.currency || 'USD',
      ...(pos.shares ? { shares: pos.shares.toString() } : {})
    });
    navigate(`/?${params.toString()}`);
  };

  // Calculations for Portfolio Stats
  const portfolioSummary = useMemo(() => {
    let totalCostBasis = 0;
    let totalMarketValue = 0;
    let validHoldingsWithShares = 0;
    let totalPnl = 0;
    let bestGainer: { ticker: string; gainPercent: number } | null = null;
    let worstLoser: { ticker: string; gainPercent: number } | null = null;

    positions.forEach(pos => {
      const effectivePrice = pos.currentPrice || pos.lastAnalyzedPrice || pos.avgPrice;
      const gainPercent = pos.avgPrice > 0 ? ((effectivePrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;

      if (!bestGainer || gainPercent > bestGainer.gainPercent) {
        bestGainer = { ticker: pos.ticker, gainPercent };
      }
      if (!worstLoser || gainPercent < worstLoser.gainPercent) {
        worstLoser = { ticker: pos.ticker, gainPercent };
      }

      if (pos.shares && pos.shares > 0) {
        validHoldingsWithShares++;
        const cost = pos.avgPrice * pos.shares;
        const val = effectivePrice * pos.shares;
        totalCostBasis += cost;
        totalMarketValue += val;
      }
    });

    totalPnl = totalMarketValue - totalCostBasis;
    const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

    return {
      totalPositions: positions.length,
      validHoldingsWithShares,
      totalCostBasis,
      totalMarketValue,
      totalPnl,
      totalPnlPercent,
      bestGainer,
      worstLoser
    };
  }, [positions]);

  // Filtered & Sorted Positions
  const filteredPositions = useMemo(() => {
    return positions.filter(pos => {
      const matchesSearch = 
        pos.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pos.name && pos.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pos.notes && pos.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      const effectivePrice = pos.currentPrice || pos.lastAnalyzedPrice || pos.avgPrice;
      const gainPercent = pos.avgPrice > 0 ? ((effectivePrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;

      if (filterType === 'gainers') return gainPercent > 0;
      if (filterType === 'losers') return gainPercent < 0;
      if (filterType === 'bullish') return pos.trend === 'Bullish' || pos.recommendationAction === 'Buy More';
      if (filterType === 'bearish') return pos.trend === 'Bearish' || pos.recommendationAction === 'Sell';

      return true;
    }).sort((a, b) => {
      const priceA = a.currentPrice || a.lastAnalyzedPrice || a.avgPrice;
      const priceB = b.currentPrice || b.lastAnalyzedPrice || b.avgPrice;
      const gainA = a.avgPrice > 0 ? ((priceA - a.avgPrice) / a.avgPrice) * 100 : 0;
      const gainB = b.avgPrice > 0 ? ((priceB - b.avgPrice) / b.avgPrice) * 100 : 0;
      const valA = (a.shares || 0) * priceA;
      const valB = (b.shares || 0) * priceB;

      if (sortBy === 'gain') return gainB - gainA;
      if (sortBy === 'value') return valB - valA;
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      // default: newest date
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });
  }, [positions, searchQuery, filterType, sortBy]);

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-100 transition-colors duration-300">
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* Header Title & Top Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 flex items-center justify-center shadow-sm">
                <PieChart className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Saved Stock Portfolio</h1>
            </div>
            <p className="text-black/50 dark:text-white/50 text-xs md:text-sm font-medium">
              Your tracked stocks and saved average cost bases. Re-analyze any position with 1 click without re-entering your purchase price.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefreshAllPrices}
              disabled={refreshing || positions.length === 0}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Refresh live prices for all positions"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500", refreshing && "animate-spin")} />
              <span>{refreshing ? 'Updating...' : 'Update Live Prices'}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Position</span>
            </button>
          </div>
        </div>

        {/* Portfolio Summary Overview Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white dark:bg-[#141414] p-4 md:p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              Tracked Positions
            </span>
            <div className="text-xl md:text-2xl font-black tracking-tight">
              {portfolioSummary.totalPositions} <span className="text-xs font-bold text-black/40 dark:text-white/40">Stocks</span>
            </div>
            <p className="text-[10px] text-black/40 dark:text-white/40 font-medium">
              {portfolioSummary.validHoldingsWithShares} with share quantities
            </p>
          </div>

          <div className="bg-white dark:bg-[#141414] p-4 md:p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              Total Portfolio Value
            </span>
            <div className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white">
              {portfolioSummary.totalMarketValue > 0 
                ? formatCurrency(portfolioSummary.totalMarketValue, 'USD')
                : (positions.length > 0 ? `${positions.length} Monitored` : '$0.00')}
            </div>
            <p className="text-[10px] text-black/40 dark:text-white/40 font-medium">
              Cost basis: {portfolioSummary.totalCostBasis > 0 ? formatCurrency(portfolioSummary.totalCostBasis, 'USD') : 'N/A'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#141414] p-4 md:p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              Unrealized Profit / Loss
            </span>
            <div className={cn(
              "text-xl md:text-2xl font-black tracking-tight flex items-center gap-1",
              portfolioSummary.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            )}>
              {portfolioSummary.totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {portfolioSummary.totalCostBasis > 0 
                ? `${portfolioSummary.totalPnl >= 0 ? '+' : ''}${formatCurrency(portfolioSummary.totalPnl, 'USD')}`
                : `${portfolioSummary.bestGainer ? `${portfolioSummary.bestGainer.gainPercent >= 0 ? '+' : ''}${portfolioSummary.bestGainer.gainPercent.toFixed(1)}%` : '0.00%'}`}
            </div>
            <p className={cn(
              "text-[10px] font-black font-mono",
              portfolioSummary.totalPnlPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            )}>
              {portfolioSummary.totalCostBasis > 0 ? `${portfolioSummary.totalPnlPercent >= 0 ? '+' : ''}${portfolioSummary.totalPnlPercent.toFixed(2)}% Overall` : 'Tracking Cost Basis'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#141414] p-4 md:p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              Top Gainer
            </span>
            {portfolioSummary.bestGainer ? (
              <>
                <div className="text-xl md:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>{portfolioSummary.bestGainer.ticker}</span>
                  <span className="text-sm font-mono font-bold">
                    {portfolioSummary.bestGainer.gainPercent >= 0 ? '+' : ''}{portfolioSummary.bestGainer.gainPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-black/40 dark:text-white/40 font-medium">Best performing cost basis</p>
              </>
            ) : (
              <div className="text-sm font-bold text-black/40 dark:text-white/40 pt-1">
                No active positions
              </div>
            )}
          </div>
        </div>

        {/* Search, Filters & View Switcher Bar */}
        <div className="bg-white dark:bg-[#141414] p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" />
              <input 
                type="text"
                placeholder="Search by ticker, name or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:border-emerald-500 transition-all uppercase"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {(['all', 'gainers', 'losers', 'bullish', 'bearish'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    filterType === tab
                      ? "bg-black dark:bg-white text-white dark:text-black shadow-xs"
                      : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10"
                  )}
                >
                  {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] font-black uppercase text-black/30 dark:text-white/30">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="date">Analyzed Date</option>
                <option value="gain">Profit / Loss %</option>
                <option value="value">Position Value</option>
                <option value="ticker">Ticker (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center bg-[#F5F5F5] dark:bg-[#0A0A0A] p-0.5 rounded-xl border border-black/5 dark:border-white/5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-white dark:bg-[#1A1A1A] shadow-xs text-black dark:text-white" : "text-black/40 dark:text-white/40"
                )}
                title="Grid View"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  viewMode === 'table' ? "bg-white dark:bg-[#1A1A1A] shadow-xs text-black dark:text-white" : "text-black/40 dark:text-white/40"
                )}
                title="Table View"
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section: Positions Grid / Table */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-black/40 dark:text-white/40">Loading your portfolio...</p>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="bg-white dark:bg-[#141414] p-10 md:p-16 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm text-center max-w-2xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                {searchQuery || filterType !== 'all' ? 'No Matching Positions' : 'Your Portfolio is Empty'}
              </h3>
              <p className="text-xs md:text-sm text-black/50 dark:text-white/50 leading-relaxed max-w-md mx-auto">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search query or filters to find what you are looking for.' 
                  : 'Stocks you analyze with your average purchase price will automatically be remembered here. You can also add stocks directly!'}
              </p>
            </div>

            {searchQuery || filterType !== 'all' ? (
              <button
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleOpenAddModal}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  + Add Your First Stock
                </button>
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Analyze a New Stock
                </Link>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPositions.map((pos) => {
              const currentPrice = pos.currentPrice || pos.lastAnalyzedPrice || pos.avgPrice;
              const gainPercent = pos.avgPrice > 0 ? ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;
              const isProfit = gainPercent >= 0;
              const totalCost = (pos.shares || 0) * pos.avgPrice;
              const totalVal = (pos.shares || 0) * currentPrice;
              const totalGainDollar = totalVal - totalCost;

              return (
                <motion.div
                  key={pos.ticker}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-[#141414] rounded-2xl border border-black/5 dark:border-white/5 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group relative"
                >
                  {/* Top Row: Ticker Logo, Name, Badges & Actions */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-black dark:bg-white rounded-xl flex items-center justify-center font-black text-white dark:text-black text-sm tracking-tight shadow-xs shrink-0">
                          {pos.ticker.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-lg tracking-tight">{pos.ticker}</h3>
                            {pos.currency && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 font-mono">
                                {pos.currency}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-medium text-black/40 dark:text-white/40">
                            {pos.exchange || 'Canonical Feed'}
                          </p>
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal(pos)}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer"
                          title="Edit Cost Basis & Shares"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTicker(pos.ticker)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove from Portfolio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price & P/L Row */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#0E0E0E] border border-black/5 dark:border-white/5 mb-3">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block mb-0.5">
                          Your Cost Basis
                        </span>
                        <div className="text-sm font-black font-mono text-black dark:text-white">
                          {formatCurrency(pos.avgPrice, pos.currency || 'USD')}
                        </div>
                        {pos.shares && pos.shares > 0 && (
                          <span className="text-[9px] font-bold text-black/40 dark:text-white/40">
                            {pos.shares} {pos.shares === 1 ? 'share' : 'shares'}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block mb-0.5">
                          Current Price
                        </span>
                        <div className="text-sm font-black font-mono">
                          {formatCurrency(currentPrice, pos.currency || 'USD')}
                        </div>
                        <div className={cn(
                          "text-[10px] font-black font-mono flex items-center justify-end gap-0.5",
                          isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                        )}>
                          {isProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isProfit ? '+' : ''}{gainPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Extended Position Value if shares specified */}
                    {pos.shares && pos.shares > 0 && (
                      <div className="flex items-center justify-between text-xs px-1 py-0.5 mb-2 font-mono">
                        <span className="text-[9px] font-black uppercase text-black/40 dark:text-white/40">Holding Value:</span>
                        <div className="text-right">
                          <span className="font-black text-black dark:text-white">
                            {formatCurrency(totalVal, pos.currency || 'USD')}
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold ml-1.5",
                            totalGainDollar >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                          )}>
                            ({totalGainDollar >= 0 ? '+' : ''}{formatCurrency(totalGainDollar, pos.currency || 'USD')})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Stored Technical & Fundamental Signals */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {pos.trend && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                          pos.trend === 'Bullish' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                          pos.trend === 'Bearish' ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" :
                          "bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60"
                        )}>
                          {pos.trend} Trend
                        </span>
                      )}

                      {pos.recommendationAction && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                          pos.recommendationAction === 'Buy More' ? "bg-emerald-600 text-white font-black" :
                          pos.recommendationAction === 'Sell' ? "bg-red-600 text-white font-black" :
                          "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                        )}>
                          AI: {pos.recommendationAction}
                        </span>
                      )}

                      {pos.avwapAthPrice && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 flex items-center gap-1">
                          <Anchor className="w-2.5 h-2.5" />
                          ATH AVWAP: {formatCurrency(pos.avwapAthPrice, pos.currency || 'USD')}
                        </span>
                      )}

                      {pos.dividendYield && pos.dividendYield > 0 && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          {pos.dividendYield.toFixed(2)}% Div Yield
                        </span>
                      )}
                    </div>

                    {pos.notes && (
                      <p className="text-[10px] text-black/50 dark:text-white/50 italic bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-lg border border-black/5 dark:border-white/5 mt-2 line-clamp-2">
                        "{pos.notes}"
                      </p>
                    )}
                  </div>

                  {/* Bottom Action: Analyze with Stored Price */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-bold text-black/30 dark:text-white/30">
                      Saved {pos.date ? format(parseISO(pos.date), 'MMM dd, yyyy') : 'Recently'}
                    </span>

                    <button
                      onClick={() => handleAnalyzeStock(pos)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-black transition-all cursor-pointer shadow-xs group/btn"
                    >
                      <span>Deep Analysis</span>
                      <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-black/5 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                    <th className="px-5 py-4">Ticker / Asset</th>
                    <th className="px-5 py-4">Cost Basis</th>
                    <th className="px-5 py-4">Current Price</th>
                    <th className="px-5 py-4">Unrealized P/L</th>
                    <th className="px-5 py-4">Position Value</th>
                    <th className="px-5 py-4">Signals & Strategy</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredPositions.map((pos) => {
                    const currentPrice = pos.currentPrice || pos.lastAnalyzedPrice || pos.avgPrice;
                    const gainPercent = pos.avgPrice > 0 ? ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;
                    const isProfit = gainPercent >= 0;
                    const totalCost = (pos.shares || 0) * pos.avgPrice;
                    const totalVal = (pos.shares || 0) * currentPrice;
                    const totalGainDollar = totalVal - totalCost;

                    return (
                      <tr key={pos.ticker} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black font-black text-xs flex items-center justify-center">
                              {pos.ticker.slice(0, 2)}
                            </div>
                            <div>
                              <span className="font-black text-sm block">{pos.ticker}</span>
                              <span className="text-[9px] text-black/40 dark:text-white/40 uppercase">{pos.exchange || pos.currency || 'USD'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono font-bold">
                          <div>{formatCurrency(pos.avgPrice, pos.currency || 'USD')}</div>
                          {pos.shares && pos.shares > 0 && (
                            <div className="text-[9px] text-black/40 dark:text-white/40 font-sans">{pos.shares} shares</div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono font-black">
                          {formatCurrency(currentPrice, pos.currency || 'USD')}
                        </td>

                        <td className="px-5 py-4 font-mono font-black">
                          <div className={cn(
                            "flex items-center gap-1",
                            isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                          )}>
                            {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isProfit ? '+' : ''}{gainPercent.toFixed(2)}%
                          </div>
                          {pos.shares && pos.shares > 0 && (
                            <div className={cn("text-[9px]", totalGainDollar >= 0 ? "text-emerald-600/70" : "text-red-500/70")}>
                              {totalGainDollar >= 0 ? '+' : ''}{formatCurrency(totalGainDollar, pos.currency || 'USD')}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono font-black">
                          {pos.shares && pos.shares > 0 ? (
                            <div>
                              <span>{formatCurrency(totalVal, pos.currency || 'USD')}</span>
                              <span className="text-[9px] text-black/40 dark:text-white/40 block font-sans">
                                Cost: {formatCurrency(totalCost, pos.currency || 'USD')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-black/30 dark:text-white/30 text-[10px]">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1">
                            {pos.trend && (
                              <span className={cn(
                                "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                                pos.trend === 'Bullish' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                                pos.trend === 'Bearish' ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" :
                                "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
                              )}>
                                {pos.trend}
                              </span>
                            )}
                            {pos.recommendationAction && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                                {pos.recommendationAction}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAnalyzeStock(pos)}
                              className="px-2.5 py-1 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[9px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-colors cursor-pointer"
                            >
                              Analyze
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(pos)}
                              className="p-1 rounded-md text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmTicker(pos.ticker)}
                              className="p-1 rounded-md text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* ADD / EDIT POSITION MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#141414] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl w-full max-w-md p-6 space-y-5 overflow-hidden relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    {editingTicker ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <h3 className="font-black text-lg tracking-tight">
                    {editingTicker ? `Edit Position: ${editingTicker}` : 'Add Portfolio Stock'}
                  </h3>
                </div>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-full text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3 items-start">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                        Stock Ticker
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. NVDA"
                      value={formTicker}
                      onChange={(e) => setFormTicker(e.target.value.toUpperCase())}
                      disabled={!!editingTicker}
                      required
                      className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-bold uppercase outline-none focus:border-emerald-500 disabled:opacity-50 text-sm"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                        Avg Purchase Price
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 124.50"
                      value={formAvgPrice}
                      onChange={(e) => setFormAvgPrice(e.target.value)}
                      required
                      className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-bold font-mono outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-start">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                        Shares (Optional)
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 25"
                      value={formShares}
                      onChange={(e) => setFormShares(e.target.value)}
                      className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-bold outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                        Currency
                      </label>
                    </div>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3 font-bold outline-none focus:border-emerald-500 cursor-pointer text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                      Personal Notes / Thesis (Optional)
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Core long-term AI hardware hold"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-medium outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-bold uppercase tracking-wider text-[10px] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPosition}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-[10px] transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingPosition ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingTicker ? 'Update Position' : 'Save to Portfolio'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      <AnimatePresence>
        {deleteConfirmTicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#141414] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl w-full max-w-sm p-6 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg">Remove {deleteConfirmTicker}?</h3>
                <p className="text-xs text-black/50 dark:text-white/50 mt-1">
                  This will remove {deleteConfirmTicker} and your stored purchase price from your saved portfolio list.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteConfirmTicker(null)}
                  className="py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-bold uppercase tracking-wider text-[10px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePosition(deleteConfirmTicker)}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-[10px] transition-colors shadow-md shadow-red-600/20"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
