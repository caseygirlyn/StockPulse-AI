import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SavedPosition {
  ticker: string;
  avgPrice: string;
  shares: string;
  currency: string;
  lastAnalyzed: string;
  dividendYield?: number;
  dividendRate?: number;
  dividendAmount?: number;
  exDividendDate?: string;
  paymentDate?: string;
}

interface PortfolioContextType {
  savedPositions: SavedPosition[];
  savePosition: (ticker: string, avgPrice: string, shares: string, currency: string, dividendYield?: number, dividendRate?: number, dividendAmount?: number, exDividendDate?: string, paymentDate?: string) => void;
  deletePosition: (ticker: string) => void;
  getPositions: () => SavedPosition[];
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedPositions, setSavedPositions] = useState<SavedPosition[]>([]);

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (response.ok) {
        const data = await response.json();
        const mapped = (data.positions || []).map((p: any) => ({
          ...p,
          lastAnalyzed: p.date || p.lastAnalyzed
        }));
        setSavedPositions(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch positions", e);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const savePosition = async (ticker: string, avgPrice: string, shares: string, currency: string, dividendYield?: number, dividendRate?: number, dividendAmount?: number, exDividendDate?: string, paymentDate?: string) => {
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: ticker.toUpperCase(), 
          avgPrice, 
          shares, 
          currency,
          dividendYield,
          dividendRate,
          dividendAmount,
          exDividendDate,
          paymentDate
        })
      });
      if (response.ok) {
        await fetchPositions();
      }
    } catch (e) {
      console.error("Failed to save position", e);
    }
  };

  const deletePosition = async (tickerToDelete: string) => {
    try {
      const response = await fetch(`/api/portfolio/${tickerToDelete}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchPositions();
      }
    } catch (e) {
      console.error("Failed to delete position", e);
    }
  };

  const getPositions = () => savedPositions;

  return (
    <PortfolioContext.Provider value={{ savedPositions, savePosition, deletePosition, getPositions }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
