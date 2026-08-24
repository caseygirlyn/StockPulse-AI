import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Sun, Moon, PieChart, Activity } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getLocalPortfolio, fetchPortfolio } from '../services/portfolioService';
import { cn } from '../utils';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [portfolioCount, setPortfolioCount] = useState<number>(0);

  const updateCount = () => {
    const items = getLocalPortfolio();
    setPortfolioCount(items.length);
  };

  useEffect(() => {
    // Initial fetch from backend to ensure synced count
    fetchPortfolio().then(items => {
      setPortfolioCount(items.length);
    }).catch(() => {
      updateCount();
    });

    window.addEventListener('portfolio_updated', updateCount);
    return () => window.removeEventListener('portfolio_updated', updateCount);
  }, []);

  const isAnalysis = location.pathname === '/';
  const isPortfolio = location.pathname === '/portfolio';

  return (
    <header className="bg-white dark:bg-[#141414] border-b border-black/5 dark:border-white/5 sticky top-0 z-50 backdrop-blur-md bg-white/90 dark:bg-[#141414]/90 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
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

          {/* Theme Toggle on mobile top row */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Links - Centered/Full width on mobile below brand, inline on desktop */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <nav className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-2xl w-full sm:w-auto">
            <Link
              to="/"
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                isAnalysis 
                  ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs" 
                  : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Analysis</span>
            </Link>

            <Link
              to="/portfolio"
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                isPortfolio 
                  ? "bg-white dark:bg-[#202020] text-black dark:text-white shadow-xs" 
                  : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Portfolio</span>
              {portfolioCount > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono ml-0.5",
                  isPortfolio 
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black" 
                    : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                )}>
                  {portfolioCount}
                </span>
              )}
            </Link>
          </nav>
          
          {/* Desktop theme toggle */}
          <div className="hidden sm:flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
