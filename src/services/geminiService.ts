export interface AvwapAthData {
  athPrice: number;
  athDate?: string;
  avwapPrice: number;
  diffPercent: number;
  status: 'above' | 'below';
  explanation: string;
}

export interface EarningsEstimatesData {
  earningsDate?: string;
  daysUntilEarnings?: number;
  fiscalQuarter?: string;
  epsEstimate?: string;
  epsPriorYear?: string;
  epsGrowthYoY?: string;
  revenueEstimate?: string;
  revenueGrowthYoY?: string;
  revisions?: string;
  revisionsSentiment?: 'bullish' | 'neutral' | 'bearish';
  impliedMove?: string;
  lastQuarterSurprise?: string;
  consensusRevisions?: string;
  keyRisk?: string;
  catalystThesis?: string;
}

export interface ExtendedHoursData {
  isMarketOpen: boolean;
  sessionType: 'PRE' | 'POST' | 'REGULAR' | 'CLOSED';
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  preMarketHigh?: number;
  preMarketLow?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  postMarketHigh?: number;
  postMarketLow?: number;
  extendedHoursVolume?: number;
  extendedHoursVolumeFormatted?: string;
  bid?: number;
  ask?: number;
  spread?: number;
  spreadPercent?: number;
  previousClose: number;
  predictedOpenPrice?: number;
  predictedOpenChangePercent?: number;
  predictionConfidence?: number; // 0-100%
  predictionCautionNote?: string;
  afterHoursMovePercent?: number;
  earningsReleaseTime?: string; // e.g. "4:05 PM"
  marketReactionInterpretation?: string; // e.g. "Strong immediate reaction"
  afterHoursSentiment: 'bullish' | 'neutral' | 'bearish';
  afterHoursConfidenceScore: number; // e.g. 82%
  signalStrength: number; // e.g. 60
  signalStrengthBars: string; // e.g. "██████░░░░ 60%"
  signalStrengthLabel: string;
  contextInsight: string;
}

export type RecommendationAction = 'BUY' | 'HOLD' | 'SELL_PARTIAL' | 'SELL_ALL' | 'AVOID' | 'Buy More' | 'Hold' | 'Sell';

export interface StockData {
  ticker: string;
  name?: string;
  companyName?: string;
  currentPrice: number;
  previousClose?: number;
  priceChange?: number;
  priceChangePercent?: number;
  priceSource?: string;
  exchange?: string;
  exchangeTimezone?: string;
  marketTimestamp?: string;
  canonicalTimestamp?: string;
  extendedHours?: ExtendedHoursData;
  dailyHistory: { 
    date: string; 
    price: number; 
    volume: number; 
    avwapAth?: number | null;
    ma5?: number | null;
    ma20?: number | null;
    ma50?: number | null;
  }[];
  ma5: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  avgVolume20d?: number;
  relativeVolume?: number;
  avwapAth?: AvwapAthData;
  marketCap?: string;
  isETF?: boolean;
  peRatio?: number;
  eps?: number;
  epsFormatted?: string;
  earnings?: EarningsEstimatesData;
  dividendYield?: number;
  dividendRate?: number;
  dividendAmount?: number;
  exDividendDate?: string;
  paymentDate?: string;
  website?: string;
  logoUrl?: string;
  news: { 
    title: string; 
    sentiment: "very_positive" | "positive" | "neutral" | "negative" | "very_negative"; 
    url: string;
    score?: number;
    source?: string;
    category?: string;
    timestamp?: string;
    summary?: string;
  }[];
  overallSentiment?: {
    score: number;
    label: "Extreme Bullish" | "Bullish" | "Neutral" | "Bearish" | "Extreme Bearish";
    bullishPercent: number;
    neutralPercent: number;
    bearishPercent: number;
  };
  analysis: {
    trend: "Bullish" | "Bearish" | "Neutral";
    trendExplanation: string;
    support: number;
    resistance: number;
    supportZone?: { low: number; high: number };
    resistanceZone?: { low: number; high: number };
    majorSupport?: number;
    supportMethodology?: string;
    resistanceMethodology?: string;
    volumeInsight: string;
    avgVolume30d?: number;
    avgVolume20d?: number;
    relativeVolume?: number;
    momentumStrength: number | string;
    rsi14?: number;
    momentumScore?: number;
    momentumLabel?: "Strong" | "Moderate" | "Weak";
    momentumMethodology?: string;
    volatility?: string;
  };
  recommendation: {
    action: RecommendationAction;
    actionHeadline?: string;
    sellPercentage?: number;
    confidence?: number;
    signalAgreement?: {
      score: number;
      alignedCount: number;
      totalCount: number;
      headline: string;
      summary: string;
      description: string;
    };
    decisionStatement?: string;
    valuationAssessment?: string;
    idealEntryPrice: number;
    addZone?: { 
      low: number; 
      high: number; 
      technicalCorridorHigh?: number;
      explanation?: string;
    };
    confirmationBreakout?: number;
    positionAllocation?: string;
    timeHorizon?: string;
    stopLoss: number;
    profitTarget: number;
    riskRewardRatio: number;
    positionSizing: string;
    entryExplanation: string;
    targetMethodology?: string;
    stopLossMethodology?: string;
    entryMethodology?: string;
    reasons: string[];
  };
  lastUpdated?: string;
}

