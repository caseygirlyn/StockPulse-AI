export interface ExchangeSchedule {
  timezone: string;
  exchangeName: string;
  isRegularOpen: boolean;
  sessionType: 'REGULAR' | 'PRE' | 'POST' | 'CLOSED';
  hasExtendedTrading: boolean;
  localTimeFormatted: string;
  weekday: string;
}

/**
 * Resolves the exchange timezone and evaluates current trading session status
 * for global equity exchanges (LSE, European, Asian, US, etc.).
 */
export function resolveExchangeSchedule(
  symbol: string,
  metaExchange?: string,
  exchangeTimezone?: string
): ExchangeSchedule {
  const sym = (symbol || '').toUpperCase().trim();
  const ex = (metaExchange || '').toUpperCase().trim();
  const tz = (exchangeTimezone || '').trim();

  // 1. Identify Exchange & Canonical Timezone
  let resolvedTz = tz;
  let resolvedExchange = metaExchange || '';
  let hasExtendedTrading = false;

  // London Stock Exchange (LSE)
  const isLse = sym.endsWith('.L') || 
                sym.endsWith('.IL') || 
                ex.includes('LSE') || 
                ex.includes('LONDON') || 
                ex.includes('FTSE') || 
                tz === 'Europe/London' ||
                tz === 'GB' ||
                tz === 'GMT';

  // European Continental Markets (XETRA, Euronext, SIX, etc.)
  const isFrankfurtXetra = sym.endsWith('.DE') || sym.endsWith('.F') || ex.includes('XETRA') || ex.includes('FRANKFURT') || tz === 'Europe/Berlin';
  const isEuronextParis = sym.endsWith('.PA') || ex.includes('PARIS') || tz === 'Europe/Paris';
  const isEuronextAmsterdam = sym.endsWith('.AS') || ex.includes('AMSTERDAM') || tz === 'Europe/Amsterdam';
  const isSwissSix = sym.endsWith('.SW') || ex.includes('SIX') || tz === 'Europe/Zurich';
  const isBorsaItaliana = sym.endsWith('.MI') || ex.includes('MILAN') || tz === 'Europe/Rome';
  const isMadrid = sym.endsWith('.MC') || ex.includes('MADRID') || tz === 'Europe/Madrid';

  // Asian & Australasian Exchanges
  const isTokyo = sym.endsWith('.T') || ex.includes('TOKYO') || tz === 'Asia/Tokyo';
  const isHongKong = sym.endsWith('.HK') || ex.includes('HONG KONG') || tz === 'Asia/Hong_Kong';
  const isAustralia = sym.endsWith('.AX') || ex.includes('ASX') || tz === 'Australia/Sydney';

  // Canadian Exchanges
  const isCanada = sym.endsWith('.TO') || sym.endsWith('.V') || ex.includes('TSX') || tz === 'America/Toronto';

  if (isLse) {
    resolvedTz = 'Europe/London';
    resolvedExchange = 'LSE';
    hasExtendedTrading = false;
  } else if (isFrankfurtXetra) {
    resolvedTz = 'Europe/Berlin';
    resolvedExchange = 'XETRA';
    hasExtendedTrading = false;
  } else if (isEuronextParis) {
    resolvedTz = 'Europe/Paris';
    resolvedExchange = 'EURONEXT';
    hasExtendedTrading = false;
  } else if (isEuronextAmsterdam) {
    resolvedTz = 'Europe/Amsterdam';
    resolvedExchange = 'EURONEXT';
    hasExtendedTrading = false;
  } else if (isSwissSix) {
    resolvedTz = 'Europe/Zurich';
    resolvedExchange = 'SIX';
    hasExtendedTrading = false;
  } else if (isBorsaItaliana) {
    resolvedTz = 'Europe/Rome';
    resolvedExchange = 'MILAN';
    hasExtendedTrading = false;
  } else if (isMadrid) {
    resolvedTz = 'Europe/Madrid';
    resolvedExchange = 'BME';
    hasExtendedTrading = false;
  } else if (isTokyo) {
    resolvedTz = 'Asia/Tokyo';
    resolvedExchange = 'TSE';
    hasExtendedTrading = false;
  } else if (isHongKong) {
    resolvedTz = 'Asia/Hong_Kong';
    resolvedExchange = 'HKEX';
    hasExtendedTrading = false;
  } else if (isAustralia) {
    resolvedTz = 'Australia/Sydney';
    resolvedExchange = 'ASX';
    hasExtendedTrading = false;
  } else if (isCanada) {
    resolvedTz = 'America/Toronto';
    resolvedExchange = 'TSX';
    hasExtendedTrading = false;
  } else {
    // Default US Market (NYSE, NASDAQ, AMEX)
    resolvedTz = 'America/New_York';
    resolvedExchange = resolvedExchange || 'US';
    hasExtendedTrading = true;
  }

  // Evaluate current local time in resolved exchange timezone
  const now = new Date();
  let hour = 12;
  let minute = 0;
  let weekday = 'Mon';

  try {
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false
    });
    const parts = tzFormatter.formatToParts(now);
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
      if (p.type === 'weekday') weekday = p.value;
    }
  } catch (err) {
    console.warn(`Timezone calculation failed for ${resolvedTz}, fallback to UTC`, err);
  }

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const timeInMinutes = hour * 60 + minute;
  const localTimeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  let isRegularOpen = false;
  let sessionType: 'REGULAR' | 'PRE' | 'POST' | 'CLOSED' = 'CLOSED';

  if (!isWeekend) {
    if (isLse) {
      // London Stock Exchange (LSE): 08:00 to 16:30 London local time (480m to 990m)
      if (timeInMinutes >= 480 && timeInMinutes < 990) {
        isRegularOpen = true;
        sessionType = 'REGULAR';
      } else {
        sessionType = 'CLOSED';
      }
    } else if (isFrankfurtXetra || isEuronextParis || isEuronextAmsterdam || isSwissSix || isBorsaItaliana || isMadrid) {
      // Continental European Markets: 09:00 to 17:30 CET (540m to 1050m)
      if (timeInMinutes >= 540 && timeInMinutes < 1050) {
        isRegularOpen = true;
        sessionType = 'REGULAR';
      } else {
        sessionType = 'CLOSED';
      }
    } else if (isTokyo) {
      // Tokyo Stock Exchange: 09:00 - 11:30 (540 - 690) & 12:30 - 15:30 (750 - 930)
      if ((timeInMinutes >= 540 && timeInMinutes < 690) || (timeInMinutes >= 750 && timeInMinutes < 930)) {
        isRegularOpen = true;
        sessionType = 'REGULAR';
      } else {
        sessionType = 'CLOSED';
      }
    } else if (isHongKong) {
      // Hong Kong Stock Exchange: 09:30 - 12:00 (570 - 720) & 13:00 - 16:00 (780 - 960)
      if ((timeInMinutes >= 570 && timeInMinutes < 720) || (timeInMinutes >= 780 && timeInMinutes < 960)) {
        isRegularOpen = true;
        sessionType = 'REGULAR';
      } else {
        sessionType = 'CLOSED';
      }
    } else if (isAustralia) {
      // ASX Sydney: 10:00 - 16:00 (600 - 960)
      if (timeInMinutes >= 600 && timeInMinutes < 960) {
        isRegularOpen = true;
        sessionType = 'REGULAR';
      } else {
        sessionType = 'CLOSED';
      }
    } else if (isCanada) {
      // TSX Toronto: 09:30 - 16:00 (570 - 960)
      if (timeInMinutes >= 570 && timeInMinutes < 960) {
        isRegularOpen = true;
        sessionType = 'REGULAR';
      } else {
        sessionType = 'CLOSED';
      }
    } else {
      // Standard US Markets (ET):
      // Pre-market: 04:00 - 09:30 ET (240 - 570 minutes)
      // Regular: 09:30 - 16:00 ET (570 - 960 minutes)
      // Post-market / After-hours: 16:00 - 20:00 ET (960 - 1200 minutes)
      if (timeInMinutes >= 570 && timeInMinutes < 960) {
        isRegularOpen = true;
        sessionType = 'REGULAR';
      } else if (timeInMinutes >= 240 && timeInMinutes < 570) {
        sessionType = 'PRE';
      } else if (timeInMinutes >= 960 && timeInMinutes < 1200) {
        sessionType = 'POST';
      } else {
        sessionType = 'CLOSED';
      }
    }
  }

  return {
    timezone: resolvedTz,
    exchangeName: resolvedExchange,
    isRegularOpen,
    sessionType,
    hasExtendedTrading,
    localTimeFormatted,
    weekday
  };
}

/**
 * Returns true if the exchange for the given symbol is currently open for regular trading.
 */
export function isExchangeMarketOpen(
  symbol: string,
  metaExchange?: string,
  exchangeTimezone?: string
): boolean {
  return resolveExchangeSchedule(symbol, metaExchange, exchangeTimezone).isRegularOpen;
}
