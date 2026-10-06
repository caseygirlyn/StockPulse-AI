import { formatCurrency } from '../utils';
import { StockData } from '../services/geminiService';
import { getCanonicalLevels, CanonicalLevelsModel, CanonicalTradeGeometry } from './canonicalLevels';

export type ExecutionStateId = 
  | 'RISK_INVALIDATED'
  | 'DEFENSIVE_REASSESS'
  | 'ACCUMULATION_ZONE'
  | 'HOLD_WAIT'
  | 'BREAKOUT_CONFIRMATION'
  | 'TARGET_REACHED';

export interface StateMachineRow {
  id: ExecutionStateId;
  levelLabel: string;
  provenance: string;
  priceCondition: string;
  actionState: string;
  isCurrent: boolean;
  minPrice?: number;
  maxPrice?: number;
  distanceDisplay?: string;
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
  tradeGeometry?: CanonicalTradeGeometry;
  canonicalLevels?: CanonicalLevelsModel;
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
  const rawAction = (data.recommendation?.action || '').toUpperCase();
  const isSellAction = rawAction.includes('SELL') || rawAction.includes('AVOID') || rawAction.includes('TRIM') || rawAction.includes('EXIT');
  const isBuyAction = rawAction.includes('BUY') || rawAction.includes('ACCUMULAT');

