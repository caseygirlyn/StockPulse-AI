import { StockData } from '../services/geminiService';
import { formatCurrency } from '../utils';

export interface CanonicalTradeGeometry {
  referencePrice: number;
  stopPrice: number;
  targetPrice: number;
  riskAmount: number;
  rewardAmount: number;
  downsidePct: number; // e.g. -5.9
  upsidePct: number;   // e.g. +10.2
  rewardRiskRatio: number; // e.g. 1.71
  ratioFormatted: string; // "1.71:1"
  multiplierFormatted: string; // "1.71x"
  breakEvenWinRate: number; // e.g. 36.9%
  formulaDisplay: {
    riskFormula: string;
    rewardFormula: string;
    ratioFormula: string;
  };
  expectedValueExplanation: string;
}

export interface CanonicalLevelRow {
  id: 'add_zone' | 'current' | 'breakout' | 'target' | 'risk';
  level: string; // 'Add zone' | 'Current' | 'Breakout' | 'Target' | 'Stop'
  priceDisplay: string; // e.g. '$347.89', '$375.72', '$320.78'
  meaning: string; // 'Preferred accumulation' | '—' | 'Confirmation' | 'Upside' | 'Stop'
  numericPrice: number;
  lowPrice?: number;
  highPrice?: number;
  percentage?: number; // upside/downside % relative to current price
  distanceDisplay?: string; // e.g. '+2.0%', '+10.2%', '−5.9%'
  fullLabel?: string; // e.g. "Breakout $347.89 · +2.0%"
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
    distancePct?: number;
    distanceDisplay?: string;
    fullLabel: string;
  };
  current: {
    price: number;
    display: string;
    meaning: string;
  };
  breakout: {
    price: number;
    display: string;
    priceDisplay: string;
    meaning: string;
    distancePct: number;
    distanceDisplay: string;
    fullLabel: string;
  };
  target: {
    price: number;
    display: string;
    priceDisplay: string;
    upsidePct: number;
    distancePct: number;
    distanceDisplay: string;
    meaning: string;
    fullLabel: string;
  };
  risk: {
    price: number;
    display: string;
    priceDisplay: string;
    downsidePct: number;
    distancePct: number;
    distanceDisplay: string;
    meaning: string;
    fullLabel: string;
  };
  rows: CanonicalLevelRow[];
  tradeGeometry: CanonicalTradeGeometry;
}

export function computeCanonicalTradeGeometry(
  currentPrice: number,
  stopPrice: number,
  targetPrice: number,
  currency: string = 'USD'
): CanonicalTradeGeometry {
  const safeCurrent = Math.max(0.0001, currentPrice);
  const safeStop = Math.min(safeCurrent - 0.0001, Math.max(0.0001, stopPrice));
  const safeTarget = Math.max(safeCurrent + 0.0001, targetPrice);

  const riskAmount = Number((safeCurrent - safeStop).toFixed(2));
  const rewardAmount = Number((safeTarget - safeCurrent).toFixed(2));

  const downsidePct = Number((((safeStop - safeCurrent) / safeCurrent) * 100).toFixed(1));
  const upsidePct = Number((((safeTarget - safeCurrent) / safeCurrent) * 100).toFixed(1));

  const effectiveRiskAmount = Math.max(0.01, riskAmount);
  const effectiveRewardAmount = Math.max(0.01, rewardAmount);

  // Exact canonical mathematical ratio: Reward ÷ Risk
  const rawRatio = effectiveRewardAmount / effectiveRiskAmount;
  const rewardRiskRatio = Number(rawRatio.toFixed(2));

  // Break-even win rate required for positive EV: P_breakEven = 1 / (1 + R:R)
  const breakEvenWinRate = Number(((1 / (1 + rawRatio)) * 100).toFixed(1));

  const ratioFormatted = `${rewardRiskRatio.toFixed(2)}:1`;
  const multiplierFormatted = `${rewardRiskRatio.toFixed(2)}x`;

  const riskFormula = `Risk: ${downsidePct.toFixed(1)}% (${formatCurrency(riskAmount, currency)}) = ${formatCurrency(safeCurrent, currency)} − ${formatCurrency(safeStop, currency)}`;
  const rewardFormula = `Reward: +${upsidePct.toFixed(1)}% (${formatCurrency(rewardAmount, currency)}) = ${formatCurrency(safeTarget, currency)} − ${formatCurrency(safeCurrent, currency)}`;
  const ratioFormula = `Reward/Risk: ${multiplierFormatted} = ${formatCurrency(rewardAmount, currency)} ÷ ${formatCurrency(riskAmount, currency)} (+${upsidePct.toFixed(1)}% ÷ ${Math.abs(downsidePct).toFixed(1)}%)`;

  const expectedValueExplanation = `${multiplierFormatted} is the purely geometric payoff ratio (reward if target hit vs loss if stop hit), not probability-adjusted Expected Value (EV). A ${ratioFormatted} payoff requires a win rate > ${breakEvenWinRate}% to yield positive expected value. Attractiveness must be validated alongside technical alignment (Signal Agreement, trend structure, and moving averages).`;

  return {
    referencePrice: safeCurrent,
    stopPrice: safeStop,
    targetPrice: safeTarget,
    riskAmount,
    rewardAmount,
    downsidePct,
    upsidePct,
    rewardRiskRatio,
    ratioFormatted,
    multiplierFormatted,
    breakEvenWinRate,
    formulaDisplay: {
      riskFormula,
      rewardFormula,
      ratioFormula,
    },
    expectedValueExplanation,
  };
}

