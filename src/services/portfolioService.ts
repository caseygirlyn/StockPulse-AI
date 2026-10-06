import { resolveTickerLogoUrl, getAuthoritativeCompanyName } from '../utils/tickerLogos';
import { safeParseResponseJson } from '../utils';
import type { RecommendationAction } from './serverStock';

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
  recommendationAction?: RecommendationAction | string;
  sellPercentage?: number;
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

export const SAMPLE_PORTFOLIO_STARTERS: PortfolioPosition[] = [
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
    dividendYield: 0.76,
    dividendRate: 0.11,
    dividendAmount: 0.06,
    exDividendDate: '2026-08-06',
    paymentDate: '2026-09-18',
    logoUrl: 'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://rolls-royce.com&size=128',
    notes: 'Core UK aerospace & defense champion. H1 2026 operating profit £2.53B, FCF £1.96B, net cash £2.14B. Statutory EPS 69.41p, interim div 6p payable 18 Sep 2026.',
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

// Clean empty slate on first load
export const DEFAULT_PORTFOLIO_STARTERS: PortfolioPosition[] = [];

const LOCAL_STORAGE_KEY = 'stockpulse_portfolio_positions';
const LOCAL_STORAGE_DELETED_KEY = 'stockpulse_portfolio_deleted_tickers';

export function getDeletedTickers(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((t: string) => t.toUpperCase()) : []);
  } catch {
    return new Set();
  }
}

export function markTickerDeleted(ticker: string): void {
  try {
    const clean = ticker.trim().toUpperCase();
    const set = getDeletedTickers();
    set.add(clean);
    localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function clearDeletedTicker(ticker: string): void {
  try {
    const clean = ticker.trim().toUpperCase();
    const set = getDeletedTickers();
    set.delete(clean);
    localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function clearAllDeletedTickers(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_DELETED_KEY);
  } catch {}
}

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

/**
 * Bi-directional self-healing fetch and reconciliation:
 * 1. Reads local browser cache immediately.
 * 2. Fetches server data.json.
 * 3. Reconciles both: preserves local positions missing from server (and heals server via batch),
 *    and incorporates server positions missing locally (unless explicitly deleted by the user).
 * 4. Merges user fields so notes, custom cost-basis, and share quantities are never lost.
 */
export async function fetchPortfolio(): Promise<PortfolioPosition[]> {
  const local = getLocalPortfolio();
  const deletedSet = getDeletedTickers();

  try {
    const res = await fetch('/api/portfolio', {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await safeParseResponseJson<any>(res);
    if (data && Array.isArray(data.positions)) {
      const serverPositions: PortfolioPosition[] = data.positions.map((p: any) => ({
        ...p,
        name: getAuthoritativeCompanyName(p.ticker, p.name),
        logoUrl: resolveTickerLogoUrl(p.ticker, p.logoUrl, p.name)
      }));

      // Reconcile between server and local
      const positionsMap = new Map<string, PortfolioPosition>();

      // 1. Add server positions (omitting any tombstoned/deleted items)
      for (const pos of serverPositions) {
        const t = (pos.ticker || '').trim().toUpperCase();
        if (!t) continue;
        if (deletedSet.has(t)) {
          // Tell server in background to ensure deletion on disk
          fetch(`/api/portfolio/${encodeURIComponent(t)}`, { method: 'DELETE' }).catch(() => {});
          continue;
        }
        positionsMap.set(t, pos);
      }

      // If server explicitly initialized and is empty (e.g. data.json has positions: []),
      // check if local only contains the legacy sample starter positions. If so, clean them out!
      const sampleTickers = new Set(['RR.L', 'NVDA', 'AAPL', 'MSFT']);
      const isOnlySampleStarters = local.length > 0 && local.every(p => sampleTickers.has(p.ticker.toUpperCase()));
      if (serverPositions.length === 0 && isOnlySampleStarters) {
        setLocalPortfolio([]);
        return [];
      }

      // 2. Add or merge local positions
      const missingOnServer: PortfolioPosition[] = [];
      for (const pos of local) {
        const t = (pos.ticker || '').trim().toUpperCase();
        if (!t || deletedSet.has(t)) continue;

        const serverMatch = positionsMap.get(t);
        if (!serverMatch) {
          // Local has a custom position the server lacked (e.g., container reboot)
          positionsMap.set(t, pos);
          missingOnServer.push(pos);
        } else {
          // Both have it: preserve user custom fields (shares, avgPrice, notes)
          positionsMap.set(t, {
            ...serverMatch,
            ...pos,
            // Keep fresh live price/metrics from server if present
            currentPrice: serverMatch.currentPrice || pos.currentPrice,
            priceChange: serverMatch.priceChange ?? pos.priceChange,
            priceChangePercent: serverMatch.priceChangePercent ?? pos.priceChangePercent,
            previousClose: serverMatch.previousClose ?? pos.previousClose,
            exchange: serverMatch.exchange || pos.exchange,
            // Retain user custom holdings details
            avgPrice: pos.avgPrice > 0 ? pos.avgPrice : serverMatch.avgPrice,
            shares: pos.shares !== undefined ? pos.shares : serverMatch.shares,
            notes: pos.notes || serverMatch.notes
          });
        }
      }

      const reconciled = Array.from(positionsMap.values());

      // If server was missing any positions stored locally, auto-heal backend in background
      if (missingOnServer.length > 0) {
        fetch('/api/portfolio/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positions: missingOnServer })
        }).catch(err => console.warn('Auto-healing server portfolio batch failed:', err));
      }

      // Save reconciled list to localStorage
      setLocalPortfolio(reconciled);
      return reconciled;
    }
  } catch (error) {
    console.warn('Falling back to local storage for portfolio:', error);
  }

  // Fallback to local storage filtered by deletions
  const filteredLocal = local.filter(p => !deletedSet.has((p.ticker || '').toUpperCase()));
  if (filteredLocal.length > 0) return filteredLocal;
  return [];
}

export async function clearAllPortfolioPositions(): Promise<void> {
  setLocalPortfolio([]);
  clearAllDeletedTickers();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.localStorage.removeItem(LOCAL_STORAGE_DELETED_KEY);
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { action: 'clear' } }));
  }
  try {
    await fetch('/api/portfolio/clear', { method: 'POST' });
  } catch (err) {
    console.warn('Failed to clear server portfolio:', err);
  }
}

