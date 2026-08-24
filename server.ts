import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import { getStockAnalysis, fetchLiveYahooData, getFxDetails } from './src/services/serverStock.js';

const DATA_FILE = path.join(process.cwd(), 'data.json');

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ positions: [] }, null, 2));
  }
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

  app.post('/api/prices', async (req, res) => {
    try {
      const { tickers, currency = 'USD' } = req.body;
      if (!Array.isArray(tickers)) {
        return res.status(400).json({ error: 'tickers must be an array' });
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
            const data = await getStockAnalysis(t, 0, currency, false);
            results[t.toUpperCase()] = {
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
  });

  app.get('/api/portfolio', async (req, res) => {
    try {
      const dataStr = await fs.readFile(DATA_FILE, 'utf-8');
      const data = JSON.parse(dataStr);
      if (!Array.isArray(data.positions)) {
        data.positions = [];
      }
      res.json(data);
    } catch (error: any) {
      console.error('Failed to read portfolio data:', error);
      res.status(500).json({ error: 'Failed to read portfolio data' });
    }
  });

  app.post('/api/portfolio', async (req, res) => {
    try {
      const body = req.body;
      const cleanTicker = (body.ticker || '').trim().toUpperCase();
      if (!cleanTicker) {
        return res.status(400).json({ error: 'Ticker symbol is required' });
      }

      const dataStr = await fs.readFile(DATA_FILE, 'utf-8');
      const data = JSON.parse(dataStr);
      if (!Array.isArray(data.positions)) {
        data.positions = [];
      }
      
      const newPosition = {
        ticker: cleanTicker,
        avgPrice: parseFloat(body.avgPrice) || 0,
        shares: body.shares ? parseFloat(body.shares) : undefined,
        currency: body.currency || 'USD',
        name: body.name || cleanTicker,
        exchange: body.exchange,
        lastAnalyzedPrice: body.lastAnalyzedPrice ? parseFloat(body.lastAnalyzedPrice) : undefined,
        currentPrice: body.currentPrice ? parseFloat(body.currentPrice) : undefined,
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
        logoUrl: body.logoUrl,
        notes: body.notes,
        date: body.date || new Date().toISOString()
      };

      // Check if ticker already exists, update if so, otherwise prepend
      const existingIndex = data.positions.findIndex((p: any) => p.ticker?.toUpperCase() === cleanTicker);
      if (existingIndex > -1) {
        data.positions[existingIndex] = {
          ...data.positions[existingIndex],
          ...newPosition,
          // Retain shares if not passed in new payload
          shares: newPosition.shares !== undefined ? newPosition.shares : data.positions[existingIndex].shares,
          notes: newPosition.notes !== undefined ? newPosition.notes : data.positions[existingIndex].notes
        };
      } else {
        data.positions.unshift(newPosition);
      }

      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(existingIndex > -1 ? data.positions[existingIndex] : newPosition);
    } catch (error: any) {
      console.error('Failed to save portfolio position:', error);
      res.status(500).json({ error: 'Failed to save portfolio data' });
    }
  });

  app.delete('/api/portfolio/:ticker', async (req, res) => {
    try {
      const ticker = (req.params.ticker || '').trim().toUpperCase();
      const dataStr = await fs.readFile(DATA_FILE, 'utf-8');
      const data = JSON.parse(dataStr);
      if (Array.isArray(data.positions)) {
        data.positions = data.positions.filter((p: any) => p.ticker?.toUpperCase() !== ticker);
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      }
      res.json({ success: true, ticker });
    } catch (error: any) {
      console.error('Failed to delete portfolio position:', error);
      res.status(500).json({ error: 'Failed to delete portfolio data' });
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
