import React, { createContext, useContext, useState, useEffect } from 'react';

export type RiskProfile = 'aggressive' | 'moderate' | 'conservative';

export interface RiskProfileMeta {
  id: RiskProfile;
  label: string;
  tagline: string;
  description: string;
  badgeTone: string;
}

export const RISK_PROFILES: Record<RiskProfile, RiskProfileMeta> = {
  aggressive: {
    id: 'aggressive',
    label: 'Aggressive',
    tagline: 'Growth & Momentum',
    description: 'Actively triggers BUY & ACCUMULATION on trend strength, dynamic moving average support, and breakout momentum.',
    badgeTone: 'emerald'
  },
  moderate: {
    id: 'moderate',
    label: 'Moderate',
    tagline: 'Balanced Growth',
    description: 'Accumulates near moving average confluence when risk-reward is favorable (≥1.8:1).',
    badgeTone: 'blue'
  },
  conservative: {
    id: 'conservative',
    label: 'Conservative',
    tagline: 'Capital Preservation',
    description: 'Requires deep pullbacks into structural support floors before issuing buy orders.',
    badgeTone: 'amber'
  }
};

interface RiskContextType {
  riskProfile: RiskProfile;
  setRiskProfile: (profile: RiskProfile) => void;
  meta: RiskProfileMeta;
}

const RiskContext = createContext<RiskContextType | undefined>(undefined);

const STORAGE_KEY = 'stockpulse_risk_profile';

export const RiskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [riskProfile, setRiskProfileState] = useState<RiskProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'aggressive' || saved === 'moderate' || saved === 'conservative') {
        return saved;
      }
    } catch {
      // Fallback
    }
    // Default to aggressive as user requested
    return 'aggressive';
  });

  const setRiskProfile = (profile: RiskProfile) => {
    setRiskProfileState(profile);
    try {
      localStorage.setItem(STORAGE_KEY, profile);
    } catch {
      // Ignore
    }
  };

  const meta = RISK_PROFILES[riskProfile];

  return (
    <RiskContext.Provider value={{ riskProfile, setRiskProfile, meta }}>
      {children}
    </RiskContext.Provider>
  );
};

export const useRiskProfile = () => {
  const context = useContext(RiskContext);
  if (!context) {
    throw new Error('useRiskProfile must be used within a RiskProvider');
  }
  return context;
};
