import { StockData } from '../services/geminiService';
import { formatCurrency } from '../utils';

export interface CanonicalLevelRow {
  id: 'add_zone' | 'current' | 'breakout' | 'target' | 'risk';
  level: string; // 'Add zone' | 'Current' | 'Breakout' | 'Target' | 'Risk'
  priceDisplay: string; // e.g. '$138.04–$140.84', '$144.79', '>$160.89', '$173.76', '$135.14'
  meaning: string; // 'Preferred accumulation' | '—' | 'Confirmation' | 'Upside' | 'Stop'
  numericPrice: number;
  lowPrice?: number;
  highPrice?: number;
  percentage?: number; // upside/downside % relative to current price
}

export interface CanonicalLevelsModel {
  currentPrice: number;
  currency: string;
  addZone: {
    low: number;
    high: number;
    display: string;
    meaning: string;
    explanation?: string;
  };
  current: {
    price: number;
    display: string;
    meaning: string;
  };
  breakout: {
    price: number;
    display: string;
    meaning: string;
  };
  target: {
    price: number;
    display: string;
    upsidePct: number;
    meaning: string;
  };
  risk: {
    price: number;
    display: string;
    downsidePct: number;
    meaning: string;
  };
  rows: CanonicalLevelRow[];
}

export function getCanonicalLevels(
  data: StockData, 
  currency: string = 'USD',
  riskMode: 'aggressive' | 'moderate' | 'conservative' = 'aggressive'
): CanonicalLevelsModel {
  const currentPrice = data.currentPrice || 0;
  const rawAction = data.recommendation?.action || '';
  const isBuyAction = rawAction.toUpperCase().includes('BUY') || rawAction.toUpperCase().includes('ACCUMULAT');
  const isBullish = data.analysis?.trend === 'Bullish' || (data.ma20 && currentPrice >= data.ma20) || currentPrice >= data.ma5;

  // 1. Add Zone (Preferred accumulation)
  const ideal = data.recommendation?.idealEntryPrice || (currentPrice > 0 ? currentPrice * 0.98 : 0);
  let addZoneLow: number;
  let addZoneHigh: number;

  if (isBuyAction || (riskMode === 'aggressive' && isBullish)) {
    // For active BUY recommendations or in Aggressive Mode on constructive trends:
    // The accumulation corridor MUST encompass the current market price so the investor can actively enter/accumulate!
    const baselineLow = data.recommendation?.addZone?.low ?? data.analysis?.supportZone?.low ?? data.analysis?.support ?? (currentPrice * 0.96);
    addZoneLow = Number(Math.min(baselineLow, currentPrice * (riskMode === 'aggressive' ? 0.95 : 0.97)).toFixed(2));
    
    const baselineHigh = data.recommendation?.addZone?.high ?? currentPrice;
    addZoneHigh = Number(Math.max(
      baselineHigh,
      currentPrice * (riskMode === 'aggressive' ? 1.025 : 1.012),
      ideal * 1.015
    ).toFixed(2));
  } else if (data.recommendation?.addZone) {
    addZoneLow = data.recommendation.addZone.low;
    addZoneHigh = data.recommendation.addZone.high;
    // In moderate mode with positive risk-reward, allow addZone to reach currentPrice if close
    if (riskMode !== 'conservative' && currentPrice <= addZoneHigh * 1.02 && isBullish) {
      addZoneHigh = Number(Math.max(addZoneHigh, currentPrice * 1.01).toFixed(2));
    }
  } else if (data.analysis?.supportZone) {
    addZoneLow = data.analysis.supportZone.low;
    addZoneHigh = data.analysis.supportZone.high;
    if (riskMode === 'aggressive' && isBullish) {
      addZoneHigh = Number(Math.max(addZoneHigh, currentPrice * 1.02).toFixed(2));
    }
  } else if (data.analysis?.support) {
    addZoneLow = Number((data.analysis.support * 0.985).toFixed(2));
    addZoneHigh = Number((Math.max(data.analysis.support * 1.015, currentPrice * (riskMode === 'aggressive' ? 1.02 : 0.99))).toFixed(2));
  } else {
    addZoneLow = Number((currentPrice * (riskMode === 'aggressive' ? 0.95 : 0.94)).toFixed(2));
    addZoneHigh = Number((currentPrice * (riskMode === 'aggressive' ? 1.02 : 0.98)).toFixed(2));
  }

  // Ensure addZoneLow <= addZoneHigh
  if (addZoneLow > addZoneHigh) {
    addZoneLow = Number((addZoneHigh * 0.985).toFixed(2));
  }

  const addZoneDisplay = `${formatCurrency(addZoneLow, currency)}–${formatCurrency(addZoneHigh, currency)}`;

  // 2. Current
  const currentDisplay = formatCurrency(currentPrice, currency);

  // 3. Breakout (Confirmation)
  const rawBreakout = data.recommendation?.confirmationBreakout ?? 
    data.analysis?.resistanceZone?.high ?? 
    data.analysis?.resistance ?? 
    Number((currentPrice * 1.08).toFixed(2));
  const breakoutPrice = Number(rawBreakout.toFixed(2));
  const breakoutDisplay = `>${formatCurrency(breakoutPrice, currency)}`;

  // 4. Target (Upside)
  const rawTarget = data.recommendation?.profitTarget || Number((currentPrice * 1.2).toFixed(2));
  const targetPrice = Number(rawTarget.toFixed(2));
  const upsidePct = currentPrice > 0 ? ((targetPrice - currentPrice) / currentPrice) * 100 : 0;
  const targetDisplay = formatCurrency(targetPrice, currency);

  // 5. Risk (Stop)
  const rawStop = data.recommendation?.stopLoss || Number((currentPrice * 0.93).toFixed(2));
  const riskPrice = Number(rawStop.toFixed(2));
  const downsidePct = currentPrice > 0 ? ((riskPrice - currentPrice) / currentPrice) * 100 : -7;
  const riskDisplay = formatCurrency(riskPrice, currency);

  const rows: CanonicalLevelRow[] = [
    {
      id: 'add_zone',
      level: 'Add zone',
      priceDisplay: addZoneDisplay,
      meaning: 'Preferred accumulation',
      numericPrice: Number(((addZoneLow + addZoneHigh) / 2).toFixed(2)),
      lowPrice: addZoneLow,
      highPrice: addZoneHigh,
    },
    {
      id: 'breakout',
      level: 'Breakout',
      priceDisplay: breakoutDisplay,
      meaning: 'Confirmation',
      numericPrice: breakoutPrice,
    },
    {
      id: 'target',
      level: 'Target',
      priceDisplay: targetDisplay,
      meaning: 'Upside',
      numericPrice: targetPrice,
      percentage: upsidePct,
    },
    {
      id: 'risk',
      level: 'Risk',
      priceDisplay: riskDisplay,
      meaning: 'Stop',
      numericPrice: riskPrice,
      percentage: downsidePct,
    },
  ];

  return {
    currentPrice,
    currency,
    addZone: {
      low: addZoneLow,
      high: addZoneHigh,
      display: addZoneDisplay,
      meaning: 'Preferred accumulation',
      explanation: data.recommendation?.addZone?.explanation,
    },
    current: {
      price: currentPrice,
      display: currentDisplay,
      meaning: '—',
    },
    breakout: {
      price: breakoutPrice,
      display: breakoutDisplay,
      meaning: 'Confirmation',
    },
    target: {
      price: targetPrice,
      display: targetDisplay,
      upsidePct,
      meaning: 'Upside',
    },
    risk: {
      price: riskPrice,
      display: riskDisplay,
      downsidePct,
      meaning: 'Stop',
    },
    rows,
  };
}
