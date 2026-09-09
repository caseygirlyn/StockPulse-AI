import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  Crosshair, 
  Plus, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  SlidersHorizontal, 
  LayoutGrid, 
  Table as TableIcon, 
  ArrowUpDown, 
  Layers, 
  ChevronRight,
  Info,
  DollarSign,
  PieChart,
  CheckCircle2,
  X,
  Zap,
  Bell,
  BellRing,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TOP_20_RECOMMENDED_STOCKS, 
  fetchMarketWatchlist, 
  type WatchlistItem 
} from '../services/watchlistService';
import { 
  savePortfolioPosition, 
  getLocalPortfolio, 
  type PortfolioPosition 
} from '../services/portfolioService';
import {
  getPriceAlerts,
  savePriceAlert,
  deletePriceAlert,
  togglePriceAlertTriggered,
  checkTriggeredAlerts,
  type PriceAlert
} from '../services/alertService';
import { cn, formatCurrency } from '../utils';

type SectorFilter = 'All' | 'AI & Semiconductors' | 'Big Tech & Cloud' | 'High-Growth & Fintech' | 'Healthcare & Biotech' | 'Blue Chips & Value';
type SortOption = 'conviction_desc' | 'change_desc' | 'change_asc' | 'upside_desc' | 'price_desc' | 'price_asc' | 'ticker_asc';

