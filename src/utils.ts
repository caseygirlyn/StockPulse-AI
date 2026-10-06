import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const KNOWN_NYSE_TICKERS = new Set([
  'V', 'KO', 'DIS', 'JNJ', 'IBM', 'PG', 'BA', 'JPM', 'UNH', 'GE', 'GS', 'CVX', 
  'MCD', 'NKE', 'PFE', 'WMT', 'XOM', 'CAT', 'HD', 'VZ', 'MMM', 'LLY', 'BRK.B', 
  'BRK.A', 'MRK', 'ORCL', 'ABBV', 'BAC', 'CRM', 'T', 'LOW', 'RTX', 'MS', 'SCHW', 
  'SPGI', 'BLK', 'C', 'PLD', 'DE', 'BMY', 'TGT', 'UPS', 'FDX', 'LMT', 'NEE', 'SO', 'DUK', 'USB', 'PNC'
]);

const KNOWN_LSE_TICKERS = new Set([
  'SBRY', 'BARC', 'RR', 'INRG', 'VUAG', 'VUSA', 'VWRP', 'VWRL', 'SSLN', 'SGLN', 
  'BT-A', 'BT', 'SHEL', 'BP', 'HSBA', 'AZN', 'GSK', 'ULVR', 'RIO', 'BATS', 'DGE', 
  'LSEG', 'BA', 'NG', 'VOD', 'LLOY', 'NWG', 'PRU', 'AV', 'AAL', 'GLEN', 'CPG', 
  'REL', 'EXPN', 'IMB', 'CRH', 'TSCO', 'MKS', 'ABF', 'STAN', 'BDEV'
]);

/**
 * Resolves and sanitizes a news article URL.
 * Fixes broken Google Finance links (e.g. https://www.google.com/finance/quote/ which return
 * "We couldn't find any match for your search") and ensures publisher branding (e.g., Seeking Alpha,
 * Reuters, Bloomberg) matches the actual destination link instead of mismatched third-party hosts.
 */
export function resolveNewsArticleUrl(
  url: string | undefined, 
  ticker?: string, 
  title?: string,
  source?: string
): string {
  const trimmed = (url || '').trim();
  const rawTicker = (ticker || '').trim().toUpperCase();
  const cleanTicker = rawTicker.replace(/\.[A-Za-z]+$/, '');
  const cleanTitle = (title || '').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanSource = (source || '').trim();
  const sourceLower = cleanSource.toLowerCase();

  const isUk = /\.(L|LON)$/i.test(rawTicker) || 
               trimmed.includes('.L/') || 
               trimmed.includes(':LN') || 
               KNOWN_LSE_TICKERS.has(cleanTicker) || 
               KNOWN_LSE_TICKERS.has(rawTicker);
  const isNyse = !isUk && KNOWN_NYSE_TICKERS.has(cleanTicker);

  // If source is specified, ensure destination strictly matches publisher branding
  if (sourceLower.includes('seeking alpha')) {
    if (!trimmed || trimmed.includes('yahoo.com') || trimmed.includes('google.com') || trimmed === '#') {
      return `https://seekingalpha.com/symbol/${cleanTicker}`;
    }
  }

  if (sourceLower.includes('reuters')) {
    const reutersTicker = isUk 
      ? `${cleanTicker}.L` 
      : isNyse 
        ? cleanTicker 
        : `${cleanTicker}.O`;

    if (trimmed.includes(`reuters.com/markets/companies/${reutersTicker}/`)) {
      return trimmed;
    }

    const isReutersCompanyPattern = trimmed.includes('/markets/companies/');
    const hasWrongSuffix = (isUk && trimmed.includes('.O')) || 
                           (isNyse && trimmed.includes('.O')) ||
                           (!isUk && !isNyse && isReutersCompanyPattern && !trimmed.includes('.O'));

    if (
      !trimmed || 
      trimmed.includes('yahoo.com') || 
      trimmed.includes('google.com') || 
      trimmed === '#' || 
      trimmed.includes('site-search') || 
      hasWrongSuffix ||
      !isReutersCompanyPattern
    ) {
      return `https://www.reuters.com/markets/companies/${reutersTicker}/`;
    }
  }

  if (sourceLower.includes('bloomberg')) {
    const bbTicker = isUk ? `${cleanTicker}:LN` : `${cleanTicker}:US`;
    if (
      !trimmed || 
      trimmed.includes('yahoo.com') || 
      trimmed.includes('google.com') || 
      trimmed === '#' || 
      trimmed.includes('/search') || 
      (isUk && trimmed.includes(':US')) || 
      (!isUk && trimmed.includes(':LN'))
    ) {
      return `https://www.bloomberg.com/quote/${bbTicker}`;
    }
  }

  if (sourceLower.includes('marketwatch')) {
    if (!trimmed || trimmed.includes('yahoo.com') || trimmed.includes('google.com') || trimmed === '#') {
      return `https://www.marketwatch.com/investing/stock/${cleanTicker.toLowerCase()}`;
    }
  }

  if (sourceLower.includes('wall street journal') || sourceLower.includes('wsj')) {
    const isUk = /\.(L|LON)$/i.test(cleanTicker) || cleanTicker.includes('.L');
    if (isUk) {
      const ukTicker = cleanTicker.replace(/\.(L|LON)$/i, '').trim();
      return `https://www.wsj.com/market-data/quotes/UK/XLON/${ukTicker}`;
    }
    if (!trimmed || trimmed.includes('yahoo.com') || trimmed.includes('google.com') || trimmed === '#') {
      return `https://www.wsj.com/market-data/quotes/${cleanTicker}`;
    }
    return trimmed;
  }

  if (sourceLower.includes('financial times') || sourceLower === 'ft') {
    if (!trimmed || trimmed.includes('yahoo.com') || trimmed.includes('google.com') || trimmed === '#') {
      return `https://markets.ft.com/data/equities/tearsheet/summary?s=${cleanTicker}`;
    }
  }

  const query = encodeURIComponent([cleanTicker, cleanSource, cleanTitle].filter(Boolean).join(' ').trim());
  const fallbackUrl = `https://news.google.com/search?q=${query || encodeURIComponent(cleanTicker || 'stock news')}`;

  if (!trimmed || trimmed === '#' || trimmed.startsWith('javascript:')) {
    return fallbackUrl;
  }

  // Broken Google Finance quote links (which error with "We couldn't find any match for your search")
  if (
    trimmed.includes('google.com/finance/quote') || 
    trimmed.includes('google.com/finance') ||
    trimmed.includes('/finance/quote')
  ) {
    return fallbackUrl;
  }

  // Yahoo Finance quote root without /news -> route to the ticker's news tab
  if (/^https?:\/\/finance\.yahoo\.com\/quote\/[A-Za-z0-9^.-]+\/?$/i.test(trimmed)) {
    return `${trimmed.replace(/\/$/, '')}/news`;
  }

  return trimmed;
}

/**
 * Safely parses JSON from a Response object, guarding against HTML error shells
 * (such as Vite dev server 404/500/cold-start <!doctype html> pages) that cause
 * "Unexpected token '<', '<!doctype '... is not valid JSON".
 */
export async function safeParseResponseJson<T = any>(res: Response): Promise<T | null> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
      return null;
    }
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

