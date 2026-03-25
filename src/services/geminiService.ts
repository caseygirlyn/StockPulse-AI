import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export interface StockData {
  ticker: string;
  currentPrice: number;
  dailyHistory: { date: string; price: number; volume: number }[];
  ma5: number;
  marketCap?: string;
  peRatio?: number;
  dividendYield?: number;
  dividendRate?: number;
  dividendAmount?: number;
  exDividendDate?: string;
  paymentDate?: string;
  news: { title: string; sentiment: "positive" | "negative" | "neutral"; url: string }[];
  analysis: {
    trend: "Bullish" | "Bearish" | "Neutral";
    trendExplanation: string;
    support: number;
    resistance: number;
    volumeInsight: string;
    momentumStrength: string;
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
}

const CACHE_PREFIX = 'stock_analysis_cache_';
const PRICE_CACHE_PREFIX = 'stock_price_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for analysis
const PRICE_TTL = 10 * 60 * 1000; // 10 minutes for prices

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > (key.startsWith(PRICE_CACHE_PREFIX) ? PRICE_TTL : CACHE_TTL)) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

export async function analyzeStock(ticker: string, avgPrice: number, currency: string = 'USD'): Promise<StockData> {
  const cacheKey = `${CACHE_PREFIX}${ticker.toUpperCase()}_${currency}`;
  const cached = getCachedData<StockData>(cacheKey);
  if (cached) return cached;

  const prompt = `Quickly analyze stock "${ticker}". User cost: ${currency} ${avgPrice}.
  
  Required (JSON):
  1. currentPrice (${currency})
  2. dailyHistory (last 30 days: date, price, volume)
  3. ma5 (${currency})
  4. marketCap, peRatio, dividendYield (%), dividendRate (${currency}), dividendAmount (${currency} - per share for next payment), exDividendDate (ISO), paymentDate (ISO)
  5. news (top 4 recent, title, sentiment, url)
  6. analysis (trend, trendExplanation, support, resistance, volumeInsight, momentumStrength)
  7. recommendation (action, idealEntryPrice, stopLoss, profitTarget, riskRewardRatio, positionSizing, entryExplanation, 3 reasons)
  
  Use Google Search efficiently. Prioritize speed.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          currentPrice: { type: Type.NUMBER },
          dailyHistory: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "ISO date string" },
                price: { type: Type.NUMBER },
                volume: { type: Type.NUMBER }
              },
              required: ["date", "price", "volume"]
            }
          },
          ma5: { type: Type.NUMBER },
          marketCap: { type: Type.STRING },
          peRatio: { type: Type.NUMBER },
          dividendYield: { type: Type.NUMBER, description: "Annual dividend yield as a percentage" },
          dividendRate: { type: Type.NUMBER, description: "Annual dividend amount per share" },
          dividendAmount: { type: Type.NUMBER, description: "Amount per share for the next/recent dividend payment" },
          exDividendDate: { type: Type.STRING, description: "ISO date string for the next or most recent ex-dividend date" },
          paymentDate: { type: Type.STRING, description: "ISO date string for the next or most recent payment date" },
          news: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                url: { type: Type.STRING }
              }
            }
          },
          analysis: {
            type: Type.OBJECT,
            properties: {
              trend: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
              trendExplanation: { type: Type.STRING },
              support: { type: Type.NUMBER },
              resistance: { type: Type.NUMBER },
              volumeInsight: { type: Type.STRING },
              momentumStrength: { type: Type.STRING }
            }
          },
          recommendation: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ["Buy More", "Hold", "Sell"] },
              idealEntryPrice: { type: Type.NUMBER },
              stopLoss: { type: Type.NUMBER },
              profitTarget: { type: Type.NUMBER },
              riskRewardRatio: { type: Type.NUMBER },
              positionSizing: { type: Type.STRING },
              entryExplanation: { type: Type.STRING },
              reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["action", "idealEntryPrice", "stopLoss", "profitTarget", "riskRewardRatio", "positionSizing", "entryExplanation", "reasons"]
          }
        },
        required: ["ticker", "currentPrice", "dailyHistory", "ma5", "analysis", "recommendation"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to analyze stock data. Please try again.");
  }
}

export async function getBatchPrices(tickers: string[], currency: string = 'USD'): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  const results: Record<string, number> = {};
  const tickersToFetch: string[] = [];

  tickers.forEach(t => {
    const cached = getCachedData<number>(`${PRICE_CACHE_PREFIX}${t.toUpperCase()}_${currency}`);
    if (cached !== null) {
      results[t.toUpperCase()] = cached;
    } else {
      tickersToFetch.push(t);
    }
  });

  if (tickersToFetch.length === 0) return results;

  const prompt = `Latest prices for these tickers in ${currency}: ${tickersToFetch.join(', ')}. 
  Return JSON: { "prices": { "TICKER": number, ... } }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prices: {
              type: Type.OBJECT,
              additionalProperties: { type: Type.NUMBER }
            }
          },
          required: ["prices"]
        }
      }
    });

    const data = JSON.parse(response.text);
    Object.entries(data.prices as Record<string, number>).forEach(([t, p]) => {
      results[t.toUpperCase()] = p;
      setCachedData(`${PRICE_CACHE_PREFIX}${t.toUpperCase()}_${currency}`, p);
    });
    return results;
  } catch (error: any) {
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('quota')) {
      console.warn("Quota exceeded, using stale cache if available");
      // If we hit quota, we just return whatever we have in results (cached items)
      return results;
    }
    console.error("Failed to parse batch prices:", error);
    throw new Error("Failed to update prices");
  }
}

export async function getLatestPrice(ticker: string, currency: string = 'USD'): Promise<{ currentPrice: number }> {
  const prices = await getBatchPrices([ticker], currency);
  const price = prices[ticker.toUpperCase()] || prices[ticker] || 0;
  return { currentPrice: price };
}
