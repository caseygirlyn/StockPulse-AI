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
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  Bell,
  BellRing,
  Target,
  Crosshair,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  fetchPortfolio, 
  savePortfolioPosition, 
  deletePortfolioPosition, 
  resetToDefaultPortfolio,
  clearAllPortfolioPositions,
  setLocalPortfolio,
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
import { getBatchPrices } from '../services/geminiService';
import TickerLogo from '../components/TickerLogo';
import { resolveTickerLogoUrl, getAuthoritativeCompanyName } from '../utils/tickerLogos';
import { cn, formatCurrency, safeParseResponseJson } from '../utils';

function getRecommendationBadgeInfo(action?: string, sellPercentage?: number) {
  if (!action) return null;
  const act = action.toUpperCase().trim();
  if (act === 'SELL_ALL') {
    return {
      label: 'AI: Sell All (100%)',
      className: 'bg-rose-600 text-white font-black shadow-xs'
    };
  }
  if (act === 'SELL_PARTIAL') {
    const pct = sellPercentage && sellPercentage > 0 && sellPercentage < 100 ? sellPercentage : 50;
    return {
      label: `AI: Sell Partial (${pct}%)`,
      className: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black'
    };
  }
  if (act === 'SELL') {
    return {
      label: 'AI: Sell',
      className: 'bg-rose-600 text-white font-black'
    };
  }
  if (act === 'BUY' || act === 'BUY MORE') {
    return {
      label: 'AI: Buy',
      className: 'bg-emerald-600 text-white font-black'
    };
  }
  if (act === 'AVOID') {
    return {
      label: 'AI: Avoid',
      className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 font-bold'
    };
  }
  return {
    label: `AI: ${action}`,
    className: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold'
  };
}

