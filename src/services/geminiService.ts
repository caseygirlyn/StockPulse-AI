export interface StockData {
  ticker: string;
  currentPrice: number;
  previousClose?: number;
  priceChange?: number;
  priceChangePercent?: number;
  dailyHistory: { date: string; price: number; volume: number }[];
  ma5: number;
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

export async function analyzeStock(
  ticker: string, 
  avgPrice: number, 
  currency: string = 'USD', 
  forceRefresh: boolean = false
): Promise<StockData> {
  const params = new URLSearchParams({
    avgPrice: avgPrice.toString(),
    currency,
    forceRefresh: forceRefresh ? 'true' : 'false'
  });

  const res = await fetch(`/api/stock/${encodeURIComponent(ticker.toUpperCase().trim())}?${params.toString()}`);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch live stock data for ${ticker}`);
  }

  const data: StockData = await res.json();
  return data;
}

export async function getLatestPrice(
  ticker: string, 
  currency: string = 'USD', 
  forceRefresh: boolean = false
): Promise<{ currentPrice: number; previousClose?: number; priceChange?: number; priceChangePercent?: number }> {
  const params = new URLSearchParams({
    currency,
    forceRefresh: forceRefresh ? 'true' : 'false'
  });

  const res = await fetch(`/api/price/${encodeURIComponent(ticker.toUpperCase().trim())}?${params.toString()}`);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch price for ${ticker}`);
  }

  return await res.json();
}

export async function getBatchPrices(
  tickers: string[], 
  currency: string = 'USD', 
  forceRefresh: boolean = false
): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};

  const res = await fetch('/api/prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers, currency, forceRefresh })
  });

  if (!res.ok) {
    return {};
  }

  const json = await res.json();
  const pricesMap: Record<string, number> = {};
  if (json.prices) {
    Object.entries(json.prices as Record<string, { currentPrice: number }>).forEach(([t, val]) => {
      pricesMap[t] = val.currentPrice;
    });
  }
  return pricesMap;
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
  if (!res.ok) {
    throw new Error('Failed to fetch FX exchange rates');
  }
  return await res.json();
}
