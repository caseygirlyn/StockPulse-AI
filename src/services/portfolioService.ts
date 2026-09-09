import { resolveTickerLogoUrl, getAuthoritativeCompanyName } from '../utils/tickerLogos';

export interface PortfolioPosition {
  ticker: string;
  avgPrice: number;
  shares?: number;
  currency: string;
  name?: string;
  exchange?: string;
  lastAnalyzedPrice?: number;
  currentPrice?: number;
  previousClose?: number;
  priceChange?: number;
  priceChangePercent?: number;
  trend?: 'Bullish' | 'Bearish' | 'Neutral';
  recommendationAction?: 'Buy More' | 'Hold' | 'Sell';
  ma5?: number;
  avwapAthPrice?: number;
  dividendYield?: number;
  dividendRate?: number;
  dividendAmount?: number;
  exDividendDate?: string;
  paymentDate?: string;
  idealEntry?: number;
  stopLoss?: number;
  takeProfit?: number;
  logoUrl?: string;
  notes?: string;
  date: string;
}

export const DEFAULT_PORTFOLIO_STARTERS: PortfolioPosition[] = [
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
    date: '2026-09-09T00:00:00.000Z'
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
    date: '2026-09-09T00:00:00.000Z'
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
    date: '2026-09-09T00:00:00.000Z'
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
    date: '2026-09-09T00:00:00.000Z'
  }
];

const LOCAL_STORAGE_KEY = 'stockpulse_portfolio_positions';

// Helper to get cached positions from localStorage
export function getLocalPortfolio(): PortfolioPosition[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(p => ({
      ...p,
      name: getAuthoritativeCompanyName(p.ticker, p.name),
      logoUrl: resolveTickerLogoUrl(p.ticker, p.logoUrl, p.name)
    }));
  } catch {
    return [];
  }
}

// Helper to save cached positions to localStorage
export function setLocalPortfolio(positions: PortfolioPosition[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(positions));
  } catch (e) {
    console.warn('Failed to save portfolio to localStorage:', e);
  }
}

export async function fetchPortfolio(): Promise<PortfolioPosition[]> {
  const localPositions = getLocalPortfolio();

  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    const serverPositions: PortfolioPosition[] = Array.isArray(data.positions) ? data.positions : [];
    
    // If server has positions, merge them with local storage
    if (serverPositions.length > 0) {
      const mergedMap = new Map<string, PortfolioPosition>();

      // Populate local first
      localPositions.forEach(p => {
        if (p.ticker) mergedMap.set(p.ticker.toUpperCase(), p);
      });

      // Merge server positions
      serverPositions.forEach(p => {
        if (!p.ticker) return;
        const key = p.ticker.toUpperCase();
        const existing = mergedMap.get(key);
        if (existing) {
          mergedMap.set(key, {
            ...existing,
            ...p,
            shares: p.shares !== undefined ? p.shares : existing.shares,
            notes: p.notes || existing.notes
          });
        } else {
          mergedMap.set(key, p);
        }
      });

      const finalPositions = Array.from(mergedMap.values()).map(p => ({
        ...p,
        name: getAuthoritativeCompanyName(p.ticker, p.name),
        logoUrl: resolveTickerLogoUrl(p.ticker, p.logoUrl, p.name)
      }));
      setLocalPortfolio(finalPositions);

      // Sync any local-only positions to the server in background
      localPositions.forEach(localPos => {
        if (!serverPositions.some(sp => sp.ticker.toUpperCase() === localPos.ticker.toUpperCase())) {
          fetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localPos)
          }).catch(() => {});
        }
      });

      return finalPositions;
    }

    // If server returned empty, but local has positions, preserve local and sync to server!
    if (localPositions.length > 0) {
      localPositions.forEach(pos => {
        fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pos)
        }).catch(() => {});
      });
      return localPositions;
    }

    // If both server and local are empty, initialize with default starters
    setLocalPortfolio(DEFAULT_PORTFOLIO_STARTERS);
    DEFAULT_PORTFOLIO_STARTERS.forEach(pos => {
      fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pos)
      }).catch(() => {});
    });

    return DEFAULT_PORTFOLIO_STARTERS;
  } catch (error) {
    console.warn('Falling back to local storage for portfolio:', error);
    const local = getLocalPortfolio();
    if (local.length > 0) return local;
    setLocalPortfolio(DEFAULT_PORTFOLIO_STARTERS);
    return DEFAULT_PORTFOLIO_STARTERS;
  }
}

