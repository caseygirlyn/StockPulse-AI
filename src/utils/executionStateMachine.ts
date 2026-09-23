import { formatCurrency } from '../utils';
import { StockData } from '../services/geminiService';
import { getCanonicalLevels, CanonicalLevelsModel } from './canonicalLevels';

export type ExecutionStateId = 
  | 'RISK_INVALIDATED'
  | 'DEFENSIVE_REASSESS'
  | 'ACCUMULATION_ZONE'
  | 'HOLD_WAIT'
  | 'BREAKOUT_CONFIRMATION'
  | 'TARGET_REACHED';

export interface StateMachineRow {
  id: ExecutionStateId;
  priceCondition: string;
  actionState: string;
  isCurrent: boolean;
  minPrice?: number;
  maxPrice?: number;
  tone: 'danger' | 'warning' | 'success' | 'neutral' | 'blue' | 'purple';
  actionPrimary: string;
}

export interface ExecutionStateMachineResult {
  currentStateId: ExecutionStateId;
  currentStateHeadline: string; // e.g. "🟡 WAIT / HOLD ABOVE $490.28"
  primaryAction: string; // e.g. "HOLD", "WAIT / WATCH", "BUY MORE", "BUY / ENTER", "SELL ALL"
  badgeStyle: string;
  directive: string;
  rows: StateMachineRow[];
  currentPrice: number;
  currency: string;
  levels: {
    stopLoss: number;
    addZoneLow: number;
    addZoneHigh: number;
    breakout: number;
    target: number;
  };
}

