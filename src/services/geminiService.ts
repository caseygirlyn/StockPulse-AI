import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface StockData {
  ticker: string;
  currentPrice: number;
  dailyHistory: { date: string; price: number; volume: number }[];
  ma5: number;
  marketCap?: string;
  peRatio?: number;
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
    reasons: string[];
  };
}

export async function analyzeStock(ticker: string, avgPrice: number, currency: string = 'USD'): Promise<StockData> {
  const prompt = `Quickly analyze stock "${ticker}". User cost: ${currency} ${avgPrice}.
  
  Required (JSON):
  1. currentPrice (${currency})
  2. dailyHistory (last 30 days: date, price, volume)
  3. ma5 (${currency})
  4. marketCap, peRatio
  5. news (top 4 recent, title, sentiment, url)
  6. analysis (trend, trendExplanation, support, resistance, volumeInsight, momentumStrength)
  7. recommendation (action, 3 reasons)
  
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
              reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        required: ["ticker", "currentPrice", "dailyHistory", "ma5", "analysis", "recommendation"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to analyze stock data. Please try again.");
  }
}

export async function getLatestPrice(ticker: string, currency: string = 'USD'): Promise<{ currentPrice: number }> {
  const prompt = `Latest price for "${ticker}" in ${currency}. JSON: { "currentPrice": number }`;

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
          currentPrice: { type: Type.NUMBER }
        },
        required: ["currentPrice"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse price update:", error);
    throw new Error("Failed to update price");
  }
}