export async function resetToDefaultPortfolio(): Promise<PortfolioPosition[]> {
  setLocalPortfolio(DEFAULT_PORTFOLIO_STARTERS);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { action: 'reset' } }));
  }

  try {
    const res = await fetch('/api/portfolio/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.positions && Array.isArray(data.positions)) {
        setLocalPortfolio(data.positions);
        return data.positions;
      }
    }
  } catch (err) {
    console.warn('Failed to call reset API:', err);
  }

  return DEFAULT_PORTFOLIO_STARTERS;
}

export async function savePortfolioPosition(position: Partial<PortfolioPosition> & { ticker: string; avgPrice: number }): Promise<PortfolioPosition> {
  const cleanTicker = position.ticker.trim().toUpperCase();
  const fullPosition: PortfolioPosition = {
    ticker: cleanTicker,
    avgPrice: position.avgPrice,
    shares: position.shares,
    currency: position.currency || 'USD',
    name: getAuthoritativeCompanyName(cleanTicker, position.name),
    exchange: position.exchange,
    lastAnalyzedPrice: position.lastAnalyzedPrice,
    currentPrice: position.currentPrice,
    previousClose: position.previousClose,
    priceChange: position.priceChange,
    priceChangePercent: position.priceChangePercent,
    trend: position.trend,
    recommendationAction: position.recommendationAction,
    ma5: position.ma5,
    avwapAthPrice: position.avwapAthPrice,
    dividendYield: position.dividendYield,
    dividendRate: position.dividendRate,
    dividendAmount: position.dividendAmount,
    exDividendDate: position.exDividendDate,
    paymentDate: position.paymentDate,
    idealEntry: position.idealEntry,
    stopLoss: position.stopLoss,
    takeProfit: position.takeProfit,
    logoUrl: resolveTickerLogoUrl(cleanTicker, position.logoUrl, position.name),
    notes: position.notes,
    date: position.date || new Date().toISOString()
  };

  // Optimistically update local cache
  const currentLocal = getLocalPortfolio();
  const existingIndex = currentLocal.findIndex(p => p.ticker.toUpperCase() === cleanTicker);
  let updatedLocal: PortfolioPosition[];
  if (existingIndex > -1) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIndex] = { ...updatedLocal[existingIndex], ...fullPosition };
  } else {
    updatedLocal = [fullPosition, ...currentLocal];
  }
  setLocalPortfolio(updatedLocal);

  // Dispatch custom event for reactive UI updates across components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { ticker: cleanTicker } }));
  }

  // Persist to server
  try {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPosition)
    });
    if (res.ok) {
      const saved = await res.json();
      return saved;
    }
  } catch (error) {
    console.warn('Failed to sync saved position to backend API:', error);
  }

  return fullPosition;
}

export async function deletePortfolioPosition(ticker: string): Promise<boolean> {
  const cleanTicker = ticker.trim().toUpperCase();

  // Optimistically update local storage
  const currentLocal = getLocalPortfolio();
  const updatedLocal = currentLocal.filter(p => p.ticker.toUpperCase() !== cleanTicker);
  setLocalPortfolio(updatedLocal);

  // Dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { ticker: cleanTicker } }));
  }

  try {
    const res = await fetch(`/api/portfolio/${encodeURIComponent(cleanTicker)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (error) {
    console.warn('Failed to delete position on backend API:', error);
    return true;
  }
}

export function getSavedPosition(ticker: string): PortfolioPosition | undefined {
  const cleanTicker = ticker.trim().toUpperCase();
  const positions = getLocalPortfolio();
  return positions.find(p => p.ticker.toUpperCase() === cleanTicker);
}
