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

  app.get('/api/stock/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const avgPrice = parseFloat(req.query.avgPrice as string) || 0;
      const currency = (req.query.currency as string) || 'USD';
      const forceRefresh = req.query.forceRefresh === 'true';

      const data = await getStockAnalysis(ticker, avgPrice, currency, forceRefresh);
      res.json(data);
    } catch (error: any) {
      console.error(`Error in /api/stock/${req.params.ticker}:`, error);
      res.status(500).json({ error: error?.message || 'Failed to fetch stock analysis' });
    }
  });

  app.get('/api/price/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const currency = (req.query.currency as string) || 'USD';
      const data = await getStockAnalysis(ticker, 0, currency, req.query.forceRefresh === 'true');
      res.json({
        ticker: data.ticker,
        currentPrice: data.currentPrice,
        previousClose: data.previousClose,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent,
        currency,
        lastUpdated: data.lastUpdated
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch stock price' });
    }
  });

  app.post('/api/prices', async (req, res) => {
    try {
      const { tickers, currency = 'USD' } = req.body;
      if (!Array.isArray(tickers)) {
        return res.status(400).json({ error: 'tickers must be an array' });
      }

      const results: Record<string, { currentPrice: number; previousClose: number; priceChange: number; priceChangePercent: number }> = {};
      
      await Promise.all(
        tickers.map(async (t: string) => {
          try {
            const data = await getStockAnalysis(t, 0, currency, false);
            results[t.toUpperCase()] = {
              currentPrice: data.currentPrice,
              previousClose: data.previousClose,
              priceChange: data.priceChange,
              priceChangePercent: data.priceChangePercent
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
      const data = await fs.readFile(DATA_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  app.post('/api/portfolio', async (req, res) => {
    try {
      const { 
        ticker, 
        avgPrice, 
        shares, 
        currency, 
        dividendYield, 
        dividendRate, 
        dividendAmount, 
        exDividendDate, 
        paymentDate,
        idealEntry,
        stopLoss,
        takeProfit,
        logoUrl
      } = req.body;
      const dataStr = await fs.readFile(DATA_FILE, 'utf-8');
      const data = JSON.parse(dataStr);
      
      const newPosition = {
        ticker,
        avgPrice,
        shares,
        currency,
        dividendYield,
        dividendRate,
        dividendAmount,
        exDividendDate,
        paymentDate,
        idealEntry,
        stopLoss,
        takeProfit,
        logoUrl,
        date: new Date().toISOString()
      };

      // Check if ticker already exists, update if so, otherwise add
      const existingIndex = data.positions.findIndex((p: any) => p.ticker === ticker);
      if (existingIndex > -1) {
        data.positions[existingIndex] = newPosition;
      } else {
        data.positions.push(newPosition);
      }

      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(newPosition);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  app.delete('/api/portfolio/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const dataStr = await fs.readFile(DATA_FILE, 'utf-8');
      const data = JSON.parse(dataStr);
      
      data.positions = data.positions.filter((p: any) => p.ticker !== ticker);
      
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete data' });
    }
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