export function getCanonicalLevels(
  data: StockData, 
  currency: string = 'USD',
  riskMode: 'aggressive' | 'moderate' | 'conservative' = 'aggressive'
): CanonicalLevelsModel {
  const currentPrice = data.currentPrice || 0;
  const rawAction = data.recommendation?.action || '';
  const isSellAction = rawAction.toUpperCase().includes('SELL') || rawAction.toUpperCase().includes('AVOID') || rawAction.toUpperCase().includes('TRIM') || rawAction.toUpperCase().includes('EXIT');
  const isBuyAction = rawAction.toUpperCase().includes('BUY') || rawAction.toUpperCase().includes('ACCUMULAT');
  const isBullish = data.analysis?.trend === 'Bullish' || (data.ma20 && currentPrice >= data.ma20) || currentPrice >= data.ma5;

  // 1. Add Zone (Preferred accumulation)
  const ideal = data.recommendation?.idealEntryPrice || (currentPrice > 0 ? currentPrice * 0.98 : 0);
  let addZoneLow: number;
  let addZoneHigh: number;

  if (!isSellAction && (isBuyAction || (riskMode === 'aggressive' && isBullish))) {
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
    if (isSellAction && addZoneHigh >= currentPrice) {
      addZoneHigh = Number((currentPrice * 0.96).toFixed(2));
    }
  } else if (data.analysis?.supportZone) {
    addZoneLow = data.analysis.supportZone.low;
    addZoneHigh = data.analysis.supportZone.high;
    if (isSellAction && addZoneHigh >= currentPrice) {
      addZoneHigh = Number((currentPrice * 0.96).toFixed(2));
    }
  } else if (data.analysis?.support) {
    addZoneLow = Number((data.analysis.support * 0.985).toFixed(2));
    addZoneHigh = Number((Math.min(data.analysis.support * 1.015, currentPrice * (isSellAction ? 0.96 : 0.99))).toFixed(2));
  } else {
    addZoneLow = Number((currentPrice * 0.90).toFixed(2));
    addZoneHigh = Number((currentPrice * 0.96).toFixed(2));
  }

  // Ensure addZoneLow <= addZoneHigh
  if (addZoneLow > addZoneHigh) {
    addZoneLow = Number((addZoneHigh * 0.985).toFixed(2));
  }

  const addZoneDisplay = `${formatCurrency(addZoneLow, currency)}–${formatCurrency(addZoneHigh, currency)}`;

  // 2. Current
  const currentDisplay = formatCurrency(currentPrice, currency);

  // Add Zone Distance Context
  let addZoneDistanceDisplay = 'Inside zone';
  let addZoneDistancePct = 0;
  if (currentPrice > addZoneHigh && currentPrice > 0) {
    addZoneDistancePct = Number((((addZoneHigh - currentPrice) / currentPrice) * 100).toFixed(1));
    addZoneDistanceDisplay = `${addZoneDistancePct.toFixed(1)}%`;
  } else if (currentPrice < addZoneLow && currentPrice > 0) {
    addZoneDistancePct = Number((((addZoneLow - currentPrice) / currentPrice) * 100).toFixed(1));
    addZoneDistanceDisplay = `+${addZoneDistancePct.toFixed(1)}%`;
  }
  const addZoneFullLabel = `Add zone ${addZoneDisplay} · ${addZoneDistanceDisplay}`;

  // 3. Breakout (Confirmation)
  const rawBreakout = data.recommendation?.confirmationBreakout ?? 
    data.analysis?.resistanceZone?.high ?? 
    data.analysis?.resistance ?? 
    Number((currentPrice * 1.08).toFixed(2));
  const breakoutPrice = Number(rawBreakout.toFixed(2));
  const breakoutPriceDisplay = formatCurrency(breakoutPrice, currency);
  const breakoutDisplay = `>${breakoutPriceDisplay}`;
  const breakoutDistancePct = currentPrice > 0 
    ? Number((((breakoutPrice - currentPrice) / currentPrice) * 100).toFixed(1))
    : 0;
  const breakoutDistanceDisplay = `${breakoutDistancePct >= 0 ? '+' : '−'}${Math.abs(breakoutDistancePct).toFixed(1)}%`;
  const breakoutFullLabel = `Breakout ${breakoutPriceDisplay} · ${breakoutDistanceDisplay}`;

  // 4. Target (Upside)
  const rawTarget = data.recommendation?.profitTarget || Number((currentPrice * 1.2).toFixed(2));
  const targetPrice = Number(rawTarget.toFixed(2));
  const targetPriceDisplay = formatCurrency(targetPrice, currency);
  const targetDisplay = targetPriceDisplay;

  // 5. Risk (Stop)
  const rawStop = data.recommendation?.stopLoss || Number((currentPrice * 0.93).toFixed(2));
  const riskPrice = Number(rawStop.toFixed(2));
  const riskPriceDisplay = formatCurrency(riskPrice, currency);
  const riskDisplay = riskPriceDisplay;

  // Canonical Trade Geometry: Single unified mathematical model for Risk, Reward, and Payoff Ratio
  const tradeGeometry = computeCanonicalTradeGeometry(currentPrice, riskPrice, targetPrice, currency);
  const upsidePct = tradeGeometry.upsidePct;
  const downsidePct = tradeGeometry.downsidePct;

  const targetDistanceDisplay = `+${upsidePct.toFixed(1)}%`;
  const targetFullLabel = `Target ${targetPriceDisplay} · ${targetDistanceDisplay}`;

  const riskDistanceDisplay = `${downsidePct < 0 ? '−' : '+'}${Math.abs(downsidePct).toFixed(1)}%`;
  const riskFullLabel = `Stop ${riskPriceDisplay} · ${riskDistanceDisplay}`;

  const rows: CanonicalLevelRow[] = [
    {
      id: 'add_zone',
      level: 'Add zone',
      priceDisplay: addZoneDisplay,
      meaning: 'Preferred accumulation',
      numericPrice: Number(((addZoneLow + addZoneHigh) / 2).toFixed(2)),
      lowPrice: addZoneLow,
      highPrice: addZoneHigh,
      percentage: addZoneDistancePct,
      distanceDisplay: addZoneDistanceDisplay,
      fullLabel: addZoneFullLabel,
    },
    {
      id: 'breakout',
      level: 'Breakout',
      priceDisplay: breakoutPriceDisplay,
      meaning: 'Confirmation',
      numericPrice: breakoutPrice,
      percentage: breakoutDistancePct,
      distanceDisplay: breakoutDistanceDisplay,
      fullLabel: breakoutFullLabel,
    },
    {
      id: 'target',
      level: 'Target',
      priceDisplay: targetPriceDisplay,
      meaning: 'Upside',
      numericPrice: targetPrice,
      percentage: upsidePct,
      distanceDisplay: targetDistanceDisplay,
      fullLabel: targetFullLabel,
    },
    {
      id: 'risk',
      level: 'Stop',
      priceDisplay: riskPriceDisplay,
      meaning: 'Risk boundary',
      numericPrice: riskPrice,
      percentage: downsidePct,
      distanceDisplay: riskDistanceDisplay,
      fullLabel: riskFullLabel,
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
      distancePct: addZoneDistancePct,
      distanceDisplay: addZoneDistanceDisplay,
      fullLabel: addZoneFullLabel,
    },
    current: {
      price: currentPrice,
      display: currentDisplay,
      meaning: '—',
    },
    breakout: {
      price: breakoutPrice,
      display: breakoutDisplay,
      priceDisplay: breakoutPriceDisplay,
      meaning: 'Confirmation',
      distancePct: breakoutDistancePct,
      distanceDisplay: breakoutDistanceDisplay,
      fullLabel: breakoutFullLabel,
    },
    target: {
      price: targetPrice,
      display: targetDisplay,
      priceDisplay: targetPriceDisplay,
      upsidePct,
      distancePct: upsidePct,
      distanceDisplay: targetDistanceDisplay,
      meaning: 'Upside',
      fullLabel: targetFullLabel,
    },
    risk: {
      price: riskPrice,
      display: riskDisplay,
      priceDisplay: riskPriceDisplay,
      downsidePct,
      distancePct: downsidePct,
      distanceDisplay: riskDistanceDisplay,
      meaning: 'Stop',
      fullLabel: riskFullLabel,
    },
    rows,
    tradeGeometry,
  };
}
