import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import { 
  getStockAnalysis, 
  fetchLiveYahooData, 
  getFxDetails,
  fetchExchangeRate,
  getFormattedMarketCap,
  formatExchangeName
} from './src/services/serverStock.js';
import { TOP_20_RECOMMENDED_STOCKS, WatchlistItem } from './src/services/watchlistService.js';
import { resolveTickerLogoUrl, getAuthoritativeCompanyName } from './src/utils/tickerLogos.js';

const DATA_FILE = path.join(process.cwd(), 'data.json');

export const DEFAULT_PORTFOLIO_POSITIONS = [
  {
    ticker: 'RR.L',
    name: 'Rolls-Royce Holdings plc',
    avgPrice: 12.50,
    shares: 250,
    currency: 'GBP',
    exchange: 'London Stock Exchange (LSE)',
    currentPrice: 14.50,
    previousClose: 14.80,
    priceChange: -0.30,
    priceChangePercent: -2.03,
    trend: 'Bullish',
    recommendationAction: 'Buy More',
    logoUrl: 'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://rolls-royce.com&size=128',
    notes: 'Core UK aerospace & defense turnaround play.',
    date: new Date().toISOString()
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    avgPrice: 118.50,
    shares: 25,
    currency: 'USD',
    exchange: 'NASDAQ',
    currentPrice: 128.50,
    previousClose: 125.80,
    priceChange: 2.70,
    priceChangePercent: 2.15,
    trend: 'Bullish',
    recommendationAction: 'Buy More',
    logoUrl: 'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://nvidia.com&size=128',
    notes: 'Foundational AI infrastructure & accelerated computing anchor.',
    date: new Date().toISOString()
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    avgPrice: 215.00,
    shares: 15,
    currency: 'USD',
    exchange: 'NASDAQ',
    currentPrice: 232.40,
    previousClose: 231.10,
    priceChange: 1.30,
    priceChangePercent: 0.56,
    trend: 'Bullish',
    recommendationAction: 'Hold',
    logoUrl: 'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://apple.com&size=128',
    notes: 'Consumer ecosystem lock-in and edge AI upgrade cycle.',
    date: new Date().toISOString()
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    avgPrice: 410.00,
    shares: 10,
    currency: 'USD',
    exchange: 'NASDAQ',
    currentPrice: 445.80,
    previousClose: 443.20,
    priceChange: 2.60,
    priceChangePercent: 0.59,
    trend: 'Bullish',
    recommendationAction: 'Hold',
    logoUrl: 'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://microsoft.com&size=128',
    notes: 'Enterprise cloud AI and productivity software moat.',
    date: new Date().toISOString()
  }
];

interface PortfolioData {
  hasInitialized?: boolean;
  positions: any[];
}

async function readPortfolioData(): Promise<PortfolioData> {
  try {
    const dataStr = await fs.readFile(DATA_FILE, 'utf-8');
    if (!dataStr || !dataStr.trim()) {
      const defaultData: PortfolioData = { 
        hasInitialized: true, 
        positions: JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_POSITIONS)) 
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const parsed = JSON.parse(dataStr);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.positions)) {
      const defaultData: PortfolioData = { 
        hasInitialized: true, 
        positions: JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_POSITIONS)) 
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    // If positions are empty and not explicitly marked as initialized by user, populate defaults
    if (parsed.positions.length === 0 && !parsed.hasInitialized) {
      parsed.hasInitialized = true;
      parsed.positions = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_POSITIONS));
      await fs.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2));
    }
    // Ensure all positions have verified, authoritative logo URLs and company names
    parsed.positions = parsed.positions.map((p: any) => ({
      ...p,
      name: getAuthoritativeCompanyName(p.ticker, p.name),
      logoUrl: resolveTickerLogoUrl(p.ticker, p.logoUrl, p.name)
    }));
    return parsed;
  } catch (err) {
    console.warn('Recovering corrupted or missing portfolio data.json:', err);
    const defaultData: PortfolioData = { 
      hasInitialized: true, 
      positions: JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_POSITIONS)) 
    };
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
    } catch (writeErr) {
      console.error('Failed to reset portfolio data file:', writeErr);
    }
    return defaultData;
  }
}

