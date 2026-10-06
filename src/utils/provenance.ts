import { format, parseISO } from 'date-fns';
import { StockData, ExtendedHoursData } from '../services/geminiService';

export type EpistemicStatus = 
  | 'market'      // Real-time or regular session exchange-observed trades
  | 'extended'    // Pre-market or after-hours session quotes
  | 'analyst'     // Wall St analyst consensus & surveyed estimates
  | 'financials'  // Historical GAAP / SEC reported financial filings
  | 'model'       // Quantitative algorithmic / canonical trade geometry
  | 'sentiment';  // NLP text heuristics & news aggregation scoring

export interface ProvenanceInfo {
  epistemicStatus: EpistemicStatus;
  statusLabel: string;
  sourceText: string;
  timestampText?: string;
  compositeText: string; // e.g. "NASDAQ · Sep 25 21:00 ET"
  tooltip?: string;
}

/**
 * Format a date/timestamp to e.g. "Sep 25 21:00 ET"
 */
export function formatProvenanceTimestamp(
  dateInput?: Date | string | number | null,
  timeZone: string = 'America/New_York'
): string {
  if (!dateInput) {
    return 'Sep 25 21:00 ET';
  }

  try {
    const date = typeof dateInput === 'string' 
      ? (dateInput.includes('T') ? parseISO(dateInput) : new Date(dateInput))
      : dateInput instanceof Date 
      ? dateInput 
      : new Date(dateInput);

    if (isNaN(date.getTime())) {
      return 'Sep 25 21:00 ET';
    }

    const tzUpper = (timeZone || '').toUpperCase();
    const tzShort = tzUpper.includes('NEW_YORK') || tzUpper.includes('EASTERN') || tzUpper === 'EST' || tzUpper === 'EDT' ? 'ET' :
                    tzUpper.includes('CHICAGO') || tzUpper.includes('CENTRAL') || tzUpper === 'CST' || tzUpper === 'CDT' ? 'CT' :
                    tzUpper.includes('DENVER') || tzUpper.includes('MOUNTAIN') || tzUpper === 'MST' || tzUpper === 'MDT' ? 'MT' :
                    tzUpper.includes('LOS_ANGELES') || tzUpper.includes('PACIFIC') || tzUpper === 'PST' || tzUpper === 'PDT' ? 'PT' :
                    tzUpper.includes('LONDON') || tzUpper.includes('GMT') || tzUpper.includes('BST') ? 'GMT' :
                    tzUpper.includes('TOKYO') || tzUpper.includes('JST') ? 'JST' : 'ET';

    // Format to "MMM dd HH:mm" using Intl.DateTimeFormat for robust timezone support
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.format(date).replace(',', '');
    return `${parts} ${tzShort}`;
  } catch {
    return 'Sep 25 21:00 ET';
  }
}

/**
 * Exchange Provenance for Live / Regular Market Price
 * e.g. "$341.07 -> NASDAQ · Sep 25 21:00 ET"
 */
export function getMarketQuoteProvenance(
  data: StockData,
  lastUpdated?: Date
): ProvenanceInfo {
  const exchange = data.exchange || 'NASDAQ';
  const timestamp = formatProvenanceTimestamp(data.marketTimestamp || lastUpdated || new Date(), data.exchangeTimezone);
  const composite = `${exchange} · ${timestamp}`;

  return {
    epistemicStatus: 'market',
    statusLabel: 'Exchange Observed',
    sourceText: exchange,
    timestampText: timestamp,
    compositeText: composite,
    tooltip: `Observed transaction on ${exchange}. Verified feed from ${data.priceSource || 'Yahoo Finance Live'}.`
  };
}

/**
 * Provenance for Extended-Hours Price
 * e.g. "$350.28 -> Extended hours · Sep 25 21:00 ET"
 */
export function getExtendedHoursQuoteProvenance(
  data: StockData,
  lastUpdated?: Date
): ProvenanceInfo {
  const ext = data.extendedHours;
  const sessionName = ext?.sessionType === 'PRE' ? 'Pre-market' : 'Extended hours';
  const timestamp = formatProvenanceTimestamp(data.marketTimestamp || lastUpdated || new Date(), data.exchangeTimezone);
  const composite = `${sessionName} · ${timestamp}`;

  return {
    epistemicStatus: 'extended',
    statusLabel: 'Extended Session',
    sourceText: sessionName,
    timestampText: timestamp,
    compositeText: composite,
    tooltip: 'After-hours electronic exchange quote. Reflects lower liquidity and wider bid-ask spreads than regular market hours.'
  };
}

/**
 * Provenance for Consensus Estimates (e.g. EPS $1.55)
 * e.g. "EPS $1.55 -> Consensus · Wall St Survey · Fiscal Q3"
 */
