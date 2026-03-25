import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data.json');

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
      const { ticker, avgPrice, shares, currency } = req.body;
      const dataStr = await fs.readFile(DATA_FILE, 'utf-8');
      const data = JSON.parse(dataStr);
      
      const newPosition = {
        ticker,
        avgPrice,
        shares,
        currency,
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
