/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { RiskProvider } from './context/RiskContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';
import MarketWatchlist from './pages/MarketWatchlist';

export default function App() {
  return (
    <ThemeProvider>
      <RiskProvider>
        <Router>
          <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] font-sans selection:bg-emerald-100 transition-colors duration-300">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/watchlist" element={<MarketWatchlist />} />
              <Route path="/portfolio" element={<Portfolio />} />
            </Routes>
          </div>
        </Router>
      </RiskProvider>
    </ThemeProvider>
  );
}