function getExchangeDelayLabel(ticker: string, exchange?: string): { label: string; isDelayed: boolean } {
  const t = (ticker || '').toUpperCase();
  const ex = (exchange || '').toLowerCase();
  if (t.endsWith('.L') || ex.includes('london') || ex.includes('lse')) {
    return { label: 'LSE · 15m Delayed', isDelayed: true };
  }
  if (t.endsWith('.PA') || t.endsWith('.AS') || t.endsWith('.DE') || ex.includes('euronext') || ex.includes('xetra') || ex.includes('frankfurt')) {
    return { label: `${exchange || 'EU'} · 15m Delayed`, isDelayed: true };
  }
  if (ex.includes('nasdaq') || ex.includes('nyse') || ex.includes('amex') || (!t.includes('.') && !ex.includes('lse'))) {
    return { label: `${exchange || 'US Market'} · Real-Time`, isDelayed: false };
  }
  return { label: `${exchange || 'Market Feed'}`, isDelayed: false };
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'gainers' | 'losers' | 'bullish' | 'bearish' | 'alerts_only'>('all');
  type SortColumn = 'date' | 'gain' | 'costBasis' | 'currentPrice' | 'value' | 'ticker';
  type SortDirection = 'asc' | 'desc';
  const [sortBy, setSortBy] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('portfolio_view_mode');
      return (saved === 'grid' || saved === 'table') ? saved : 'table';
    } catch {
      return 'table';
    }
  });

  // Alerts Management State
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [alertModalItem, setAlertModalItem] = useState<{
    ticker: string;
    name: string;
    currentPrice: number;
    currency: string;
    idealEntry?: number;
    stopLoss?: number;
    takeProfit?: number;
  } | null>(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState<string>('');
  const [alertCondition, setAlertCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [alertType, setAlertType] = useState<'TAKE_PROFIT' | 'STOP_LOSS' | 'ENTRY_ZONE' | 'CUSTOM'>('TAKE_PROFIT');
  const [alertNotes, setAlertNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [triggeredAlertsList, setTriggeredAlertsList] = useState<PriceAlert[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshAlerts = () => {
    const currentAlerts = getPriceAlerts();
    setAlerts(currentAlerts);
  };

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
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // Load portfolio positions on mount
  const loadPortfolioData = async () => {
    try {
      const data = await fetchPortfolio();
      setPositions(data);

      // Check alerts immediately against loaded position prices
      const priceMap: Record<string, number> = {};
      data.forEach(p => {
        const px = p.currentPrice || p.lastAnalyzedPrice;
        if (px && px > 0) {
          priceMap[p.ticker.toUpperCase()] = px;
        }
      });
      const triggered = checkTriggeredAlerts(priceMap);
      if (triggered.length > 0) {
        setTriggeredAlertsList(triggered);
      }

      // If any position is missing currentPrice or on initial load, refresh prices silently
      if (data.length > 0 && data.some(p => !p.currentPrice)) {
        setTimeout(() => {
          handleRefreshAllPrices(data);
        }, 300);
      }
    } catch (e) {
      console.error('Failed to load portfolio:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();
    refreshAlerts();

    // Listen to background updates
    const handleUpdate = () => {
      loadPortfolioData();
    };
    window.addEventListener('portfolio_updated', handleUpdate);
    window.addEventListener('price_alerts_updated', refreshAlerts);

    // Auto-check prices and alerts every 60 seconds (consistent with Watchlist)
    const autoRefreshTimer = setInterval(() => {
      handleRefreshAllPrices();
    }, 60000);

    return () => {
      clearInterval(autoRefreshTimer);
      window.removeEventListener('portfolio_updated', handleUpdate);
      window.removeEventListener('price_alerts_updated', refreshAlerts);
    };
  }, []);

  // Batch refresh live prices for all portfolio items
  const handleRefreshAllPrices = async (targetPositions?: PortfolioPosition[]) => {
    const listToRefresh = targetPositions || positions;
    if (listToRefresh.length === 0 || refreshing) return;
    setRefreshing(true);

    try {
      const tickers = listToRefresh.map(p => p.ticker);
      const currencies: Record<string, string> = {};
      listToRefresh.forEach(p => {
        currencies[p.ticker.toUpperCase()] = p.currency || 'USD';
      });

      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ tickers, currencies, forceRefresh: true })
      });

      if (res.ok) {
        const json = await safeParseResponseJson<{ prices?: Record<string, any> }>(res);
        if (!json) return;
        const pricesMap = json.prices || {};

        setPositions(prev => {
          const updated = prev.map(pos => {
            const item = pricesMap[pos.ticker.toUpperCase()];
            if (item && item.currentPrice !== undefined) {
              const freshPrice = item.currentPrice;
              const diff = pos.avgPrice > 0 ? ((freshPrice - pos.avgPrice) / pos.avgPrice) * 100 : undefined;
              return {
                ...pos,
                currentPrice: freshPrice,
                previousClose: item.previousClose ?? pos.previousClose,
                priceChange: item.priceChange ?? pos.priceChange,
                priceChangePercent: diff !== undefined ? parseFloat(diff.toFixed(2)) : pos.priceChangePercent,
                exchange: item.exchange || pos.exchange,
                date: new Date().toISOString()
              };
            }
            return pos;
          });
          setLocalPortfolio(updated);
          return updated;
        });

        // Check for triggered alerts with fresh prices
        const priceMap: Record<string, number> = {};
        Object.entries(pricesMap).forEach(([tkr, data]: [string, any]) => {
          if (data && typeof data.currentPrice === 'number') {
            priceMap[tkr.toUpperCase()] = data.currentPrice;
          }
        });
        const triggered = checkTriggeredAlerts(priceMap);
        if (triggered.length > 0) {
          setTriggeredAlertsList(triggered);
        }

        setLastRefreshedAt(new Date());
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('Unexpected token')) {
        console.warn('Could not refresh prices at this time:', e.message);
      }
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

  // Open modal to create/edit Price Alert
  const handleOpenAlertModal = (pos: PortfolioPosition, presetType?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'ENTRY_ZONE') => {
    const currentPx = pos.currentPrice || pos.lastAnalyzedPrice || pos.avgPrice;
    const calcTakeProfit = pos.takeProfit || Number((currentPx * 1.15).toFixed(2));
    const calcIdealEntry = pos.idealEntry || Number((currentPx * 0.95).toFixed(2));
    const calcStopLoss = pos.stopLoss || Number((currentPx * 0.92).toFixed(2));

    setAlertModalItem({
      ticker: pos.ticker,
      name: pos.name || getAuthoritativeCompanyName(pos.ticker),
      currentPrice: currentPx,
      currency: pos.currency || 'USD',
      takeProfit: calcTakeProfit,
      idealEntry: calcIdealEntry,
      stopLoss: calcStopLoss
    });

    if (presetType === 'TAKE_PROFIT') {
      setAlertTargetPrice(calcTakeProfit.toString());
      setAlertCondition('ABOVE');
      setAlertType('TAKE_PROFIT');
      setAlertNotes(`Targeting Take Profit at ${formatCurrency(calcTakeProfit, pos.currency || 'USD')}`);
    } else if (presetType === 'STOP_LOSS') {
      setAlertTargetPrice(calcStopLoss.toString());
      setAlertCondition('BELOW');
      setAlertType('STOP_LOSS');
      setAlertNotes(`Capital Protection Stop Loss at ${formatCurrency(calcStopLoss, pos.currency || 'USD')}`);
    } else if (presetType === 'ENTRY_ZONE') {
      setAlertTargetPrice(calcIdealEntry.toString());
      setAlertCondition(currentPx > calcIdealEntry ? 'BELOW' : 'ABOVE');
      setAlertType('ENTRY_ZONE');
      setAlertNotes(`Dip Accumulation Entry at ${formatCurrency(calcIdealEntry, pos.currency || 'USD')}`);
    } else {
      setAlertTargetPrice(calcTakeProfit.toString());
      setAlertCondition('ABOVE');
      setAlertType('TAKE_PROFIT');
      setAlertNotes(`Target price milestone for ${pos.ticker}`);
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

    const saved = savePriceAlert({
      ticker: alertModalItem.ticker,
      name: alertModalItem.name,
      targetPrice: targetVal,
      condition: alertCondition,
      initialPrice: alertModalItem.currentPrice,
      currency: alertModalItem.currency,
      notes: alertNotes,
      alertType: alertType
    });

    const isAlreadyTriggered = 
      (alertCondition === 'ABOVE' && alertModalItem.currentPrice >= targetVal) ||
      (alertCondition === 'BELOW' && alertModalItem.currentPrice <= targetVal);

    if (isAlreadyTriggered) {
      togglePriceAlertTriggered(saved.id);
      showToast(`🚨 Price alert set for ${alertModalItem.ticker} (Target ${formatCurrency(targetVal, alertModalItem.currency)} already met!)`);
    } else {
      showToast(`🔔 Price alert set for ${alertModalItem.ticker} at ${formatCurrency(targetVal, alertModalItem.currency)}!`);
    }

    setAlertModalItem(null);
    refreshAlerts();
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

      // Attempt to look up live market details if missing
      let livePrice = existing?.currentPrice;
      let livePreviousClose = existing?.previousClose;
      let livePriceChange = existing?.priceChange;
      let livePriceChangePercent = existing?.priceChangePercent;
      let liveExchange = existing?.exchange;
      let liveLogoUrl = existing?.logoUrl;
      let liveName = existing?.name;

      if (!livePrice || !liveLogoUrl) {
        try {
          const quoteRes = await fetch(`/api/price/${cleanTicker}?currency=${formCurrency}&forceRefresh=true`, {
            headers: { 'Accept': 'application/json' }
          });
          if (quoteRes.ok) {
            const quote = await safeParseResponseJson<any>(quoteRes);
            if (quote && quote.currentPrice) {
              livePrice = quote.currentPrice;
              livePreviousClose = quote.previousClose;
              livePriceChange = quote.priceChange;
              livePriceChangePercent = quote.priceChangePercent;
              liveExchange = quote.exchange;
            }
          }
        } catch (e) {
          console.warn('Could not fetch immediate live price for added position:', e);
        }
      }

      const saved = await savePortfolioPosition({
        ticker: cleanTicker,
        avgPrice: numAvg,
        shares: formShares ? parseFloat(formShares) : undefined,
        currency: formCurrency,
        notes: formNotes.trim() || undefined,
        name: liveName || existing?.name,
        exchange: liveExchange || existing?.exchange,
        currentPrice: livePrice,
        previousClose: livePreviousClose,
        priceChange: livePriceChange,
        priceChangePercent: livePriceChangePercent,
        trend: existing?.trend,
        recommendationAction: existing?.recommendationAction,
        ma5: existing?.ma5,
        avwapAthPrice: existing?.avwapAthPrice,
        dividendYield: existing?.dividendYield,
        logoUrl: liveLogoUrl || existing?.logoUrl
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

  // Clear all positions
  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      await clearAllPortfolioPositions();
      setPositions([]);
      setClearAllConfirmOpen(false);
    } finally {
      setClearingAll(false);
    }
  };

  // Navigate to full analysis page with stored average price
  const handleAnalyzeStock = (pos: PortfolioPosition) => {
    const params = new URLSearchParams({
      ticker: pos.ticker,
      avgPrice: pos.avgPrice.toString(),
      currency: pos.currency || 'USD',
      ...(pos.shares ? { shares: pos.shares.toString() } : {}),
      ts: Date.now().toString()
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
    let totalUnweightedGainPercent = 0;
    let positionsWithValidCost = 0;

    positions.forEach(pos => {
      const effectivePrice = pos.currentPrice || pos.lastAnalyzedPrice || pos.avgPrice;
      const gainPercent = pos.avgPrice > 0 ? ((effectivePrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;

      if (pos.avgPrice > 0) {
        totalUnweightedGainPercent += gainPercent;
        positionsWithValidCost++;
      }

      // Only qualify as best gainer if the return is strictly positive
      if (gainPercent > 0 && (!bestGainer || gainPercent > bestGainer.gainPercent)) {
        bestGainer = { ticker: pos.ticker, gainPercent };
      }
      if (gainPercent < 0 && (!worstLoser || gainPercent < worstLoser.gainPercent)) {
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
    const avgHoldingGainPercent = positionsWithValidCost > 0 ? totalUnweightedGainPercent / positionsWithValidCost : 0;

    return {
      totalPositions: positions.length,
      validHoldingsWithShares,
      totalCostBasis,
      totalMarketValue,
      totalPnl,
      totalPnlPercent,
      avgHoldingGainPercent,
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
      if (filterType === 'bullish') {
        const act = (pos.recommendationAction || '').toUpperCase();
        return pos.trend === 'Bullish' || act === 'BUY' || act === 'BUY MORE';
      }
      if (filterType === 'bearish') {
        const act = (pos.recommendationAction || '').toUpperCase();
        return pos.trend === 'Bearish' || act === 'SELL' || act === 'SELL_ALL' || act === 'SELL_PARTIAL' || act === 'AVOID';
      }
      if (filterType === 'alerts_only') {
        return alerts.some(a => a.ticker.toUpperCase() === pos.ticker.toUpperCase());
      }

      return true;
    }).sort((a, b) => {
      const priceA = a.currentPrice || a.lastAnalyzedPrice || a.avgPrice || 0;
      const priceB = b.currentPrice || b.lastAnalyzedPrice || b.avgPrice || 0;
      const costA = a.avgPrice || 0;
      const costB = b.avgPrice || 0;
      const gainA = a.avgPrice > 0 ? ((priceA - a.avgPrice) / a.avgPrice) * 100 : 0;
      const gainB = b.avgPrice > 0 ? ((priceB - b.avgPrice) / b.avgPrice) * 100 : 0;
      const valA = (a.shares || 0) * priceA;
      const valB = (b.shares || 0) * priceB;

      let diff = 0;
      if (sortBy === 'costBasis') {
        diff = costA - costB;
      } else if (sortBy === 'currentPrice') {
        diff = priceA - priceB;
      } else if (sortBy === 'gain') {
        diff = gainA - gainB;
      } else if (sortBy === 'value') {
        diff = valA - valB;
      } else if (sortBy === 'ticker') {
        diff = a.ticker.localeCompare(b.ticker);
      } else {
        // default: 'date'
        diff = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      }

      return sortDirection === 'desc' ? -diff : diff;
    });
  }, [positions, searchQuery, filterType, sortBy, sortDirection, alerts]);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.triggered).length;
  }, [alerts]);

  const triggeredAlertsCount = useMemo(() => {
    return alerts.filter(a => a.triggered).length;
  }, [alerts]);

  const activeAlertsByTicker = useMemo(() => {
    const map: Record<string, PriceAlert[]> = {};
    alerts.forEach(a => {
      const sym = a.ticker.toUpperCase();
      if (!map[sym]) map[sym] = [];
      map[sym].push(a);
    });
    return map;
  }, [alerts]);

  const handleColumnSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection(column === 'ticker' ? 'asc' : 'desc');
    }
  };

  const renderSortHeader = (column: SortColumn, label: string) => {
    const isActive = sortBy === column;
    return (
      <button
        type="button"
        onClick={() => handleColumnSort(column)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none group text-left",
          isActive 
            ? "text-black dark:text-white font-black" 
            : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
        )}
        title={`Sort by ${label} (${isActive ? (sortDirection === 'desc' ? 'High to Low' : 'Low to High') : 'Click to sort'})`}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'desc' ? (
            <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
          ) : (
            <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-2.5 h-2.5 opacity-25 group-hover:opacity-75 transition-opacity shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-100 transition-colors duration-300">
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* Header Title & Top Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 flex items-center justify-center shadow-sm">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Saved Stock Portfolio</h1>
                {lastRefreshedAt && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-black/5 dark:border-white/5">
                    Synced {format(lastRefreshedAt, 'HH:mm:ss')}
                  </span>
                )}
              </div>
              <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                Market quotes updated on sync · US real-time, UK & Int'l ~15m delayed per exchange regulations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {positions.length > 0 && (
              <button
                onClick={() => setClearAllConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 text-xs font-black uppercase tracking-wider text-black/50 hover:text-red-600 dark:text-white/50 dark:hover:text-red-400 hover:border-red-500/30 transition-all shadow-xs cursor-pointer"
                title="Clear all saved portfolio positions"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}

            <button
              onClick={() => handleRefreshAllPrices()}
              disabled={refreshing || positions.length === 0}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Sync market prices (US real-time, UK/Int'l 15m delayed)"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500", refreshing && "animate-spin")} />
              <span>{refreshing ? 'Updating...' : 'Sync Market Prices'}</span>
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
        <div className={cn(
          "grid gap-3 md:gap-4",
          portfolioSummary.bestGainer 
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" 
            : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
        )}>
          <div className="bg-white dark:bg-[#141414] p-4 md:p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              Tracked Positions
            </span>
            <div className="text-xl md:text-2xl font-black tracking-tight tabular-nums">
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
            <div className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white tabular-nums">
              {portfolioSummary.totalMarketValue && portfolioSummary.totalMarketValue > 0 
                ? formatCurrency(portfolioSummary.totalMarketValue, 'USD')
                : (positions.length > 0 ? `${positions.length} Monitored` : '—')}
            </div>
            <p className="text-[10px] text-black/40 dark:text-white/40 font-medium">
              Cost basis: {portfolioSummary.totalCostBasis && portfolioSummary.totalCostBasis > 0 ? formatCurrency(portfolioSummary.totalCostBasis, 'USD') : '—'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#141414] p-4 md:p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              Unrealized Profit / Loss
            </span>
            <div className={cn(
              "text-xl md:text-2xl font-black tracking-tight flex items-center gap-1.5 tabular-nums",
              (portfolioSummary.totalCostBasis > 0 ? portfolioSummary.totalPnl >= 0 : portfolioSummary.avgHoldingGainPercent >= 0)
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-red-500"
            )}>
              {(portfolioSummary.totalCostBasis > 0 ? portfolioSummary.totalPnl >= 0 : portfolioSummary.avgHoldingGainPercent >= 0) 
                ? <TrendingUp className="w-5 h-5 shrink-0" /> 
                : <TrendingDown className="w-5 h-5 shrink-0" />}
              {portfolioSummary.totalCostBasis > 0 
                ? `${portfolioSummary.totalPnl >= 0 ? '+' : ''}${formatCurrency(portfolioSummary.totalPnl, 'USD')}`
                : `${portfolioSummary.avgHoldingGainPercent >= 0 ? '+' : ''}${portfolioSummary.avgHoldingGainPercent.toFixed(2)}%`}
            </div>
            <p className={cn(
              "text-[10px] font-bold",
              (portfolioSummary.totalCostBasis > 0 ? portfolioSummary.totalPnlPercent >= 0 : portfolioSummary.avgHoldingGainPercent >= 0)
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-red-500"
            )}>
              {portfolioSummary.totalCostBasis > 0 
                ? `${portfolioSummary.totalPnlPercent >= 0 ? '+' : ''}${portfolioSummary.totalPnlPercent.toFixed(2)}% Overall` 
                : 'Tracking Cost Basis'}
            </p>
          </div>

          {portfolioSummary.bestGainer && (
            <div className="bg-white dark:bg-[#141414] p-4 md:p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
                Top Gainer
              </span>
              <div className="text-xl md:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>{portfolioSummary.bestGainer.ticker}</span>
                <span className="text-sm font-bold tabular-nums">
                  +{portfolioSummary.bestGainer.gainPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-black/40 dark:text-white/40 font-medium">Best performing cost basis</p>
            </div>
          )}

          {/* Price Alerts Summary Card - Single Unified Home for Alerts */}
          <div 
            onClick={() => setShowAlertsPanel(true)}
            className={cn(
              "p-4 md:p-5 rounded-2xl border shadow-xs cursor-pointer transition-all group space-y-1 relative",
              triggeredAlertsCount > 0
                ? "bg-amber-50/90 dark:bg-amber-950/30 border-amber-400/80 dark:border-amber-600/60 hover:border-amber-500 shadow-amber-500/5 ring-1 ring-amber-400/30"
                : "bg-white dark:bg-[#141414] border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
            )}
            title={triggeredAlertsCount > 0 ? "Review triggered price alert milestones" : "Open Price Alerts Center"}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest block",
                triggeredAlertsCount > 0 ? "text-amber-800 dark:text-amber-300" : "text-black/40 dark:text-white/40"
              )}>
                Price Alerts
              </span>
              <div className="flex items-center gap-1.5">
                {triggeredAlertsCount > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse fill-amber-500/20" />
                  </>
                ) : (
                  <Bell className={cn("w-3.5 h-3.5 transition-colors", alerts.length > 0 ? "text-emerald-500 fill-emerald-500/20" : "text-black/30 dark:text-white/30")} />
                )}
              </div>
            </div>

            <div className="text-xl md:text-2xl font-black tracking-tight tabular-nums flex items-baseline gap-1.5">
              {triggeredAlertsCount > 0 ? (
                <>
                  <span className="text-amber-900 dark:text-amber-200">{triggeredAlertsCount}</span>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-tight">Triggered!</span>
                  <span className="text-[10px] font-semibold text-black/50 dark:text-white/50">
                    ({activeAlertsCount} active)
                  </span>
                </>
              ) : (
                <>
                  <span className="text-black dark:text-white">{activeAlertsCount}</span>
                  <span className="text-xs font-bold text-black/40 dark:text-white/40">Active</span>
                  {alerts.length > 0 && alerts.length !== activeAlertsCount && (
                    <span className="text-[10px] font-medium text-black/40 dark:text-white/40">
                      ({alerts.length} total)
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold mt-0.5">
              <span className={cn(
                triggeredAlertsCount > 0 
                  ? "text-amber-800 dark:text-amber-300 font-black" 
                  : "text-emerald-600 dark:text-emerald-400"
              )}>
                {triggeredAlertsCount > 0 ? `Review & Re-Arm (${alerts.length})` : `Alerts Hub (${alerts.length})`}
              </span>
              <ChevronRight className={cn(
                "w-3 h-3 group-hover:translate-x-0.5 transition-transform",
                triggeredAlertsCount > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-400"
              )} />
            </div>
          </div>
        </div>

        {/* Search, Filters & View Switcher Bar */}
        <div className="bg-white dark:bg-[#141414] p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" />
              <input 
                type="text"
                placeholder="Search by ticker (e.g. NVDA), name, or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:border-emerald-500 transition-all placeholder:normal-case placeholder:font-normal placeholder:text-black/35 dark:placeholder:text-white/35"
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
              {(['all', 'gainers', 'losers', 'bullish', 'bearish', 'alerts_only'] as const).map(tab => {
                const countWithAlerts = positions.filter(p => alerts.some(a => a.ticker.toUpperCase() === p.ticker.toUpperCase())).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                      filterType === tab
                        ? "bg-black dark:bg-white text-white dark:text-black shadow-xs"
                        : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10"
                    )}
                  >
                    {tab === 'alerts_only' && <Bell className={cn("w-3 h-3", alerts.length > 0 && "fill-amber-500 text-amber-500")} />}
                    <span>
                      {tab === 'all' ? 'All' :
                       tab === 'alerts_only' ? `With Alerts (${countWithAlerts})` :
                       tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] font-black uppercase text-black/30 dark:text-white/30">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  const col = e.target.value as SortColumn;
                  setSortBy(col);
                  setSortDirection(col === 'ticker' ? 'asc' : 'desc');
                }}
                className="bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="date">Analyzed Date</option>
                <option value="gain">Unrealized P/L</option>
                <option value="costBasis">Cost Basis</option>
                <option value="currentPrice">Current Price</option>
                <option value="value">Position Value</option>
                <option value="ticker">Ticker (A-Z)</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-xl bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title={`Sort ${sortDirection === 'desc' ? 'Descending (High to Low)' : 'Ascending (Low to High)'} - Click to reverse`}
                aria-label="Toggle sort direction"
              >
                {sortDirection === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* View Mode Toggle (Consistent with Watchlist) */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => {
                  setViewMode('table');
                  try { localStorage.setItem('portfolio_view_mode', 'table'); } catch {}
                }}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                  viewMode === 'table'
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs"
                    : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                )}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setViewMode('grid');
                  try { localStorage.setItem('portfolio_view_mode', 'grid'); } catch {}
                }}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                  viewMode === 'grid'
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs"
                    : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                )}
                title="3-Grid View"
                aria-label="3-Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
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
              {filterType === 'alerts_only' ? (
                <Bell className="w-8 h-8 text-amber-500" />
              ) : (
                <Sparkles className="w-8 h-8" />
              )}
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                {filterType === 'alerts_only' 
                  ? 'No Price Alerts Set on Portfolio Positions'
                  : searchQuery || filterType !== 'all' 
                    ? 'No Matching Positions' 
                    : 'Your Portfolio is Empty'}
              </h3>
              <p className="text-xs md:text-sm text-black/50 dark:text-white/50 leading-relaxed max-w-md mx-auto">
                {filterType === 'alerts_only'
                  ? "You don't have any price alerts set for this filter. Click the bell icon or target buttons on any portfolio position to configure target alerts."
                  : searchQuery || filterType !== 'all' 
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
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await resetToDefaultPortfolio();
                      setPositions(res);
                      setTimeout(() => {
                        handleRefreshAllPrices(res);
                      }, 200);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-[#1A1A1A] border border-black/10 dark:border-white/10 hover:border-emerald-500/50 text-black dark:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Restore Starter Positions</span>
                </button>
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Deep Analysis
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
              const itemAlerts = alerts.filter(a => a.ticker.toUpperCase() === pos.ticker.toUpperCase());

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
                      <div className="flex items-center gap-3 min-w-0">
                        <TickerLogo ticker={pos.ticker} logoUrl={pos.logoUrl} companyName={pos.name} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-lg tracking-tight">{pos.ticker}</h3>
                            {pos.currency && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 font-mono">
                                {pos.currency}
                              </span>
                            )}
                          </div>
                          <p 
                            className="text-xs font-semibold text-black/70 dark:text-white/70 leading-tight" 
                            title={pos.name || getAuthoritativeCompanyName(pos.ticker)}
                          >
                            {pos.name || getAuthoritativeCompanyName(pos.ticker)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-medium text-black/40 dark:text-white/40">
                              {pos.exchange || 'Canonical Feed'}
                            </p>
                            {itemAlerts.length > 0 && (
                              <button
                                onClick={() => handleOpenAlertModal(pos)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 cursor-pointer"
                                title={`${itemAlerts.length} price alert(s) set`}
                              >
                                <Bell className="w-2.5 h-2.5 fill-amber-500" />
                                <span>{itemAlerts.length} alert{itemAlerts.length > 1 ? 's' : ''}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Alert, Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenAlertModal(pos)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                            itemAlerts.length > 0
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "hover:bg-black/5 dark:hover:bg-white/5 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                          )}
                          title={itemAlerts.length > 0 ? `${itemAlerts.length} alert(s) configured (Click to edit)` : "Set Price Alert"}
                        >
                          <Bell className={cn("w-3.5 h-3.5", itemAlerts.length > 0 && "fill-amber-500")} />
                        </button>
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
                        {Boolean(pos.shares && pos.shares > 0) && (
                          <span className="text-[9px] font-bold text-black/40 dark:text-white/40">
                            {pos.shares} {pos.shares === 1 ? 'share' : 'shares'}
                          </span>
                        )}
                        <span className="text-[8px] font-mono text-neutral-400 dark:text-neutral-500 block mt-0.5">
                          User · Purchase Ledger
                        </span>
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
                        {(() => {
                          const feedInfo = getExchangeDelayLabel(pos.ticker, pos.exchange);
                          return (
                            <span className={cn(
                              "text-[8px] font-mono block mt-0.5",
                              feedInfo.isDelayed ? "text-amber-600 dark:text-amber-400" : "text-neutral-400 dark:text-neutral-500"
                            )}>
                              {feedInfo.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Extended Position Value if shares specified and holding value > 0 */}
                    {Boolean(pos.shares && pos.shares > 0 && totalVal && totalVal > 0) && (
                      <div className="flex items-center justify-between text-xs px-2.5 py-1.5 mb-2 font-mono bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-black/5 dark:border-white/5">
                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">Holding Value:</span>
                        <div className="text-right">
                          <span className="font-bold text-neutral-900 dark:text-neutral-50 text-xs">
                            {formatCurrency(totalVal, pos.currency || 'USD')}
                          </span>
                          <span className={cn(
                            "text-[10px] font-semibold ml-1.5 whitespace-nowrap tabular-nums",
                            totalGainDollar >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            ({totalGainDollar >= 0 ? '+' : ''}{formatCurrency(totalGainDollar, pos.currency || 'USD')})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Strategy Targets: Clickable to Set Instant Alerts (Consistent with Watchlist) */}
                    {(() => {
                      const currentPx = currentPrice > 0 ? currentPrice : pos.avgPrice;
                      const calcTakeProfit = pos.takeProfit || Number((currentPx * 1.15).toFixed(2));
                      const calcIdealEntry = pos.idealEntry || Number((currentPx * 0.95).toFixed(2));
                      const tpUpside = currentPx > 0 ? ((calcTakeProfit - currentPx) / currentPx) * 100 : 15;
                      const entryDist = currentPx > 0 ? ((calcIdealEntry - currentPx) / currentPx) * 100 : -5;
                      const entryDistStr = `${entryDist >= 0 ? '+' : '−'}${Math.abs(entryDist).toFixed(1)}%`;

                      return (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {/* Take-Profit Target with quick alert button */}
                          <div 
                            onClick={() => handleOpenAlertModal(pos, 'TAKE_PROFIT')}
                            className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/30 text-left hover:border-emerald-500 cursor-pointer transition-all group/target relative"
                            title="Click to set Take-Profit price alert"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                <Target className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                Target
                              </span>
                              <span className="text-[8px] font-black font-mono text-emerald-700 dark:text-emerald-300">
                                +{tpUpside.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-xs font-black font-mono text-emerald-950 dark:text-emerald-100">
                                {formatCurrency(calcTakeProfit, pos.currency || 'USD')}
                              </p>
                              <Bell className="w-3 h-3 text-emerald-600/60 dark:text-emerald-400/60 group-hover/target:scale-110 group-hover/target:text-emerald-600 transition-transform" />
                            </div>
                          </div>

                          {/* Ideal Entry Zone / Accumulation with quick alert button */}
                          <div 
                            onClick={() => handleOpenAlertModal(pos, 'ENTRY_ZONE')}
                            className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/30 text-left hover:border-blue-500 cursor-pointer transition-all group/entry relative"
                            title="Click to set Entry Zone / Accumulation price alert"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1">
                                <Crosshair className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                Entry Zone
                              </span>
                              <span className="text-[8px] font-bold text-blue-700 dark:text-blue-300 font-mono">
                                {entryDistStr}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-xs font-black font-mono text-blue-950 dark:text-blue-100">
                                {formatCurrency(calcIdealEntry, pos.currency || 'USD')}
                              </p>
                              <Bell className="w-3 h-3 text-blue-600/60 dark:text-blue-400/60 group-hover/entry:scale-110 group-hover/entry:text-blue-600 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Stored Technical & Fundamental Signals */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {pos.trend && (
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                          pos.trend === 'Bullish' ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" :
                          pos.trend === 'Bearish' ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25" :
                          "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                        )}>
                          {pos.trend} Trend
                        </span>
                      )}

                      {(() => {
                        const badgeInfo = getRecommendationBadgeInfo(pos.recommendationAction, pos.sellPercentage);
                        if (!badgeInfo) return null;
                        return (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md",
                            badgeInfo.className
                          )}>
                            {badgeInfo.label}
                          </span>
                        );
                      })()}

                      {pos.avwapAthPrice && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25 flex items-center gap-1">
                          <Anchor className="w-3 h-3 shrink-0" />
                          <span>ATH AVWAP: {formatCurrency(pos.avwapAthPrice, pos.currency || 'USD')}</span>
                        </span>
                      )}

                      {Boolean(pos.dividendYield && pos.dividendYield > 0) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 flex items-center gap-1">
                          <span>{pos.dividendYield.toFixed(2)}% Div Yield</span>
                          {pos.dividendRate ? <span>({formatCurrency(pos.dividendRate, pos.currency || 'USD')}/yr)</span> : null}
                          {pos.exDividendDate ? <span>• Ex: {pos.exDividendDate}</span> : null}
                        </span>
                      )}
                    </div>

                    {pos.notes && (
                      <p className="text-[10px] text-black/50 dark:text-white/50 italic bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-lg border border-black/5 dark:border-white/5 mt-2 line-clamp-2">
                        "{pos.notes}"
                      </p>
                    )}
                  </div>

                  {/* Bottom Action: Analyze with Stored Price & Alert */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <span className="text-[8px] font-bold text-black/30 dark:text-white/30">
                      Saved {pos.date ? format(parseISO(pos.date), 'MMM dd, yyyy') : 'Recently'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenAlertModal(pos)}
                        className={cn(
                          "p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0",
                          itemAlerts.length > 0
                            ? "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                            : "bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                        )}
                        title={itemAlerts.length > 0 ? `${itemAlerts.length} alert(s) set (Click to configure)` : "Set Price Alert"}
                      >
                        <Bell className={cn("w-3.5 h-3.5", itemAlerts.length > 0 && "fill-amber-500")} />
                      </button>

                      <button
                        onClick={() => handleAnalyzeStock(pos)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-black transition-all cursor-pointer shadow-xs group/btn"
                      >
                        <span>Deep Analysis</span>
                        <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
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
                    <th className="px-5 py-4">
                      {renderSortHeader('ticker', 'Ticker / Asset')}
                    </th>
                    <th className="px-5 py-4">
                      {renderSortHeader('costBasis', 'Cost Basis')}
                    </th>
                    <th className="px-5 py-4">
                      {renderSortHeader('currentPrice', 'Current Price')}
                    </th>
                    <th className="px-5 py-4">
                      {renderSortHeader('gain', 'Unrealized P/L')}
                    </th>
                    <th className="px-5 py-4">
                      {renderSortHeader('value', 'Position Value')}
                    </th>
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
                    const itemAlerts = alerts.filter(a => a.ticker.toUpperCase() === pos.ticker.toUpperCase());

                    return (
                      <tr key={pos.ticker} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <TickerLogo ticker={pos.ticker} logoUrl={pos.logoUrl} companyName={pos.name} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-sm block leading-tight">{pos.ticker}</span>
                                {itemAlerts.length > 0 && (
                                  <button
                                    onClick={() => handleOpenAlertModal(pos)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                                    title={`${itemAlerts.length} active alert(s)`}
                                  >
                                    <Bell className="w-2.5 h-2.5 fill-amber-500" />
                                    <span>{itemAlerts.length}</span>
                                  </button>
                                )}
                              </div>
                              <span 
                                className="text-xs font-semibold text-black/70 dark:text-white/70 block leading-tight" 
                                title={pos.name || getAuthoritativeCompanyName(pos.ticker)}
                              >
                                {pos.name || getAuthoritativeCompanyName(pos.ticker)}
                              </span>
                              <span className="text-[9px] text-black/40 dark:text-white/40 uppercase block mt-0.5">{pos.exchange || pos.currency || 'USD'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono font-bold">
                          <div>{formatCurrency(pos.avgPrice, pos.currency || 'USD')}</div>
                          {Boolean(pos.shares && pos.shares > 0) && (
                            <div className="text-[9px] text-black/40 dark:text-white/40 font-sans">
                              {pos.shares} {pos.shares === 1 ? 'share' : 'shares'}
                            </div>
                          )}
                          <span className="text-[8px] font-mono text-neutral-400 dark:text-neutral-500 block">
                            User Ledger
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono font-black">
                          <div>{formatCurrency(currentPrice, pos.currency || 'USD')}</div>
                          {(() => {
                            const feedInfo = getExchangeDelayLabel(pos.ticker, pos.exchange);
                            return (
                              <span className={cn(
                                "text-[8px] font-mono block font-normal",
                                feedInfo.isDelayed ? "text-amber-600 dark:text-amber-400" : "text-neutral-400 dark:text-neutral-500"
                              )}>
                                {feedInfo.label}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="px-5 py-4 font-mono font-black">
                          <div className={cn(
                            "flex items-center gap-1",
                            isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                          )}>
                            {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isProfit ? '+' : ''}{gainPercent.toFixed(2)}%
                          </div>
                          {Boolean(pos.shares && pos.shares > 0 && totalVal && totalVal > 0) && (
                            <div className={cn("text-[9px]", totalGainDollar >= 0 ? "text-emerald-600/70" : "text-red-500/70")}>
                              {totalGainDollar >= 0 ? '+' : ''}{formatCurrency(totalGainDollar, pos.currency || 'USD')}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono font-black">
                          {Boolean(pos.shares && pos.shares > 0 && totalVal && totalVal > 0) ? (
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            {pos.trend && (
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                                pos.trend === 'Bullish' ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" :
                                pos.trend === 'Bearish' ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25" :
                                "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                              )}>
                                {pos.trend}
                              </span>
                            )}
                            {(() => {
                              const badgeInfo = getRecommendationBadgeInfo(pos.recommendationAction, pos.sellPercentage);
                              if (!badgeInfo) return null;
                              return (
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-md",
                                  badgeInfo.className
                                )}>
                                  {badgeInfo.label}
                                </span>
                              );
                            })()}
                          </div>
                          {/* Quick Target Alerts (Consistent with Watchlist) */}
                          {(() => {
                            const currentPx = currentPrice > 0 ? currentPrice : pos.avgPrice;
                            const calcTakeProfit = pos.takeProfit || Number((currentPx * 1.15).toFixed(2));
                            const calcIdealEntry = pos.idealEntry || Number((currentPx * 0.95).toFixed(2));
                            return (
                              <div className="flex items-center gap-2 mt-1.5">
                                <button
                                  onClick={() => handleOpenAlertModal(pos, 'TAKE_PROFIT')}
                                  className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                                  title="Click to set Take-Profit alert"
                                >
                                  <Target className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>TP: {formatCurrency(calcTakeProfit, pos.currency || 'USD')}</span>
                                </button>
                                <button
                                  onClick={() => handleOpenAlertModal(pos, 'ENTRY_ZONE')}
                                  className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                                  title="Click to set Entry Zone alert"
                                >
                                  <Crosshair className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                  <span>Entry: {formatCurrency(calcIdealEntry, pos.currency || 'USD')}</span>
                                </button>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAnalyzeStock(pos)}
                              className="p-2 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all cursor-pointer"
                              title="Deep Analysis"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenAlertModal(pos)}
                              className={cn(
                                "p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0",
                                itemAlerts.length > 0
                                  ? "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                                  : "bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                              )}
                              title={itemAlerts.length > 0 ? `${itemAlerts.length} alert(s) set (Click to configure)` : "Set Price Alert"}
                            >
                              <Bell className={cn("w-3.5 h-3.5", itemAlerts.length > 0 && "fill-amber-500")} />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1 text-left w-full">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                        Stock Ticker
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. NVDA, CSPX.L, NESN.SW"
                      value={formTicker}
                      onChange={(e) => setFormTicker(e.target.value.toUpperCase())}
                      disabled={!!editingTicker}
                      required
                      className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-bold uppercase outline-none focus:border-emerald-500 disabled:opacity-50 text-sm placeholder:normal-case placeholder:font-normal placeholder:text-black/35 dark:placeholder:text-white/35"
                    />
                    {formTicker.trim() && getAuthoritativeCompanyName(formTicker.trim()) !== formTicker.trim().toUpperCase() && (
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1 leading-snug break-words">
                        {getAuthoritativeCompanyName(formTicker.trim())}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-left w-full">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                        Avg Purchase Price
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Cost basis (e.g. 124.50)"
                      value={formAvgPrice}
                      onChange={(e) => setFormAvgPrice(e.target.value)}
                      required
                      className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-bold font-mono outline-none focus:border-emerald-500 text-sm placeholder:font-sans placeholder:font-normal placeholder:text-xs placeholder:text-black/35 dark:placeholder:text-white/35"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1 text-left w-full">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                        Shares (Optional)
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 25 shares"
                      value={formShares}
                      onChange={(e) => setFormShares(e.target.value)}
                      className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-bold outline-none focus:border-emerald-500 text-sm placeholder:font-normal placeholder:text-black/35 dark:placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-1 text-left w-full">
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
                      <option value="CHF">CHF (Fr)</option>
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
                    placeholder="e.g. Long-term AI infrastructure hold, target exit at 180"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full h-11 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-3.5 font-medium outline-none focus:border-emerald-500 text-sm placeholder:text-black/35 dark:placeholder:text-white/35"
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
      {/* CLEAR ALL PORTFOLIO CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      <AnimatePresence>
        {clearAllConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#141414] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl w-full max-w-sm p-6 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg">Clear Entire Portfolio?</h3>
                <p className="text-xs text-black/50 dark:text-white/50 mt-1">
                  This will remove all {positions.length} stocks from both your browser and disk storage, resetting your portfolio to a clean empty state.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  disabled={clearingAll}
                  onClick={() => setClearAllConfirmOpen(false)}
                  className="py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={clearingAll}
                  onClick={handleClearAll}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-[10px] transition-colors shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {clearingAll ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Clearing...</span>
                    </>
                  ) : (
                    <span>Confirm Clear</span>
                  )}
                </button>
              </div>
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

      {/* ======================================================== */}
      {/* TOAST NOTIFICATION */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* SET PRICE ALERT MODAL */}
      {/* ======================================================== */}
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
                    {alertModalItem.idealEntry && (
                      <span className="text-blue-600 dark:text-blue-400">Entry: {formatCurrency(alertModalItem.idealEntry, alertModalItem.currency)}</span>
                    )}
                    {alertModalItem.takeProfit && (
                      <span className="text-emerald-600 dark:text-emerald-400">Target: {formatCurrency(alertModalItem.takeProfit, alertModalItem.currency)}</span>
                    )}
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
                      const tp = alertModalItem.takeProfit || Number((alertModalItem.currentPrice * 1.15).toFixed(2));
                      setAlertTargetPrice(tp.toString());
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
                    <span className="font-mono font-black">
                      {formatCurrency(alertModalItem.takeProfit || Number((alertModalItem.currentPrice * 1.15).toFixed(2)), alertModalItem.currency)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const entry = alertModalItem.idealEntry || Number((alertModalItem.currentPrice * 0.95).toFixed(2));
                      setAlertTargetPrice(entry.toString());
                      setAlertCondition(alertModalItem.currentPrice > entry ? 'BELOW' : 'ABOVE');
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
                    <span className="font-mono font-black">
                      {formatCurrency(alertModalItem.idealEntry || Number((alertModalItem.currentPrice * 0.95).toFixed(2)), alertModalItem.currency)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sl = alertModalItem.stopLoss || Number((alertModalItem.currentPrice * 0.92).toFixed(2));
                      setAlertTargetPrice(sl.toString());
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
                    <span className="font-mono font-black">
                      {formatCurrency(alertModalItem.stopLoss || Number((alertModalItem.currentPrice * 0.92).toFixed(2)), alertModalItem.currency)}
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleSaveAlert} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="w-full">
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
                      placeholder={`e.g. ${alertModalItem.takeProfit || alertModalItem.currentPrice}`}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="w-full">
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
                    placeholder="e.g. Take 50% profit, trail stop to breakeven..."
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

      {/* ======================================================== */}
      {/* PRICE ALERTS HUB MODAL / DRAWER */}
      {/* ======================================================== */}
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
                    Manage active price alerts, review triggered milestones, and track notifications for your portfolio.
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
                      Click the bell icon next to any stock in your Portfolio to create target price notifications.
                    </p>
                  </div>
                ) : (
                  alerts.map((al) => {
                    const pos = positions.find(p => p.ticker.toUpperCase() === al.ticker.toUpperCase());
                    const currentPrice = pos?.currentPrice || pos?.lastAnalyzedPrice || al.initialPrice;
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
    </div>
  );
}