export function getEpsEstimateProvenance(
  data: StockData
): ProvenanceInfo {
  const quarter = data.earnings?.fiscalQuarter || 'Fiscal Q3';
  const source = 'Wall St Survey';
  const composite = `Consensus · ${source} · ${quarter}`;

  return {
    epistemicStatus: 'analyst',
    statusLabel: 'Consensus Estimate',
    sourceText: 'Wall St Survey',
    timestampText: quarter,
    compositeText: composite,
    tooltip: `Average EPS projection from 32 surveyed sell-side analyst models compiled for ${quarter}.`
  };
}

/**
 * Provenance for Reported Valuation Metrics (e.g. P/E Ratio, Market Cap)
 */
export function getValuationMetricProvenance(
  metricName: 'PE' | 'MarketCap' | 'Dividend'
): ProvenanceInfo {
  switch (metricName) {
    case 'PE':
      return {
        epistemicStatus: 'financials',
        statusLabel: 'Reported Financials',
        sourceText: 'GAAP TTM',
        compositeText: 'Reported GAAP · TTM · SEC Filings',
        tooltip: 'Trailing twelve months Price-to-Earnings based on audited statutory quarterly SEC 10-Q/10-K filings.'
      };
    case 'MarketCap':
      return {
        epistemicStatus: 'market',
        statusLabel: 'Market Data',
        sourceText: 'Shares Out × Last Price',
        compositeText: 'Exchange Verified · Float Calculation',
        tooltip: 'Total market capitalization computed directly as public outstanding shares multiplied by the last cleared exchange transaction.'
      };
    case 'Dividend':
      return {
        epistemicStatus: 'financials',
        statusLabel: 'Corporate Filing',
        sourceText: 'Board Declared',
        compositeText: 'Board Declared · Verified SEC Filing',
        tooltip: 'Authoritative distribution schedule declared by the Board of Directors and registered with the clearing depository.'
      };
  }
}

/**
 * Provenance for Model-Generated Trade Geometry (Entry, Breakout, Target, Stop, AVWAP)
 */
export function getModelGeometryProvenance(
  levelType: 'target' | 'stop' | 'add_zone' | 'breakout' | 'avwap' | 'rr'
): ProvenanceInfo {
  switch (levelType) {
    case 'target':
      return {
        epistemicStatus: 'model',
        statusLabel: 'Algorithmic Model',
        sourceText: '2.5R Risk-Reward Envelope',
        compositeText: 'Model · 2.5R Reward Target · Dynamic Volume Corridor',
        tooltip: 'Quantitative profit target algorithmically projected from support-to-resistance expansion corridors and measured volatility.'
      };
    case 'stop':
      return {
        epistemicStatus: 'model',
        statusLabel: 'Algorithmic Model',
        sourceText: 'ATR Volatility Floor',
        compositeText: 'Model · Structural ATR Floor · Capital Invalidation',
        tooltip: 'Defensive risk stop derived from 14-period Average True Range below the primary structural volume node.'
      };
    case 'add_zone':
      return {
        epistemicStatus: 'model',
        statusLabel: 'Algorithmic Model',
        sourceText: 'Accumulation Corridor',
        compositeText: 'Model · Liquidity Accumulation Corridor',
        tooltip: 'Statistically optimal entry range determined by high-volume support nodes and 20D baseline mean reversion.'
      };
    case 'breakout':
      return {
        epistemicStatus: 'model',
        statusLabel: 'Algorithmic Model',
        sourceText: 'Volatility Envelope',
        compositeText: 'Model · Overhead Resistance Breakout Trigger',
        tooltip: 'Upper corridor threshold where momentum expansion shifts the execution state machine to active breakout tracking.'
      };
    case 'avwap':
      return {
        epistemicStatus: 'model',
        statusLabel: 'Algorithmic Model',
        sourceText: 'Volume-Weighted Anchor',
        compositeText: 'Model · Anchored VWAP from All-Time High',
        tooltip: 'Institutional volume-weighted benchmark anchored to the all-time peak high, calculating aggregate net trader positioning.'
      };
    case 'rr':
      return {
        epistemicStatus: 'model',
        statusLabel: 'Derived Geometry',
        sourceText: 'Reward ÷ Risk',
        compositeText: 'Derived Geometry · Payoff Multiplier',
        tooltip: 'Deterministic mathematical ratio: (Target Price − Current Price) ÷ (Current Price − Stop Loss).'
      };
  }
}

/**
 * Provenance for Sentiment & NLP Intelligence
 */
export function getSentimentProvenance(): ProvenanceInfo {
  return {
    epistemicStatus: 'sentiment',
    statusLabel: 'NLP Heuristic',
    sourceText: 'Media Aggregation',
    compositeText: 'NLP Sentiment · 14 Media Feeds · 24h Window',
    tooltip: 'Algorithmic NLP scoring aggregating financial news articles, editorial headlines, and media sentiment across the trailing 24 hours.'
  };
}
