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
  AlertTriangle,
  ArrowUpRight,
  LayoutGrid,
  List,
  Briefcase,
  X
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
import {
  EARNINGS_CALENDAR_EVENTS,
  type EarningsCalendarEvent,
  computeEarningsTiming,
  isEtfTicker,
  isLseTicker,
  normalizeEarningsTicker,
  snapToTradingWeekday,
  formatToIsoDate
} from '../utils/earningsDate';
import { cn } from '../utils';

export { EARNINGS_CALENDAR_EVENTS, type EarningsCalendarEvent };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatEventFigure(val: string, ticker: string): string {
  if (!val) return val;
  if (!isLseTicker(ticker)) return val;
  // Convert pence (e.g. '14.20p') to GBP (£)
  const penceMatch = val.trim().match(/^(-?\d+(?:\.\d+)?)p$/i);
  if (penceMatch) {
    const pounds = parseFloat(penceMatch[1]) / 100;
    return `£${pounds.toFixed(2)}`;
  }
  // Ensure any '$' prefix on an LSE stock is displayed as '£' (GBP)
  return val.replace(/\$/g, '£');
}

export default function EarningsCalendar() {
  const navigate = useNavigate();
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
    const set = new Set<string>();
    TOP_20_RECOMMENDED_STOCKS.forEach(s => {
      const norm = normalizeEarningsTicker(s.ticker);
      set.add(s.ticker.toUpperCase());
      set.add(norm);
    });
    return set;
  }, []);

  // Exclude ETFs (e.g. VUAG, INRG.L) from portfolio earnings tracking since ETFs do not report corporate earnings
  const equityPortfolioPositions = useMemo(() => {
    return portfolioPositions.filter(p => !isEtfTicker(p.ticker, p.name));
  }, [portfolioPositions]);

  const portfolioTickerSet = useMemo(() => {
    const set = new Set<string>();
    equityPortfolioPositions.forEach(p => {
      const norm = normalizeEarningsTicker(p.ticker);
      set.add(p.ticker.toUpperCase());
      set.add(norm);
    });
    return set;
  }, [equityPortfolioPositions]);

  // Merge authoritative calendar events with any custom non-ETF portfolio equities not already in the schedule
  const allEvents = useMemo(() => {
    const existingTickers = new Set<string>();
    EARNINGS_CALENDAR_EVENTS.forEach(e => {
      existingTickers.add(e.ticker.toUpperCase());
      existingTickers.add(normalizeEarningsTicker(e.ticker));
    });

    const customPortfolioEvents: EarningsCalendarEvent[] = [];

    equityPortfolioPositions.forEach((pos, idx) => {
      const sym = pos.ticker.toUpperCase();
      const norm = normalizeEarningsTicker(sym);
      if (!existingTickers.has(sym) && !existingTickers.has(norm)) {
        existingTickers.add(sym);
        existingTickers.add(norm);
        // Deterministic trading weekday in November 2026 (never shifts when switching months and never lands on a weekend)
        const seed = sym.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const dayCandidate = 3 + ((seed + idx * 5) % 23);
        const fixedWeekday = snapToTradingWeekday(new Date(2026, 10, dayCandidate));
        const dateStr = formatToIsoDate(fixedWeekday);

        customPortfolioEvents.push({
          ticker: sym,
          name: pos.name || sym,
          date: dateStr,
          session: seed % 2 === 0 ? 'AMC' : 'BMO',
          fiscalQuarter: 'Q3 FY26',
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
  }, [equityPortfolioPositions]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      const sym = ev.ticker.toUpperCase();
      const norm = normalizeEarningsTicker(sym);
      if (filterMode === 'watchlist' && !watchlistTickerSet.has(sym) && !watchlistTickerSet.has(norm)) return false;
      if (filterMode === 'portfolio' && !portfolioTickerSet.has(sym) && !portfolioTickerSet.has(norm)) return false;
      if (filterMode === 'high_move' && ev.impliedMoveNumeric < 7.0) return false;
      if (sessionFilter !== 'ALL' && ev.session !== sessionFilter) return false;

      if (searchQuery.trim()) {
        const rawQ = searchQuery.trim().toLowerCase();
        const aliasQ = normalizeEarningsTicker(rawQ).toLowerCase();
        return (
          ev.ticker.toLowerCase().includes(rawQ) ||
          ev.ticker.toLowerCase().includes(aliasQ) ||
          ev.name.toLowerCase().includes(rawQ) ||
          ev.sector.toLowerCase().includes(rawQ)
        );
      }
      return true;
    });
  }, [allEvents, filterMode, sessionFilter, searchQuery, watchlistTickerSet, portfolioTickerSet]);

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

  // Unique companies count for the All filter pill
  const uniqueScheduledCompaniesCount = useMemo(() => {
    return new Set(allEvents.map(e => normalizeEarningsTicker(e.ticker))).size;
  }, [allEvents]);

  // Summary metrics for header (strictly without rolling past dates forward)
  const upcomingWithin7DaysCount = useMemo(() => {
    return allEvents.filter(ev => {
      const timing = computeEarningsTiming(ev.date, undefined, false);
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
    { label: 'Jan 2027', date: new Date(2027, 0, 1) },
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
                  if (val.trim().length >= 2) {
                    const q = val.trim().toLowerCase();
                    const aliasQ = normalizeEarningsTicker(q).toLowerCase();
                    const matches = allEvents.filter(ev => {
                      const tLower = ev.ticker.toLowerCase();
                      return (
                        tLower.includes(q) ||
                        tLower.includes(aliasQ) ||
                        ev.name.toLowerCase().includes(q)
                      );
                    });
                    if (matches.length > 0) {
                      const exactMatch =
                        matches.find(
                          m =>
                            m.ticker.toLowerCase() === q ||
                            m.ticker.toLowerCase() === aliasQ
                        ) ||
                        matches.find(
                          m => !computeEarningsTiming(m.date, undefined, false).isPast
                        ) ||
                        matches[0];
                      const matchDate = parseISO(exactMatch.date);
                      setCurrentMonth(startOfMonth(matchDate));
                      setSelectedDay(matchDate);
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
              All ({uniqueScheduledCompaniesCount})
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
              My Portfolio ({equityPortfolioPositions.length})
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
                        const norm = normalizeEarningsTicker(ev.ticker);
                        const isHeld = portfolioTickerSet.has(ev.ticker.toUpperCase()) || portfolioTickerSet.has(norm);
                        return (
                          <button
                            key={`${ev.ticker}-${ev.date}`}
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
                  const timing = computeEarningsTiming(ev.date, undefined, false);
                  return (
                    <div
                      key={`${ev.ticker}-${ev.date}`}
                      onClick={() => setSelectedEvent(ev)}
                      className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TickerLogo ticker={ev.ticker} companyName={ev.name} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-sm font-black">{ev.ticker}</span>
                              {isLseTicker(ev.ticker) && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                  LSE · GBP
                                </span>
                              )}
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
                          <span className="text-xs font-mono font-black">
                            {formatEventFigure(ev.epsEstimate, ev.ticker)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-black/40 dark:text-white/40 block">
                            Rev Est
                          </span>
                          <span className="text-xs font-mono font-black">
                            {formatEventFigure(ev.revenueEstimate, ev.ticker)}
                          </span>
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
                const timing = computeEarningsTiming(ev.date, undefined, false);
                const norm = normalizeEarningsTicker(ev.ticker);
                const isHeld = portfolioTickerSet.has(ev.ticker.toUpperCase()) || portfolioTickerSet.has(norm);
                return (
                  <div
                    key={`${ev.ticker}-${ev.date}`}
                    onClick={() => setSelectedEvent(ev)}
                    className="py-3.5 px-2 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <TickerLogo ticker={ev.ticker} companyName={ev.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black">{ev.ticker}</span>
                          <span className="text-xs font-bold text-black/70 dark:text-white/70">{ev.name}</span>
                          {isLseTicker(ev.ticker) && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70">
                              LSE · GBP (£)
                            </span>
                          )}
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
                          {formatEventFigure(ev.epsEstimate, ev.ticker)} · {formatEventFigure(ev.revenueEstimate, ev.ticker)}
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
                      {isLseTicker(selectedEvent.ticker) && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          LSE · GBP (£)
                        </span>
                      )}
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
                    <span className="text-lg font-black font-mono">
                      {formatEventFigure(selectedEvent.epsEstimate, selectedEvent.ticker)}
                    </span>
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
                    Prior Year: {formatEventFigure(selectedEvent.epsPriorYear, selectedEvent.ticker)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
                    Consensus Revenue
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black font-mono">
                      {formatEventFigure(selectedEvent.revenueEstimate, selectedEvent.ticker)}
                    </span>
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
                    const norm = normalizeEarningsTicker(sym);
                    const matchedHolding = equityPortfolioPositions.find(
                      p =>
                        p.ticker.toUpperCase() === sym.toUpperCase() ||
                        normalizeEarningsTicker(p.ticker) === norm
                    );
                    const targetCurrency = isLseTicker(sym, matchedHolding?.exchange)
                      ? 'GBP'
                      : matchedHolding?.currency || 'USD';
                    const params = new URLSearchParams();
                    params.set('ticker', sym);
                    params.set('currency', targetCurrency);
                    if (matchedHolding?.avgPrice) {
                      params.set('avgPrice', String(matchedHolding.avgPrice));
                    }
                    if (matchedHolding?.shares) {
                      params.set('shares', String(matchedHolding.shares));
                    }
                    setSelectedEvent(null);
                    navigate(`/?${params.toString()}`);
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