export default function MarketWatchlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>(TOP_20_RECOMMENDED_STOCKS);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<SectorFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('conviction_desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Track existing portfolio tickers to reflect added state
  const [savedTickers, setSavedTickers] = useState<Set<string>>(new Set());

  // Alerts Management State
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'alerts_only'>('all');

  // Modal State for adding to portfolio
  const [modalItem, setModalItem] = useState<WatchlistItem | null>(null);
  const [modalAvgPrice, setModalAvgPrice] = useState<string>('');
  const [modalShares, setModalShares] = useState<string>('10');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for creating a Price Alert
  const [alertModalItem, setAlertModalItem] = useState<WatchlistItem | null>(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState<string>('');
  const [alertCondition, setAlertCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [alertType, setAlertType] = useState<'TAKE_PROFIT' | 'STOP_LOSS' | 'ENTRY_ZONE' | 'CUSTOM'>('TAKE_PROFIT');
  const [alertNotes, setAlertNotes] = useState<string>('');
  
  // Notification Toast & Triggered Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [triggeredAlertsList, setTriggeredAlertsList] = useState<PriceAlert[]>([]);

  const refreshPortfolioStatus = () => {
    const portfolio = getLocalPortfolio();
    const tickerSet = new Set(portfolio.map(p => p.ticker.toUpperCase()));
    setSavedTickers(tickerSet);
  };

  const refreshAlerts = () => {
    const currentAlerts = getPriceAlerts();
    setAlerts(currentAlerts);
  };

  useEffect(() => {
    refreshPortfolioStatus();
    refreshAlerts();
    window.addEventListener('portfolio_updated', refreshPortfolioStatus);
    window.addEventListener('price_alerts_updated', refreshAlerts);
    
    // Load live watchlist data from API
    setLoading(true);
    fetchMarketWatchlist('USD')
      .then((data) => {
        if (data && data.length > 0) {
          setItems(data);
          // Check for triggered alerts immediately
          const priceMap: Record<string, number> = {};
          data.forEach(item => {
            priceMap[item.ticker.toUpperCase()] = item.currentPrice;
          });
          const triggered = checkTriggeredAlerts(priceMap);
          if (triggered.length > 0) {
            setTriggeredAlertsList(triggered);
          }
        }
      })
      .catch((err) => {
        console.warn('Using local watchlist fallback:', err);
      })
      .finally(() => {
        setLoading(false);
        setLastRefreshed(new Date());
      });

    return () => {
      window.removeEventListener('portfolio_updated', refreshPortfolioStatus);
      window.removeEventListener('price_alerts_updated', refreshAlerts);
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await fetchMarketWatchlist('USD', true);
      if (data && data.length > 0) {
        setItems(data);
        
        // Evaluate alerts against fresh prices
        const priceMap: Record<string, number> = {};
        data.forEach(item => {
          priceMap[item.ticker.toUpperCase()] = item.currentPrice;
        });
        const newlyTriggered = checkTriggeredAlerts(priceMap);
        if (newlyTriggered.length > 0) {
          setTriggeredAlertsList(prev => [...newlyTriggered, ...prev]);
          showToast(`🚨 ${newlyTriggered.length} price target alert(s) reached!`);
        } else {
          showToast('Watchlist prices & alerts checked');
        }
      }
      setLastRefreshed(new Date());
    } catch {
      showToast('Using latest cached intelligence');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const sectors: { label: SectorFilter; count: number }[] = useMemo(() => {
    const counts: Record<string, number> = {
      'AI & Semiconductors': 0,
      'Big Tech & Cloud': 0,
      'High-Growth & Fintech': 0,
      'Healthcare & Biotech': 0,
      'Blue Chips & Value': 0,
    };
    items.forEach(it => {
      if (counts[it.sector] !== undefined) {
        counts[it.sector]++;
      }
    });

    return [
      { label: 'All', count: items.length },
      { label: 'AI & Semiconductors', count: counts['AI & Semiconductors'] || 0 },
      { label: 'Big Tech & Cloud', count: counts['Big Tech & Cloud'] || 0 },
      { label: 'High-Growth & Fintech', count: counts['High-Growth & Fintech'] || 0 },
      { label: 'Healthcare & Biotech', count: counts['Healthcare & Biotech'] || 0 },
      { label: 'Blue Chips & Value', count: counts['Blue Chips & Value'] || 0 },
    ];
  }, [items]);

  // Map of active alerts per ticker
  const activeAlertsByTicker = useMemo(() => {
    const map: Record<string, PriceAlert[]> = {};
    alerts.forEach(a => {
      const sym = a.ticker.toUpperCase();
      if (!map[sym]) map[sym] = [];
      map[sym].push(a);
    });
    return map;
  }, [alerts]);

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSector = selectedSector === 'All' || item.sector === selectedSector;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || 
          item.ticker.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.categoryTag.toLowerCase().includes(q) ||
          item.thesis.toLowerCase().includes(q) ||
          item.catalysts.some(c => c.toLowerCase().includes(q));

        const matchesTab = activeTab === 'all' || (activeAlertsByTicker[item.ticker.toUpperCase()] && activeAlertsByTicker[item.ticker.toUpperCase()].length > 0);

        return matchesSector && matchesSearch && matchesTab;
      })
      .sort((a, b) => {
        const upsideA = a.currentPrice > 0 ? ((a.takeProfit - a.currentPrice) / a.currentPrice) * 100 : 0;
        const upsideB = b.currentPrice > 0 ? ((b.takeProfit - b.currentPrice) / b.currentPrice) * 100 : 0;

        switch (sortBy) {
          case 'conviction_desc':
            return b.convictionScore - a.convictionScore;
          case 'change_desc':
            return b.priceChangePercent - a.priceChangePercent;
          case 'change_asc':
            return a.priceChangePercent - b.priceChangePercent;
          case 'upside_desc':
            return upsideB - upsideA;
          case 'price_desc':
            return b.currentPrice - a.currentPrice;
          case 'price_asc':
            return a.currentPrice - b.currentPrice;
          case 'ticker_asc':
            return a.ticker.localeCompare(b.ticker);
          default:
            return 0;
        }
      });
  }, [items, selectedSector, searchQuery, sortBy, activeTab, activeAlertsByTicker]);

  // Modal open for adding to portfolio
  const handleOpenAddModal = (item: WatchlistItem) => {
    setModalItem(item);
    setModalAvgPrice(item.idealEntry ? item.idealEntry.toString() : item.currentPrice.toString());
    setModalShares('10');
    setModalNotes(`Added from AI Top 20 Watchlist (${item.categoryTag})`);
  };

  // Modal open for setting price alert
  const handleOpenAlertModal = (item: WatchlistItem, presetType?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'ENTRY_ZONE') => {
    setAlertModalItem(item);
    if (presetType === 'TAKE_PROFIT') {
      setAlertTargetPrice(item.takeProfit.toString());
      setAlertCondition('ABOVE');
      setAlertType('TAKE_PROFIT');
      setAlertNotes(`Targeting AI Take Profit of ${formatCurrency(item.takeProfit, item.currency)}`);
    } else if (presetType === 'STOP_LOSS') {
      setAlertTargetPrice(item.stopLoss.toString());
      setAlertCondition('BELOW');
      setAlertType('STOP_LOSS');
      setAlertNotes(`Defensive Stop Loss at ${formatCurrency(item.stopLoss, item.currency)}`);
    } else if (presetType === 'ENTRY_ZONE') {
      setAlertTargetPrice(item.idealEntry.toString());
      setAlertCondition(item.currentPrice > item.idealEntry ? 'BELOW' : 'ABOVE');
      setAlertType('ENTRY_ZONE');
      setAlertNotes(`Tactical Buy Entry Zone near ${formatCurrency(item.idealEntry, item.currency)}`);
    } else {
      setAlertTargetPrice(item.currentPrice.toString());
      setAlertCondition('ABOVE');
      setAlertType('CUSTOM');
      setAlertNotes(`Price notification for ${item.ticker}`);
    }
  };

  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertModalItem) return;

    const targetVal = parseFloat(alertTargetPrice);
    if (isNaN(targetVal) || targetVal <= 0) {
      showToast('Please enter a valid positive target price');
      return;
    }

    savePriceAlert({
      ticker: alertModalItem.ticker,
      name: alertModalItem.name,
      targetPrice: targetVal,
      condition: alertCondition,
      initialPrice: alertModalItem.currentPrice,
      currency: alertModalItem.currency,
      notes: alertNotes,
      alertType: alertType
    });

    setAlertModalItem(null);
    showToast(`🔔 Price alert set for ${alertModalItem.ticker} at ${formatCurrency(targetVal, alertModalItem.currency)}!`);
  };

  const handleSaveToPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem) return;

    setIsSaving(true);
    const parsedAvgPrice = parseFloat(modalAvgPrice) || modalItem.currentPrice;
    const parsedShares = parseFloat(modalShares) || 10;

    try {
      await savePortfolioPosition({
        ticker: modalItem.ticker,
        name: modalItem.name,
        avgPrice: parsedAvgPrice,
        shares: parsedShares,
        currency: modalItem.currency,
        exchange: modalItem.exchange,
        currentPrice: modalItem.currentPrice,
        previousClose: modalItem.previousClose,
        priceChange: modalItem.priceChange,
        priceChangePercent: modalItem.priceChangePercent,
        trend: modalItem.trend,
        recommendationAction: modalItem.recommendationAction === 'Strong Buy' || modalItem.recommendationAction === 'Buy on Dips' ? 'Buy More' : 'Hold',
        idealEntry: modalItem.idealEntry,
        stopLoss: modalItem.stopLoss,
        takeProfit: modalItem.takeProfit,
        notes: modalNotes
      });

      refreshPortfolioStatus();
      setModalItem(null);
      showToast(`${modalItem.ticker} successfully added to Portfolio!`);
    } catch (err) {
      console.error('Failed to save to portfolio:', err);
      showToast(`Error adding ${modalItem.ticker} to portfolio`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAnalyze = (item: WatchlistItem) => {
    navigate(`/?ticker=${encodeURIComponent(item.ticker)}&avgPrice=${encodeURIComponent(item.idealEntry || item.currentPrice)}&currency=${encodeURIComponent(item.currency)}`);
  };

  const averageConviction = useMemo(() => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc, curr) => acc + curr.convictionScore, 0);
    return (total / items.length).toFixed(1);
  }, [items]);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.triggered).length;
  }, [alerts]);

  const triggeredAlertsCount = useMemo(() => {
    return alerts.filter(a => a.triggered).length;
  }, [alerts]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-4 z-50 bg-black dark:bg-white text-white dark:text-black px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-white/10"
          >
            <BellRing className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Triggered Alerts Banner if any exist */}
      {triggeredAlertsCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                {triggeredAlertsCount} Price Alert{triggeredAlertsCount > 1 ? 's' : ''} Triggered
              </h4>
              <p className="text-[11px] font-medium text-black/70 dark:text-white/70">
                Target price thresholds have been breached. Review triggered orders or re-arm targets.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAlertsPanel(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 text-center shadow-xs"
          >
            Manage Alerts
          </button>
        </motion.div>
      )}

      {/* Hero Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 md:p-10 shadow-xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Institutional Market Intelligence & Price Alerts
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-black dark:text-white">
              Market Watchlist
            </h1>
            <p className="text-sm md:text-base font-medium text-black/60 dark:text-white/60 leading-relaxed">
              Top 20 high-conviction AI stock recommendations, market leaders, and tactical buy targets. Configure real-time price alerts to receive instant notifications when key entry or take-profit targets are touched.
            </p>
          </div>

          {/* Quick Metrics Cards & Alert Center Trigger */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Top Leaders</p>
              <p className="text-xl font-black text-black dark:text-white mt-0.5">{items.length}</p>
              <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Curated Equities</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Avg Conviction</p>
              <p className="text-xl font-black text-black dark:text-white mt-0.5">{averageConviction}%</p>
              <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">AI Confidence</p>
            </div>

            {/* Active Price Alerts Card Button */}
            <button
              onClick={() => setShowAlertsPanel(true)}
              className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-emerald-500/50 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Price Alerts</p>
                <Bell className={cn("w-3.5 h-3.5 transition-colors", activeAlertsCount > 0 ? "text-emerald-500" : "text-black/30 dark:text-white/30")} />
              </div>
              <p className="text-xl font-black text-black dark:text-white mt-0.5">{activeAlertsCount}</p>
              <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>View Alert Hub</span>
                <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </button>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Data Sync</p>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-black dark:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3 h-3 text-emerald-600 dark:text-emerald-400", loading && "animate-spin")} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="space-y-4">
        {/* Sector Tabs & Alert Quick Filter */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            {sectors.map((sec) => (
              <button
                key={sec.label}
                onClick={() => { setSelectedSector(sec.label); setActiveTab('all'); }}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0",
                  selectedSector === sec.label && activeTab === 'all'
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                    : "bg-white dark:bg-[#141414] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-black/5 dark:border-white/5"
                )}
              >
                <span>{sec.label}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[9px] font-mono",
                  selectedSector === sec.label && activeTab === 'all'
                    ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                    : "bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
                )}>
                  {sec.count}
                </span>
              </button>
            ))}
          </div>

          <div className="shrink-0">
            <button
              onClick={() => setActiveTab(activeTab === 'alerts_only' ? 'all' : 'alerts_only')}
              className={cn(
                "px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0",
                activeTab === 'alerts_only'
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#141414] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-black/5 dark:border-white/5"
              )}
            >
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>With Active Alerts ({alerts.length})</span>
            </button>
          </div>
        </div>

        {/* Search, Sort, and View Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 p-3 rounded-2xl">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-black/40 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, theme, or catalyst..."
              className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="conviction_desc">Highest Conviction</option>
                <option value="upside_desc">Highest Upside Target</option>
                <option value="change_desc">Top Daily Gainers</option>
                <option value="change_asc">Top Daily Dips</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="ticker_asc">Ticker (A-Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                  viewMode === 'cards'
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs"
                    : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                )}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                  viewMode === 'table'
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs"
                    : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                )}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Search State */}
      {filteredAndSortedItems.length === 0 && (
        <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto text-black/40 dark:text-white/40">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-black dark:text-white">No stocks match your query</h3>
          <p className="text-xs text-black/60 dark:text-white/60 max-w-sm mx-auto">
            {activeTab === 'alerts_only' 
              ? "You don't have any price alerts set for this filter. Click the bell icon on any stock to configure a target alert."
              : "Try searching for a different ticker, sector, or clearing your search filters."}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedSector('All'); setActiveTab('all'); }}
            className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Cards View Layout */}
      {viewMode === 'cards' && filteredAndSortedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedItems.map((item, idx) => {
            const isSaved = savedTickers.has(item.ticker.toUpperCase());
            const upsidePercent = item.currentPrice > 0 ? ((item.takeProfit - item.currentPrice) / item.currentPrice) * 100 : 0;
            const itemAlerts = activeAlertsByTicker[item.ticker.toUpperCase()] || [];

            return (
              <motion.div
                key={item.ticker}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-[2rem] p-6 shadow-xs flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all duration-300 group"
              >
                <div className="space-y-4">
                  {/* Card Header: Ticker, Category, Alert Button & Conviction Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black tracking-tight text-black dark:text-white font-mono">
                          {item.ticker}
                        </span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60">
                          {item.exchange || 'NASDAQ'}
                        </span>
                        
                        {/* Alert Pill if alerts configured */}
                        {itemAlerts.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[9px] font-black">
                            <BellRing className="w-2.5 h-2.5" />
                            <span>{itemAlerts.length} alert{itemAlerts.length > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-black/70 dark:text-white/70 truncate max-w-[180px]">
                        {item.name}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {item.categoryTag}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-700/40 text-emerald-900 dark:text-emerald-300 font-mono text-xs font-black">
                        <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
                        <span>{item.convictionScore}%</span>
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mt-1">
                        AI Conviction
                      </p>
                    </div>
                  </div>

                  {/* Price & Change Banner */}
                  <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#0D0D0D] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Market Price</p>
                      <p className="text-lg font-black font-mono tracking-tight text-black dark:text-white mt-0.5">
                        {formatCurrency(item.currentPrice, item.currency)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1 text-xs font-black font-mono px-2 py-0.5 rounded-lg",
                        item.priceChangePercent >= 0 
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" 
                          : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                      )}>
                        {item.priceChangePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{item.priceChangePercent >= 0 ? '+' : ''}{item.priceChangePercent.toFixed(2)}%</span>
                      </div>
                      <p className="text-[8px] font-bold text-black/40 dark:text-white/40 mt-0.5">
                        Cap: {item.marketCap}
                      </p>
                    </div>
                  </div>

                  {/* Strategy Targets: Clickable to Set Instant Alerts */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Take Profit Target with quick alert button */}
                    <div 
                      onClick={() => handleOpenAlertModal(item, 'TAKE_PROFIT')}
                      className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/30 text-left hover:border-emerald-500 cursor-pointer transition-all group/target relative"
                      title="Click to set Take-Profit alert"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <Target className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                          Target
                        </span>
                        <span className="text-[8px] font-black font-mono text-emerald-700 dark:text-emerald-300">
                          +{upsidePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs font-black font-mono text-emerald-950 dark:text-emerald-100">
                          {formatCurrency(item.takeProfit, item.currency)}
                        </p>
                        <Bell className="w-3 h-3 text-emerald-600/60 dark:text-emerald-400/60 group-hover/target:scale-110 group-hover/target:text-emerald-600 transition-transform" />
                      </div>
                    </div>

                    {/* Ideal Entry Zone with quick alert button */}
                    <div 
                      onClick={() => handleOpenAlertModal(item, 'ENTRY_ZONE')}
                      className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/30 text-left hover:border-blue-500 cursor-pointer transition-all group/entry relative"
                      title="Click to set Entry Zone alert"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1">
                          <Crosshair className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                          Entry Zone
                        </span>
                        <span className="text-[8px] font-bold text-blue-700 dark:text-blue-300 font-mono">
                          1:{item.riskRewardRatio.toFixed(1)} R/R
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs font-black font-mono text-blue-950 dark:text-blue-100">
                          {formatCurrency(item.idealEntry, item.currency)}
                        </p>
                        <Bell className="w-3 h-3 text-blue-600/60 dark:text-blue-400/60 group-hover/entry:scale-110 group-hover/entry:text-blue-600 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Core Thesis & Catalysts */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-black/80 dark:text-white/80 leading-relaxed italic line-clamp-2">
                      "{item.thesis}"
                    </p>

                    <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                        Upcoming AI Catalysts
                      </p>
                      <ul className="space-y-1">
                        {item.catalysts.slice(0, 2).map((cat, cIdx) => (
                          <li key={cIdx} className="flex items-start gap-1.5 text-[10px] font-medium text-black/70 dark:text-white/70 leading-snug">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span className="line-clamp-1">{cat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-5 border-t border-black/5 dark:border-white/5 flex items-center gap-2 mt-4">
                  <button
                    onClick={() => handleQuickAnalyze(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Analyze Lab</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Price Alert Bell Button */}
                  <button
                    onClick={() => handleOpenAlertModal(item)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0",
                      itemAlerts.length > 0
                        ? "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                        : "bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                    )}
                    title={itemAlerts.length > 0 ? `${itemAlerts.length} alert(s) set (Click to configure)` : "Set Price Alert"}
                  >
                    <Bell className={cn("w-4 h-4", itemAlerts.length > 0 && "fill-amber-500")} />
                  </button>

                  {/* Add to Portfolio Button */}
                  <button
                    onClick={() => handleOpenAddModal(item)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0",
                      isSaved
                        ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : "bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                    )}
                    title={isSaved ? "Already in Portfolio (Click to edit)" : "Add to Portfolio"}
                  >
                    {isSaved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Table View Layout */}
      {viewMode === 'table' && filteredAndSortedItems.length > 0 && (
        <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                <tr>
                  <th className="py-4 px-6">Asset & Sector</th>
                  <th className="py-4 px-4">AI Conviction</th>
                  <th className="py-4 px-4">Action Signal</th>
                  <th className="py-4 px-4 text-right">Market Price</th>
                  <th className="py-4 px-4 text-right">Change</th>
                  <th className="py-4 px-4 text-right">Entry Zone</th>
                  <th className="py-4 px-4 text-right">Take Profit</th>
                  <th className="py-4 px-4 text-right">Risk/Reward</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredAndSortedItems.map((item) => {
                  const isSaved = savedTickers.has(item.ticker.toUpperCase());
                  const itemAlerts = activeAlertsByTicker[item.ticker.toUpperCase()] || [];
                  const upsidePercent = item.currentPrice > 0 ? ((item.takeProfit - item.currentPrice) / item.currentPrice) * 100 : 0;

                  return (
                    <tr key={item.ticker} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-black dark:text-white font-mono">{item.ticker}</span>
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
                                {item.exchange || 'NASDAQ'}
                              </span>
                              {itemAlerts.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[8px] font-black">
                                  <Bell className="w-2.5 h-2.5 fill-amber-500" />
                                  <span>{itemAlerts.length}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-black/60 dark:text-white/60 truncate max-w-[150px]">{item.name}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300 font-mono text-xs font-black">
                          <Zap className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
                          {item.convictionScore}%
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                          item.recommendationAction === 'Strong Buy' ? "bg-emerald-600 text-white" :
                          item.recommendationAction === 'Buy on Dips' ? "bg-blue-600 text-white" :
                          item.recommendationAction === 'Breakout Watch' ? "bg-amber-500 text-white" :
                          "bg-indigo-600 text-white"
                        )}>
                          {item.recommendationAction}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-black font-mono text-black dark:text-white">
                        {formatCurrency(item.currentPrice, item.currency)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold">
                        <span className={cn(
                          item.priceChangePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          {item.priceChangePercent >= 0 ? '+' : ''}{item.priceChangePercent.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-black/80 dark:text-white/80">
                        {formatCurrency(item.idealEntry, item.currency)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.takeProfit, item.currency)} (+{upsidePercent.toFixed(1)}%)
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-black/60 dark:text-white/60">
                        1:{item.riskRewardRatio.toFixed(1)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleQuickAnalyze(item)}
                            className="p-2 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all cursor-pointer"
                            title="Analyze in Lab"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Alert Bell Button */}
                          <button
                            onClick={() => handleOpenAlertModal(item)}
                            className={cn(
                              "p-2 rounded-xl border transition-all cursor-pointer",
                              itemAlerts.length > 0
                                ? "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                                : "bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                            )}
                            title="Set Price Alert"
                          >
                            <Bell className={cn("w-3.5 h-3.5", itemAlerts.length > 0 && "fill-amber-500")} />
                          </button>

                          <button
                            onClick={() => handleOpenAddModal(item)}
                            className={cn(
                              "p-2 rounded-xl border transition-all cursor-pointer",
                              isSaved
                                ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                : "bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                            )}
                            title={isSaved ? "In Portfolio" : "Add to Portfolio"}
                          >
                            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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

      {/* Set Price Alert Modal */}
      <AnimatePresence>
        {alertModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 relative"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-black dark:text-white">{alertModalItem.ticker}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Bell className="w-3 h-3" /> Price Alert
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">{alertModalItem.name}</p>
                </div>

                <button
                  onClick={() => setAlertModalItem(null)}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Market Price Banner */}
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">Current Price</span>
                  <span className="text-base font-black font-mono text-black dark:text-white mt-0.5 block">
                    {formatCurrency(alertModalItem.currentPrice, alertModalItem.currency)}
                  </span>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">AI Targets</span>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-blue-600 dark:text-blue-400">Entry: {formatCurrency(alertModalItem.idealEntry, alertModalItem.currency)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Target: {formatCurrency(alertModalItem.takeProfit, alertModalItem.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Fast Presets Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
                  Quick AI Target Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAlertTargetPrice(alertModalItem.takeProfit.toString());
                      setAlertCondition('ABOVE');
                      setAlertType('TAKE_PROFIT');
                      setAlertNotes(`Take-Profit Target for ${alertModalItem.ticker}`);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center",
                      alertType === 'TAKE_PROFIT' 
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-xs" 
                        : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-black dark:text-white hover:bg-black/10"
                    )}
                  >
                    <span className="text-[9px] uppercase tracking-wider opacity-80">Take Profit</span>
                    <span className="font-mono font-black">{formatCurrency(alertModalItem.takeProfit, alertModalItem.currency)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAlertTargetPrice(alertModalItem.idealEntry.toString());
                      setAlertCondition(alertModalItem.currentPrice > alertModalItem.idealEntry ? 'BELOW' : 'ABOVE');
                      setAlertType('ENTRY_ZONE');
                      setAlertNotes(`Entry Zone Target for ${alertModalItem.ticker}`);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center",
                      alertType === 'ENTRY_ZONE' 
                        ? "bg-blue-500 text-white border-blue-600 shadow-xs" 
                        : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-black dark:text-white hover:bg-black/10"
                    )}
                  >
                    <span className="text-[9px] uppercase tracking-wider opacity-80">Entry Zone</span>
                    <span className="font-mono font-black">{formatCurrency(alertModalItem.idealEntry, alertModalItem.currency)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAlertTargetPrice(alertModalItem.stopLoss.toString());
                      setAlertCondition('BELOW');
                      setAlertType('STOP_LOSS');
                      setAlertNotes(`Stop Loss Alert for ${alertModalItem.ticker}`);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center",
                      alertType === 'STOP_LOSS' 
                        ? "bg-rose-500 text-white border-rose-600 shadow-xs" 
                        : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-black dark:text-white hover:bg-black/10"
                    )}
                  >
                    <span className="text-[9px] uppercase tracking-wider opacity-80">Stop Loss</span>
                    <span className="font-mono font-black">{formatCurrency(alertModalItem.stopLoss, alertModalItem.currency)}</span>
                  </button>
                </div>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleSaveAlert} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5">
                      Target Price ({alertModalItem.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={alertTargetPrice}
                      onChange={(e) => {
                        setAlertTargetPrice(e.target.value);
                        setAlertType('CUSTOM');
                      }}
                      placeholder={alertModalItem.takeProfit.toString()}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5">
                      Trigger Condition
                    </label>
                    <select
                      value={alertCondition}
                      onChange={(e) => setAlertCondition(e.target.value as 'ABOVE' | 'BELOW')}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2.5 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ABOVE">Price Rises &ge; Target</option>
                      <option value="BELOW">Price Drops &le; Target</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5">
                    Alert Strategy / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={alertNotes}
                    onChange={(e) => setAlertNotes(e.target.value)}
                    placeholder="e.g., Take partial profits, scale into position..."
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAlertModalItem(null)}
                    className="flex-1 py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-bold text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Save Alert</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Price Alerts Hub Modal / Drawer */}
      <AnimatePresence>
        {showAlertsPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative max-h-[85vh] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-start justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xl font-black tracking-tight text-black dark:text-white">Price Alerts Center</h3>
                  </div>
                  <p className="text-xs font-medium text-black/60 dark:text-white/60 mt-1">
                    Manage active price alerts, review triggered milestones, and track notifications.
                  </p>
                </div>

                <button
                  onClick={() => setShowAlertsPanel(false)}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Alerts List Body */}
              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {alerts.length === 0 ? (
                  <div className="p-10 text-center space-y-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/5 dark:border-white/5">
                    <Bell className="w-8 h-8 text-black/20 dark:text-white/20 mx-auto" />
                    <p className="text-xs font-bold text-black/60 dark:text-white/60">No price alerts configured yet</p>
                    <p className="text-[11px] text-black/40 dark:text-white/40 max-w-xs mx-auto">
                      Click the bell icon next to any stock in the Watchlist to create target price notifications.
                    </p>
                  </div>
                ) : (
                  alerts.map((al) => {
                    const stock = items.find(i => i.ticker.toUpperCase() === al.ticker.toUpperCase());
                    const currentPrice = stock ? stock.currentPrice : al.initialPrice;
                    const distance = ((al.targetPrice - currentPrice) / currentPrice) * 100;

                    return (
                      <div
                        key={al.id}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                          al.triggered
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-black dark:text-white">{al.ticker}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60">
                              {al.condition === 'ABOVE' ? 'Rise ≥' : 'Drop ≤'} {formatCurrency(al.targetPrice, al.currency)}
                            </span>
                            {al.triggered ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Triggered
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                Active
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] font-medium text-black/60 dark:text-white/60">
                            Current: <span className="font-mono font-bold text-black dark:text-white">{formatCurrency(currentPrice, al.currency)}</span>
                            {' • '}
                            Distance: <span className="font-mono font-bold">{distance >= 0 ? `+${distance.toFixed(1)}%` : `${distance.toFixed(1)}%`}</span>
                            {al.notes && ` • ${al.notes}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => togglePriceAlertTriggered(al.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[10px] font-black uppercase tracking-wider text-black dark:text-white transition-all cursor-pointer"
                          >
                            {al.triggered ? 'Re-Arm' : 'Mark Triggered'}
                          </button>
                          
                          <button
                            onClick={() => {
                              deletePriceAlert(al.id);
                              showToast(`Alert for ${al.ticker} deleted`);
                            }}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white transition-all cursor-pointer"
                            title="Delete Alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-black/50 dark:text-white/50">
                  {alerts.length} Total Alerts ({activeAlertsCount} Active, {triggeredAlertsCount} Triggered)
                </span>
                <button
                  onClick={() => setShowAlertsPanel(false)}
                  className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Position to Portfolio Modal */}
      <AnimatePresence>
        {modalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 relative"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-black dark:text-white">{modalItem.ticker}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                      {modalItem.convictionScore}% AI Conviction
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">{modalItem.name}</p>
                </div>

                <button
                  onClick={() => setModalItem(null)}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Strategy Highlights Box */}
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-black/50 dark:text-white/50">Market Price:</span>
                  <span className="font-mono text-black dark:text-white">{formatCurrency(modalItem.currentPrice, modalItem.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-600 dark:text-blue-400">AI Ideal Entry Zone:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(modalItem.idealEntry, modalItem.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">Take Profit Target:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(modalItem.takeProfit, modalItem.currency)}</span>
                </div>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleSaveToPortfolio} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5">
                      Avg Entry Price ({modalItem.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalAvgPrice}
                      onChange={(e) => setModalAvgPrice(e.target.value)}
                      placeholder={modalItem.idealEntry.toString()}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5">
                      Quantity (Shares)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={modalShares}
                      onChange={(e) => setModalShares(e.target.value)}
                      placeholder="10"
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5">
                    Investment Thesis / Strategy Notes
                  </label>
                  <textarea
                    rows={2}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-2 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalItem(null)}
                    className="flex-1 py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-bold text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Add to Portfolio'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