export interface LatestPriceResult {
  ticker: string;
  currentPrice: number;
  previousClose?: number;
  priceChange?: number;
  priceChangePercent?: number;
  priceSource?: string;
  exchange?: string;
  exchangeTimezone?: string;
  marketTimestamp?: string;
  canonicalTimestamp?: string;
  currency?: string;
  lastUpdated?: string;
}

async function safeJsonFetch<T>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();

  // Try parsing JSON first, regardless of content-type header quirks
  let json: any;
  let isJson = false;
  try {
    json = JSON.parse(text);
    isJson = true;
  } catch {
    isJson = false;
  }

  if (isJson) {
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('401 Authentication Required: Access session expired or unauthorized. Please re-open the app via Google AI Studio or check project access.');
      }
      throw new Error(json?.error || fallbackError);
    }
    return json as T;
  }

  // If response is not JSON, check status code
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('401 Authentication Required: Access session expired or unauthorized. Please re-open the app via Google AI Studio or check project access.');
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(`Server temporarily unavailable (${res.status}). Server process may be warming up or restarting.`);
    }
    // Clean up raw HTML if proxy returned an HTML error page (e.g., Google Front End error)
    const cleanMsg = text.length > 0 && text.length < 300 && !text.includes('<!DOCTYPE') && !text.includes('<html') 
      ? text.trim() 
      : fallbackError;
    throw new Error(`Server returned error (${res.status}): ${cleanMsg}`);
  }

  // If status is 200 but body was non-JSON (e.g., HTML from proxy/Vite during server reload/cold start)
  const isHtml = text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<script');
  if (isHtml) {
    throw new Error('Server connection warming up (received HTML shell during initialization). Retrying connection...');
  }

  throw new Error('Unexpected non-JSON response from server. Please try refreshing or checking the ticker symbol.');
}

export async function fetchJsonWithRetry<T>(
  url: string, 
  options: RequestInit = {}, 
  fallbackError: string,
  retries: number = 3
): Promise<T> {
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  };

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, mergedOptions);
      return await safeJsonFetch<T>(res, fallbackError);
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || '';
      const isTransient = 
        msg.includes('warming up') ||
        msg.includes('non-JSON') || 
        msg.includes('temporarily unavailable') ||
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504');

      if (attempt < retries && isTransient) {
        // Exponential progressive backoff (e.g. 500ms, 1000ms, 1500ms, 2000ms)
        const delay = Math.min(2500, 500 * (attempt + 1));
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  // Provide user-friendly final error if still failing after retries
  if (lastError?.message?.includes('warming up') || lastError?.message?.includes('non-JSON')) {
    throw new Error('The live data server was temporarily reconnecting. Please click "Try Again" or refresh the page to load fresh market data.');
  }

  throw lastError || new Error(fallbackError);
}

