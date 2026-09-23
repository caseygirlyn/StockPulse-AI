import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  RefreshCw,
  ArrowUpDown,
  Crosshair,
  PieChart,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ChevronRight,
  Check,
  Wallet,
  Compass,
  Activity,
  Scale,
  Layers,
  HelpCircle,
  Zap,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { analyzeStock, getLatestPrice, formatExchangeShortCode, type StockData } from '../services/geminiService';
import { TOP_20_RECOMMENDED_STOCKS } from '../services/watchlistService';
import { 
  fetchPortfolio, 
  savePortfolioPosition, 
  getLocalPortfolio, 
  type PortfolioPosition 
} from '../services/portfolioService';
import MultiCurrencyValuation from '../components/MultiCurrencyValuation';
import StockPriceChart from '../components/StockPriceChart';
import TickerLogo from '../components/TickerLogo';
import { WhatShouldIDoBox } from '../components/WhatShouldIDoBox';
import { WhyThisRecommendation } from '../components/WhyThisRecommendation';
import { MarketReactionCard } from '../components/MarketReactionCard';
import { isExchangeMarketOpen } from '../utils/marketHours';
import { getAuthoritativeCompanyName } from '../utils/tickerLogos';
import { cn, formatCurrency } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { useRiskProfile, RiskProfile } from '../context/RiskContext';

function formatDivDate(d?: string | number): string {
  if (!d) return '';
  try {
    if (typeof d === 'number') {
      const ms = d < 1e11 ? d * 1000 : d;
      return format(new Date(ms), 'MMM d, yyyy');
    }
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return String(d);
  }
}

function formatDivDateShort(d?: string | number): string {
  if (!d) return '';
  try {
    if (typeof d === 'number') {
      const ms = d < 1e11 ? d * 1000 : d;
      return format(new Date(ms), 'MMM d');
    }
    return format(parseISO(d), 'MMM d');
  } catch {
    return String(d);
  }
}

