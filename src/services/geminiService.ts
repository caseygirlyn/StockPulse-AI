export interface AvwapAthData {
  athPrice: number;
  athDate?: string;
  avwapPrice: number;
  diffPercent: number;
  status: 'above' | 'below';
  explanation: string;
}

export interface StockData {
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
  dailyHistory: { date: string; price: number; volume: number; avwapAth?: number | null }[];
  ma5: number;
  avwapAth?: AvwapAthData;
  marketCap?: string;
  peRatio?: number;
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
    volumeInsight: string;
    momentumStrength: number | string;
  };
  recommendation: {
    action: "Buy More" | "Hold" | "Sell";
    idealEntryPrice: number;
    stopLoss: number;
    profitTarget: number;
    riskRewardRatio: number;
    positionSizing: string;
    entryExplanation: string;
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
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Server returned error (${res.status}): ${fallbackError}`);
    }
    throw new Error('Unexpected non-JSON response from server. Please try refreshing or checking the ticker symbol.');
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON received from server. ${fallbackError}`);
  }

  if (!res.ok) {
    throw new Error(json?.error || fallbackError);
  }

  return json as T;
}

export async function analyzeStock(
  ticker: string, 
  avgPrice: number, 
  currency: string = 'USD', 
  forceRefresh: boolean = false
): Promise<StockData> {
  const cleanTicker = (ticker || '').trim();
  if (!cleanTicker) {
    throw new Error('Please enter a valid ticker symbol.');
  }

  const params = new URLSearchParams({
    ticker: cleanTicker,
    avgPrice: avgPrice.toString(),
    currency,
    forceRefresh: forceRefresh ? 'true' : 'false'
  });

  const res = await fetch(`/api/stock/${encodeURIComponent(cleanTicker.toUpperCase())}?${params.toString()}`);
  return await safeJsonFetch<StockData>(res, `Failed to fetch live stock data for ${cleanTicker}`);
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

  const res = await fetch(`/api/price/${encodeURIComponent(cleanTicker.toUpperCase())}?${params.toString()}`);
  return await safeJsonFetch<LatestPriceResult>(res, `Failed to fetch price for ${cleanTicker}`);
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
