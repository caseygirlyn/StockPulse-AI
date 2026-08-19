import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-[#141414] border-b border-black/5 dark:border-white/5 sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#141414]/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 transition-colors"
          >
            <TrendingUp className="text-white dark:text-black w-5 h-5" />
          </motion.div>
          <h1 className="font-bold text-xl tracking-tight text-black dark:text-white transition-colors">StockPulse <span className="text-emerald-600 dark:text-emerald-500">AI</span></h1>
        </Link>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