async function writePortfolioData(data: PortfolioData): Promise<void> {
  if (!data || !Array.isArray(data.positions)) {
    data = { hasInitialized: true, positions: [] };
  }
  data.hasInitialized = true;
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function ensureDataFile() {
  await readPortfolioData();
}

async function startServer() {
  await ensureDataFile();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/fx', async (req, res) => {
    try {
      const fxData = await getFxDetails();
      res.json(fxData);
    } catch (error: any) {
      console.error('Error fetching FX rates:', error);
      res.status(500).json({ error: error?.message || 'Failed to fetch exchange rates' });
    }
  });

  const handleStockRequest = async (req: express.Request, res: express.Response) => {
    try {
      const tickerParam = (req.params.ticker || (req.params as any)[0] || (req.query.ticker as string) || '').trim();
      if (!tickerParam) {
        return res.status(400).json({ error: 'Ticker symbol is required (e.g. AAPL, NVDA, SSLN.L)' });
      }

      const avgPrice = parseFloat(req.query.avgPrice as string) || 0;
      const currency = (req.query.currency as string) || 'USD';
      const forceRefresh = req.query.forceRefresh === 'true';

      const data = await getStockAnalysis(tickerParam, avgPrice, currency, forceRefresh);
      res.json(data);
    } catch (error: any) {
      console.error(`Error in stock analysis:`, error?.message || error);
      res.status(500).json({ error: error?.message || 'Failed to fetch stock analysis' });
    }
  };

  app.get('/api/stock/:ticker', handleStockRequest);
  app.get('/api/stock', handleStockRequest);
  app.get('/api/stock/*', handleStockRequest);

  const handlePriceRequest = async (req: express.Request, res: express.Response) => {
    try {
      const tickerParam = (req.params.ticker || (req.params as any)[0] || (req.query.ticker as string) || '').trim();
      if (!tickerParam) {
        return res.status(400).json({ error: 'Ticker symbol is required' });
      }

      const currency = (req.query.currency as string) || 'USD';
      const forceRefresh = req.query.forceRefresh === 'true';
      const data = await getStockAnalysis(tickerParam, 0, currency, forceRefresh);
      
      res.json({
        ticker: data.ticker,
        name: data.name,
        companyName: data.companyName,
        currentPrice: data.currentPrice,
        previousClose: data.previousClose,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent,
        priceSource: data.priceSource,
        exchange: data.exchange,
        exchangeTimezone: data.exchangeTimezone,
        marketTimestamp: data.marketTimestamp,
        canonicalTimestamp: data.canonicalTimestamp,
        currency,
        lastUpdated: data.lastUpdated
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch stock price' });
    }
  };

  app.get('/api/price/:ticker', handlePriceRequest);
  app.get('/api/price', handlePriceRequest);
  app.get('/api/price/*', handlePriceRequest);

  const handlePricesBatch = async (req: express.Request, res: express.Response) => {
    try {
      let tickers: string[] = [];
      let currency = 'USD';
      let currencies: Record<string, string> = {};

      if (req.method === 'GET') {
        const tParam = req.query.tickers ? String(req.query.tickers) : '';
        tickers = tParam ? tParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];
        currency = String(req.query.currency || 'USD');
      } else {
        tickers = Array.isArray(req.body.tickers) ? req.body.tickers : [];
        currency = req.body.currency || 'USD';
        currencies = req.body.currencies || {};
      }

      if (!tickers.length) {
        return res.json({ prices: {} });
      }

      const results: Record<string, { 
        currentPrice: number; 
        previousClose: number; 
        priceChange: number; 
        priceChangePercent: number;
        priceSource: string;
        exchange?: string;
        marketTimestamp: string;
        canonicalTimestamp: string;
        lastUpdated: string;
      }> = {};
      
      await Promise.all(
        tickers.map(async (t: string) => {
          try {
            const cleanT = t.trim().toUpperCase();
            const targetCurrency = currencies[cleanT] || currency;
            const data = await getStockAnalysis(cleanT, 0, targetCurrency, false);
            results[cleanT] = {
              currentPrice: data.currentPrice,
              previousClose: data.previousClose,
              priceChange: data.priceChange,
              priceChangePercent: data.priceChangePercent,
              priceSource: data.priceSource,
              exchange: data.exchange,
              marketTimestamp: data.marketTimestamp,
              canonicalTimestamp: data.canonicalTimestamp,
              lastUpdated: data.lastUpdated
            };
          } catch (e) {
            console.warn(`Failed to fetch price for ${t}:`, e);
          }
        })
      );

      res.json({ prices: results });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch batch prices' });
    }
  };

  app.post('/api/prices', handlePricesBatch);
  app.get('/api/prices', handlePricesBatch);

  // In-memory cache for live watchlist items
  const watchlistCache = new Map<string, { items: WatchlistItem[]; timestamp: number }>();
  const WATCHLIST_CACHE_TTL = 30 * 1000; // 30 seconds live cache

  // Watchlist Top 20 Recommended Stocks Route with Live Pricing
  app.get('/api/watchlist', async (req, res) => {
    try {
      const currency = ((req.query.currency as string) || 'USD').toUpperCase();
      const forceRefresh = req.query.forceRefresh === 'true';
      const cacheKey = currency;

      if (!forceRefresh) {
        const cached = watchlistCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < WATCHLIST_CACHE_TTL) {
          return res.json({
            items: cached.items,
            count: cached.items.length,
            lastUpdated: new Date(cached.timestamp).toISOString(),
            source: 'cache'
          });
        }
      }

      // Fetch live market data for all 20 recommended tickers in parallel
      const updatedItems: WatchlistItem[] = await Promise.all(
        TOP_20_RECOMMENDED_STOCKS.map(async (item) => {
          try {
            const liveQuote = await fetchLiveYahooData(item.ticker);
            const fxRate = await fetchExchangeRate(liveQuote.currency || 'USD', currency);
            
            const livePrice = Number((liveQuote.currentPrice * fxRate).toFixed(2));
            const prevClose = Number((liveQuote.previousClose * fxRate).toFixed(2));
            const change = Number((livePrice - prevClose).toFixed(2));
            const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
            
            // Dynamic proportional scaling for entry, stop loss, and target levels
            const basePrice = item.currentPrice > 0 ? item.currentPrice : livePrice;
            const priceRatio = livePrice / basePrice;
            
            const idealEntry = Number((item.idealEntry * priceRatio).toFixed(2));
            const stopLoss = Number((item.stopLoss * priceRatio).toFixed(2));
            const takeProfit = Number((item.takeProfit * priceRatio).toFixed(2));
            
            const upside = Math.max(0.01, takeProfit - livePrice);
            const downside = Math.max(0.01, livePrice - stopLoss);
            const riskRewardRatio = Number((upside / downside).toFixed(1));

            // Dynamic AVWAP status relative to current ATH anchor
            let avwapAthStatus: WatchlistItem['avwapAthStatus'] = item.avwapAthStatus;
            if (liveQuote.avwapAthPrice && liveQuote.avwapAthPrice > 0) {
              const avwapConverted = liveQuote.avwapAthPrice * fxRate;
              avwapAthStatus = livePrice >= avwapConverted ? 'Above AVWAP' : 'Below AVWAP';
            }

            const formattedMarketCap = getFormattedMarketCap(
              item.ticker, 
              livePrice / fxRate,
              currency
            );

            const exchange = formatExchangeName(liveQuote.exchangeName || item.exchange);

            return {
              ...item,
              currentPrice: livePrice,
              previousClose: prevClose,
              priceChange: change,
              priceChangePercent: changePercent,
              currency,
              marketCap: formattedMarketCap,
              exchange,
              idealEntry,
              stopLoss,
              takeProfit,
              riskRewardRatio,
              trend: changePercent >= 0.5 ? 'Bullish' : changePercent <= -0.5 ? 'Bearish' : 'Neutral',
              avwapAthStatus
            };
          } catch (err) {
            console.warn(`Live quote fallback for watchlist ticker ${item.ticker}:`, err);
            return {
              ...item,
              currency
            };
          }
        })
      );

      watchlistCache.set(cacheKey, {
        items: updatedItems,
        timestamp: Date.now()
      });

      res.json({
        items: updatedItems,
        count: updatedItems.length,
        lastUpdated: new Date().toISOString(),
        source: 'live'
      });
    } catch (error: any) {
      console.error('Error serving watchlist:', error);
      const currency = ((req.query.currency as string) || 'USD').toUpperCase();
      const items: WatchlistItem[] = TOP_20_RECOMMENDED_STOCKS.map(item => ({
        ...item,
        currency
      }));
      res.json({
        items,
        count: items.length,
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      });
    }
  });

  app.get('/api/portfolio', async (req, res) => {
    try {
      const data = await readPortfolioData();
      res.json(data);
    } catch (error: any) {
      console.error('Failed to read portfolio data:', error);
      res.json({ positions: [] });
    }
  });

  app.post('/api/portfolio', async (req, res) => {
    try {
      const body = req.body;
      const cleanTicker = (body.ticker || '').trim().toUpperCase();
      if (!cleanTicker) {
        return res.status(400).json({ error: 'Ticker symbol is required' });
      }

      const data = await readPortfolioData();
      
      const newPosition: any = {
        ticker: cleanTicker,
        avgPrice: parseFloat(body.avgPrice) || 0,
        shares: body.shares ? parseFloat(body.shares) : undefined,
        currency: body.currency || 'USD',
        name: getAuthoritativeCompanyName(cleanTicker, body.name),
        exchange: body.exchange,
        lastAnalyzedPrice: body.lastAnalyzedPrice ? parseFloat(body.lastAnalyzedPrice) : undefined,
        currentPrice: body.currentPrice ? parseFloat(body.currentPrice) : undefined,
        previousClose: body.previousClose,
        priceChange: body.priceChange,
        priceChangePercent: body.priceChangePercent,
        trend: body.trend,
        recommendationAction: body.recommendationAction,
        ma5: body.ma5,
        avwapAthPrice: body.avwapAthPrice,
        dividendYield: body.dividendYield,
        dividendRate: body.dividendRate,
        dividendAmount: body.dividendAmount,
        exDividendDate: body.exDividendDate,
        paymentDate: body.paymentDate,
        idealEntry: body.idealEntry,
        stopLoss: body.stopLoss,
        takeProfit: body.takeProfit,
        logoUrl: resolveTickerLogoUrl(cleanTicker, body.logoUrl, body.name),
        notes: body.notes,
        date: body.date || new Date().toISOString()
      };

      // Auto-lookup live market details if missing
      if (!newPosition.currentPrice || !newPosition.exchange) {
        try {
          const live = await fetchLiveYahooData(cleanTicker);
          if (live && live.currentPrice) {
            if (!newPosition.currentPrice) newPosition.currentPrice = live.currentPrice;
            if (!newPosition.previousClose) newPosition.previousClose = live.previousClose;
            if (newPosition.priceChange === undefined) newPosition.priceChange = live.currentPrice - live.previousClose;
            if (newPosition.priceChangePercent === undefined && live.previousClose > 0) {
              newPosition.priceChangePercent = parseFloat((((live.currentPrice - live.previousClose) / live.previousClose) * 100).toFixed(2));
            }
            if (!newPosition.exchange && live.exchangeName) newPosition.exchange = formatExchangeName(live.exchangeName);
            if (!newPosition.currency && live.currency) newPosition.currency = live.currency;
          }
        } catch (lookupErr) {
          console.warn(`Could not auto-fetch live data for new position ${cleanTicker}:`, lookupErr);
        }
      }

      // Check if ticker already exists, update if so, otherwise prepend
      const existingIndex = data.positions.findIndex((p: any) => p.ticker?.toUpperCase() === cleanTicker);
      if (existingIndex > -1) {
        data.positions[existingIndex] = {
          ...data.positions[existingIndex],
          ...newPosition,
          // Retain shares or notes if not passed in new payload
          shares: newPosition.shares !== undefined ? newPosition.shares : data.positions[existingIndex].shares,
          notes: newPosition.notes !== undefined ? newPosition.notes : data.positions[existingIndex].notes
        };
      } else {
        data.positions.unshift(newPosition);
      }

      await writePortfolioData(data);
      res.json(existingIndex > -1 ? data.positions[existingIndex] : newPosition);
    } catch (error: any) {
      console.error('Failed to save portfolio position:', error);
      res.status(500).json({ error: 'Failed to save portfolio data' });
    }
  });

  app.delete('/api/portfolio/:ticker', async (req, res) => {
    try {
      const ticker = (req.params.ticker || '').trim().toUpperCase();
      const data = await readPortfolioData();
      data.positions = data.positions.filter((p: any) => p.ticker?.toUpperCase() !== ticker);
      await writePortfolioData(data);
      res.json({ success: true, ticker });
    } catch (error: any) {
      console.error('Failed to delete portfolio position:', error);
      res.status(500).json({ error: 'Failed to delete portfolio data' });
    }
  });

  app.post('/api/portfolio/reset', async (req, res) => {
    try {
      const data = {
        hasInitialized: true,
        positions: JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_POSITIONS))
      };
      await writePortfolioData(data);
      res.json({ success: true, positions: data.positions });
    } catch (error: any) {
      console.error('Failed to reset portfolio:', error);
      res.status(500).json({ error: 'Failed to reset portfolio data' });
    }
  });

  // Catch-all for unmatched API routes to ensure JSON response instead of HTML SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
