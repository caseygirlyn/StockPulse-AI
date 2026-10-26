import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Sun, Moon, PieChart, Activity, Sparkles, Bell, BellRing, Menu, X, ChevronRight, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getLocalPortfolio, fetchPortfolio } from '../services/portfolioService';
import { getPriceAlerts, type PriceAlert } from '../services/alertService';
import PriceAlertsModal from './PriceAlertsModal';
import { cn } from '../utils';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [portfolioCount, setPortfolioCount] = useState<number>(0);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCount = () => {
    const items = getLocalPortfolio();
    setPortfolioCount(items.length);
  };

  const loadAlerts = () => {
    setAlerts(getPriceAlerts());
  };

  useEffect(() => {
    // Initial fetch from backend to ensure synced count
    fetchPortfolio().then(items => {
      setPortfolioCount(items.length);
    }).catch(() => {
      updateCount();
    });

    loadAlerts();

    const handlePortfolioUpdate = () => updateCount();
    const handleAlertsUpdate = () => loadAlerts();
    const handleOpenAlertsModal = () => setShowAlertsModal(true);

    window.addEventListener('portfolio_updated', handlePortfolioUpdate);
    window.addEventListener('price_alerts_updated', handleAlertsUpdate);
    window.addEventListener('open_price_alerts_modal', handleOpenAlertsModal);

    return () => {
      window.removeEventListener('portfolio_updated', handlePortfolioUpdate);
      window.removeEventListener('price_alerts_updated', handleAlertsUpdate);
      window.removeEventListener('open_price_alerts_modal', handleOpenAlertsModal);
    };
  }, []);

  // Close hamburger menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close hamburger menu on outside click or Escape key
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const activeAlertsCount = alerts.filter(a => !a.triggered).length;
  const triggeredAlertsCount = alerts.filter(a => a.triggered).length;

  const isAnalysis = location.pathname === '/';
  const isWatchlist = location.pathname === '/watchlist';
  const isPortfolio = location.pathname === '/portfolio';
  const isEarnings = location.pathname === '/earnings';

  return (
    <>
      <header className="bg-white dark:bg-[#141414] border-b border-black/5 dark:border-white/5 sticky top-0 z-50 backdrop-blur-md bg-white/90 dark:bg-[#141414]/90 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4 relative">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 transition-colors shadow-xs shrink-0"
            >
              <TrendingUp className="text-white dark:text-black w-5 h-5" />
            </motion.div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight text-black dark:text-white transition-colors whitespace-nowrap">
              StockPulse <span className="text-emerald-600 dark:text-emerald-500">AI</span>
            </h1>
          </Link>

          {/* Right Controls: Desktop Inline Nav + Action Buttons + Mobile/Tablet Portrait Hamburger Menu */}
          <div className="flex items-center gap-2 lg:gap-3" ref={menuRef}>
            {/* Desktop Inline Navigation Links (lg and above) */}
            <nav className="hidden lg:flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
              <Link
                to="/"
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  isAnalysis 
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs" 
                    : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <Activity className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isAnalysis ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500"
                )} />
                <span>Analysis</span>
              </Link>

              <Link
                to="/watchlist"
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  isWatchlist 
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs" 
                    : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <Sparkles className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isWatchlist ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500"
                )} />
                <span>Watchlist</span>
                <span className="inline-flex px-1 py-0.5 rounded bg-emerald-500/15 text-[8px] font-black text-emerald-700 dark:text-emerald-300 font-mono shrink-0 leading-none">
                  TOP 30
                </span>
              </Link>

              <Link
                to="/portfolio"
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                  isPortfolio 
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs" 
                    : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <PieChart className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isPortfolio ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500"
                )} />
                <span>Portfolio</span>
                {portfolioCount > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono shrink-0 leading-none",
                    isPortfolio 
                      ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black" 
                      : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  )}>
                    {portfolioCount}
                  </span>
                )}
              </Link>

              <Link
                to="/earnings"
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  isEarnings 
                    ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs" 
                    : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <Calendar className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isEarnings ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500"
                )} />
                <span>Earnings</span>
              </Link>
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowAlertsModal(true)}
                className={cn(
                  "p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5",
                  activeAlertsCount > 0
                    ? "bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/25"
                    : "bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10"
                )}
                title={activeAlertsCount > 0 ? `${activeAlertsCount} active price alert${activeAlertsCount > 1 ? 's' : ''} (Click to open Price Alerts Center)` : "Price Alerts Center"}
                aria-label="Price Alerts"
              >
                {triggeredAlertsCount > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse fill-amber-500/20" />
                ) : (
                  <Bell className={cn("w-4 h-4", activeAlertsCount > 0 && "text-amber-600 dark:text-amber-400 fill-amber-500/20")} />
                )}
                {activeAlertsCount > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-black font-mono leading-none px-1.5 py-0.5 rounded-full bg-amber-500 text-white dark:bg-amber-400 dark:text-black">
                    {activeAlertsCount}
                  </span>
                )}
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 sm:p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                aria-label="Toggle theme"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* Mobile & Tablet Portrait Hamburger Button (< lg / < 1024px) */}
              <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                className={cn(
                  "lg:hidden p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center relative",
                  isMenuOpen
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                    : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10"
                )}
                aria-label="Toggle navigation menu"
                aria-expanded={isMenuOpen}
                title="Navigation Menu"
              >
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile & Tablet Portrait Hamburger Dropdown Menu (< lg / < 1024px) */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="lg:hidden absolute right-4 top-[calc(100%+0.5rem)] w-64 sm:w-72 bg-white dark:bg-[#181818] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                >
                  <div className="px-3 py-1.5 mb-1 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                      Navigation
                    </span>
                  </div>

                  <nav className="flex flex-col gap-1">
                    <Link
                      to="/"
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        isAnalysis
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Activity className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isAnalysis ? "text-emerald-500 dark:text-emerald-600" : "text-neutral-400 dark:text-neutral-500"
                        )} />
                        <span>Analysis</span>
                      </div>
                      <ChevronRight className={cn("w-3.5 h-3.5 opacity-50", isAnalysis && "opacity-100")} />
                    </Link>

                    <Link
                      to="/watchlist"
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        isWatchlist
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isWatchlist ? "text-emerald-500 dark:text-emerald-600" : "text-neutral-400 dark:text-neutral-500"
                        )} />
                        <span>Watchlist</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-black font-mono shrink-0",
                          isWatchlist
                            ? "bg-emerald-500/25 text-emerald-300 dark:bg-emerald-600/20 dark:text-emerald-700"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        )}>
                          TOP 30
                        </span>
                        <ChevronRight className={cn("w-3.5 h-3.5 opacity-50", isWatchlist && "opacity-100")} />
                      </div>
                    </Link>

                    <Link
                      to="/portfolio"
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        isPortfolio
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <PieChart className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isPortfolio ? "text-emerald-500 dark:text-emerald-600" : "text-neutral-400 dark:text-neutral-500"
                        )} />
                        <span>Portfolio</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {portfolioCount > 0 && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono shrink-0 leading-none",
                            isPortfolio
                              ? "bg-emerald-500 text-black dark:bg-emerald-600 dark:text-white"
                              : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          )}>
                            {portfolioCount}
                          </span>
                        )}
                        <ChevronRight className={cn("w-3.5 h-3.5 opacity-50", isPortfolio && "opacity-100")} />
                      </div>
                    </Link>

                    <Link
                      to="/earnings"
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        isEarnings
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isEarnings ? "text-emerald-500 dark:text-emerald-600" : "text-neutral-400 dark:text-neutral-500"
                        )} />
                        <span>Earnings Calendar</span>
                      </div>
                      <ChevronRight className={cn("w-3.5 h-3.5 opacity-50", isEarnings && "opacity-100")} />
                    </Link>
                  </nav>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Global Price Alerts Center Modal */}
      <PriceAlertsModal 
        isOpen={showAlertsModal} 
        onClose={() => setShowAlertsModal(false)} 
      />
    </>
  );
}