export async function analyzeStock(
  ticker: string, 
  avgPrice: number, 
  currency: string = 'USD', 
  forceRefresh: boolean = false,
  riskMode: string = 'aggressive'
): Promise<StockData> {
  const cleanTicker = (ticker || '').trim();
  if (!cleanTicker) {
    throw new Error('Please enter a valid ticker symbol.');
  }

  const params = new URLSearchParams({
    ticker: cleanTicker,
    avgPrice: avgPrice.toString(),
    currency,
    forceRefresh: forceRefresh ? 'true' : 'false',
    riskMode
  });

  const url = `/api/stock/${encodeURIComponent(cleanTicker.toUpperCase())}?${params.toString()}`;
  return await fetchJsonWithRetry<StockData>(url, {}, `Failed to fetch live stock data for ${cleanTicker}`);
}

export async function getLatestPrice(
  ticker: string, 
  currency: string = 'USD', 
  forceRefresh: boolean = false
): Promise<LatestPriceResult> {
  const cleanTicker = (ticker || '').trim();
  if (!cleanTicker) {
    throw new Error('Please enter a valid ticker symbol.');
  }

  const params = new URLSearchParams({
    ticker: cleanTicker,
    currency,
    forceRefresh: forceRefresh ? 'true' : 'false'
  });

  const url = `/api/price?${params.toString()}`;
  return await fetchJsonWithRetry<LatestPriceResult>(url, {}, `Failed to fetch price for ${cleanTicker}`);
}

export async function getBatchPrices(
  tickers: string[], 
  currency: string = 'USD', 
  forceRefresh: boolean = false
): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};

  try {
    const res = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers, currency, forceRefresh })
    });

    const json = await safeJsonFetch<{ prices?: Record<string, { currentPrice: number }> }>(res, 'Failed to fetch batch prices');
    const pricesMap: Record<string, number> = {};
    if (json.prices) {
      Object.entries(json.prices).forEach(([t, val]) => {
        pricesMap[t] = val.currentPrice;
      });
    }
    return pricesMap;
  } catch (err) {
    console.warn('Batch price fetch error:', err);
    return {};
  }
}

export interface FxRateDetail {
  pair: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  history: { date: string; rate: number }[];
  lastUpdated: string;
}

export interface FxDataResponse {
  gbpToUsd: FxRateDetail;
  usdToGbp: FxRateDetail;
  eurToUsd: FxRateDetail;
  usdToEur: FxRateDetail;
  lastUpdated: string;
}

export async function fetchFxRates(): Promise<FxDataResponse> {
  const res = await fetch('/api/fx');
  return await safeJsonFetch<FxDataResponse>(res, 'Failed to fetch FX exchange rates');
}

export function formatExchangeShortCode(exchangeCode?: string): string {
  if (!exchangeCode) return 'Live';
  const code = exchangeCode.trim();
  const parenMatch = code.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].toUpperCase();
  const upper = code.toUpperCase();
  if (upper.includes('LONDON') || upper.includes('LSE') || upper.includes('LON')) return 'LSE';
  if (upper.includes('NASDAQ') || upper.includes('NMS') || upper.includes('NGS') || upper.includes('NCM')) return 'NASDAQ';
  if (upper.includes('NYSE') || upper.includes('NYQ')) return 'NYSE';
  if (upper.includes('FRANKFURT') || upper.includes('XETRA') || upper.includes('GER') || upper.includes('FRA')) return 'XETRA';
  if (upper.includes('TORONTO') || upper.includes('TSX')) return 'TSX';
  if (upper.includes('PARIS') || upper.includes('EURONEXT')) return 'EURONEXT';
  if (upper.includes('CRYPTO') || upper.includes('FX')) return 'FX/CRYPTO';
  if (code.length > 8) return code.slice(0, 6) + '..';
  return code;
}
