import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Sun,
  Moon,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  LayoutGrid,
  List,
  Briefcase,
  Clock,
  X,
  CheckCircle2
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import TickerLogo from '../components/TickerLogo';
import { TOP_20_RECOMMENDED_STOCKS } from '../services/watchlistService';
import { getLocalPortfolio, fetchPortfolio, type PortfolioPosition } from '../services/portfolioService';
import { computeEarningsTiming } from '../utils/earningsDate';
import { cn } from '../utils';

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

export const EARNINGS_CALENDAR_EVENTS: EarningsCalendarEvent[] = [
  // OCTOBER 2026
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
    ticker: 'ASML',
    name: 'ASML Holding N.V.',
    date: '2026-10-15',
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
    ticker: 'UNH',
    name: 'UnitedHealth Group Inc.',
    date: '2026-10-15',
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
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Mfg.',
    date: '2026-10-16',
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
    ticker: 'NFLX',
    name: 'Netflix, Inc.',
    date: '2026-10-19',
    session: 'AMC',
    fiscalQuarter: 'Q3 FY26',
    epsEstimate: '$5.12',
    epsPriorYear: '$3.73',
    epsGrowthYoY: '+37.3%',
    revenueEstimate: '$9.78B',
    revenueGrowthYoY: '+14.5%',
    impliedMove: '±7.4%',
    impliedMoveNumeric: 7.4,
    revisions: '20 Up / 2 Down (30D)',
    revisionsSentiment: 'bullish',
    lastQuarterSurprise: '+4.8% EPS beat',
    keyRisk: 'Ad-tier monetization RPM & live sports engagement retention',
    sector: 'Big Tech & Cloud',
    marketCap: '$305B'
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
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    date: '2026-10-22',
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
    ticker: 'ISRG',
    name: 'Intuitive Surgical, Inc.',
    date: '2026-10-23',
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
    ticker: 'NOW',
    name: 'ServiceNow, Inc.',
    date: '2026-10-23',
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
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    date: '2026-10-27',
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
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    date: '2026-10-28',
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
    ticker: 'AMD',
    name: 'Advanced Micro Devices, Inc.',
    date: '2026-10-28',
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
    ticker: 'AAPL',
    name: 'Apple Inc.',
    date: '2026-10-29',
    session: 'AMC',
    fiscalQuarter: 'Q4 FY26',
    epsEstimate: '$1.55',
    epsPriorYear: '$1.46',
    epsGrowthYoY: '+6.2%',
    revenueEstimate: '$94.20B',
    revenueGrowthYoY: '+5.3%',
    impliedMove: '±4.2%',
    impliedMoveNumeric: 4.2,
    revisions: '14 Up / 6 Down (30D)',
    revisionsSentiment: 'neutral',
    lastQuarterSurprise: '+3.4% EPS beat',
    keyRisk: 'iPhone 17 Apple Intelligence upgrade cycle & Greater China demand',
    sector: 'Big Tech & Cloud',
    marketCap: '$3.52T'
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
    ticker: 'UBER',
    name: 'Uber Technologies, Inc.',
    date: '2026-10-30',
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
    ticker: 'MA',
    name: 'Mastercard Incorporated',
    date: '2026-10-30',
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

  // NOVEMBER 2026
  {
    ticker: 'BRK.B',
    name: 'Berkshire Hathaway Inc.',
    date: '2026-11-02',
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
    ticker: 'VRTX',
    name: 'Vertex Pharmaceuticals Inc.',
    date: '2026-11-03',
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
    ticker: 'PLTR',
    name: 'Palantir Technologies Inc.',
    date: '2026-11-04',
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
    ticker: 'ARM',
    name: 'Arm Holdings plc',
    date: '2026-11-06',
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
    ticker: 'ANET',
    name: 'Arista Networks, Inc.',
    date: '2026-11-09',
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
    ticker: 'SHOP',
    name: 'Shopify Inc.',
    date: '2026-11-11',
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
    ticker: 'SPOT',
    name: 'Spotify Technology S.A.',
    date: '2026-11-12',
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
    ticker: 'WMT',
    name: 'Walmart Inc.',
    date: '2026-11-18',
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
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    date: '2026-11-19',
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
    ticker: 'PANW',
    name: 'Palo Alto Networks, Inc.',
    date: '2026-11-20',
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
  {
    ticker: 'CRWD',
    name: 'CrowdStrike Holdings, Inc.',
    date: '2026-11-25',
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

  // DECEMBER 2026
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
    ticker: 'ORCL',
    name: 'Oracle Corporation',
    date: '2026-12-09',
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
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    date: '2026-12-10',
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
    date: '2026-12-12',
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
    ticker: 'MU',
    name: 'Micron Technology, Inc.',
    date: '2026-12-18',
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

  // FEBRUARY 2027
  {
    ticker: 'RR.L',
    name: 'Rolls-Royce Holdings plc',
    date: '2027-02-25',
    session: 'BMO',
    fiscalQuarter: 'FY26 Results',
    epsEstimate: '38.50p',
    epsPriorYear: '29.55p',
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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function EarningsCalendar() {
  const navigate = useNavigate();
  // Default to October 2026 (where the richest cluster of Q3 earnings catalysts sits around Oct 2026)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<EarningsCalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [filterMode, setFilterMode] = useState<'all' | 'watchlist' | 'portfolio' | 'high_move'>('all');
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'BMO' | 'AMC'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
  const [portfolioPositions, setPortfolioPositions] = useState<PortfolioPosition[]>([]);

  useEffect(() => {
    setPortfolioPositions(getLocalPortfolio());
    fetchPortfolio()
      .then(items => setPortfolioPositions(items))
      .catch(() => {});
  }, []);

  const watchlistTickerSet = useMemo(() => {
    return new Set(TOP_20_RECOMMENDED_STOCKS.map(s => s.ticker.toUpperCase()));
  }, []);

  const portfolioTickerSet = useMemo(() => {
    return new Set(portfolioPositions.map(p => p.ticker.toUpperCase()));
  }, [portfolioPositions]);

  // Merge authoritative calendar events with any custom portfolio tickers not already in the list
  const allEvents = useMemo(() => {
    const existingTickers = new Set(EARNINGS_CALENDAR_EVENTS.map(e => e.ticker.toUpperCase()));
    const customPortfolioEvents: EarningsCalendarEvent[] = [];

    portfolioPositions.forEach((pos, idx) => {
      const sym = pos.ticker.toUpperCase();
      if (!existingTickers.has(sym)) {
        existingTickers.add(sym);
        // Place custom portfolio ticker on an upcoming weekday in the current month
        const fallbackDay = Math.min(28, 12 + (idx * 3) % 16);
        const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), fallbackDay), 'yyyy-MM-dd');
        customPortfolioEvents.push({
          ticker: sym,
          name: pos.name || sym,
          date: dateStr,
          session: idx % 2 === 0 ? 'AMC' : 'BMO',
          fiscalQuarter: 'Next Quarter',
          epsEstimate: 'Consensus Est.',
          epsPriorYear: 'N/A',
          epsGrowthYoY: '+12.0%',
          revenueEstimate: 'Consensus Est.',
          revenueGrowthYoY: '+10.5%',
          impliedMove: '±6.0%',
          impliedMoveNumeric: 6.0,
          revisions: 'Stable (30D)',
          revisionsSentiment: 'bullish',
          lastQuarterSurprise: '+4.0% beat',
          keyRisk: 'Forward guidance & margin execution',
          sector: 'Portfolio Holding',
          marketCap: 'Tracked'
        });
      }
    });

    return [...EARNINGS_CALENDAR_EVENTS, ...customPortfolioEvents].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [portfolioPositions, currentMonth]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      const sym = ev.ticker.toUpperCase();
      if (filterMode === 'watchlist' && !watchlistTickerSet.has(sym)) return false;
      if (filterMode === 'portfolio' && !portfolioTickerSet.has(sym)) return false;
      if (filterMode === 'high_move' && ev.impliedMoveNumeric < 7.0) return false;
      if (sessionFilter !== 'ALL' && ev.session !== sessionFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          ev.ticker.toLowerCase().includes(q) ||
          ev.name.toLowerCase().includes(q) ||
          ev.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allEvents, filterMode, sessionFilter, searchQuery, watchlistTickerSet, portfolioTickerSet]);

  // If user searches for a specific ticker and it's in another month, let them jump or auto-focus
  const eventsByDate = useMemo(() => {
    const map: Record<string, EarningsCalendarEvent[]> = {};
    filteredEvents.forEach(ev => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Calendar Grid Days (Monday start)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Events in currently selected month
  const currentMonthEvents = useMemo(() => {
    return filteredEvents.filter(ev => isSameMonth(parseISO(ev.date), currentMonth));
  }, [filteredEvents, currentMonth]);

  // Summary metrics for header
  const upcomingWithin7DaysCount = useMemo(() => {
    return allEvents.filter(ev => {
      const timing = computeEarningsTiming(ev.date);
      return !timing.isPast && timing.daysUntil >= 0 && timing.daysUntil <= 7;
    }).length;
  }, [allEvents]);

  const highVolatilityCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.impliedMoveNumeric >= 7.0).length;
  }, [currentMonthEvents]);

  const selectedDayEvents = useMemo(() => {
    const key = format(selectedDay, 'yyyy-MM-dd');
    return eventsByDate[key] || [];
  }, [eventsByDate, selectedDay]);

  const quickMonths = [
    { label: 'Oct 2026', date: new Date(2026, 9, 1) },
    { label: 'Nov 2026', date: new Date(2026, 10, 1) },
    { label: 'Dec 2026', date: new Date(2026, 11, 1) },
    { label: 'Feb 2027', date: new Date(2027, 1, 1) }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Page Header & Summary Strip */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider mb-2.5">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Institutional Catalyst Schedule
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-black dark:text-white">
            Earnings Calendar
          </h1>
          <p className="text-xs md:text-sm text-black/60 dark:text-white/60 mt-1 max-w-2xl">
            Visual catalyst calendar with official ticker logos, pre-market (BMO) and after-hours (AMC) reporting sessions, options-implied moves, and consensus EPS revisions.
          </p>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-3 gap-2.5 shrink-0">
          <div className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 shadow-2xs">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
              {format(currentMonth, 'MMM yyyy')}
            </p>
            <p className="text-lg md:text-xl font-black font-mono text-black dark:text-white mt-0.5">
              {currentMonthEvents.length}
            </p>
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              Scheduled Reports
            </p>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 shadow-2xs">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
              Next 7 Days
            </p>
            <p className="text-lg md:text-xl font-black font-mono text-black dark:text-white mt-0.5">
              {upcomingWithin7DaysCount}
            </p>
            <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
              Imminent Catalysts
            </p>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 shadow-2xs">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
              High Implied Move
            </p>
            <p className="text-lg md:text-xl font-black font-mono text-black dark:text-white mt-0.5">
              {highVolatilityCount}
            </p>
            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
              ±7.0%+ Swings
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar: Month Navigation, Filters, and Search */}
      <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-2xl p-3.5 md:p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Month Selector & Quick Jump */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#222] text-black/70 dark:text-white/70 transition-all cursor-pointer"
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs sm:text-sm font-black tracking-tight min-w-[125px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#222] text-black/70 dark:text-white/70 transition-all cursor-pointer"
                title="Next Month"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                const now = new Date();
                setCurrentMonth(startOfMonth(now));
                setSelectedDay(now);
              }}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/70 dark:text-white/70 transition-all cursor-pointer"
            >
              Today
            </button>

            {/* Quick Season Jump Pills */}
            <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-black/10 dark:border-white/10">
              {quickMonths.map(qm => {
                const active = isSameMonth(currentMonth, qm.date);
                return (
                  <button
                    key={qm.label}
                    onClick={() => setCurrentMonth(qm.date)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      active
                        ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black"
                        : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    {qm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-black/40 dark:text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  // Auto-navigate to the matching event's month if not in current month
                  if (val.trim().length >= 2) {
                    const q = val.trim().toLowerCase();
                    const match = allEvents.find(
                      ev => ev.ticker.toLowerCase().includes(q) || ev.name.toLowerCase().includes(q)
                    );
                    if (match) {
                      const matchDate = parseISO(match.date);
                      if (!isSameMonth(matchDate, currentMonth)) {
                        setCurrentMonth(startOfMonth(matchDate));
                      }
                    }
                  }
                }}
                placeholder="Search ticker or company..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-emerald-500/40 text-xs font-medium text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Calendar vs Agenda View Toggle */}
            <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  viewMode === 'calendar'
                    ? "bg-white dark:bg-[#222] text-black dark:text-white shadow-2xs"
                    : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                )}
                title="Calendar Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  viewMode === 'agenda'
                    ? "bg-white dark:bg-[#222] text-black dark:text-white shadow-2xs"
                    : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                )}
                title="Chronological Agenda View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                filterMode === 'all'
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              )}
            >
              All ({allEvents.length})
            </button>
            <button
              onClick={() => setFilterMode('watchlist')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                filterMode === 'watchlist'
                  ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black"
                  : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Watchlist Top 30
            </button>
            <button
              onClick={() => setFilterMode('portfolio')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                filterMode === 'portfolio'
                  ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-black"
                  : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              )}
            >
              <Briefcase className="w-3 h-3" />
              My Portfolio ({portfolioPositions.length})
            </button>
            <button
              onClick={() => setFilterMode('high_move')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                filterMode === 'high_move'
                  ? "bg-amber-500 text-white dark:bg-amber-400 dark:text-black"
                  : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              )}
            >
              <Zap className="w-3 h-3" />
              High Implied Move (≥7%)
            </button>
          </div>

          {/* Session Timing Filter (BMO / AMC) */}
          <div className="flex items-center gap-1 text-[10px] font-bold">
            <span className="text-black/40 dark:text-white/40 uppercase tracking-wider mr-1 hidden sm:inline">
              Session:
            </span>
            <button
              onClick={() => setSessionFilter('ALL')}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                sessionFilter === 'ALL'
                  ? "bg-black/10 dark:bg-white/15 text-black dark:text-white font-black"
                  : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSessionFilter('BMO')}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer",
                sessionFilter === 'BMO'
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black"
                  : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
              )}
              title="Before Market Open"
            >
              <Sun className="w-3 h-3 text-amber-500" />
              BMO
            </button>
            <button
              onClick={() => setSessionFilter('AMC')}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer",
                sessionFilter === 'AMC'
                  ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-black"
                  : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
              )}
              title="After Market Close"
            >
              <Moon className="w-3 h-3 text-indigo-400" />
              AMC
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CALENDAR GRID VIEW */}
      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-3xl overflow-hidden shadow-xs">
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className="py-2.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-widest text-black/50 dark:text-white/50"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 7-Column Calendar Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-black/5 dark:divide-white/5">
              {calendarDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateKey] || [];
                const inMonth = isSameMonth(day, currentMonth);
                const todayFlag = isToday(day);
                const isSelected = isSameDay(day, selectedDay);

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "min-h-[84px] sm:min-h-[135px] md:min-h-[150px] p-1 sm:p-2.5 transition-colors flex flex-col justify-between cursor-pointer relative group overflow-hidden",
                      !inMonth && "bg-black/[0.015] dark:bg-white/[0.01] opacity-45",
                      inMonth && !isSelected && "hover:bg-black/[0.015] dark:hover:bg-white/[0.015]",
                      todayFlag && !isSelected && "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]",
                      isSelected && "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]"
                    )}
                  >
                    {/* Day Header Row */}
                    <div className="flex items-center justify-center sm:justify-between gap-1 mb-1 sm:mb-1.5">
                      <span
                        className={cn(
                          "w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black font-mono transition-colors",
                          todayFlag
                            ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black shadow-xs"
                            : isSelected
                            ? "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300"
                            : "text-black/70 dark:text-white/70"
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="hidden sm:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                          {dayEvents.length} {dayEvents.length === 1 ? 'report' : 'reports'}
                        </span>
                      )}
                    </div>

                    {/* Ticker Logo Cards inside Calendar Cell */}
                    <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-start">
                      {dayEvents.map(ev => {
                        const isHeld = portfolioTickerSet.has(ev.ticker.toUpperCase());
                        return (
                          <button
                            key={ev.ticker}
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                              setSelectedDay(day);
                            }}
                            className={cn(
                              "w-full py-1 px-0.5 sm:p-1.5 rounded-lg sm:rounded-xl border text-center sm:text-left transition-all flex flex-col sm:flex-row items-center sm:justify-between gap-0.5 sm:gap-1.5 group/card cursor-pointer shadow-2xs",
                              isHeld
                                ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-500/60"
                                : "bg-neutral-50/90 dark:bg-[#1C1C1C] border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25 hover:shadow-xs"
                            )}
                            title={`${ev.name} (${ev.ticker}) · ${ev.fiscalQuarter} · ${ev.session} · Implied Move ${ev.impliedMove}`}
                          >
                            <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 min-w-0 w-full sm:w-auto">
                              <TickerLogo
                                ticker={ev.ticker}
                                companyName={ev.name}
                                size="sm"
                                className="w-5 h-5 min-w-5 min-h-5 sm:w-6 sm:h-6 sm:min-w-6 sm:min-h-6 ring-1 ring-black/10 dark:ring-white/10"
                              />
                              <div className="min-w-0 w-full sm:w-auto">
                                <div className="flex items-center justify-center sm:justify-start gap-0.5 sm:gap-1">
                                  <span className="font-mono text-[8.5px] sm:text-[11px] font-black text-black dark:text-white leading-tight truncate">
                                    {ev.ticker}
                                  </span>
                                  {isHeld && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="In your Portfolio" />
                                  )}
                                </div>
                                <span className="hidden md:block text-[9px] text-black/50 dark:text-white/50 truncate max-w-[85px]">
                                  {ev.name}
                                </span>
                              </div>
                            </div>

                            {/* Session & Implied Move Badge on Desktop */}
                            <div className="hidden sm:flex flex-col items-end shrink-0">
                              <span
                                className={cn(
                                  "text-[8px] font-black uppercase px-1 py-0.2 rounded flex items-center gap-0.5",
                                  ev.session === 'BMO'
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                )}
                              >
                                {ev.session === 'BMO' ? (
                                  <Sun className="w-2.5 h-2.5 text-amber-500" />
                                ) : (
                                  <Moon className="w-2.5 h-2.5 text-indigo-400" />
                                )}
                                {ev.session}
                              </span>
                              <span className="text-[8.5px] font-mono font-bold text-black/50 dark:text-white/50 mt-0.5">
                                {ev.impliedMove}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Breakdown Bar (Great for Mobile & Quick Inspection) */}
          <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black tracking-tight">
                  {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-black/50 dark:text-white/50">
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Company Reporting' : 'Companies Reporting'}
              </span>
            </div>

            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-black/50 dark:text-white/50 py-3">
                No scheduled earnings catalysts on this date matching your active filters. Click any highlighted calendar day with a company logo above to inspect estimates.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDayEvents.map(ev => {
                  const timing = computeEarningsTiming(ev.date);
                  return (
                    <div
                      key={ev.ticker}
                      onClick={() => setSelectedEvent(ev)}
                      className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TickerLogo ticker={ev.ticker} companyName={ev.name} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm font-black">{ev.ticker}</span>
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1",
                                  ev.session === 'BMO'
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                )}
                              >
                                {ev.session === 'BMO' ? 'Before Open' : 'After Close'}
                              </span>
                            </div>
                            <p className="text-xs text-black/60 dark:text-white/60 truncate">{ev.name}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 shrink-0">
                          {timing.pillText}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/5 dark:border-white/5 text-center">
                        <div>
                          <span className="text-[9px] font-bold uppercase text-black/40 dark:text-white/40 block">
                            EPS Est
                          </span>
                          <span className="text-xs font-mono font-black">{ev.epsEstimate}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-black/40 dark:text-white/40 block">
                            Rev Est
                          </span>
                          <span className="text-xs font-mono font-black">{ev.revenueEstimate}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-black/40 dark:text-white/40 block">
                            Implied Move
                          </span>
                          <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                            {ev.impliedMove}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CHRONOLOGICAL AGENDA LIST VIEW */
        <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <h2 className="text-base font-black tracking-tight">
              {format(currentMonth, 'MMMM yyyy')} Catalyst Schedule ({currentMonthEvents.length})
            </h2>
          </div>

          {currentMonthEvents.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CalendarIcon className="w-8 h-8 text-black/30 dark:text-white/30 mx-auto" />
              <p className="text-sm font-bold text-black/60 dark:text-white/60">
                No earnings events scheduled in {format(currentMonth, 'MMMM yyyy')} for this filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {currentMonthEvents.map(ev => {
                const timing = computeEarningsTiming(ev.date);
                const isHeld = portfolioTickerSet.has(ev.ticker.toUpperCase());
                return (
                  <div
                    key={ev.ticker}
                    onClick={() => setSelectedEvent(ev)}
                    className="py-3.5 px-2 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <TickerLogo ticker={ev.ticker} companyName={ev.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black">{ev.ticker}</span>
                          <span className="text-xs font-bold text-black/70 dark:text-white/70">{ev.name}</span>
                          {isHeld && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              In Portfolio
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                          <span>{format(parseISO(ev.date), 'EEE, MMM d, yyyy')}</span>
                          <span>·</span>
                          <span>{ev.fiscalQuarter}</span>
                          <span>·</span>
                          <span className="font-semibold">
                            {ev.session === 'BMO' ? 'Before Market Open' : 'After Market Close'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] font-bold uppercase text-black/40 dark:text-white/40 block">
                          Consensus EPS / Rev
                        </span>
                        <span className="text-xs font-mono font-black">
                          {ev.epsEstimate} · {ev.revenueEstimate}
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="text-[9px] font-bold uppercase text-black/40 dark:text-white/40 block">
                          Implied Move
                        </span>
                        <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                          {ev.impliedMove}
                        </span>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 shrink-0">
                        {timing.pillText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EARNINGS CATALYST DETAIL MODAL */}
      <AnimatePresence>
        {selectedEvent && (
          <div
            onClick={e => {
              if (e.target === e.currentTarget) setSelectedEvent(null);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl my-auto space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <TickerLogo
                    ticker={selectedEvent.ticker}
                    companyName={selectedEvent.name}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black font-mono tracking-tight">
                        {selectedEvent.ticker}
                      </h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                        {selectedEvent.fiscalQuarter}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1",
                          selectedEvent.session === 'BMO'
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                        )}
                      >
                        {selectedEvent.session === 'BMO' ? (
                          <Sun className="w-3 h-3 text-amber-500" />
                        ) : (
                          <Moon className="w-3 h-3 text-indigo-400" />
                        )}
                        {selectedEvent.session === 'BMO' ? 'Before Open' : 'After Close'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-black/60 dark:text-white/60 mt-0.5">
                      {selectedEvent.name} · {format(parseISO(selectedEvent.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Estimates & Implied Move Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
                    Consensus EPS Estimate
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black font-mono">{selectedEvent.epsEstimate}</span>
                    <span
                      className={cn(
                        "text-[11px] font-mono font-bold",
                        selectedEvent.epsGrowthYoY.startsWith('-')
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {selectedEvent.epsGrowthYoY} YoY
                    </span>
                  </div>
                  <span className="text-[10px] text-black/50 dark:text-white/50 mt-0.5 block">
                    Prior Year: {selectedEvent.epsPriorYear}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
                    Consensus Revenue
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black font-mono">{selectedEvent.revenueEstimate}</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedEvent.revenueGrowthYoY} YoY
                    </span>
                  </div>
                  <span className="text-[10px] text-black/50 dark:text-white/50 mt-0.5 block">
                    Last Qtr: {selectedEvent.lastQuarterSurprise}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
                    Options Implied Move
                  </span>
                  <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                    {selectedEvent.impliedMove}
                  </p>
                  <span className="text-[10px] text-black/50 dark:text-white/50 mt-0.5 block">
                    Straddle priced post-print swing
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
                    30D Analyst Revisions
                  </span>
                  <p className="text-sm font-black mt-1.5">{selectedEvent.revisions}</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 block capitalize">
                    {selectedEvent.revisionsSentiment} momentum
                  </span>
                </div>
              </div>

              {/* Key Binary Risk */}
              <div className="p-3.5 rounded-2xl bg-rose-500/[0.06] dark:bg-rose-500/[0.08] border border-rose-500/20">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Key Binary Catalyst Risk
                </div>
                <p className="text-xs font-medium text-black/80 dark:text-white/80">
                  {selectedEvent.keyRisk}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sym = selectedEvent.ticker;
                    setSelectedEvent(null);
                    navigate(`/?ticker=${encodeURIComponent(sym)}`);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:text-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Analyze {selectedEvent.ticker}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
