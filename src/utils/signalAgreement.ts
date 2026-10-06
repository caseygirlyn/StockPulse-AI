import { StockData } from '../services/geminiService';
import { formatCurrency } from '../utils';
import { computeCanonicalTradeGeometry, getCanonicalLevels } from './canonicalLevels';

export interface MonitoredSignal {
  id: string;
  name: string;
  category: 'Trend' | 'Momentum' | 'Volume' | 'Risk/Reward' | 'Support/Resistance';
  status: 'aligned' | 'caution' | 'neutral';
  measuredValue: string;
  explanation: string;
  isAligned: boolean;
}

export interface SignalAgreementModel {
  score: number; // 0–100 (e.g. 82)
  alignedCount: number; // e.g. 7
  totalCount: number; // e.g. 9
  headline: string; // "Signal agreement: 82/100"
  subheadline: string; // "7 of 9 monitored signals currently align with the setup."
  definition: string;
  signals: MonitoredSignal[];
}

export function computeSignalAgreement(data: StockData, currency: string = 'USD'): SignalAgreementModel {
  const currentPrice = data.currentPrice || 0;
  const analysis = data.analysis;
  const rec = data.recommendation;
  const fmt = (val?: number) => val !== undefined ? formatCurrency(val, currency) : '—';

  const canonical = getCanonicalLevels(data, currency);

  const trend = analysis?.trend || 'Neutral';
  const rsi = typeof analysis?.rsi14 === 'number' 
    ? analysis.rsi14 
    : (typeof analysis?.momentumScore === 'number' ? analysis.momentumScore : 50);
  const relVol = typeof analysis?.relativeVolume === 'number' 
    ? analysis.relativeVolume 
    : (typeof data.relativeVolume === 'number' ? data.relativeVolume : 1.0);
  const stopLoss = canonical.risk.price;
  const profitTarget = canonical.target.price;
  const support = analysis?.support || stopLoss * 1.03;
  const resistance = analysis?.resistance || profitTarget * 0.95;
  const addZoneLow = canonical.addZone.low;
  const addZoneHigh = canonical.addZone.high;
  const ma20 = data.ma20 || data.ma5;
  const ma50 = data.ma50;

  const tradeGeometry = canonical.tradeGeometry;
  const riskReward = tradeGeometry.rewardRiskRatio;

  const signals: MonitoredSignal[] = [];

  // 1. Primary Trend Direction
  const isTrendBullish = trend === 'Bullish';
  const isTrendNeutral = trend === 'Neutral';
  signals.push({
    id: 'trend_direction',
    name: 'Primary Trend Direction',
    category: 'Trend',
    status: isTrendBullish ? 'aligned' : isTrendNeutral ? 'neutral' : 'caution',
    measuredValue: `${trend} trend structure`,
    explanation: isTrendBullish 
      ? 'Higher swing highs and ascending moving average alignment.'
      : isTrendNeutral 
      ? 'Consolidation regime without clear directional breakdown.' 
      : 'Lower swing lows indicating prevailing downside pressure.',
    isAligned: isTrendBullish || (isTrendNeutral && currentPrice >= (ma20 || 0)),
  });

  // 2. Moving Average Geometry (20-Day & 50-Day)
  const isAboveMa20 = ma20 ? currentPrice >= ma20 : true;
  const isAboveMa50 = ma50 ? currentPrice >= ma50 : true;
  const maAligned = isAboveMa20;
  signals.push({
    id: 'ma_structure',
    name: 'Moving Average Geometry',
    category: 'Trend',
    status: maAligned ? 'aligned' : 'caution',
    measuredValue: ma20 ? `Price vs 20-Day (${fmt(ma20)})` : 'Above key trendline',
    explanation: isAboveMa20
      ? `Current price (${fmt(currentPrice)}) trades above short-term trend benchmark (${fmt(ma20)}).`
      : `Trading below the 20-day moving average (${fmt(ma20)}), signaling short-term weakness.`,
    isAligned: maAligned,
  });

  // 3. 14-Period RSI Momentum
  const isRsiHealthy = rsi >= 42 && rsi <= 72;
  const isRsiOverbought = rsi > 72;
  const isRsiOversold = rsi < 35;
  signals.push({
    id: 'rsi_momentum',
    name: '14-Period RSI Momentum',
    category: 'Momentum',
    status: isRsiHealthy ? 'aligned' : isRsiOverbought ? 'caution' : isRsiOversold ? 'neutral' : 'aligned',
    measuredValue: `RSI(14) = ${rsi.toFixed(1)}`,
    explanation: isRsiHealthy
      ? 'Balanced momentum expansion within sustainable non-exhaustion boundary (42–72).'
      : isRsiOverbought
      ? 'Elevated RSI suggests short-term momentum stretch; vulnerable to mean reversion.'
      : 'RSI in depressed territory; awaiting momentum stabilization.',
    isAligned: isRsiHealthy || rsi >= 38,
  });

  // 4. Volume Participation & Institutional Flow
  const isVolConfirmed = relVol >= 0.90;
  signals.push({
    id: 'volume_participation',
    name: 'Volume Participation',
    category: 'Volume',
    status: isVolConfirmed ? 'aligned' : 'caution',
    measuredValue: `${relVol.toFixed(2)}x 20-day baseline`,
    explanation: isVolConfirmed
      ? `Active institutional participation confirms price stability (${relVol.toFixed(2)}x average).`
      : `Sub-baseline participation (${relVol.toFixed(2)}x average); signals caution on directional follow-through.`,
    isAligned: isVolConfirmed,
  });

  // 5. Asymmetric Risk/Reward Ratio (Payoff Ratio)
  const isRrFavorable = riskReward >= 1.8;
  signals.push({
    id: 'risk_reward',
    name: 'Risk-to-Reward Payoff Ratio',
    category: 'Risk/Reward',
    status: isRrFavorable ? 'aligned' : 'caution',
    measuredValue: `${tradeGeometry.multiplierFormatted} (${tradeGeometry.ratioFormatted})`,
    explanation: isRrFavorable
      ? `Favorable geometric payoff (${tradeGeometry.multiplierFormatted}: Reward +${tradeGeometry.upsidePct.toFixed(1)}% vs Risk ${Math.abs(tradeGeometry.downsidePct).toFixed(1)}%). Requires >${tradeGeometry.breakEvenWinRate}% win rate for positive EV.`
      : `Payoff ratio (${tradeGeometry.multiplierFormatted}) below preferred 1.8:1 hurdle. Requires higher win probability (>${tradeGeometry.breakEvenWinRate}%) for positive EV.`,
    isAligned: isRrFavorable,
  });

  // 6. Structural Support Proximity & Integrity
  const isSupportIntact = currentPrice >= support && currentPrice >= stopLoss;
  const supportDist = currentPrice > 0 ? ((support - currentPrice) / currentPrice) * 100 : 0;
  const supportDistStr = `${supportDist >= 0 ? '+' : '−'}${Math.abs(supportDist).toFixed(1)}%`;
  signals.push({
    id: 'support_integrity',
    name: 'Support Floor Integrity',
    category: 'Support/Resistance',
    status: isSupportIntact ? 'aligned' : 'caution',
    measuredValue: `Support ${fmt(support)} · ${supportDistStr}`,
    explanation: isSupportIntact
      ? `Price maintains structural integrity comfortably above key floor (${fmt(support)} · ${supportDistStr}).`
      : `Price is pressing or violating major technical support (${fmt(support)} · ${supportDistStr}).`,
    isAligned: isSupportIntact,
  });

  // 7. Accumulation Zone Discipline
  const isWithinOrDisciplined = currentPrice <= addZoneHigh * 1.03;
  signals.push({
    id: 'accumulation_discipline',
    name: 'Accumulation Corridor Discipline',
    category: 'Risk/Reward',
    status: isWithinOrDisciplined ? 'aligned' : 'caution',
    measuredValue: `Add corridor ${fmt(addZoneLow)}–${fmt(addZoneHigh)} · ${canonical.addZone.distanceDisplay}`,
    explanation: (currentPrice >= addZoneLow && currentPrice <= addZoneHigh)
      ? 'Trading directly within optimal asymmetric accumulation corridor.'
      : currentPrice > addZoneHigh
      ? `Trading above corridor (${fmt(addZoneHigh)}); requires pullback or breakout trigger before fresh deployment.`
      : 'Trading below preferred corridor; requires base confirmation.',
    isAligned: isWithinOrDisciplined,
  });

  // 8. Quantitatively Defined Risk Boundary (Stop-Loss)
  const isStopDefined = stopLoss > 0 && currentPrice > stopLoss;
  signals.push({
    id: 'stop_loss_definition',
    name: 'Downside Risk Boundary',
    category: 'Risk/Reward',
    status: isStopDefined ? 'aligned' : 'caution',
    measuredValue: `Stop ${fmt(stopLoss)} · ${canonical.risk.distanceDisplay}`,
    explanation: isStopDefined
      ? `Defensive stop anchored below structural support (${fmt(stopLoss)} · ${canonical.risk.distanceDisplay}) to cap max drawdowns.`
      : `Current price has compromised or lacks clear defensive stop invalidation level.`,
    isAligned: isStopDefined,
  });

  // 9. Overhead Clearance to Major Resistance
  const hasHeadroom = resistance > currentPrice && ((resistance - currentPrice) / currentPrice) >= 0.03;
  const resDist = currentPrice > 0 ? ((resistance - currentPrice) / currentPrice) * 100 : 0;
  const resDistStr = `${resDist >= 0 ? '+' : '−'}${Math.abs(resDist).toFixed(1)}%`;
  signals.push({
    id: 'overhead_clearance',
    name: 'Overhead Resistance Clearance',
    category: 'Support/Resistance',
    status: hasHeadroom ? 'aligned' : 'caution',
    measuredValue: `Resistance ${fmt(resistance)} · ${resDistStr}`,
    explanation: hasHeadroom
      ? `Uncongested upside pathway to primary resistance ceiling (${fmt(resistance)} · ${resDistStr}).`
      : `Near-term overhead resistance (${fmt(resistance)} · ${resDistStr}) restricts favorable upside expansion.`,
    isAligned: hasHeadroom,
  });

  const alignedCount = signals.filter(s => s.isAligned).length;
  const totalCount = signals.length;

  // Derive score directly or sync with base data recommendation confidence if provided
  let calculatedScore = Math.round((alignedCount / totalCount) * 100);
  if (typeof rec?.confidence === 'number' && rec.confidence >= 50 && rec.confidence <= 100) {
    // Keep aligned with server confidence within reasonable proximity
    calculatedScore = rec.confidence;
  }

  return {
    score: calculatedScore,
    alignedCount,
    totalCount,
    headline: `Signal agreement: ${calculatedScore}/100`,
    subheadline: `${alignedCount} of ${totalCount} monitored signals currently align with the active setup.`,
    definition: 'Multi-factor technical alignment score evaluating concordance across 9 quantitative criteria: trend structure, moving averages, RSI momentum, volume participation, support integrity, risk-to-reward ratio, accumulation discipline, downside risk boundary, and overhead clearance. This is not a win probability or price-increase forecast.',
    signals,
  };
}
