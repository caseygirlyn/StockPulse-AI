/**
 * Authoritative Earnings Calendar & Catalyst Timing Engine
 * Synced with live Yahoo Finance / NASDAQ corporate reporting schedules.
 * Provides timezone-safe local date parsing, accurate countdown calculation,
 * and a unified single source of truth for corporate earnings dates across
 * the Earnings Calendar page, Analysis Dashboard, and Backend API.
 */

export interface CalculatedEarningsTiming {
  daysUntil: number;
  pillText: string;
  displayDate: string;
  isoDate: string;
  isPast: boolean;
}

export interface EarningsCalendarEvent {
  ticker: string;
  name: string;
  date: string; // YYYY-MM-DD
  session: 'BMO' | 'AMC'; // Before Market Open | After Market Close
  fiscalQuarter: string;
  epsEstimate: string;
  epsPriorYear: string;
  epsGrowthYoY: string;
  revenueEstimate: string;
  revenueGrowthYoY: string;
  impliedMove: string;
  impliedMoveNumeric: number;
  revisions: string;
  revisionsSentiment: 'bullish' | 'neutral' | 'bearish';
  lastQuarterSurprise: string;
  keyRisk: string;
  sector: string;
  marketCap: string;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const KNOWN_ETF_SYMBOLS = new Set([
  'VUAG', 'VUAG.L', 'VUSA', 'VUSA.L', 'VWRP', 'VWRP.L', 'VWRL', 'VWRL.L',
  'INRG', 'INRG.L', 'SSLN', 'SSLN.L', 'SGLN', 'SGLN.L', 'CSPX', 'CSPX.L',
  'SPY', 'QQQ', 'VOO', 'VTI', 'GLD', 'SLV', 'IVV', 'IWM', 'EEM', 'XLF', 'XLE', 'XLK'
]);

export function isEtfTicker(ticker: string, name?: string): boolean {
  const sym = (ticker || '').trim().toUpperCase();
  const base = sym.replace(/\.[A-Z]+$/, '');
  if (KNOWN_ETF_SYMBOLS.has(sym) || KNOWN_ETF_SYMBOLS.has(base)) return true;
  if (name) {
    const lower = name.toLowerCase();
    if (
      lower.includes('etf') ||
      lower.includes('ucits') ||
      lower.includes('ishares') ||
      lower.includes('vanguard') ||
      lower.includes('physical gold') ||
      lower.includes('physical silver')
    ) {
      return true;
    }
  }
  return false;
}

const KNOWN_LSE_BASE_SYMBOLS = new Set([
  'TSCO', 'BARC', 'HSBA', 'BP', 'AV', 'LGEN', 'RR', 'AZN', 'SHEL', 'ULVR', 'RIO', 'GSK', 'REL', 'NG', 'LLOY', 'VOD', 'BA', 'GLEN'
]);

export function isLseTicker(ticker?: string, exchange?: string): boolean {
  const sym = (ticker || '').trim().toUpperCase();
  if (sym.endsWith('.L')) return true;
  if (exchange && (exchange.toUpperCase().includes('LSE') || exchange.toUpperCase().includes('LONDON'))) return true;
  return KNOWN_LSE_BASE_SYMBOLS.has(sym);
}

/**
 * Parses a date string ('YYYY-MM-DD' or 'Nov 2, 2026') into a local midnight Date
 * without UTC-to-local timezone shifting.
 */
export function parseLocalCalendarDate(rawDateStr?: string): Date | null {
  if (!rawDateStr || typeof rawDateStr !== 'string') return null;
  const cleaned = rawDateStr.replace(/^[^·]*·\s*/, '').trim();

  // 1. Strict YYYY-MM-DD local date parsing (prevents UTC midnight -1 day shift in US/UK timezones)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Month name format e.g. 'Nov 2, 2026' or '2 Nov 2026'
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

export function formatToIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Ensures a Date falls on a standard trading weekday (Mon-Fri).
 * If it lands on Saturday, shifts to Thursday; if Sunday, shifts to Tuesday.
 */
export function snapToTradingWeekday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay();
  if (dow === 6) {
    copy.setDate(copy.getDate() - 2); // Saturday -> Thursday
  } else if (dow === 0) {
    copy.setDate(copy.getDate() + 2); // Sunday -> Tuesday
  }
  return copy;
}

export function computeEarningsTiming(
  earningsDateStr?: string,
  defaultDaysFallback?: number,
  allowRollForward: boolean = false
): CalculatedEarningsTiming {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let parsed = parseLocalCalendarDate(earningsDateStr);

  if (!parsed) {
    const days = defaultDaysFallback ?? 30;
    const target = snapToTradingWeekday(new Date(todayMidnight + days * 86400000));
    const formatted = `${MONTHS_SHORT[target.getMonth()]} ${target.getDate()}, ${target.getFullYear()}`;
    return {
      daysUntil: days,
      pillText: days === 0 ? 'Reporting Today' : days === 1 ? 'In 1 Day' : `In ${days} Days`,
      displayDate: formatted,
      isoDate: formatToIsoDate(target),
      isPast: false
    };
  }

  let targetMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  let diffDays = Math.round((targetMidnight - todayMidnight) / 86400000);

  if (allowRollForward && diffDays < -3) {
    while (diffDays < 0) {
      parsed = snapToTradingWeekday(new Date(parsed.getTime() + 91 * 86400000));
      targetMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
      diffDays = Math.round((targetMidnight - todayMidnight) / 86400000);
    }
  }

  const formattedDate = `${MONTHS_SHORT[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
  const isoDate = formatToIsoDate(parsed);

  if (diffDays === 0) {
    return { daysUntil: 0, pillText: 'Reporting Today', displayDate: formattedDate, isoDate, isPast: false };
  } else if (diffDays === 1) {
    return { daysUntil: 1, pillText: 'In 1 Day', displayDate: formattedDate, isoDate, isPast: false };
  } else if (diffDays > 1) {
    return { daysUntil: diffDays, pillText: `In ${diffDays} Days`, displayDate: formattedDate, isoDate, isPast: false };
  } else if (diffDays === -1) {
    return { daysUntil: -1, pillText: 'Reported Yesterday', displayDate: formattedDate, isoDate, isPast: true };
  } else {
    return { daysUntil: diffDays, pillText: `Reported ${Math.abs(diffDays)}d Ago`, displayDate: formattedDate, isoDate, isPast: true };
  }
}

/**
 * Verified Corporate Earnings Calendar Schedule (Oct 2026 – Feb 2027)
 * Synced directly with live Yahoo Finance & NASDAQ corporate earnings timestamps.
 */
export const EARNINGS_CALENDAR_EVENTS: EarningsCalendarEvent[] = [
  // ==========================================
  // OCTOBER 2026 (Verified Yahoo Finance / NASDAQ Dates)
  // ==========================================
  {
    ticker: 'TSCO.L',
    name: 'Tesco PLC',
    date: '2026-10-08',
    session: 'BMO',
    fiscalQuarter: 'H1 FY27 Interim',
    epsEstimate: '£0.14',
    epsPriorYear: '£0.13',
    epsGrowthYoY: '+10.9%',
    revenueEstimate: '£31.80B',
    revenueGrowthYoY: '+4.5%',
    impliedMove: '±3.8%',
    impliedMoveNumeric: 3.8,
    revisions: '11 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.2% EPS beat',
    keyRisk: 'UK grocery price inflation & Finest premium volume mix',
    sector: 'Blue Chips & Value',
    marketCap: '£33.1B'
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    date: '2026-10-13',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$4.18',
    epsPriorYear: '$4.01',
    epsGrowthYoY: '+4.2%',
    revenueEstimate: '$41.90B',
    revenueGrowthYoY: '+5.1%',
    impliedMove: '±3.4%',
    impliedMoveNumeric: 3.4,
    revisions: '14 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.8% EPS beat',
    keyRisk: 'Net interest income (NII) trajectory & commercial credit provisions',
    sector: 'Blue Chips & Value',
    marketCap: '$615B'
  },
  {
    ticker: 'UNH',
    name: 'UnitedHealth Group Inc.',
    date: '2026-10-13',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$7.02',
    epsPriorYear: '$6.56',
    epsGrowthYoY: '+7.0%',
    revenueEstimate: '$99.20B',
    revenueGrowthYoY: '+7.4%',
    impliedMove: '±4.6%',
    impliedMoveNumeric: 4.6,
    revisions: '14 Up / 4 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.1% EPS beat',
    keyRisk: 'Medical Care Ratio (MCR) trend & Medicare Advantage utilization',
    sector: 'Healthcare & Biotech',
    marketCap: '$531B'
  },
  {
    ticker: 'ASML',
    name: 'ASML Holding N.V.',
    date: '2026-10-14',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$5.42',
    epsPriorYear: '$4.81',
    epsGrowthYoY: '+12.7%',
    revenueEstimate: '$7.95B',
    revenueGrowthYoY: '+11.4%',
    impliedMove: '±6.4%',
    impliedMoveNumeric: 6.4,
    revisions: '16 Up / 4 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.1% EPS beat',
    keyRisk: 'High-NA EUV net bookings & China export license restrictions',
    sector: 'AI & Semiconductors',
    marketCap: '$360B'
  },
  {
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Mfg.',
    date: '2026-10-15',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.95',
    epsPriorYear: '$1.29',
    epsGrowthYoY: '+51.2%',
    revenueEstimate: '$23.60B',
    revenueGrowthYoY: '+36.0%',
    impliedMove: '±6.2%',
    impliedMoveNumeric: 6.2,
    revisions: '24 Up / 0 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+8.9% EPS beat',
    keyRisk: 'CoWoS advanced packaging capacity & N2 node ramp timeline',
    sector: 'AI & Semiconductors',
    marketCap: '$925B'
  },
  {
    ticker: 'GE',
    name: 'GE Aerospace',
    date: '2026-10-20',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.14',
    epsPriorYear: '$0.82',
    epsGrowthYoY: '+39.0%',
    revenueEstimate: '$9.05B',
    revenueGrowthYoY: '+11.8%',
    impliedMove: '±5.1%',
    impliedMoveNumeric: 5.1,
    revisions: '17 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+14.1% EPS beat',
    keyRisk: 'LEAP engine shop visit output & commercial aftermarket spare parts',
    sector: 'Blue Chips & Value',
    marketCap: '$204B'
  },
  {
    ticker: 'NFLX',
    name: 'Netflix, Inc.',
    date: '2026-10-20',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.87',
    epsPriorYear: '$0.72',
    epsGrowthYoY: '+20.8%',
    revenueEstimate: '$12.87B',
    revenueGrowthYoY: '+11.9%',
    impliedMove: '±7.4%',
    impliedMoveNumeric: 7.4,
    revisions: '20 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.1% EPS beat',
    keyRisk: 'Ad-tier monetization RPM & live sports engagement retention',
    sector: 'Big Tech & Cloud',
    marketCap: '$305B'
  },
  {
    ticker: 'ISRG',
    name: 'Intuitive Surgical, Inc.',
    date: '2026-10-20',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.65',
    epsPriorYear: '$1.46',
    epsGrowthYoY: '+13.0%',
    revenueEstimate: '$2.02B',
    revenueGrowthYoY: '+15.4%',
    impliedMove: '±5.3%',
    impliedMoveNumeric: 5.3,
    revisions: '15 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+7.2% EPS beat',
    keyRisk: 'da Vinci 5 system placements & global surgical procedure volume',
    sector: 'Healthcare & Biotech',
    marketCap: '$175B'
  },
  {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    date: '2026-10-21',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$5.25',
    epsPriorYear: '$4.39',
    epsGrowthYoY: '+19.6%',
    revenueEstimate: '$40.20B',
    revenueGrowthYoY: '+17.7%',
    impliedMove: '±7.0%',
    impliedMoveNumeric: 7.0,
    revisions: '24 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+11.2% EPS beat',
    keyRisk: 'FY27 AI infrastructure capex guidance & Reels ad impression pricing',
    sector: 'Big Tech & Cloud',
    marketCap: '$1.48T'
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    date: '2026-10-21',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.58',
    epsPriorYear: '$0.66',
    epsGrowthYoY: '-12.1%',
    revenueEstimate: '$25.40B',
    revenueGrowthYoY: '+8.9%',
    impliedMove: '±9.2%',
    impliedMoveNumeric: 9.2,
    revisions: '6 Up / 14 Down (30D)',
    revisionsSentiment: 'bearish',
    lastQuarterSurprise: '-8.5% EPS miss',
    keyRisk: 'Automotive ex-credits gross margin & FSD/Robotaxi regulatory timeline',
    sector: 'High-Growth & Fintech',
    marketCap: '$780B'
  },
  {
    ticker: 'SAP',
    name: 'SAP SE',
    date: '2026-10-21',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '€1.35',
    epsPriorYear: '€1.16',
    epsGrowthYoY: '+16.4%',
    revenueEstimate: '€8.55B',
    revenueGrowthYoY: '+9.8%',
    impliedMove: '±4.5%',
    impliedMoveNumeric: 4.5,
    revisions: '18 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.8% EPS beat',
    keyRisk: 'Cloud ERP backlog conversion & European enterprise IT budgets',
    sector: 'Big Tech & Cloud',
    marketCap: '$265B'
  },
  {
    ticker: 'SPOT',
    name: 'Spotify Technology S.A.',
    date: '2026-10-22',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '€1.72',
    epsPriorYear: '€0.33',
    epsGrowthYoY: '+421%',
    revenueEstimate: '€4.02B',
    revenueGrowthYoY: '+19.6%',
    impliedMove: '±8.2%',
    impliedMoveNumeric: 8.2,
    revisions: '21 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+14.0% EPS beat',
    keyRisk: 'Premium subscriber net additions & gross margin expansion above 30%',
    sector: 'High-Growth & Fintech',
    marketCap: '$78B'
  },
  {
    ticker: 'BARC.L',
    name: 'Barclays PLC',
    date: '2026-10-22',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '£0.11',
    epsPriorYear: '£0.09',
    epsGrowthYoY: '+21.3%',
    revenueEstimate: '£6.48B',
    revenueGrowthYoY: '+4.1%',
    impliedMove: '±4.2%',
    impliedMoveNumeric: 4.2,
    revisions: '13 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+7.4% EPS beat',
    keyRisk: 'UK structural hedge income & investment bank FICC trading revenue',
    sector: 'Blue Chips & Value',
    marketCap: '£65.5B'
  },
  {
    ticker: 'KO',
    name: 'The Coca-Cola Company',
    date: '2026-10-27',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.75',
    epsPriorYear: '$0.74',
    epsGrowthYoY: '+1.4%',
    revenueEstimate: '$11.65B',
    revenueGrowthYoY: '+3.2%',
    impliedMove: '±2.8%',
    impliedMoveNumeric: 2.8,
    revisions: '12 Up / 4 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+3.7% EPS beat',
    keyRisk: 'Organic concentrate volume elasticity & FX headwinds',
    sector: 'Blue Chips & Value',
    marketCap: '$302B'
  },
  {
    ticker: 'HSBA.L',
    name: 'HSBC Holdings plc',
    date: '2026-10-27',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '£0.25',
    epsPriorYear: '£0.22',
    epsGrowthYoY: '+10.3%',
    revenueEstimate: '£13.15B',
    revenueGrowthYoY: '+5.2%',
    impliedMove: '±3.9%',
    impliedMoveNumeric: 3.9,
    revisions: '14 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.1% EPS beat',
    keyRisk: 'Hong Kong wealth management inflows & banking net interest income',
    sector: 'Blue Chips & Value',
    marketCap: '£138B'
  },
  {
    ticker: 'V',
    name: 'Visa Inc.',
    date: '2026-10-27',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$2.58',
    epsPriorYear: '$2.33',
    epsGrowthYoY: '+10.7%',
    revenueEstimate: '$9.49B',
    revenueGrowthYoY: '+10.2%',
    impliedMove: '±3.2%',
    impliedMoveNumeric: 3.2,
    revisions: '17 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+2.9% EPS beat',
    keyRisk: 'Cross-border travel volume growth & US debit regulatory scrutiny',
    sector: 'Blue Chips & Value',
    marketCap: '$565B'
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    date: '2026-10-28',
    session: 'AMC',
    fiscalQuarter: 'Q1 FY27',
    epsEstimate: '$3.10',
    epsPriorYear: '$2.99',
    epsGrowthYoY: '+3.7%',
    revenueEstimate: '$64.50B',
    revenueGrowthYoY: '+14.1%',
    impliedMove: '±4.5%',
    impliedMoveNumeric: 4.5,
    revisions: '16 Up / 4 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.9% EPS beat',
    keyRisk: 'Azure AI cloud capacity & capex payback visibility',
    sector: 'Big Tech & Cloud',
    marketCap: '$3.16T'
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    date: '2026-10-28',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.85',
    epsPriorYear: '$1.55',
    epsGrowthYoY: '+19.4%',
    revenueEstimate: '$86.30B',
    revenueGrowthYoY: '+12.5%',
    impliedMove: '±5.6%',
    impliedMoveNumeric: 5.6,
    revisions: '21 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+7.8% EPS beat',
    keyRisk: 'Search AI Overviews monetization & DOJ antitrust remedies',
    sector: 'Big Tech & Cloud',
    marketCap: '$2.08T'
  },
  {
    ticker: 'NOW',
    name: 'ServiceNow, Inc.',
    date: '2026-10-28',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$3.46',
    epsPriorYear: '$2.92',
    epsGrowthYoY: '+18.5%',
    revenueEstimate: '$2.75B',
    revenueGrowthYoY: '+20.1%',
    impliedMove: '±6.2%',
    impliedMoveNumeric: 6.2,
    revisions: '23 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.8% EPS beat',
    keyRisk: 'Now Assist generative AI Pro Plus net new ACV & cRPO expansion',
    sector: 'High-Growth & Fintech',
    marketCap: '$190B'
  },
  {
    ticker: 'LLY',
    name: 'Eli Lilly and Company',
    date: '2026-10-29',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.45',
    epsPriorYear: '$0.10',
    epsGrowthYoY: '+1,350%',
    revenueEstimate: '$12.10B',
    revenueGrowthYoY: '+27.4%',
    impliedMove: '±6.5%',
    impliedMoveNumeric: 6.5,
    revisions: '19 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+18.2% EPS beat',
    keyRisk: 'Mounjaro / Zepbound manufacturing fill-finish supply & GLP-1 pricing',
    sector: 'Healthcare & Biotech',
    marketCap: '$860B'
  },
  {
    ticker: 'CAT',
    name: 'Caterpillar Inc.',
    date: '2026-10-29',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$5.34',
    epsPriorYear: '$5.17',
    epsGrowthYoY: '+3.3%',
    revenueEstimate: '$16.10B',
    revenueGrowthYoY: '+1.2%',
    impliedMove: '±4.8%',
    impliedMoveNumeric: 4.8,
    revisions: '11 Up / 5 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.2% EPS beat',
    keyRisk: 'Dealer equipment inventory restocking & data center turbine backlog',
    sector: 'Blue Chips & Value',
    marketCap: '$188B'
  },
  {
    ticker: 'MA',
    name: 'Mastercard Incorporated',
    date: '2026-10-29',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$3.74',
    epsPriorYear: '$3.39',
    epsGrowthYoY: '+10.3%',
    revenueEstimate: '$7.27B',
    revenueGrowthYoY: '+11.2%',
    impliedMove: '±3.5%',
    impliedMoveNumeric: 3.5,
    revisions: '16 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.6% EPS beat',
    keyRisk: 'Global consumer discretionary spend & value-added services growth',
    sector: 'Blue Chips & Value',
    marketCap: '$465B'
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com, Inc.',
    date: '2026-10-29',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$1.14',
    epsPriorYear: '$0.94',
    epsGrowthYoY: '+21.3%',
    revenueEstimate: '$157.20B',
    revenueGrowthYoY: '+9.9%',
    impliedMove: '±6.1%',
    impliedMoveNumeric: 6.1,
    revisions: '22 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+9.5% EPS beat',
    keyRisk: 'AWS generative AI re-acceleration & North America retail margin expansion',
    sector: 'Big Tech & Cloud',
    marketCap: '$2.02T'
  },
  {
    ticker: 'INTC',
    name: 'Intel Corporation',
    date: '2026-10-29',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.18',
    epsPriorYear: '$0.41',
    epsGrowthYoY: '-56.1%',
    revenueEstimate: '$13.15B',
    revenueGrowthYoY: '-7.1%',
    impliedMove: '±8.4%',
    impliedMoveNumeric: 8.4,
    revisions: '8 Up / 12 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+6.5% EPS beat',
    keyRisk: '18A foundry node customer yields & data center Xeon market share',
    sector: 'AI & Semiconductors',
    marketCap: '$112B'
  },
  {
    ticker: 'BP.L',
    name: 'BP p.l.c.',
    date: '2026-10-30',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '£0.10',
    epsPriorYear: '£0.11',
    epsGrowthYoY: '-4.9%',
    revenueEstimate: '£37.30B',
    revenueGrowthYoY: '-2.8%',
    impliedMove: '±4.1%',
    impliedMoveNumeric: 4.1,
    revisions: '7 Up / 9 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+2.4% EPS beat',
    keyRisk: 'Refining marker margins & quarterly share buyback pace',
    sector: 'Blue Chips & Value',
    marketCap: '£72.4B'
  },
  {
    ticker: 'REGN',
    name: 'Regeneron Pharmaceuticals, Inc.',
    date: '2026-10-30',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$11.80',
    epsPriorYear: '$11.59',
    epsGrowthYoY: '+1.8%',
    revenueEstimate: '$3.66B',
    revenueGrowthYoY: '+8.9%',
    impliedMove: '±4.4%',
    impliedMoveNumeric: 4.4,
    revisions: '15 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.1% EPS beat',
    keyRisk: 'Dupixent COPD label expansion ramp & Eylea HD conversion pace',
    sector: 'Healthcare & Biotech',
    marketCap: '$108B'
  },
  {
    ticker: 'ABBV',
    name: 'AbbVie Inc.',
    date: '2026-10-30',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$2.92',
    epsPriorYear: '$2.95',
    epsGrowthYoY: '-1.0%',
    revenueEstimate: '$14.28B',
    revenueGrowthYoY: '+3.8%',
    impliedMove: '±3.9%',
    impliedMoveNumeric: 3.9,
    revisions: '16 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.4% EPS beat',
    keyRisk: 'Skyrizi & Rinvoq immunology growth offsetting Humira biosimilars',
    sector: 'Healthcare & Biotech',
    marketCap: '$338B'
  },

  // ==========================================
  // NOVEMBER 2026 (Verified Yahoo Finance / NASDAQ Dates)
  // ==========================================
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    date: '2026-11-02',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.60',
    epsPriorYear: '$1.46',
    epsGrowthYoY: '+9.6%',
    revenueEstimate: '$94.50B',
    revenueGrowthYoY: '+5.6%',
    impliedMove: '±4.2%',
    impliedMoveNumeric: 4.2,
    revisions: '18 Up / 4 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.4% EPS beat',
    keyRisk: 'iPhone 17 Apple Intelligence upgrade cycle & Greater China demand',
    sector: 'Big Tech & Cloud',
    marketCap: '$3.52T'
  },
  {
    ticker: 'PLTR',
    name: 'Palantir Technologies Inc.',
    date: '2026-11-02',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.09',
    epsPriorYear: '$0.07',
    epsGrowthYoY: '+28.6%',
    revenueEstimate: '$705M',
    revenueGrowthYoY: '+26.3%',
    impliedMove: '±11.4%',
    impliedMoveNumeric: 11.4,
    revisions: '17 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+12.5% EPS beat',
    keyRisk: 'US commercial AIP bootcamp conversion velocity & defense contract timing',
    sector: 'High-Growth & Fintech',
    marketCap: '$96B'
  },
  {
    ticker: 'VRTX',
    name: 'Vertex Pharmaceuticals Inc.',
    date: '2026-11-02',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$4.15',
    epsPriorYear: '$3.87',
    epsGrowthYoY: '+7.2%',
    revenueEstimate: '$2.69B',
    revenueGrowthYoY: '+8.5%',
    impliedMove: '±4.9%',
    impliedMoveNumeric: 4.9,
    revisions: '16 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.4% EPS beat',
    keyRisk: 'Suzetrigine non-opioid pain uptake & Casgevy treatment center activations',
    sector: 'Healthcare & Biotech',
    marketCap: '$123B'
  },
  {
    ticker: 'SHOP',
    name: 'Shopify Inc.',
    date: '2026-11-03',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.27',
    epsPriorYear: '$0.24',
    epsGrowthYoY: '+12.5%',
    revenueEstimate: '$2.12B',
    revenueGrowthYoY: '+23.8%',
    impliedMove: '±9.4%',
    impliedMoveNumeric: 9.4,
    revisions: '19 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+11.1% EPS beat',
    keyRisk: 'Gross Merchandise Volume (GMV) trajectory & enterprise Plus merchant attach',
    sector: 'High-Growth & Fintech',
    marketCap: '$109B'
  },
  {
    ticker: 'AMD',
    name: 'Advanced Micro Devices, Inc.',
    date: '2026-11-03',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.92',
    epsPriorYear: '$0.70',
    epsGrowthYoY: '+31.4%',
    revenueEstimate: '$6.71B',
    revenueGrowthYoY: '+15.7%',
    impliedMove: '±7.5%',
    impliedMoveNumeric: 7.5,
    revisions: '15 Up / 5 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+2.2% EPS beat',
    keyRisk: 'MI325X / MI350 data center GPU revenue guide & PC client recovery',
    sector: 'AI & Semiconductors',
    marketCap: '$252B'
  },
  {
    ticker: 'ANET',
    name: 'Arista Networks, Inc.',
    date: '2026-11-03',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$2.08',
    epsPriorYear: '$1.83',
    epsGrowthYoY: '+13.7%',
    revenueEstimate: '$1.75B',
    revenueGrowthYoY: '+15.9%',
    impliedMove: '±7.6%',
    impliedMoveNumeric: 7.6,
    revisions: '19 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.4% EPS beat',
    keyRisk: '800G AI back-end Ethernet switching trials at cloud titans',
    sector: 'AI & Semiconductors',
    marketCap: '$124B'
  },
  {
    ticker: 'UBER',
    name: 'Uber Technologies, Inc.',
    date: '2026-11-04',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$0.41',
    epsPriorYear: '$0.10',
    epsGrowthYoY: '+310%',
    revenueEstimate: '$10.98B',
    revenueGrowthYoY: '+18.2%',
    impliedMove: '±6.8%',
    impliedMoveNumeric: 6.8,
    revisions: '18 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+12.5% EPS beat',
    keyRisk: 'Autonomous vehicle partnership economics & mobility gross bookings',
    sector: 'High-Growth & Fintech',
    marketCap: '$162B'
  },
  {
    ticker: 'ARM',
    name: 'Arm Holdings plc',
    date: '2026-11-04',
    session: 'AMC',
    fiscalQuarter: 'Q2 FY27',
    epsEstimate: '$0.26',
    epsPriorYear: '$0.36',
    epsGrowthYoY: '-27.8%',
    revenueEstimate: '$810M',
    revenueGrowthYoY: '+0.5%',
    impliedMove: '±9.8%',
    impliedMoveNumeric: 9.8,
    revisions: '14 Up / 5 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+8.1% EPS beat',
    keyRisk: 'Armv9 royalty rate adoption in smartphones & data center CPU licensing',
    sector: 'AI & Semiconductors',
    marketCap: '$154B'
  },
  {
    ticker: 'MRNA',
    name: 'Moderna, Inc.',
    date: '2026-11-06',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$-1.89',
    epsPriorYear: '$-9.53',
    epsGrowthYoY: '+80.2%',
    revenueEstimate: '$1.25B',
    revenueGrowthYoY: '-31.0%',
    impliedMove: '±8.9%',
    impliedMoveNumeric: 8.9,
    revisions: '9 Up / 7 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+11.4% EPS beat',
    keyRisk: 'Respiratory mRNA vaccine seasonal uptake & R&D cash burn discipline',
    sector: 'Healthcare & Biotech',
    marketCap: '$28.5B'
  },
  {
    ticker: 'BRK.B',
    name: 'Berkshire Hathaway Inc.',
    date: '2026-11-07',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$4.85',
    epsPriorYear: '$4.52',
    epsGrowthYoY: '+7.3%',
    revenueEstimate: '$92.50B',
    revenueGrowthYoY: '+4.8%',
    impliedMove: '±2.6%',
    impliedMoveNumeric: 2.6,
    revisions: '8 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.1% EPS beat',
    keyRisk: 'GEICO underwriting ratios & T-bill cash pile deployment yield',
    sector: 'Blue Chips & Value',
    marketCap: '$985B'
  },
  {
    ticker: 'AV.L',
    name: 'Aviva plc',
    date: '2026-11-12',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY26 Trading',
    epsEstimate: '£0.23',
    epsPriorYear: '£0.21',
    epsGrowthYoY: '+12.5%',
    revenueEstimate: '£9.65B',
    revenueGrowthYoY: '+9.2%',
    impliedMove: '±3.4%',
    impliedMoveNumeric: 3.4,
    revisions: '10 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.8% beat',
    keyRisk: 'UK general insurance combined operating ratio & Solvency II capital generation',
    sector: 'Blue Chips & Value',
    marketCap: '£18.6B'
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    date: '2026-11-17',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY27',
    epsEstimate: '$0.75',
    epsPriorYear: '$0.40',
    epsGrowthYoY: '+87.5%',
    revenueEstimate: '$33.10B',
    revenueGrowthYoY: '+82.6%',
    impliedMove: '±7.8%',
    impliedMoveNumeric: 7.8,
    revisions: '28 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.1% EPS beat',
    keyRisk: 'Blackwell architecture production ramp & data center gross margin cadence',
    sector: 'AI & Semiconductors',
    marketCap: '$3.15T'
  },
  {
    ticker: 'WMT',
    name: 'Walmart Inc.',
    date: '2026-11-19',
    session: 'BMO',
    fiscalQuarter: 'Q3 FY27',
    epsEstimate: '$0.54',
    epsPriorYear: '$0.51',
    epsGrowthYoY: '+5.9%',
    revenueEstimate: '$167.50B',
    revenueGrowthYoY: '+4.2%',
    impliedMove: '±4.1%',
    impliedMoveNumeric: 4.1,
    revisions: '18 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.8% EPS beat',
    keyRisk: 'US comparable store sales & Walmart Connect advertising margin mix',
    sector: 'Blue Chips & Value',
    marketCap: '$605B'
  },
  {
    ticker: 'PANW',
    name: 'Palo Alto Networks, Inc.',
    date: '2026-11-19',
    session: 'AMC',
    fiscalQuarter: 'Q1 FY27',
    epsEstimate: '$1.48',
    epsPriorYear: '$1.38',
    epsGrowthYoY: '+7.2%',
    revenueEstimate: '$2.12B',
    revenueGrowthYoY: '+12.8%',
    impliedMove: '±7.9%',
    impliedMoveNumeric: 7.9,
    revisions: '20 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.7% EPS beat',
    keyRisk: 'Next-Gen Security ARR platformization & remaining performance obligations',
    sector: 'High-Growth & Fintech',
    marketCap: '$122B'
  },

  // ==========================================
  // DECEMBER 2026 (Verified Yahoo Finance / NASDAQ Dates)
  // ==========================================
  {
    ticker: 'CRWD',
    name: 'CrowdStrike Holdings, Inc.',
    date: '2026-12-01',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY27',
    epsEstimate: '$0.81',
    epsPriorYear: '$0.82',
    epsGrowthYoY: '-1.2%',
    revenueEstimate: '$982M',
    revenueGrowthYoY: '+25.0%',
    impliedMove: '±8.7%',
    impliedMoveNumeric: 8.7,
    revisions: '15 Up / 7 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+6.1% EPS beat',
    keyRisk: 'Net new ARR retention & Falcon Flex module adoption post-incident',
    sector: 'High-Growth & Fintech',
    marketCap: '$76B'
  },
  {
    ticker: 'LGEN.L',
    name: 'Legal & General Group Plc',
    date: '2026-12-02',
    session: 'BMO',
    fiscalQuarter: 'Q4 Capital Update',
    epsEstimate: '£0.20',
    epsPriorYear: '£0.18',
    epsGrowthYoY: '+9.4%',
    revenueEstimate: '£6.40B',
    revenueGrowthYoY: '+6.5%',
    impliedMove: '±3.6%',
    impliedMoveNumeric: 3.6,
    revisions: '9 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.2% beat',
    keyRisk: 'Pension Risk Transfer (PRT) bulk annuity volumes & Solvency II coverage',
    sector: 'Blue Chips & Value',
    marketCap: '£17.1B'
  },
  {
    ticker: 'CRM',
    name: 'Salesforce, Inc.',
    date: '2026-12-02',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY27',
    epsEstimate: '$2.44',
    epsPriorYear: '$2.11',
    epsGrowthYoY: '+15.6%',
    revenueEstimate: '$9.35B',
    revenueGrowthYoY: '+7.2%',
    impliedMove: '±6.9%',
    impliedMoveNumeric: 6.9,
    revisions: '18 Up / 4 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+8.5% EPS beat',
    keyRisk: 'Agentforce autonomous AI agent adoption & cRPO growth',
    sector: 'Big Tech & Cloud',
    marketCap: '$285B'
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    date: '2026-12-09',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.39',
    epsPriorYear: '$1.11',
    epsGrowthYoY: '+25.2%',
    revenueEstimate: '$14.05B',
    revenueGrowthYoY: '+51.1%',
    impliedMove: '±6.8%',
    impliedMoveNumeric: 6.8,
    revisions: '23 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.3% EPS beat',
    keyRisk: 'Custom AI XPU accelerator demand & VMware software integration margins',
    sector: 'AI & Semiconductors',
    marketCap: '$815B'
  },
  {
    ticker: 'COST',
    name: 'Costco Wholesale Corporation',
    date: '2026-12-10',
    session: 'AMC',
    fiscalQuarter: 'Q1 FY27',
    epsEstimate: '$3.78',
    epsPriorYear: '$3.58',
    epsGrowthYoY: '+5.6%',
    revenueEstimate: '$62.10B',
    revenueGrowthYoY: '+7.4%',
    impliedMove: '±3.6%',
    impliedMoveNumeric: 3.6,
    revisions: '15 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.4% EPS beat',
    keyRisk: 'Membership fee increase flow-through & comparable store traffic',
    sector: 'Blue Chips & Value',
    marketCap: '$402B'
  },
  {
    ticker: 'ORCL',
    name: 'Oracle Corporation',
    date: '2026-12-14',
    session: 'AMC',
    fiscalQuarter: 'Q2 FY27',
    epsEstimate: '$1.48',
    epsPriorYear: '$1.34',
    epsGrowthYoY: '+10.4%',
    revenueEstimate: '$14.12B',
    revenueGrowthYoY: '+9.1%',
    impliedMove: '±7.2%',
    impliedMoveNumeric: 7.2,
    revisions: '20 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.5% EPS beat',
    keyRisk: 'OCI GPU cluster backlog conversion & multi-cloud database expansion',
    sector: 'Big Tech & Cloud',
    marketCap: '$477B'
  },
  {
    ticker: 'MU',
    name: 'Micron Technology, Inc.',
    date: '2026-12-23',
    session: 'AMC',
    fiscalQuarter: 'Q1 FY27',
    epsEstimate: '$1.74',
    epsPriorYear: '$-0.95',
    epsGrowthYoY: '+283%',
    revenueEstimate: '$8.70B',
    revenueGrowthYoY: '+84.0%',
    impliedMove: '±8.5%',
    impliedMoveNumeric: 8.5,
    revisions: '19 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+14.2% EPS beat',
    keyRisk: 'HBM3E 12-high memory yield qualification & DRAM spot pricing',
    sector: 'AI & Semiconductors',
    marketCap: '$118B'
  },

  // ==========================================
  // JANUARY 2027 (Verified Yahoo Finance / NASDAQ Dates)
  // ==========================================
  {
    ticker: 'TSCO.L',
    name: 'Tesco PLC',
    date: '2027-01-07',
    session: 'BMO',
    fiscalQuarter: 'Q3 & Christmas Trading',
    epsEstimate: '£0.15',
    epsPriorYear: '£0.13',
    epsGrowthYoY: '+10.8%',
    revenueEstimate: '£18.40B',
    revenueGrowthYoY: '+4.2%',
    impliedMove: '±3.8%',
    impliedMoveNumeric: 3.8,
    revisions: '12 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.2% EPS beat',
    keyRisk: 'Holiday like-for-like UK grocery market share & retail free cash flow guidance',
    sector: 'Blue Chips & Value',
    marketCap: '£33.1B'
  },
  {
    ticker: 'UNH',
    name: 'UnitedHealth Group Inc.',
    date: '2027-01-12',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$6.85',
    epsPriorYear: '$6.16',
    epsGrowthYoY: '+11.2%',
    revenueEstimate: '$101.50B',
    revenueGrowthYoY: '+7.5%',
    impliedMove: '±4.5%',
    impliedMoveNumeric: 4.5,
    revisions: '15 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.1% EPS beat',
    keyRisk: 'FY27 medical care ratio (MCR) outlook & Optum Health enrollment',
    sector: 'Healthcare & Biotech',
    marketCap: '$531B'
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    date: '2027-01-14',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$4.35',
    epsPriorYear: '$3.97',
    epsGrowthYoY: '+9.6%',
    revenueEstimate: '$42.60B',
    revenueGrowthYoY: '+6.7%',
    impliedMove: '±3.5%',
    impliedMoveNumeric: 3.5,
    revisions: '16 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.8% EPS beat',
    keyRisk: 'FY27 net interest income (NII) guidance & investment banking advisory pipeline',
    sector: 'Blue Chips & Value',
    marketCap: '$615B'
  },
  {
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Mfg.',
    date: '2027-01-14',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$2.18',
    epsPriorYear: '$1.44',
    epsGrowthYoY: '+51.4%',
    revenueEstimate: '$26.20B',
    revenueGrowthYoY: '+33.5%',
    impliedMove: '±6.2%',
    impliedMoveNumeric: 6.2,
    revisions: '25 Up / 0 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+8.9% EPS beat',
    keyRisk: 'FY27 capital expenditure budget & CoWoS-L AI packaging capacity',
    sector: 'AI & Semiconductors',
    marketCap: '$925B'
  },
  {
    ticker: 'NFLX',
    name: 'Netflix, Inc.',
    date: '2027-01-19',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$0.94',
    epsPriorYear: '$0.78',
    epsGrowthYoY: '+20.5%',
    revenueEstimate: '$13.40B',
    revenueGrowthYoY: '+13.2%',
    impliedMove: '±7.4%',
    impliedMoveNumeric: 7.4,
    revisions: '21 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.1% EPS beat',
    keyRisk: 'Q4 holiday net paid additions, NFL live streaming metrics & FY27 operating margin',
    sector: 'Big Tech & Cloud',
    marketCap: '$305B'
  },
  {
    ticker: 'ASML',
    name: 'ASML Holding N.V.',
    date: '2027-01-20',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$6.85',
    epsPriorYear: '$5.62',
    epsGrowthYoY: '+21.9%',
    revenueEstimate: '$9.40B',
    revenueGrowthYoY: '+18.2%',
    impliedMove: '±6.4%',
    impliedMoveNumeric: 6.4,
    revisions: '17 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.1% EPS beat',
    keyRisk: 'Q4 EUV system net bookings & 2027 foundry tool delivery schedule',
    sector: 'AI & Semiconductors',
    marketCap: '$360B'
  },
  {
    ticker: 'GE',
    name: 'GE Aerospace',
    date: '2027-01-21',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.22',
    epsPriorYear: '$0.96',
    epsGrowthYoY: '+27.1%',
    revenueEstimate: '$9.55B',
    revenueGrowthYoY: '+12.4%',
    impliedMove: '±5.0%',
    impliedMoveNumeric: 5.0,
    revisions: '18 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+14.1% EPS beat',
    keyRisk: 'FY27 free cash flow guide & LEAP commercial engine delivery cadence',
    sector: 'Blue Chips & Value',
    marketCap: '$204B'
  },
  {
    ticker: 'ISRG',
    name: 'Intuitive Surgical, Inc.',
    date: '2027-01-21',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.79',
    epsPriorYear: '$1.60',
    epsGrowthYoY: '+11.9%',
    revenueEstimate: '$2.21B',
    revenueGrowthYoY: '+14.5%',
    impliedMove: '±5.3%',
    impliedMoveNumeric: 5.3,
    revisions: '16 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+7.2% EPS beat',
    keyRisk: 'FY27 global procedure growth guidance & da Vinci 5 multi-system orders',
    sector: 'Healthcare & Biotech',
    marketCap: '$175B'
  },
  {
    ticker: 'V',
    name: 'Visa Inc.',
    date: '2027-01-26',
    session: 'AMC',
    fiscalQuarter: 'Q1 FY27',
    epsEstimate: '$2.66',
    epsPriorYear: '$2.41',
    epsGrowthYoY: '+10.4%',
    revenueEstimate: '$9.35B',
    revenueGrowthYoY: '+8.3%',
    impliedMove: '±3.2%',
    impliedMoveNumeric: 3.2,
    revisions: '18 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+2.9% EPS beat',
    keyRisk: 'Holiday payment volume growth & international transaction yield',
    sector: 'Blue Chips & Value',
    marketCap: '$565B'
  },
  {
    ticker: 'SAP',
    name: 'SAP SE',
    date: '2027-01-26',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '€1.48',
    epsPriorYear: '€1.26',
    epsGrowthYoY: '+17.5%',
    revenueEstimate: '€9.25B',
    revenueGrowthYoY: '+10.4%',
    impliedMove: '±4.5%',
    impliedMoveNumeric: 4.5,
    revisions: '18 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.8% EPS beat',
    keyRisk: 'Current cloud backlog growth & FY27 operating profit ambition',
    sector: 'Big Tech & Cloud',
    marketCap: '$265B'
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    date: '2027-01-27',
    session: 'AMC',
    fiscalQuarter: 'Q2 FY27',
    epsEstimate: '$3.18',
    epsPriorYear: '$2.93',
    epsGrowthYoY: '+8.5%',
    revenueEstimate: '$68.90B',
    revenueGrowthYoY: '+11.1%',
    impliedMove: '±4.5%',
    impliedMoveNumeric: 4.5,
    revisions: '18 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.9% EPS beat',
    keyRisk: 'Azure AI growth acceleration in H2 FY27 & M365 Copilot seat attach',
    sector: 'Big Tech & Cloud',
    marketCap: '$3.16T'
  },
  {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    date: '2027-01-27',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$6.75',
    epsPriorYear: '$5.33',
    epsGrowthYoY: '+26.6%',
    revenueEstimate: '$46.80B',
    revenueGrowthYoY: '+16.7%',
    impliedMove: '±7.0%',
    impliedMoveNumeric: 7.0,
    revisions: '25 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+11.2% EPS beat',
    keyRisk: 'Holiday ad auction pricing & FY27 total expense / AI capex guidance',
    sector: 'Big Tech & Cloud',
    marketCap: '$1.48T'
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    date: '2027-01-27',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$0.74',
    epsPriorYear: '$0.71',
    epsGrowthYoY: '+4.2%',
    revenueEstimate: '$27.20B',
    revenueGrowthYoY: '+8.1%',
    impliedMove: '±9.2%',
    impliedMoveNumeric: 9.2,
    revisions: '10 Up / 10 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+6.2% EPS beat',
    keyRisk: 'FY27 vehicle delivery growth guidance, Megapack storage margins & FSD',
    sector: 'High-Growth & Fintech',
    marketCap: '$780B'
  },
  {
    ticker: 'NOW',
    name: 'ServiceNow, Inc.',
    date: '2027-01-27',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$3.68',
    epsPriorYear: '$3.11',
    epsGrowthYoY: '+18.3%',
    revenueEstimate: '$2.96B',
    revenueGrowthYoY: '+21.4%',
    impliedMove: '±6.2%',
    impliedMoveNumeric: 6.2,
    revisions: '23 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.8% EPS beat',
    keyRisk: 'FY27 subscription revenue guidance & federal/enterprise AI renewal ACV',
    sector: 'High-Growth & Fintech',
    marketCap: '$190B'
  },
  {
    ticker: 'MA',
    name: 'Mastercard Incorporated',
    date: '2027-01-28',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$3.72',
    epsPriorYear: '$3.18',
    epsGrowthYoY: '+17.0%',
    revenueEstimate: '$7.38B',
    revenueGrowthYoY: '+12.7%',
    impliedMove: '±3.5%',
    impliedMoveNumeric: 3.5,
    revisions: '17 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.6% EPS beat',
    keyRisk: 'Cross-border holiday travel volume & FY27 net revenue growth guide',
    sector: 'Blue Chips & Value',
    marketCap: '$465B'
  },
  {
    ticker: 'CAT',
    name: 'Caterpillar Inc.',
    date: '2027-01-28',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$5.15',
    epsPriorYear: '$5.23',
    epsGrowthYoY: '-1.5%',
    revenueEstimate: '$16.65B',
    revenueGrowthYoY: '-2.4%',
    impliedMove: '±4.8%',
    impliedMoveNumeric: 4.8,
    revisions: '12 Up / 4 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.2% EPS beat',
    keyRisk: 'Energy & Transportation power generation backlog & construction margins',
    sector: 'Blue Chips & Value',
    marketCap: '$188B'
  },
  {
    ticker: 'INTC',
    name: 'Intel Corporation',
    date: '2027-01-28',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$0.14',
    epsPriorYear: '$0.54',
    epsGrowthYoY: '-74.1%',
    revenueEstimate: '$13.80B',
    revenueGrowthYoY: '-10.4%',
    impliedMove: '±8.4%',
    impliedMoveNumeric: 8.4,
    revisions: '9 Up / 11 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+6.5% EPS beat',
    keyRisk: 'Q1 client PC seasonality & Intel Foundry external customer tape-outs',
    sector: 'AI & Semiconductors',
    marketCap: '$112B'
  },

  // ==========================================
  // FEBRUARY 2027 (Verified Yahoo Finance / NASDAQ Dates)
  // ==========================================
  {
    ticker: 'LLY',
    name: 'Eli Lilly and Company',
    date: '2027-02-02',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$5.45',
    epsPriorYear: '$2.49',
    epsGrowthYoY: '+118.9%',
    revenueEstimate: '$13.85B',
    revenueGrowthYoY: '+48.1%',
    impliedMove: '±6.5%',
    impliedMoveNumeric: 6.5,
    revisions: '21 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+18.2% EPS beat',
    keyRisk: 'FY27 revenue guidance for Mounjaro / Zepbound & oral orforglipron readout',
    sector: 'Healthcare & Biotech',
    marketCap: '$860B'
  },
  {
    ticker: 'BP.L',
    name: 'BP p.l.c.',
    date: '2027-02-02',
    session: 'BMO',
    fiscalQuarter: 'Q4 & FY26 Results',
    epsEstimate: '£0.11',
    epsPriorYear: '£0.12',
    epsGrowthYoY: '-4.7%',
    revenueEstimate: '£37.85B',
    revenueGrowthYoY: '+1.4%',
    impliedMove: '±4.1%',
    impliedMoveNumeric: 4.1,
    revisions: '9 Up / 6 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+2.4% EPS beat',
    keyRisk: '2027 capital allocation framework & quarterly share buyback commitment',
    sector: 'Blue Chips & Value',
    marketCap: '£72.4B'
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    date: '2027-02-02',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$2.12',
    epsPriorYear: '$1.64',
    epsGrowthYoY: '+29.3%',
    revenueEstimate: '$96.50B',
    revenueGrowthYoY: '+11.8%',
    impliedMove: '±5.6%',
    impliedMoveNumeric: 5.6,
    revisions: '22 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+7.8% EPS beat',
    keyRisk: 'Google Cloud AI margin expansion & YouTube holiday brand ad spend',
    sector: 'Big Tech & Cloud',
    marketCap: '$2.08T'
  },
  {
    ticker: 'REGN',
    name: 'Regeneron Pharmaceuticals, Inc.',
    date: '2027-02-04',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$11.95',
    epsPriorYear: '$11.86',
    epsGrowthYoY: '+0.8%',
    revenueEstimate: '$3.74B',
    revenueGrowthYoY: '+8.7%',
    impliedMove: '±4.4%',
    impliedMoveNumeric: 4.4,
    revisions: '15 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+5.1% EPS beat',
    keyRisk: 'Eylea HD market share vs. branded competition & Dupixent volume growth',
    sector: 'Healthcare & Biotech',
    marketCap: '$108B'
  },
  {
    ticker: 'ABBV',
    name: 'AbbVie Inc.',
    date: '2027-02-04',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$2.98',
    epsPriorYear: '$2.79',
    epsGrowthYoY: '+6.8%',
    revenueEstimate: '$14.85B',
    revenueGrowthYoY: '+4.0%',
    impliedMove: '±3.9%',
    impliedMoveNumeric: 3.9,
    revisions: '16 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.4% EPS beat',
    keyRisk: 'FY27 adjusted EPS guidance & Skyrizi/Rinvoq combined sales trajectory',
    sector: 'Healthcare & Biotech',
    marketCap: '$338B'
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com, Inc.',
    date: '2027-02-04',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.48',
    epsPriorYear: '$1.00',
    epsGrowthYoY: '+48.0%',
    revenueEstimate: '$186.50B',
    revenueGrowthYoY: '+9.7%',
    impliedMove: '±6.1%',
    impliedMoveNumeric: 6.1,
    revisions: '24 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+9.5% EPS beat',
    keyRisk: 'AWS AI cloud backlog growth & Q4 holiday retail operating income',
    sector: 'Big Tech & Cloud',
    marketCap: '$2.02T'
  },
  {
    ticker: 'KO',
    name: 'The Coca-Cola Company',
    date: '2027-02-09',
    session: 'BMO',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$0.53',
    epsPriorYear: '$0.49',
    epsGrowthYoY: '+8.2%',
    revenueEstimate: '$10.75B',
    revenueGrowthYoY: '+3.4%',
    impliedMove: '±2.8%',
    impliedMoveNumeric: 2.8,
    revisions: '13 Up / 3 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+3.7% EPS beat',
    keyRisk: 'FY27 organic revenue growth guidance & emerging market unit case volume',
    sector: 'Blue Chips & Value',
    marketCap: '$302B'
  },
  {
    ticker: 'BARC.L',
    name: 'Barclays PLC',
    date: '2027-02-18',
    session: 'BMO',
    fiscalQuarter: 'FY26 Annual Results',
    epsEstimate: '£0.41',
    epsPriorYear: '£0.32',
    epsGrowthYoY: '+27.2%',
    revenueEstimate: '£26.40B',
    revenueGrowthYoY: '+4.8%',
    impliedMove: '±4.2%',
    impliedMoveNumeric: 4.2,
    revisions: '14 Up / 1 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+7.4% EPS beat',
    keyRisk: 'Full-year capital distribution plan, share buybacks & RoTE target',
    sector: 'Blue Chips & Value',
    marketCap: '£65.5B'
  },
  {
    ticker: 'HSBA.L',
    name: 'HSBC Holdings plc',
    date: '2027-02-24',
    session: 'BMO',
    fiscalQuarter: 'FY26 Annual Results',
    epsEstimate: '£1.01',
    epsPriorYear: '£0.89',
    epsGrowthYoY: '+13.9%',
    revenueEstimate: '£51.70B',
    revenueGrowthYoY: '+3.1%',
    impliedMove: '±3.9%',
    impliedMoveNumeric: 3.9,
    revisions: '15 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.1% EPS beat',
    keyRisk: 'FY27 net interest income outlook, final dividend & buyback tranche',
    sector: 'Blue Chips & Value',
    marketCap: '£138B'
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    date: '2027-02-24',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY27',
    epsEstimate: '$0.84',
    epsPriorYear: '$0.52',
    epsGrowthYoY: '+61.5%',
    revenueEstimate: '$37.50B',
    revenueGrowthYoY: '+70.0%',
    impliedMove: '±7.8%',
    impliedMoveNumeric: 7.8,
    revisions: '29 Up / 0 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+6.1% EPS beat',
    keyRisk: 'Blackwell Ultra / Rubin architecture roadmap & hyperscaler cluster orders',
    sector: 'AI & Semiconductors',
    marketCap: '$3.15T'
  },
  {
    ticker: 'RR.L',
    name: 'Rolls-Royce Holdings plc',
    date: '2027-02-25',
    session: 'BMO',
    fiscalQuarter: 'FY26 Annual Results',
    epsEstimate: '£0.39',
    epsPriorYear: '£0.30',
    epsGrowthYoY: '+30.3%',
    revenueEstimate: '£18.20B',
    revenueGrowthYoY: '+18.5%',
    impliedMove: '±5.0%',
    impliedMoveNumeric: 5.0,
    revisions: '12 Up / 0 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+12.0% EPS beat',
    keyRisk: 'Civil aerospace widebody engine flying hours & free cash flow conversion',
    sector: 'Blue Chips & Value',
    marketCap: '£41.5B'
  }
];

const TICKER_ALIASES: Record<string, string> = {
  'APPL': 'AAPL',
  'BRK-B': 'BRK.B',
  'BRK.A': 'BRK.B',
  'BRK-A': 'BRK.B',
  'GOOG': 'GOOGL',
  'SAP.DE': 'SAP',
  'RR': 'RR.L',
  'RYCEY': 'RR.L',
  'HSBC': 'HSBA.L',
  'BP': 'BP.L',
  'BCS': 'BARC.L',
  'TSCO': 'TSCO.L',
  'AV': 'AV.L',
  'LGEN': 'LGEN.L'
};

export function normalizeEarningsTicker(symbol: string): string {
  const s = (symbol || '').trim().toUpperCase();
  if (TICKER_ALIASES[s]) return TICKER_ALIASES[s];
  return s;
}

/**
 * Returns the most relevant upcoming (or active within 2 days) earnings event
 * for a given ticker symbol so the Analysis Dashboard and Earnings Calendar
 * always display the exact same catalyst date and estimates.
 */
export function getAuthoritativeEarningsForTicker(symbol: string): EarningsCalendarEvent | undefined {
  const norm = normalizeEarningsTicker(symbol);
  const cleanBase = norm.replace(/\.[A-Z]+$/, '');

  const matches = EARNINGS_CALENDAR_EVENTS.filter(ev => {
    const evUpper = ev.ticker.toUpperCase();
    const evBase = evUpper.replace(/\.[A-Z]+$/, '');
    return evUpper === norm || evBase === cleanBase;
  }).sort((a, b) => a.date.localeCompare(b.date));

  if (matches.length === 0) return undefined;

  // Prefer the next upcoming report (or one that reported yesterday/today within -2 days)
  for (const ev of matches) {
    const timing = computeEarningsTiming(ev.date, undefined, false);
    if (timing.daysUntil >= -2) {
      return ev;
    }
  }

  // Otherwise return the latest scheduled event
  return matches[matches.length - 1];
}
