import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, History, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../utils';

export default function Navbar() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-black/5 sticky top-0 z-50 backdrop-blur-md bg-white/80">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-8 h-8 bg-black rounded-lg flex items-center justify-center group-hover:bg-emerald-600 transition-colors"
          >
            <TrendingUp className="text-white w-5 h-5" />
          </motion.div>
          <h1 className="font-bold text-xl tracking-tight">StockPulse <span className="text-emerald-600">AI</span></h1>
        </Link>
        
        <nav className="flex items-center gap-1">
          <Link 
            to="/" 
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              location.pathname === '/' ? "bg-black text-white shadow-lg shadow-black/10" : "text-black/40 hover:text-black hover:bg-black/5"
            )}
          >
            <Search className="w-3.5 h-3.5" />
            Analyze
          </Link>
          <Link 
            to="/portfolio" 
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              location.pathname === '/portfolio' ? "bg-black text-white shadow-lg shadow-black/10" : "text-black/40 hover:text-black hover:bg-black/5"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Portfolio
          </Link>
        </nav>
      </div>
    </header>
  );
}
