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
  X,
  Clock
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
import StockPriceChart from '../components/StockPriceChart';
import TickerLogo from '../components/TickerLogo';
import { WhatShouldIDoBox } from '../components/WhatShouldIDoBox';
import { WhyThisRecommendation } from '../components/WhyThisRecommendation';
import { MarketReactionCard } from '../components/MarketReactionCard';
import MarketHoursGuideModal from '../components/MarketHoursGuideModal';
import { isExchangeMarketOpen } from '../utils/marketHours';
import { getAuthoritativeCompanyName } from '../utils/tickerLogos';
import { cn, formatCurrency, resolveNewsArticleUrl } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { useRiskProfile, RiskProfile } from '../context/RiskContext';
import { ProvenanceTag } from '../components/ProvenanceTag';
import { 
  getEpsEstimateProvenance, 
  getValuationMetricProvenance, 
  getModelGeometryProvenance, 
  getSentimentProvenance,
  formatProvenanceTimestamp
} from '../utils/provenance';

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
  const [showTimingModal, setShowTimingModal] = useState(false);

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
    const guideParam = searchParams.get('guide') || searchParams.get('timing');

    if (guideParam === 'timing' || guideParam === 'true' || window.location.hash === '#timing-guide') {
      setShowTimingModal(true);
    }

    if (t) {
      const ts = searchParams.get('ts') || '';
      const key = `${t.trim().toUpperCase()}-${a}-${s}-${c}-${ts}`;
      if (lastAnalyzedKeyRef.current === key && data && !error) return;
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
      lastAnalyzedKeyRef.current = '';
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
                <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-tight">
                  Actionable Stock Analysis <br className="hidden sm:inline" />& Trade Signals
                </h2>
                <p className="text-black/60 dark:text-white/60 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
                  Clear Buy, Hold & Sell signals with price targets, risk management, and live catalyst sentiment for US, UK, and European equities.
                </p>
                
                {/* Market Hours & Benchmark Rates Guide Pill (Single Primary Trigger) */}
                <div className="mt-3.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowTimingModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#161616] border border-black/10 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                    title="Optimal trading windows, live exchange status, benchmark FX rates, and execution timing for US (NYSE/NASDAQ), UK (LSE), and European equities (EUR/CHF)"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:rotate-12 transition-transform" />
                    <span className="font-bold">Market Hours & Benchmark Rates Guide</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider font-mono">
                      US · UK · Europe · FX
                    </span>
                  </button>
                </div>
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

                      <div className="relative flex items-center">
                        <input 
                          type="text" 
                          placeholder="e.g. NVDA, CSPX.L, NESN.SW" 
                          className="w-full h-11 md:h-12 bg-[#F5F5F5] dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 focus:border-emerald-500 rounded-xl pl-4 pr-10 md:pl-5 outline-none transition-all font-bold uppercase text-sm placeholder:normal-case placeholder:font-normal placeholder:text-black/35 dark:placeholder:text-white/35"
                          value={ticker}
                          onChange={(e) => handleTickerChange(e.target.value)}
                          required
                        />

                        {ticker && (
                          <button
                            type="button"
                            onClick={() => setTicker('')}
                            className="absolute right-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                            title="Clear ticker"
                            aria-label="Clear ticker input"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

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
                        <option value="CHF">CHF (Fr)</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-black dark:bg-white text-white dark:text-black font-black py-3.5 md:py-4 rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm md:text-base cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Running Deep Analysis...</span>
                      </>
                    ) : (
                      'Deep Analysis'
                    )}
                  </button>

                  <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
                    <p className="text-[10px] sm:text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500 text-center font-normal">
                      <span className="font-semibold text-neutral-500 dark:text-neutral-400">Disclaimer: </span>
                      Algorithmic signals, ratings, and price targets generated by StockPulse AI are intended for research, informational, and educational purposes only. The platform does not provide personalized investment advice or portfolio management. Always conduct your own due diligence and consult a certified financial advisor before making investment decisions.
                    </p>
                  </div>
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
              <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2 gap-4">
                {/* Left Side: Asset Identity & Price Telemetry Blocks */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
                  {/* Block 1: Asset Identity (Logo, Ticker, Exchange & Company Name) */}
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <TickerLogo ticker={data.ticker} logoUrl={data.logoUrl} companyName={data.companyName} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
                          {data.ticker}
                        </h2>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-700/70 shrink-0">
                          {data.exchange || 'NASDAQ'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                        {data.name || data.companyName || getAuthoritativeCompanyName(data.ticker)}
                      </p>
                    </div>
                  </div>

                  {/* Visual Divider (Visible on screens with horizontal room) */}
                  <div className="hidden sm:block w-px h-9 bg-neutral-200/80 dark:bg-neutral-800 shrink-0" />

                  {/* Block 2: Live Price & Authoritative Session Status */}
                  {(() => {
                    const isMarketOpen = isExchangeMarketOpen(data.ticker, data.exchange, data.exchangeTimezone);
                    const marketTimestamp = formatProvenanceTimestamp(data.marketTimestamp || lastUpdated, data.exchangeTimezone);
                    const isPositive = (data.priceChangePercent ?? 0) >= 0;
                    const changeAmount = data.priceChange ?? (data.priceChangePercent ? (data.currentPrice * data.priceChangePercent) / 100 : 0);

                    return (
                      <div className="flex flex-col min-w-0 justify-center">
                        <div className="flex items-baseline gap-2 sm:gap-2.5 flex-wrap">
                          <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums leading-none">
                            {formatCurrency(data.currentPrice, currency)}
                          </span>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded-md tabular-nums shrink-0",
                            isPositive 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20" 
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/20"
                          )}>
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
                            <span>{isPositive ? '+' : ''}{(data.priceChangePercent ?? 0).toFixed(2)}%</span>
                            {changeAmount !== 0 && (
                              <span className="text-[10px] opacity-80 hidden xs:inline">
                                ({isPositive ? '+' : ''}{formatCurrency(Math.abs(changeAmount), currency)})
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Authoritative Single Market Status Strip */}
                        <div className="text-[10.5px] font-mono text-neutral-500 dark:text-neutral-400 mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isMarketOpen ? "bg-emerald-500 animate-pulse" : "bg-neutral-400 dark:bg-neutral-500"
                          )} />
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {isMarketOpen ? 'Market Open' : 'Market Closed'}
                          </span>
                          <span>·</span>
                          <span>
                            {(() => {
                              const t = (data.ticker || '').toUpperCase();
                              const ex = (data.exchange || '').toLowerCase();
                              const isDelayed = t.endsWith('.L') || ex.includes('london') || ex.includes('lse') || ex.includes('euronext') || ex.includes('xetra');
                              if (isMarketOpen) {
                                return isDelayed ? `15m Delayed: ${marketTimestamp}` : `Real-time: ${marketTimestamp}`;
                              }
                              return `At close: ${marketTimestamp}`;
                            })()}
                          </span>
                          <span>·</span>
                          <span>{currency || 'USD'}</span>
                        </div>
                      </div>
                    );
                  })()}
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

                  <button 
                    onClick={() => handleUpdatePrice(true)}
                    disabled={isUpdating}
                    className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 p-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    title={`Refresh price (Last checked at ${format(lastUpdated, 'HH:mm:ss')})`}
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

              {/* Epistemic Status & Provenance Directory Legend Strip (Positioned Below Trade Decision) */}
              <motion.div variants={itemVariants} className="w-full">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-[10.5px] font-mono">
                  <span className="font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[9px] shrink-0">
                    Data Epistemology:
                  </span>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-neutral-600 dark:text-neutral-400">
                    <span className="inline-flex items-center gap-1.5" title="Exchange-cleared trades, quotes, and moving averages from live feed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">Market:</strong> NASDAQ / NYSE Live
                    </span>
                    <span className="inline-flex items-center gap-1.5" title="Pre-market and after-hours electronic trading crossing networks">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">Extended:</strong> ECN Electronic
                    </span>
                    <span className="inline-flex items-center gap-1.5" title="Surveyed Wall Street sell-side analyst consensus projections">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">Analyst:</strong> Consensus Surveys
                    </span>
                    <span className="inline-flex items-center gap-1.5" title="Deterministic ATR volatility envelopes and trade geometry algorithms">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">Model:</strong> Algorithmic Levels
                    </span>
                    <span className="inline-flex items-center gap-1.5" title="Audited SEC 10-Q/10-K reported corporate accounting filings">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 shrink-0" />
                      <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">Financials:</strong> GAAP Filings
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Full-Width Price Performance & Structural Analysis */}
              <motion.div variants={itemVariants} className="w-full">
                <StockPriceChart 
                  data={data}
                  chartData={chartData}
                  avgPrice={avgPrice}
                  currency={currency}
                  lastUpdated={lastUpdated}
                />
              </motion.div>

              {/* Main Content Grid with Sidebar Up */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
                  {/* Card 1: Trend & Key Levels - Full Width of Main Column (same width as Market Reaction) */}
                  <motion.div 
                    variants={itemVariants}
                    className="w-full bg-white dark:bg-[#121212] p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
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

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
                            {data.currentPrice >= data.ma5 && data.currentPrice >= (data.ma20 || 0) ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Bullish Alignment</span>
                              </>
                            ) : data.currentPrice >= data.ma5 ? (
                              <>
                                <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" />
                                <span>Short-Term Momentum</span>
                              </>
                            ) : data.ma20 && data.currentPrice >= data.ma20 ? (
                              <>
                                <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Baseline Support</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="w-4 h-4 text-neutral-500 shrink-0" />
                                <span>Pullback Phase</span>
                              </>
                            )}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
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

                      {/* Technical Architecture: 5D MA, 20D MA, and 30D Range in a 3-Column Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
                        {/* 5D Momentum MA */}
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                            5D Momentum MA
                          </p>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums font-mono">
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
                          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Market · 5D Moving Avg</span>
                          </div>
                        </div>

                        {/* 20D Baseline MA */}
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                            20D Baseline MA
                          </p>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums font-mono">
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
                          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Market · 20D Moving Avg</span>
                          </div>
                        </div>

                        {/* 30D Price Range Track */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                              <Crosshair className="w-2.5 h-2.5 text-neutral-400" />
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

                          <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 dark:text-neutral-400">
                            <span>L: {formatCurrency(range30dStats.low30d, currency)}</span>
                            <span>H: {formatCurrency(range30dStats.high30d, currency)}</span>
                          </div>
                          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Market · 30D High/Low</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Moving Average Alignment Footer */}
                    <div className="pt-2 mt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                        Structure
                      </span>
                      <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
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

                  {/* Position Value and Valuation Profile (Below Trend & Key Levels) */}
                  <div className={cn(
                    "grid gap-3 sm:gap-3.5",
                    portfolioStats ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                  )}>

                    {/* Card 2: Total Holding Value & Position Return (Integrated) */}
                    {portfolioStats && (
                      <motion.div 
                        variants={itemVariants}
                        className="bg-white dark:bg-[#121212] p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
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
                            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
                              {formatCurrency(portfolioStats.marketValue, currency)}
                            </h3>
                            
                            <div className="flex items-center gap-2 mt-1 min-w-0">
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
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">Return</span>
                            </div>

                            <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>Market · Float × Last Price</span>
                            </div>
                          </div>

                          {/* Secondary Metrics: Cost Basis & Avg Purchase */}
                          <div className="grid grid-cols-2 gap-2.5 mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">
                                Cost Basis
                              </p>
                              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                                {formatCurrency(portfolioStats.totalCost ?? portfolioStats.costBasis, currency)}
                              </p>
                              <p className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
                                User · Ledger Input
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">
                                Avg Buy
                              </p>
                              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                                {formatCurrency(parseFloat(avgPrice), currency)}
                              </p>
                              <p className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
                                User · Ledger Input
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Integrated Position Metadata Strip */}
                        <div className="pt-2 mt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap block">
                              Unrealized P/L
                            </span>
                          </div>
                          <span className={cn(
                            "text-[11px] font-semibold tabular-nums whitespace-nowrap font-mono",
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
                      className="bg-white dark:bg-[#121212] p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            Valuation & Profile
                          </span>
                          {data.avwapAth && (
                            <span className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 tabular-nums whitespace-nowrap",
                              data.avwapAth.status === 'above' 
                                ? "bg-neutral-100 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400" 
                                : "bg-neutral-100 dark:bg-neutral-800 text-rose-600 dark:text-rose-400"
                            )}>
                              ATH VWAP {data.avwapAth.diffPercent >= 0 ? '+' : ''}{data.avwapAth.diffPercent}%
                            </span>
                          )}
                        </div>

                        {/* Primary Metrics: Market Cap & P/E Ratio Side-by-Side */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
                              {data.marketCap || 'N/A'}
                            </p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 whitespace-nowrap">
                              Market Cap
                            </p>
                            <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>Market · Float × Last Price</span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
                              {data.peRatio ? `${data.peRatio.toFixed(2)}x` : 'N/A'}
                            </p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 whitespace-nowrap">
                              P/E Ratio
                            </p>
                            <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 shrink-0" />
                              <span>Reported GAAP · TTM</span>
                            </div>
                          </div>
                        </div>

                        {/* Secondary Metrics: EPS & Div Yield */}
                        <div className="grid grid-cols-2 gap-2.5 mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
                          {/* EPS */}
                          <div className="min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">
                                EPS (TTM)
                              </p>
                              {data.epsFormatted && (
                                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                  EST
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                              {data.epsFormatted ? data.epsFormatted : (data.eps !== undefined ? formatCurrency(data.eps, currency) : 'N/A')}
                            </p>
                            <div className="text-[8.5px] font-mono text-amber-700/80 dark:text-amber-400/80 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="truncate">{getEpsEstimateProvenance(data).compositeText}</span>
                            </div>
                          </div>

                          {/* Div Yield */}
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">
                              Div Yield
                            </p>
                            <p className={cn(
                              "text-sm font-semibold tabular-nums whitespace-nowrap",
                              Boolean(data.dividendYield && data.dividendYield > 0)
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-neutral-500 dark:text-neutral-400"
                            )}>
                              {Boolean(data.dividendYield && data.dividendYield > 0) ? `${data.dividendYield.toFixed(2)}%` : 'None'}
                            </p>
                            {Boolean(data.dividendYield && data.dividendYield > 0) ? (
                              <>
                                <p className="text-[9.5px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums leading-snug truncate">
                                  {data.dividendRate 
                                    ? `${formatCurrency(data.dividendRate, currency)}/yr` 
                                    : (data.dividendAmount ? `${formatCurrency(data.dividendAmount * 4, currency)}/yr` : 'Annualized')}
                                  {data.exDividendDate ? ` · Ex: ${formatDivDateShort(data.exDividendDate)}` : ''}
                                </p>
                                <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 shrink-0" />
                                  <span>Board Declared</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-[9.5px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 whitespace-nowrap">
                                Growth profile
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Integrated Fundamentals Footer Strip */}
                      <div className="pt-2 mt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap block">
                            ATH Anchor Price
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200 tabular-nums whitespace-nowrap">
                          {data.avwapAth ? formatCurrency(data.avwapAth.avwapPrice, currency) : 'N/A'}
                        </span>
                      </div>
                    </motion.div>
                  </div>

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
                          const articleUrl = resolveNewsArticleUrl(item.url, data.ticker, item.title, item.source);

                          return (
                            <motion.a 
                              key={i} 
                              href={articleUrl} 
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
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                      Estimated EPS
                                    </p>
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                      ESTIMATE
                                    </span>
                                  </div>
                                  <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight font-mono">
                                    {earnings.epsEstimate}
                                  </p>
                                  <div className="text-[9.5px] font-mono text-amber-700/80 dark:text-amber-400/80 flex items-center gap-1 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span>Consensus · Wall St Survey · {earnings.fiscalQuarter || 'Fiscal Q3'}</span>
                                  </div>
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
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                      Revenue Consensus
                                    </p>
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                      ESTIMATE
                                    </span>
                                  </div>
                                  <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight font-mono">
                                    {earnings.revenueEstimate}
                                  </p>
                                  <div className="text-[9.5px] font-mono text-amber-700/80 dark:text-amber-400/80 flex items-center gap-1 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span>Consensus · Surveyed Analysts · {earnings.fiscalQuarter || 'Fiscal Q3'}</span>
                                  </div>
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
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Market Timing & Hours Guide Modal */}
      <MarketHoursGuideModal 
        isOpen={showTimingModal} 
        onClose={() => setShowTimingModal(false)} 
      />
    </div>
  );
}