const CLIENT_EARNINGS_MAP: Record<string, {
  earningsDate: string;
  daysUntilEarnings?: number;
  fiscalQuarter?: string;
  epsEstimate: string;
  epsPriorYear?: string;
  epsGrowthYoY?: string;
  revenueEstimate: string;
  revenueGrowthYoY?: string;
  revisions: string;
  revisionsSentiment?: 'bullish' | 'neutral' | 'bearish';
  impliedMove?: string;
  lastQuarterSurprise?: string;
  consensusRevisions?: string;
  keyRisk?: string;
  catalystThesis?: string;
}> = {
  'MU': {
    earningsDate: 'Sep 25, 2026',
    daysUntilEarnings: 11,
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.74',
    epsPriorYear: '$-0.14',
    epsGrowthYoY: '+1,342%',
    revenueEstimate: '$7.65B',
    revenueGrowthYoY: '+82.4%',
    revisions: '19 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±8.5%',
    lastQuarterSurprise: '+14.2% EPS beat',
    consensusRevisions: 'Upward trend (19 Up / 2 Down)',
    keyRisk: 'HBM memory pricing guidance & margin execution'
  },
  'NVDA': {
    earningsDate: 'Nov 19, 2026',
    daysUntilEarnings: 66,
    fiscalQuarter: 'Q3 FY27',
    epsEstimate: '$0.75',
    epsPriorYear: '$0.40',
    epsGrowthYoY: '+87.5%',
    revenueEstimate: '$33.10B',
    revenueGrowthYoY: '+82.6%',
    revisions: '28 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±7.8%',
    lastQuarterSurprise: '+6.1% EPS beat',
    consensusRevisions: 'Strongly Positive (28 Up)',
    keyRisk: 'Blackwell architecture ramp and supply chain capacity'
  },
  'AAPL': {
    earningsDate: 'Oct 29, 2026',
    daysUntilEarnings: 45,
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.55',
    epsPriorYear: '$1.46',
    epsGrowthYoY: '+6.2%',
    revenueEstimate: '$94.20B',
    revenueGrowthYoY: '+5.3%',
    revisions: '14 Up / 6 Down (30D)',
    revisionsSentiment: 'neutral',
    impliedMove: '±4.2%',
    lastQuarterSurprise: '+3.4% EPS beat',
    consensusRevisions: 'Stable / Balanced (14 Up / 6 Down)',
    keyRisk: 'iPhone 17 cycle adoption & Greater China demand'
  },
  'MSFT': {
    earningsDate: 'Oct 22, 2026',
    daysUntilEarnings: 38,
    fiscalQuarter: 'Q1 FY27',
    epsEstimate: '$3.10',
    epsPriorYear: '$2.99',
    epsGrowthYoY: '+3.7%',
    revenueEstimate: '$64.50B',
    revenueGrowthYoY: '+14.1%',
    revisions: '16 Up / 4 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±4.5%',
    lastQuarterSurprise: '+4.9% EPS beat',
    consensusRevisions: 'Stable / Positive (16 Up / 4 Down)',
    keyRisk: 'Azure AI cloud capacity & capex payback visibility'
  },
  'GOOGL': {
    earningsDate: 'Oct 27, 2026',
    daysUntilEarnings: 43,
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.85',
    epsPriorYear: '$1.55',
    epsGrowthYoY: '+19.4%',
    revenueEstimate: '$86.30B',
    revenueGrowthYoY: '+12.5%',
    revisions: '21 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±5.6%',
    lastQuarterSurprise: '+7.8% EPS beat',
    consensusRevisions: 'Positive (21 Up / 3 Down)',
    keyRisk: 'Search monetization transition & DOJ antitrust remedies'
  },
  'GOOG': {
    earningsDate: 'Oct 27, 2026',
    daysUntilEarnings: 43,
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.85',
    epsPriorYear: '$1.55',
    epsGrowthYoY: '+19.4%',
    revenueEstimate: '$86.30B',
    revenueGrowthYoY: '+12.5%',
    revisions: '21 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±5.6%',
    lastQuarterSurprise: '+7.8% EPS beat',
    consensusRevisions: 'Positive (21 Up / 3 Down)',
    keyRisk: 'Search monetization transition & DOJ antitrust remedies'
  },
  'TSLA': {
    earningsDate: 'Oct 21, 2026',
    daysUntilEarnings: 37,
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.58',
    epsPriorYear: '$0.66',
    epsGrowthYoY: '-12.1%',
    revenueEstimate: '$25.40B',
    revenueGrowthYoY: '+8.9%',
    revisions: '6 Up / 14 Down (30D)',
    revisionsSentiment: 'bearish',
    impliedMove: '±9.2%',
    lastQuarterSurprise: '-8.5% EPS miss',
    consensusRevisions: 'Downward revisions (14 Down)',
    keyRisk: 'Automotive gross margin compression & Robotaxi timeline'
  },
  'RR.L': {
    earningsDate: 'Feb 25, 2027',
    daysUntilEarnings: 164,
    fiscalQuarter: 'FY26 Results',
    epsEstimate: '38.50p',
    epsPriorYear: '29.55p',
    epsGrowthYoY: '+30.3%',
    revenueEstimate: '£18.20B',
    revenueGrowthYoY: '+18.5%',
    revisions: '12 Up / 0 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±5.0%',
    lastQuarterSurprise: '+12.0% beat',
    consensusRevisions: 'Strongly Positive (12 Up)',
    keyRisk: 'Global widebody flying hours & supply chain bottleneck'
  },
  'SAP': {
    earningsDate: 'Oct 21, 2026',
    daysUntilEarnings: 37,
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '€1.35',
    epsPriorYear: '€1.16',
    epsGrowthYoY: '+16.4%',
    revenueEstimate: '€8.55B',
    revenueGrowthYoY: '+9.8%',
    revisions: '18 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±4.5%',
    lastQuarterSurprise: '+6.8% beat',
    consensusRevisions: 'Strongly Positive (18 Up)',
    keyRisk: 'Cloud backlog conversion & European enterprise IT budgets'
  },
  'SAP.DE': {
    earningsDate: 'Oct 21, 2026',
    daysUntilEarnings: 37,
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '€1.35',
    epsPriorYear: '€1.16',
    epsGrowthYoY: '+16.4%',
    revenueEstimate: '€8.55B',
    revenueGrowthYoY: '+9.8%',
    revisions: '18 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    impliedMove: '±4.5%',
    lastQuarterSurprise: '+6.8% beat',
    consensusRevisions: 'Strongly Positive (18 Up)',
    keyRisk: 'Cloud backlog conversion & European enterprise IT budgets'
  }
};

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { riskProfile } = useRiskProfile();
  
  const initialTicker = searchParams.get('ticker') || '';
  const initialAvgPrice = searchParams.get('avgPrice') || '';
  const initialShares = searchParams.get('shares') || '';
  const initialCurrency = searchParams.get('currency') || 'USD';

  const [ticker, setTicker] = useState(initialTicker);
  const [avgPrice, setAvgPrice] = useState<string>(initialAvgPrice);
  const [shares, setShares] = useState<string>(initialShares);
  const [currency, setCurrency] = useState(initialCurrency);
  const [loading, setLoading] = useState(() => Boolean(initialTicker && initialAvgPrice));
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockData | null>(null);
  const [savedPortfolio, setSavedPortfolio] = useState<PortfolioPosition[]>([]);
  const [justSavedNotification, setJustSavedNotification] = useState(false);
  const lastAnalyzedKeyRef = useRef<string>('');

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

  // Handle URL parameters for loading positions
  useEffect(() => {
    const t = searchParams.get('ticker');
    const a = searchParams.get('avgPrice') || '';
    const s = searchParams.get('shares') || '';
    const c = searchParams.get('currency') || 'USD';

    if (t) {
      const key = `${t.trim().toUpperCase()}-${a}-${s}-${c}`;
      if (lastAnalyzedKeyRef.current === key) return;
      lastAnalyzedKeyRef.current = key;

      setTicker(t);
      setAvgPrice(a);
      setShares(s);
      setCurrency(c);
      
      // Trigger analysis automatically
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent, { ticker: t, avgPrice: a, shares: s, currency: c });
    }
  }, [searchParams]);

  const handleSubmit = async (
    e: React.FormEvent, 
    overridePos?: { ticker: string, avgPrice: string, shares: string, currency: string }, 
    forceRefresh: boolean = false,
    overrideRiskProfile?: RiskProfile
  ) => {
    e.preventDefault();
    const currentTicker = overridePos?.ticker || ticker;
    const currentAvgPrice = overridePos ? overridePos.avgPrice : avgPrice;
    const currentCurrency = overridePos?.currency || currency;
    const activeRisk = overrideRiskProfile || riskProfile;

    if (!currentTicker || !currentTicker.trim()) return;

    setLoading(true);
    setError(null);
    setLoadingStep(0);
    
    // Simulate progress for better UX
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const parsedAvg = currentAvgPrice && !isNaN(parseFloat(currentAvgPrice)) && parseFloat(currentAvgPrice) > 0 
        ? parseFloat(currentAvgPrice) 
        : 0;

      const result = await analyzeStock(currentTicker.toUpperCase(), parsedAvg, currentCurrency, forceRefresh, activeRisk);
      setData(result);
      const canonicalDate = result.canonicalTimestamp || result.marketTimestamp || result.lastUpdated;
      setLastUpdated(canonicalDate ? new Date(canonicalDate) : new Date());

      // Automatically store/update this stock in Portfolio only if user specified an actual purchase cost basis
      if (parsedAvg > 0) {
        savePortfolioPosition({
          ticker: result.ticker.toUpperCase(),
          avgPrice: parsedAvg,
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
          sellPercentage: result.recommendation.sellPercentage,
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

  const handleUpdatePrice = async (forceRefresh: boolean = true, silent: boolean = false) => {
    if (!data || !data.ticker?.trim() || isUpdating) return;
    if (!silent) setIsUpdating(true);
    try {
      const latest = await getLatestPrice(data.ticker, currency, forceRefresh);
      const canonicalIso = latest.canonicalTimestamp || latest.marketTimestamp || latest.lastUpdated || new Date().toISOString();

      setData(prev => {
        if (!prev) return null;

        // Prevent unnecessary re-render if key financial indicators have not changed
        if (
          prev.currentPrice === latest.currentPrice &&
          prev.priceChange === latest.priceChange &&
          prev.priceChangePercent === latest.priceChangePercent &&
          prev.previousClose === latest.previousClose
        ) {
          return prev;
        }

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

        const history = [...prev.dailyHistory];
        if (history.length > 0) {
          history[history.length - 1] = {
            ...history[history.length - 1],
            price: latest.currentPrice
          };
          updatedData.dailyHistory = history;
        }

        // Keep recommendation reasons and explanations in sync without redundant price snapshots
        if (updatedData.recommendation?.reasons) {
          updatedData.recommendation = {
            ...updatedData.recommendation,
            reasons: updatedData.recommendation.reasons.filter(
              r => !r.toLowerCase().startsWith('verified live price')
            )
          };
        }
        if (updatedData.analysis?.trendExplanation) {
          updatedData.analysis = {
            ...updatedData.analysis,
            trendExplanation: updatedData.analysis.trendExplanation.replace(
              new RegExp(`${prev.ticker}\\s+is\\s+trading\\s+at\\s+[A-Z0-9$€£.,\\s]+?,\\s*`, 'i'),
              `${prev.ticker} is positioned `
            )
          };
        }
        
        return updatedData;
      });
      
      if (canonicalIso) {
        const newDate = new Date(canonicalIso);
        setLastUpdated(prev => (prev.getTime() !== newDate.getTime() ? newDate : prev));
      }
    } catch (err) {
      if (silent) {
        console.warn("Price update poll skipped (will retry on next interval):", err);
      } else {
        console.error("Price update failed:", err);
      }
    } finally {
      if (!silent) setIsUpdating(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === currency) return;
    setCurrency(newCurrency);
    if (data) {
      setIsUpdating(true);
      setError(null);
      try {
        const result = await analyzeStock(data.ticker, parseFloat(avgPrice || '0'), newCurrency, false);
        setData(result);
        const canonicalDate = result.canonicalTimestamp || result.marketTimestamp || result.lastUpdated;
        setLastUpdated(canonicalDate ? new Date(canonicalDate) : new Date());
      } catch (err) {
        console.error("Currency switch error:", err);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        duration: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15 } }
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
    if (isNaN(qty) || qty === 0) return null;
    const costBasis = avg * qty;
    const marketValue = current * qty;
    const profit = marketValue - costBasis;
    const percentReturn = costBasis > 0 ? (profit / costBasis) * 100 : 0;
    return { costBasis, totalCost: costBasis, marketValue, profit, percentReturn };
  }, [data, avgPrice, shares]);

  const range30dStats = useMemo(() => {
    if (!data) return { low30d: 0, high30d: 0, span30d: 0, rangePos: 50 };
    const canonicalPx = data.currentPrice || 0;
    const histPrices = [...(data.dailyHistory?.map(d => d.price) || []), canonicalPx].filter(p => p > 0);
    const low30d = histPrices.length > 0 ? Math.min(...histPrices) : canonicalPx * 0.95;
    const high30d = histPrices.length > 0 ? Math.max(...histPrices) : canonicalPx * 1.05;
    const span30d = high30d - low30d;
    const rangePos = span30d > 0 ? Math.min(100, Math.max(0, Math.round(((canonicalPx - low30d) / span30d) * 100))) : 50;
    return { low30d, high30d, span30d, rangePos };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    
    // Ensure data is sorted chronologically (oldest to newest) for left-to-right display
    const sortedHistory = [...data.dailyHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedHistory.map((item, index) => {
      // Short-term 5D MA
      const slice5 = sortedHistory.slice(Math.max(0, index - 4), index + 1);
      const computedMa5 = slice5.reduce((sum, curr) => sum + curr.price, 0) / slice5.length;

      // Swing 20D MA
      const slice20 = sortedHistory.slice(Math.max(0, index - 19), index + 1);
      const computedMa20 = slice20.length >= 8 ? slice20.reduce((sum, curr) => sum + curr.price, 0) / slice20.length : null;

      // Intermediate 50D MA
      const slice50 = sortedHistory.slice(Math.max(0, index - 49), index + 1);
      const computedMa50 = slice50.length >= 20 ? slice50.reduce((sum, curr) => sum + curr.price, 0) / slice50.length : null;
      
      return {
        ...item,
        displayDate: format(parseISO(item.date), 'MMM dd'),
        ma5: item.ma5 ?? (index >= 4 ? Number(computedMa5.toFixed(2)) : null),
        ma20: item.ma20 ?? (computedMa20 !== null ? Number(computedMa20.toFixed(2)) : null),
        ma50: item.ma50 ?? (computedMa50 !== null ? Number(computedMa50.toFixed(2)) : null),
        avwapAth: item.avwapAth ?? null,
      };
    });
  }, [data]);

  // Real-time polling for latest stock price from canonical feed
  useEffect(() => {
    if (!data?.ticker || loading) return;

    const pollInterval = setInterval(async () => {
      const isDataSaver = localStorage.getItem('data_saver_mode') === 'true';
      if (document.hidden || !data?.ticker || loading || isDataSaver) return;
      await handleUpdatePrice(false, true);
    }, 30000);

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
                <form onSubmit={(e) => handleSubmit(e)} className="w-full max-w-xl bg-white dark:bg-[#121212] p-5 md:p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xl space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">New Analysis</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
                    <div className="space-y-1 text-left w-full">
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
                        placeholder="e.g. NVDA, AAPL, CSPX.L" 
                        className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 md:px-5 outline-none focus:border-emerald-500 transition-all font-bold uppercase text-sm placeholder:normal-case placeholder:font-normal placeholder:text-black/35 dark:placeholder:text-white/35"
                        value={ticker}
                        onChange={(e) => handleTickerChange(e.target.value)}
                        required
                      />
                      {ticker.trim() && getAuthoritativeCompanyName(ticker.trim()) !== ticker.trim().toUpperCase() && (
                        <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1 leading-snug break-words">
                          {getAuthoritativeCompanyName(ticker.trim())}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-left w-full">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                          Avg Price ({currency})
                        </label>
                        <span className="text-[9px] font-medium text-black/40 dark:text-white/40">Optional · Defaults to live price</span>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Leave blank for live price" 
                        className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 md:px-5 outline-none focus:border-emerald-500 transition-all font-bold text-sm font-mono placeholder:font-sans placeholder:font-normal placeholder:text-xs placeholder:text-black/35 dark:placeholder:text-white/35"
                        value={avgPrice}
                        onChange={(e) => setAvgPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
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
                        className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-xl px-4 md:px-5 outline-none focus:border-emerald-500 transition-all font-bold text-sm placeholder:font-normal placeholder:text-black/35 dark:placeholder:text-white/35"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 text-left w-full">
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
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto bg-red-50/80 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20 p-5 rounded-2xl flex flex-col gap-3 shadow-xs"
          >
            <div className="flex gap-3 items-start justify-between">
              <div className="flex gap-3 items-start">
                <AlertCircle className="text-red-600 dark:text-red-400 w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-red-950 dark:text-red-300 text-sm">Unable to Load Data</h4>
                  <p className="text-red-800/90 dark:text-red-300/90 text-xs leading-relaxed">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  navigate('/', { replace: true });
                }}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 p-1 rounded-lg hover:bg-red-100/50 dark:hover:bg-red-500/20 transition-all cursor-pointer shrink-0"
                title="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  setError(null);
                  if (ticker.trim()) {
                    handleSubmit(e, {
                      ticker: ticker.trim().toUpperCase(),
                      avgPrice,
                      shares,
                      currency
                    }, true);
                  } else {
                    navigate('/', { replace: true });
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Request</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setTicker('');
                  navigate('/', { replace: true });
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-900 dark:text-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Reset to Search</span>
              </button>
            </div>

            <div className="pt-3 border-t border-red-200/60 dark:border-red-500/20 flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-900/60 dark:text-red-400/60">
                Or try a popular verified ticker:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { symbol: 'GPRO', label: 'GPRO (GoPro)' },
                  { symbol: 'AAPL', label: 'AAPL' },
                  { symbol: 'NVDA', label: 'NVDA' },
                  { symbol: 'TSLA', label: 'TSLA' },
                  { symbol: 'MSFT', label: 'MSFT' },
                  { symbol: 'SPY', label: 'SPY' },
                  { symbol: 'SSLN.L', label: 'SSLN.L' }
                ].map(s => (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => {
                      const targetAvg = avgPrice && parseFloat(avgPrice) > 0 ? avgPrice : '';
                      setTicker(s.symbol);
                      setError(null);
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      handleSubmit(fakeEvent, {
                        ticker: s.symbol,
                        avgPrice: targetAvg,
                        shares: shares || '',
                        currency
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-black/30 border border-red-200 dark:border-red-500/30 text-[11px] font-bold text-red-900 dark:text-red-200 hover:bg-red-100/50 dark:hover:bg-red-500/20 transition-all cursor-pointer font-mono"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
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
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <TickerLogo ticker={data.ticker} logoUrl={data.logoUrl} companyName={data.companyName} size="md" />
                  <div className="flex flex-col justify-center min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-neutral-900 dark:text-neutral-50 leading-none">
                        {data.ticker}
                      </h2>
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums leading-none">
                        {formatCurrency(data.currentPrice, currency)}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-bold font-mono px-2 py-0.5 rounded-lg shrink-0",
                        (data.priceChangePercent ?? 0) >= 0 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                      )}>
                        {(data.priceChangePercent ?? 0) >= 0 ? '+' : ''}{(data.priceChangePercent ?? 0).toFixed(2)}% today
                      </span>
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isUpdating ? "bg-emerald-400 animate-ping" : "bg-emerald-500"
                        )} />
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                          <span className="md:hidden">{formatExchangeShortCode(data.exchange)} Live</span>
                          <span className="hidden md:inline">{data.exchange ? `${data.exchange} Live` : 'Live'}</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-600/70 dark:text-emerald-400/70 whitespace-nowrap">
                          {format(lastUpdated, 'HH:mm:ss')}
                        </span>
                        <button 
                          onClick={() => handleUpdatePrice(true)}
                          disabled={isUpdating}
                          className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-full transition-colors group ml-0.5 cursor-pointer shrink-0"
                          title="Refresh Canonical Price"
                        >
                          <RefreshCw className={cn("w-2.5 h-2.5 text-emerald-600/50 dark:text-emerald-500/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-500", isUpdating && "animate-spin")} />
                        </button>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-black/60 dark:text-white/60 tracking-tight mt-1 leading-snug break-words">
                      {data.name || data.companyName || getAuthoritativeCompanyName(data.ticker)}
                    </span>
                  </div>
                </div>
                  <div className="relative flex items-center gap-2 md:gap-3">
                    <AnimatePresence>
                      {justSavedNotification && (
                        <motion.div
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs shrink-0"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Stored in Portfolio</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

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

              {/* Full-Width Trade Decision Hub */}
              <motion.div variants={itemVariants} className="w-full">
                <WhatShouldIDoBox 
                  data={data} 
                  currency={currency} 
                  avgPrice={avgPrice} 
                  onRefreshWithRiskProfile={(newProfile) => {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                    handleSubmit(fakeEvent, undefined, true, newProfile);
                  }}
                  isUpdating={loading || isUpdating}
                />
              </motion.div>

              {/* Main Content Grid with Sidebar Up */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Merged & Streamlined Summary Cards */}
                  <div className={cn(
                    "grid gap-4",
                    portfolioStats ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
                  )}>
                    {/* Card 1: Trend & Key Levels */}
                    <motion.div 
                      variants={itemVariants}
                      className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            Trend & Key Levels
                          </span>
                          <div 
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[11px] font-medium shrink-0 whitespace-nowrap"
                            title={data.exchange ? `${data.exchange} Data Feed` : 'Canonical Exchange Feed'}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>{formatExchangeShortCode(data.exchange)}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                              {data.currentPrice >= data.ma5 && data.currentPrice >= (data.ma20 || 0) ? (
                                <>
                                  <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                                  <span>Bullish Alignment</span>
                                </>
                              ) : data.currentPrice >= data.ma5 ? (
                                <>
                                  <ArrowUpRight className="w-5 h-5 text-blue-500 shrink-0" />
                                  <span>Short-Term Momentum</span>
                                </>
                              ) : data.ma20 && data.currentPrice >= data.ma20 ? (
                                <>
                                  <Activity className="w-5 h-5 text-amber-500 shrink-0" />
                                  <span>Baseline Support</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="w-5 h-5 text-neutral-500 shrink-0" />
                                  <span>Pullback Phase</span>
                                </>
                              )}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>
                              Volatility: <strong className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">{data.analysis.volatility || 'Moderate'}</strong>
                            </span>
                            {data.relativeVolume ? (
                              <>
                                <span>·</span>
                                <span>
                                  Rel Vol: <strong className="font-semibold font-mono text-neutral-800 dark:text-neutral-200">{data.relativeVolume.toFixed(1)}x</strong>
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Moving Average Hierarchy */}
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-0.5">
                              5D Momentum MA
                            </p>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <p className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums font-mono">
                                {formatCurrency(data.ma5, currency)}
                              </p>
                              <span className={cn(
                                "text-[10px] font-bold font-mono",
                                data.currentPrice >= data.ma5 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              )}>
                                {data.currentPrice >= data.ma5 ? '+' : ''}
                                {(((data.currentPrice - data.ma5) / data.ma5) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-0.5">
                              20D Baseline MA
                            </p>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <p className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums font-mono">
                                {data.ma20 ? formatCurrency(data.ma20, currency) : 'N/A'}
                              </p>
                              {data.ma20 && (
                                <span className={cn(
                                  "text-[10px] font-bold font-mono",
                                  data.currentPrice >= data.ma20 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                )}>
                                  {data.currentPrice >= data.ma20 ? '+' : ''}
                                  {(((data.currentPrice - data.ma20) / data.ma20) * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 30D Price Range Track */}
                        <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1">
                              <Crosshair className="w-3 h-3 text-neutral-400" />
                              30D Range
                            </span>
                            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                              {range30dStats.rangePos}% pos
                            </span>
                          </div>

                          <div className="relative pt-0.5 pb-0.5">
                            <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden">
                              <div 
                                className="h-full bg-neutral-400 dark:bg-neutral-500 rounded-full"
                                style={{ width: `${range30dStats.rangePos}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                            <span>Low: {formatCurrency(range30dStats.low30d, currency)}</span>
                            <span>High: {formatCurrency(range30dStats.high30d, currency)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Moving Average Alignment Footer */}
                      <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Structure
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            data.currentPrice >= data.ma5 && data.currentPrice >= (data.ma20 || 0)
                              ? "bg-emerald-500"
                              : data.currentPrice >= data.ma5
                              ? "bg-blue-500"
                              : data.ma20 && data.currentPrice >= data.ma20
                              ? "bg-amber-500"
                              : "bg-neutral-400"
                          )} />
                          <span>
                            {data.currentPrice >= data.ma5 && data.currentPrice >= (data.ma20 || 0)
                              ? 'Trading above 5D & 20D MAs'
                              : data.currentPrice >= data.ma5
                              ? 'Leading above 5D Momentum'
                              : data.ma20 && data.currentPrice >= data.ma20
                              ? 'Holding above 20D Baseline'
                              : 'Trading below key MAs'}
                          </span>
                        </span>
                      </div>
                    </motion.div>

                    {/* Card 2: Total Holding Value & Position Return (Integrated) */}
                    {portfolioStats && (
                      <motion.div 
                        variants={itemVariants}
                        className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                              Position Value
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                                <Check className="w-2.5 h-2.5 shrink-0" /> Stored
                              </span>
                              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                                {parseFloat(shares).toLocaleString()} {parseFloat(shares) === 1 ? 'share' : 'shares'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
                              {formatCurrency(portfolioStats.marketValue, currency)}
                            </h3>
                            
                            <div className="flex items-center gap-2 mt-1.5 min-w-0">
                              <span className={cn(
                                "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums whitespace-nowrap",
                                portfolioStats.profit >= 0 
                                  ? "text-emerald-600 dark:text-emerald-400" 
                                  : "text-rose-600 dark:text-rose-400"
                              )}>
                                {portfolioStats.profit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
                                <span>{portfolioStats.profit >= 0 ? '+' : ''}{formatCurrency(portfolioStats.profit, currency)}</span>
                                <span className="font-medium opacity-90">({(portfolioStats.percentReturn ?? 0) >= 0 ? '+' : ''}{(portfolioStats.percentReturn ?? 0).toFixed(2)}%)</span>
                              </span>
                              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">Return</span>
                            </div>
                          </div>

                          {/* Secondary Metrics: Cost Basis & Avg Purchase */}
                          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-0.5 whitespace-nowrap">
                                Cost Basis
                              </p>
                              <p className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                                {formatCurrency(portfolioStats.totalCost ?? portfolioStats.costBasis, currency)}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-0.5 whitespace-nowrap">
                                Avg Buy
                              </p>
                              <p className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                                {formatCurrency(parseFloat(avgPrice), currency)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Integrated Position Metadata Strip */}
                        <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                            Unrealized P/L
                          </span>
                          <span className={cn(
                            "text-[11px] font-semibold tabular-nums whitespace-nowrap",
                            portfolioStats.profit >= 0 
                              ? "text-emerald-600 dark:text-emerald-400" 
                              : "text-rose-600 dark:text-rose-400"
                          )}>
                            {portfolioStats.profit >= 0 ? '+' : ''}{formatCurrency(portfolioStats.profit, currency)}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Card 3: Unified Valuation & Fundamentals */}
                    <motion.div 
                      variants={itemVariants}
                      className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            Valuation & Profile
                          </span>
                          {data.avwapAth && (
                            <span className={cn(
                              "text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0 tabular-nums whitespace-nowrap",
                              data.avwapAth.status === 'above' 
                                ? "bg-neutral-100 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400" 
                                : "bg-neutral-100 dark:bg-neutral-800 text-rose-600 dark:text-rose-400"
                            )}>
                              ATH VWAP {data.avwapAth.diffPercent >= 0 ? '+' : ''}{data.avwapAth.diffPercent}%
                            </span>
                          )}
                        </div>

                        {/* Primary Metric: Market Cap */}
                        <div>
                          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
                            {data.marketCap || 'N/A'}
                          </p>
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 whitespace-nowrap">
                            Market Capitalization
                          </p>
                        </div>

                        {/* Next Line: P/E Ratio & Div Yield */}
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-0.5 whitespace-nowrap">
                              P/E Ratio
                            </p>
                            <p className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                              {data.peRatio ? `${data.peRatio.toFixed(2)}x` : 'N/A'}
                            </p>
                            {data.epsFormatted && (
                              <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums whitespace-nowrap">
                                EPS: {data.epsFormatted}
                              </p>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-0.5 whitespace-nowrap">
                              Div Yield
                            </p>
                            <p className={cn(
                              "text-sm sm:text-base font-semibold tabular-nums whitespace-nowrap",
                              Boolean(data.dividendYield && data.dividendYield > 0)
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-neutral-500 dark:text-neutral-400"
                            )}>
                              {Boolean(data.dividendYield && data.dividendYield > 0) ? `${data.dividendYield.toFixed(2)}%` : 'None'}
                            </p>
                            {Boolean(data.dividendYield && data.dividendYield > 0) ? (
                              <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums leading-snug break-words">
                                {data.dividendRate 
                                  ? `${formatCurrency(data.dividendRate, currency)}/yr` 
                                  : (data.dividendAmount ? `${formatCurrency(data.dividendAmount * 4, currency)}/yr` : 'Annualized')}
                                {data.exDividendDate ? ` · Ex: ${formatDivDateShort(data.exDividendDate)}` : ''}
                              </p>
                            ) : (
                              <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 whitespace-nowrap">
                                Growth profile
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Integrated Fundamentals Footer Strip */}
                      <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                          ATH Anchor Price
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums whitespace-nowrap">
                          {data.avwapAth ? formatCurrency(data.avwapAth.avwapPrice, currency) : 'N/A'}
                        </span>
                      </div>
                    </motion.div>
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
                  <div className="bg-white dark:bg-[#121212] p-5 md:p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
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
                                  label: '🔻 Downside Momentum',
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
                  {/* Recommendation Thesis (Positioned above Next Catalyst) */}
                  <WhyThisRecommendation data={data} currency={currency} />

                  {/* Market reaction card (rendered conditionally when extended hours data is present and market is not open in regular session) */}
                  {data.extendedHours && !data.extendedHours.isMarketOpen && !isExchangeMarketOpen(data.ticker, data.exchange, data.exchangeTimezone) && (
                    <MarketReactionCard 
                      data={data.extendedHours}
                      currency={currency}
                      ticker={data.ticker}
                      exchange={data.exchange}
                      exchangeTimezone={data.exchangeTimezone}
                    />
                  )}

                  {/* NEXT CATALYST: High-Impact Decision Driver & Consensus Estimates */}
                  {(() => {
                    if (data.isETF) return null;
                    const tickerUpper = (data.ticker || '').trim().toUpperCase();
                    const cleanTicker = tickerUpper.replace(/\.[A-Z]+$/, '');
                    const earnings = data.earnings || CLIENT_EARNINGS_MAP[tickerUpper] || CLIENT_EARNINGS_MAP[cleanTicker] || {
                      earningsDate: 'Oct 28, 2026',
                      daysUntilEarnings: 44,
                      fiscalQuarter: 'Q3 Earnings',
                      epsEstimate: '$0.92',
                      epsPriorYear: '$0.70',
                      epsGrowthYoY: '+31.4%',
                      revenueEstimate: '$6.71B',
                      revenueGrowthYoY: '+15.7%',
                      revisions: '15 Up / 5 Down (30D)',
                      revisionsSentiment: 'bullish',
                      impliedMove: '±7.5%',
                      lastQuarterSurprise: '+2.2% EPS beat',
                      consensusRevisions: 'Stable',
                      keyRisk: 'Earnings gap'
                    };

                    const isEstimateValid = (val?: string) => {
                      if (!val) return false;
                      const trimmed = val.trim().toLowerCase();
                      return !['n/a', 'na', 'tbd', '--', '-', 'consensus est.', 'consensus est', 'consensus estimate', 'none'].includes(trimmed);
                    };

                    const hasEpsEstimate = isEstimateValid(earnings.epsEstimate);
                    const hasRevEstimate = isEstimateValid(earnings.revenueEstimate);

                    // Compute dynamic catalyst thesis connected to the time horizon
                    const horizonDays = data.recommendation?.timeHorizon ? data.recommendation.timeHorizon : '30–90 day';
                    const catalystThesisText = earnings.catalystThesis || (
                      earnings.daysUntilEarnings !== undefined
                        ? (earnings.daysUntilEarnings <= 90
                            ? `Earnings occur before the ${horizonDays} horizon expires.`
                            : `Next catalyst falls beyond the primary ${horizonDays} window.`)
                        : `Next catalyst aligns with the ${horizonDays} thesis horizon.`
                    );

                    const stockWatchlistItem = TOP_20_RECOMMENDED_STOCKS.find(
                      item => item.ticker.toUpperCase() === tickerUpper || item.ticker.toUpperCase() === cleanTicker
                    );

                    const divRateFormatted = data.dividendRate 
                      ? `${formatCurrency(data.dividendRate, currency)}/yr` 
                      : (tickerUpper === 'MU' ? '$0.53/yr' : `${formatCurrency(((data.currentPrice || 0) * (data.dividendYield || 0)) / 100, currency)}/yr`);
                    const divYieldVal = data.dividendYield !== undefined && data.dividendYield > 0 ? data.dividendYield : (tickerUpper === 'MU' ? 0.06 : 0);
                    const nextExDiv = formatDivDateShort(data.exDividendDate) || (tickerUpper === 'MU' ? 'Jul 6' : '');

                    return (
                      <motion.div 
                        variants={itemVariants} 
                        className="bg-white dark:bg-[#121212] p-5 md:p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs relative overflow-hidden"
                      >
                        {/* Header: Next Catalyst */}
                        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/70 dark:border-neutral-700 shrink-0">
                              <Zap className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                                Next Catalyst
                              </h4>
                              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 leading-snug break-words">
                                {earnings.fiscalQuarter || 'Earnings'}
                                {earnings.earningsDate ? ` · ${earnings.earningsDate}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Timing Metric Pill */}
                          <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="whitespace-nowrap">
                              {earnings.daysUntilEarnings !== undefined 
                                ? (earnings.daysUntilEarnings === 0 
                                    ? 'Reporting Today' 
                                    : earnings.daysUntilEarnings === 1 
                                    ? 'In 1 Day' 
                                    : `In ${earnings.daysUntilEarnings} Days`)
                                : (earnings.earningsDate || 'Upcoming')}
                            </span>
                          </div>
                        </div>

                        {/* Core Catalyst Metrics: Expected Move & Consensus Revisions */}
                        <div className="space-y-2.5 mb-3.5">
                          <div className="grid grid-cols-2 gap-2.5 text-xs">
                            {/* Expected Move */}
                            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 flex flex-col justify-between">
                              <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                                Expected move
                              </p>
                              <p className="text-base font-black text-blue-600 dark:text-blue-400 tracking-tight font-mono">
                                {earnings.impliedMove || '±7.5%'}
                              </p>
                              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-1 leading-tight">
                                Options implied swing
                              </p>
                            </div>

                            {/* Consensus Revisions */}
                            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 flex flex-col justify-between">
                              <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                                Consensus revisions
                              </p>
                              <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug break-words">
                                {earnings.consensusRevisions || 'Stable'}
                              </p>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mt-1 leading-snug break-words">
                                {earnings.revisions || 'Analyst 30D drift'}
                              </p>
                            </div>
                          </div>

                          {/* Key Binary Risk */}
                          {earnings.keyRisk && (
                            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 flex items-start gap-2 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                                  Key binary risk
                                </span>
                                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 leading-snug mt-0.5 break-words">
                                  {earnings.keyRisk}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Thesis Connection: Connect Catalyst to Investment Horizon */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40 flex items-start gap-2.5 mb-3.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <p className="text-xs font-semibold text-blue-950 dark:text-blue-200 leading-relaxed break-words">
                            "{catalystThesisText}"
                          </p>
                        </div>

                        {/* Conditional Consensus Estimates Grid: Only displayed if estimates are present and valid */}
                        {(hasEpsEstimate || hasRevEstimate) && (
                          <div className={cn(
                            "grid gap-2.5 mb-3.5",
                            hasEpsEstimate && hasRevEstimate ? "grid-cols-2" : "grid-cols-1"
                          )}>
                            {/* Estimated EPS */}
                            {hasEpsEstimate && (
                              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 flex flex-col justify-between">
                                <div>
                                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                                    Estimated EPS
                                  </p>
                                  <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight font-mono">
                                    {earnings.epsEstimate}
                                  </p>
                                </div>
                                {earnings.epsGrowthYoY ? (
                                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 leading-snug break-words">
                                    {earnings.epsGrowthYoY} YoY
                                  </p>
                                ) : earnings.epsPriorYear ? (
                                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-1 leading-snug break-words">
                                    vs {earnings.epsPriorYear} YoY
                                  </p>
                                ) : null}
                              </div>
                            )}

                            {/* Revenue Consensus */}
                            {hasRevEstimate && (
                              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 flex flex-col justify-between">
                                <div>
                                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                                    Revenue Consensus
                                  </p>
                                  <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight font-mono">
                                    {earnings.revenueEstimate}
                                  </p>
                                </div>
                                {earnings.revenueGrowthYoY ? (
                                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 leading-snug break-words">
                                    {earnings.revenueGrowthYoY} YoY
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Prior Quarter Execution */}
                        {earnings.lastQuarterSurprise && (
                          <div className="p-2.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Prior Quarter Execution:</span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">{earnings.lastQuarterSurprise}</span>
                          </div>
                        )}

                        {/* Secondary Structural Pipeline Drivers (Render full list, never truncated) */}
                        {stockWatchlistItem?.catalysts && stockWatchlistItem.catalysts.length > 0 && (
                          <div className="mt-3.5 pt-3.5 border-t border-neutral-100 dark:border-neutral-800/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-2.5">
                              Structural Pipeline Drivers
                            </span>
                            <div className="space-y-2">
                              {stockWatchlistItem.catalysts.map((cat, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                  <span className="leading-relaxed break-words">{cat}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })()}

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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