  // Determine active state strictly by price location relative to structural boundaries
  if (currentPrice < stopLoss || rawAction === 'SELL_ALL') {
    currentStateId = 'RISK_INVALIDATED';
  } else if (currentPrice >= target) {
    currentStateId = 'TARGET_REACHED';
  } else if (currentPrice >= breakout && currentPrice < target) {
    currentStateId = 'BREAKOUT_CONFIRMATION';
  } else if (currentPrice > addZoneHigh && currentPrice < breakout) {
    if (!isSellAction && (riskMode === 'aggressive' || isBuyAction) && isBullish && currentPrice <= addZoneHigh * 1.03) {
      currentStateId = 'ACCUMULATION_ZONE';
    } else {
      currentStateId = 'HOLD_WAIT';
    }
  } else if (currentPrice >= addZoneLow && currentPrice <= addZoneHigh) {
    currentStateId = 'ACCUMULATION_ZONE';
  } else if (currentPrice >= stopLoss && currentPrice < addZoneLow) {
    currentStateId = 'DEFENSIVE_REASSESS';
  } else {
    currentStateId = 'HOLD_WAIT';
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
      id: 'TARGET_REACHED',
      levelLabel: 'Target',
      provenance: 'Profit Target (2.5R)',
      priceCondition: `>${fmt(target)}`,
      distanceDisplay: canonical.target.distanceDisplay,
      actionState: 'Target reached (Take profit)',
      isCurrent: currentStateId === 'TARGET_REACHED',
      minPrice: target,
      tone: 'purple',
      actionPrimary: 'TAKE PROFIT (TRIM)',
    },
    {
      id: 'BREAKOUT_CONFIRMATION',
      levelLabel: 'Breakout',
      provenance: 'Resistance Ceiling',
      priceCondition: `>${fmt(breakout)}`,
      distanceDisplay: canonical.breakout.distanceDisplay,
      actionState: 'Breakout confirmation (Trail stop)',
      isCurrent: currentStateId === 'BREAKOUT_CONFIRMATION',
      minPrice: breakout,
      maxPrice: target,
      tone: 'blue',
      actionPrimary: isProspective ? 'BUY BREAKOUT' : 'RIDE TREND',
    },
    {
      id: 'HOLD_WAIT',
      levelLabel: 'Hold / Wait',
      provenance: 'Consolidation Corridor',
      priceCondition: holdCondition,
      actionState: 'Hold / await setup',
      isCurrent: currentStateId === 'HOLD_WAIT',
      minPrice: addZoneHigh,
      maxPrice: breakout,
      tone: 'neutral',
      actionPrimary: isProspective ? 'WAIT / WATCH' : 'HOLD',
    },
    {
      id: 'ACCUMULATION_ZONE',
      levelLabel: 'Add Zone',
      provenance: 'Support Floor (Accumulation)',
      priceCondition: `${fmt(addZoneLow)}–${fmt(addZoneHigh)}`,
      distanceDisplay: canonical.addZone.distanceDisplay,
      actionState: 'Accumulation zone (Limit orders)',
      isCurrent: currentStateId === 'ACCUMULATION_ZONE',
      minPrice: addZoneLow,
      maxPrice: addZoneHigh,
      tone: 'success',
      actionPrimary: isProspective ? 'BUY / ENTER' : 'BUY MORE',
    },
    {
      id: 'DEFENSIVE_REASSESS',
      levelLabel: 'Defensive',
      provenance: 'Sub-Support Warning',
      priceCondition: defensiveCondition,
      actionState: 'Defensive / reassess baseline',
      isCurrent: currentStateId === 'DEFENSIVE_REASSESS',
      minPrice: stopLoss,
      maxPrice: addZoneLow,
      tone: 'warning',
      actionPrimary: 'DEFENSIVE / REASSESS',
    },
    {
      id: 'RISK_INVALIDATED',
      levelLabel: 'Risk Floor',
      provenance: 'Stop-Loss (14D ATR)',
      priceCondition: `<${fmt(stopLoss)}`,
      distanceDisplay: canonical.risk.distanceDisplay,
      actionState: 'Stop-loss breached (Exit)',
      isCurrent: currentStateId === 'RISK_INVALIDATED',
      maxPrice: stopLoss,
      tone: 'danger',
      actionPrimary: isProspective ? 'AVOID' : 'SELL ALL (100%)',
    },
  ];

  // Specific state representations
  let currentStateHeadline = '';
  let primaryAction = '';
  let badgeStyle = '';
  let directive = '';

  switch (currentStateId) {
    case 'RISK_INVALIDATED':
      currentStateHeadline = `🔴 STOP-LOSS BREACHED BELOW ${fmt(stopLoss)} · ${canonical.risk.distanceDisplay}`;
      primaryAction = isProspective ? 'AVOID' : 'SELL ALL (100%)';
      badgeStyle = 'bg-rose-600 text-white font-black shadow-xs shadow-rose-600/30 border border-rose-700';
      directive = `Current price of ${fmt(currentPrice)} has broken below primary stop-loss support (${fmt(stopLoss)} · ${canonical.risk.distanceDisplay}). Exit position immediately to preserve capital or avoid opening a new position.`;
      break;

    case 'DEFENSIVE_REASSESS':
      currentStateHeadline = `🟠 DEFENSIVE / REASSESS BELOW ${fmt(addZoneLow)}`;
      primaryAction = 'DEFENSIVE / REASSESS';
      badgeStyle = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) is trading below the preferred accumulation corridor (${fmt(addZoneLow)}–${fmt(addZoneHigh)}). Maintain caution, hold strict stop at ${fmt(stopLoss)} (${canonical.risk.distanceDisplay}), and wait for structural base stabilization.`;
      break;

    case 'ACCUMULATION_ZONE':
      currentStateHeadline = `🟢 ACCUMULATION ZONE ${fmt(addZoneLow)}–${fmt(addZoneHigh)} · ${canonical.addZone.distanceDisplay}`;
      primaryAction = isProspective ? 'BUY / ENTER' : 'BUY MORE';
      badgeStyle = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) is trading directly inside the preferred accumulation zone (${fmt(addZoneLow)}–${fmt(addZoneHigh)}). Favorable asymmetric risk-reward entry with stop-loss disciplined at ${fmt(stopLoss)} (${canonical.risk.distanceDisplay}).`;
      break;

    case 'HOLD_WAIT':
      currentStateHeadline = `🟡 WAIT / HOLD ABOVE ${fmt(addZoneHigh)}`;
      primaryAction = isProspective ? 'WAIT / WATCH' : 'HOLD';
      badgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold';
      directive = `Current price (${fmt(currentPrice)}) is extended above the preferred accumulation zone (${fmt(addZoneHigh)}) and below breakout level (${fmt(breakout)} · ${canonical.breakout.distanceDisplay}). Await a healthy pullback into ${fmt(addZoneLow)}–${fmt(addZoneHigh)} or a confirmed breakout above ${fmt(breakout)} before adding fresh capital.`;
      break;

    case 'BREAKOUT_CONFIRMATION':
      currentStateHeadline = `🔵 BREAKOUT CONFIRMED ABOVE ${fmt(breakout)} · ${canonical.breakout.distanceDisplay}`;
      primaryAction = isProspective ? 'BUY BREAKOUT' : 'RIDE TREND';
      badgeStyle = 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) has cleared breakout resistance (${fmt(breakout)} · ${canonical.breakout.distanceDisplay}). Momentum expansion in progress toward target ${fmt(target)} (${canonical.target.distanceDisplay}); trail stops up to ${fmt(breakout)} to protect unrealized gains.`;
      break;

    case 'TARGET_REACHED': {
      const sellPct = data.recommendation?.sellPercentage || 50;
      currentStateHeadline = rawAction === 'SELL_PARTIAL' 
        ? `🎯 TARGET REACHED / TRIM ZONE ${fmt(target)} · ${canonical.target.distanceDisplay}`
        : `🎯 TARGET REACHED ABOVE ${fmt(target)} · ${canonical.target.distanceDisplay}`;
      primaryAction = `TAKE PROFIT (SELL ${sellPct}%)`;
      badgeStyle = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-black';
      directive = `Current price (${fmt(currentPrice)}) has reached profit targets or key resistance. Lock in gains by selling partial (${sellPct}%) or trail stops to protect realized profits.`;
      break;
    }
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
    tradeGeometry: canonical.tradeGeometry,
    canonicalLevels: canonical,
  };
}