export function computeExecutionStateMachine(
  data: StockData,
  currency: string = 'USD',
  avgPrice?: string,
  riskMode: 'aggressive' | 'moderate' | 'conservative' = 'aggressive'
): ExecutionStateMachineResult {
  const isProspective = !avgPrice || isNaN(parseFloat(avgPrice)) || parseFloat(avgPrice) <= 0;
  const canonical = getCanonicalLevels(data, currency, riskMode);
  const currentPrice = canonical.currentPrice || 0;

  // Canonical level anchors
  let stopLoss = canonical.risk.price;
  let addZoneLow = canonical.addZone.low;
  let addZoneHigh = canonical.addZone.high;
  let breakout = canonical.breakout.price;
  let target = canonical.target.price;

  // Guard monotonicity: stopLoss < addZoneLow <= addZoneHigh < breakout < target
  if (addZoneLow > addZoneHigh) {
    const temp = addZoneLow;
    addZoneLow = addZoneHigh;
    addZoneHigh = temp;
  }
  if (stopLoss >= addZoneLow) {
    stopLoss = Number((addZoneLow * 0.95).toFixed(2));
  }
  if (breakout <= addZoneHigh) {
    breakout = Number((addZoneHigh * 1.05).toFixed(2));
  }
  if (target <= breakout) {
    target = Number((breakout * 1.08).toFixed(2));
  }

  const fmt = (val: number) => formatCurrency(val, currency);

  // Determine active state by current price
  let currentStateId: ExecutionStateId = 'HOLD_WAIT';

  const isBullish = data.analysis?.trend === 'Bullish' || (data.ma20 && currentPrice >= data.ma20) || currentPrice >= data.ma5;
  const isBuyAction = (data.recommendation?.action || '').toUpperCase().includes('BUY');

  if (currentPrice < stopLoss) {
    currentStateId = 'RISK_INVALIDATED';
  } else if (currentPrice >= stopLoss && currentPrice < addZoneLow) {
    currentStateId = 'DEFENSIVE_REASSESS';
  } else if (currentPrice >= addZoneLow && currentPrice <= addZoneHigh) {
    currentStateId = 'ACCUMULATION_ZONE';
  } else if (currentPrice > addZoneHigh && currentPrice < breakout) {
    // In Aggressive mode or when stock has an active BUY action and bullish structure,
    // consolidate into accumulation zone if close to addZoneHigh
    if ((riskMode === 'aggressive' || isBuyAction) && isBullish && currentPrice <= addZoneHigh * 1.03) {
      currentStateId = 'ACCUMULATION_ZONE';
    } else {
      currentStateId = 'HOLD_WAIT';
    }
  } else if (currentPrice >= breakout && currentPrice < target) {
    currentStateId = 'BREAKOUT_CONFIRMATION';
  } else {
    currentStateId = 'TARGET_REACHED';
  }

  // Formatting exact boundary labels (e.g. $465.77–$482.92, $490.29–$515.16)
  const defensiveMax = Number((addZoneLow - 0.01).toFixed(2));
  const holdMin = Number((addZoneHigh + 0.01).toFixed(2));
  const holdMax = Number((breakout - 0.01).toFixed(2));
  const breakoutMax = Number((target - 0.01).toFixed(2));

  const defensiveCondition = defensiveMax >= stopLoss 
    ? `${fmt(stopLoss)}–${fmt(defensiveMax)}` 
    : `${fmt(stopLoss)}–${fmt(addZoneLow)}`;

  const holdCondition = holdMax >= holdMin 
    ? `${fmt(holdMin)}–${fmt(holdMax)}` 
    : `${fmt(addZoneHigh)}–${fmt(breakout)}`;

  const breakoutCondition = breakoutMax >= breakout
    ? `${fmt(breakout)}–${fmt(breakoutMax)}`
    : `>${fmt(breakout)}`;

  const rows: StateMachineRow[] = [
    {
      id: 'RISK_INVALIDATED',
      priceCondition: `<${fmt(stopLoss)}`,
      actionState: 'Risk invalidated',
      isCurrent: currentStateId === 'RISK_INVALIDATED',
      maxPrice: stopLoss,
      tone: 'danger',
      actionPrimary: isProspective ? 'AVOID' : 'SELL ALL (100%)',
    },
    {
      id: 'DEFENSIVE_REASSESS',
      priceCondition: defensiveCondition,
      actionState: 'Defensive / reassess',
      isCurrent: currentStateId === 'DEFENSIVE_REASSESS',
      minPrice: stopLoss,
      maxPrice: addZoneLow,
      tone: 'warning',
      actionPrimary: 'DEFENSIVE / REASSESS',
    },
    {
      id: 'ACCUMULATION_ZONE',
      priceCondition: `${fmt(addZoneLow)}–${fmt(addZoneHigh)}`,
      actionState: 'Accumulation zone',
      isCurrent: currentStateId === 'ACCUMULATION_ZONE',
      minPrice: addZoneLow,
      maxPrice: addZoneHigh,
      tone: 'success',
      actionPrimary: isProspective ? 'BUY / ENTER' : 'BUY MORE',
    },
    {
      id: 'HOLD_WAIT',
      priceCondition: holdCondition,
      actionState: 'Hold / wait',
      isCurrent: currentStateId === 'HOLD_WAIT',
      minPrice: addZoneHigh,
      maxPrice: breakout,
      tone: 'neutral',
      actionPrimary: isProspective ? 'WAIT / WATCH' : 'HOLD',
    },
    {
      id: 'BREAKOUT_CONFIRMATION',
      priceCondition: `>${fmt(breakout)}`,
      actionState: 'Breakout confirmation',
      isCurrent: currentStateId === 'BREAKOUT_CONFIRMATION',
      minPrice: breakout,
      maxPrice: target,
      tone: 'blue',
      actionPrimary: isProspective ? 'BUY BREAKOUT' : 'RIDE TREND',
    },
    {
      id: 'TARGET_REACHED',
      priceCondition: `>${fmt(target)}`,
      actionState: 'Target reached',
      isCurrent: currentStateId === 'TARGET_REACHED',
      minPrice: target,
      tone: 'purple',
      actionPrimary: 'TAKE PROFIT (TRIM)',
    },
  ];

  // Specific state representations
  let currentStateHeadline = '';
  let primaryAction = '';
  let badgeStyle = '';
  let directive = '';

  switch (currentStateId) {
    case 'RISK_INVALIDATED':
      currentStateHeadline = `🔴 RISK INVALIDATED BELOW ${fmt(stopLoss)}`;
      primaryAction = isProspective ? 'AVOID' : 'SELL ALL (100%)';
      badgeStyle = 'bg-rose-600 text-white font-black shadow-xs shadow-rose-600/30 border border-rose-700';
      directive = `Current price of ${fmt(currentPrice)} has broken below primary risk support (${fmt(stopLoss)}). Technical setup is invalidated — exit position immediately or avoid committing capital.`;
      break;

    case 'DEFENSIVE_REASSESS':
      currentStateHeadline = `🟠 DEFENSIVE / REASSESS BELOW ${fmt(addZoneLow)}`;
      primaryAction = 'DEFENSIVE / REASSESS';
      badgeStyle = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) is trading below the preferred accumulation corridor (${fmt(addZoneLow)}–${fmt(addZoneHigh)}). Maintain caution, hold strict stop at ${fmt(stopLoss)}, and wait for structural base stabilization.`;
      break;

    case 'ACCUMULATION_ZONE':
      currentStateHeadline = `🟢 ACCUMULATION ZONE ${fmt(addZoneLow)}–${fmt(addZoneHigh)}`;
      primaryAction = isProspective ? 'BUY / ENTER' : 'BUY MORE';
      badgeStyle = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) is trading directly inside the preferred accumulation zone (${fmt(addZoneLow)}–${fmt(addZoneHigh)}). Favorable asymmetric risk-reward entry with stop-loss disciplined at ${fmt(stopLoss)}.`;
      break;

    case 'HOLD_WAIT':
      currentStateHeadline = `🟡 WAIT / HOLD ABOVE ${fmt(addZoneHigh)}`;
      primaryAction = isProspective ? 'WAIT / WATCH' : 'HOLD';
      badgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold';
      directive = `Current price (${fmt(currentPrice)}) is extended above the preferred accumulation zone (${fmt(addZoneHigh)}) and below breakout level (${fmt(breakout)}). Await a healthy pullback into ${fmt(addZoneLow)}–${fmt(addZoneHigh)} or a confirmed breakout above ${fmt(breakout)} before adding fresh capital.`;
      break;

    case 'BREAKOUT_CONFIRMATION':
      currentStateHeadline = `🔵 BREAKOUT CONFIRMED ABOVE ${fmt(breakout)}`;
      primaryAction = isProspective ? 'BUY BREAKOUT' : 'RIDE TREND';
      badgeStyle = 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) has cleared breakout resistance (${fmt(breakout)}). Momentum expansion in progress toward target ${fmt(target)}; trail stops up to ${fmt(breakout)} to protect unrealized gains.`;
      break;

    case 'TARGET_REACHED':
      currentStateHeadline = `🎯 TARGET REACHED ABOVE ${fmt(target)}`;
      primaryAction = 'TAKE PROFIT (TRIM)';
      badgeStyle = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) has met or exceeded target price (${fmt(target)}). Take profits or trim position into strength to lock in performance.`;
      break;
  }

  return {
    currentStateId,
    currentStateHeadline,
    primaryAction,
    badgeStyle,
    directive,
    rows,
    currentPrice,
    currency,
    levels: {
      stopLoss,
      addZoneLow,
      addZoneHigh,
      breakout,
      target,
    },
  };
}