export async function resetToDefaultPortfolio(): Promise<PortfolioPosition[]> {
  clearAllDeletedTickers();
  try {
    const res = await fetch('/api/portfolio/reset', { 
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await safeParseResponseJson<any>(res);
      if (data && data.positions && Array.isArray(data.positions)) {
        const positions: PortfolioPosition[] = data.positions.map((p: any) => ({
          ...p,
          name: getAuthoritativeCompanyName(p.ticker, p.name),
          logoUrl: resolveTickerLogoUrl(p.ticker, p.logoUrl, p.name)
        }));
        setLocalPortfolio(positions);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { action: 'reset' } }));
        }
        return positions;
      }
    }
  } catch (err) {
    console.warn('Failed to call reset API:', err);
  }

  setLocalPortfolio(SAMPLE_PORTFOLIO_STARTERS);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { action: 'reset' } }));
  }
  return SAMPLE_PORTFOLIO_STARTERS;
}

export async function savePortfolioPosition(position: Partial<PortfolioPosition> & { ticker: string; avgPrice: number }): Promise<PortfolioPosition> {
  const cleanTicker = position.ticker.trim().toUpperCase();
  clearDeletedTicker(cleanTicker);

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
    sellPercentage: position.sellPercentage,
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

  // 1. Immediately clear any tombstone and cache in local storage so browser never loses it
  clearDeletedTicker(cleanTicker);
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

  let savedResult: PortfolioPosition = fullPosition;

  // 2. Persist to server data.json
  try {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fullPosition)
    });
    if (res.ok) {
      const saved = await safeParseResponseJson<any>(res);
      if (saved && saved.ticker) {
        savedResult = saved;
        // Re-cache with any server-populated live price/exchange data
        const idx = updatedLocal.findIndex(p => p.ticker.toUpperCase() === cleanTicker);
        if (idx > -1) {
          updatedLocal[idx] = { ...updatedLocal[idx], ...savedResult };
          setLocalPortfolio(updatedLocal);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to sync saved position to backend API:', error);
  }

  // 3. Dispatch event across app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { ticker: cleanTicker } }));
  }

  return savedResult;
}

export async function deletePortfolioPosition(ticker: string): Promise<boolean> {
  const cleanTicker = ticker.trim().toUpperCase();

  // 1. Tombstone in local deleted set so server sync never resurrects it
  markTickerDeleted(cleanTicker);

  // 2. Remove from local storage immediately
  const currentLocal = getLocalPortfolio();
  const updatedLocal = currentLocal.filter(p => p.ticker.toUpperCase() !== cleanTicker);
  setLocalPortfolio(updatedLocal);

  // 3. Delete from server data.json
  let serverOk = false;
  try {
    const res = await fetch(`/api/portfolio/${encodeURIComponent(cleanTicker)}`, {
      method: 'DELETE'
    });
    serverOk = res.ok;
  } catch (error) {
    console.warn('Failed to delete position on backend API:', error);
  }

  // 4. Dispatch event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: { ticker: cleanTicker } }));
  }

  return serverOk;
}

export function getSavedPosition(ticker: string): PortfolioPosition | undefined {
  const cleanTicker = ticker.trim().toUpperCase();
  const positions = getLocalPortfolio();
  return positions.find(p => p.ticker.toUpperCase() === cleanTicker);
}
