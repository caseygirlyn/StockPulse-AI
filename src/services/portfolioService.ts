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

const LOCAL_STORAGE_KEY = 'stockpulse_portfolio_positions';

// Helper to get cached positions from localStorage
export function getLocalPortfolio(): PortfolioPosition[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    const positions: PortfolioPosition[] = Array.isArray(data.positions) ? data.positions : [];
    
    // Sync to local storage
    setLocalPortfolio(positions);
    return positions;
  } catch (error) {
    console.warn('Falling back to local storage for portfolio:', error);
    return getLocalPortfolio();
  }
}

export async function savePortfolioPosition(position: Partial<PortfolioPosition> & { ticker: string; avgPrice: number }): Promise<PortfolioPosition> {
  const cleanTicker = position.ticker.trim().toUpperCase();
  const fullPosition: PortfolioPosition = {
    ticker: cleanTicker,
    avgPrice: position.avgPrice,
    shares: position.shares,
    currency: position.currency || 'USD',
    name: position.name || cleanTicker,
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
    logoUrl: position.logoUrl,
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
