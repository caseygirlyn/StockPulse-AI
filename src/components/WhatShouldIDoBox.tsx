import React, { useState, useMemo } from 'react';
import { 
  Compass,
  Crosshair,
  Navigation,
  Target,
  ShieldAlert,
  Info,
  ChevronRight,
  Zap,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { StockData } from '../services/geminiService';
import { cn, formatCurrency } from '../utils';
import { computeExecutionStateMachine } from '../utils/executionStateMachine';
import { ExecutionStateMachineTable } from './ExecutionStateMachineTable';
import { computeSignalAgreement } from '../utils/signalAgreement';
import { SignalAgreementModal } from './SignalAgreementModal';
import { AiConfidenceModal } from './AiConfidenceModal';
import { useRiskProfile, RiskProfile } from '../context/RiskContext';

interface WhatShouldIDoBoxProps {
  data: StockData;
  currency: string;
  avgPrice?: string;
  className?: string;
  onRefreshWithRiskProfile?: (profile: RiskProfile) => void;
  isUpdating?: boolean;
}

export const WhatShouldIDoBox: React.FC<WhatShouldIDoBoxProps> = ({ 
  data, 
  currency, 
  avgPrice, 
  className,
  onRefreshWithRiskProfile,
  isUpdating = false
}) => {
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [showConfidenceModal, setShowConfidenceModal] = useState(false);
  const { riskProfile, setRiskProfile } = useRiskProfile();

  // Dynamic portfolio allocation sizing aligned with risk posture and asset profile
  const allocationText = useMemo(() => {
    if (data.isETF) {
      if (riskProfile === 'aggressive') return '10–20%';
      if (riskProfile === 'conservative') return '5–10%';
      return '8–15%';
    }
    if (riskProfile === 'aggressive') return '5–10%';
    if (riskProfile === 'conservative') return '1–3%';
    return data.recommendation?.positionAllocation || '2–5%';
  }, [data.isETF, data.recommendation?.positionAllocation, riskProfile]);

  // Tactical trading / investment horizon
  const horizonText = useMemo(() => {
    if (riskProfile === 'aggressive') return '14–45 days';
    if (riskProfile === 'conservative') return '60–180 days';
    return data.recommendation?.timeHorizon || '30–90 days';
  }, [data.recommendation?.timeHorizon, riskProfile]);

  // Authoritative Execution State Machine driven by user's risk tolerance
  const stateMachine = computeExecutionStateMachine(data, currency, avgPrice, riskProfile);

  // AI Confidence Score & Confluence Tier
  const confidenceScore = useMemo(() => {
    if (typeof data.recommendation?.confidence === 'number' && data.recommendation.confidence > 0) {
      return Math.round(data.recommendation.confidence);
    }
    if (typeof data.recommendation?.signalAgreement?.score === 'number' && data.recommendation.signalAgreement.score > 0) {
      return Math.round(data.recommendation.signalAgreement.score);
    }
    let base = 74;
    const rr = stateMachine.tradeGeometry?.rewardRiskRatio || 2.0;
    if (rr >= 2.2) base += 4;
    if (data.analysis?.trend === 'Bullish' && data.recommendation?.action === 'BUY') base += 5;
    if (data.analysis?.momentumLabel === 'Strong') base += 3;
    return Math.min(92, Math.max(62, base));
  }, [data, stateMachine.tradeGeometry]);

  const confidenceTier = useMemo(() => {
    if (confidenceScore >= 80) {
      return {
        label: 'High Conviction',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
        barClass: 'bg-emerald-500',
        description: 'Strong technical confluence, favorable risk-reward, and volume support'
      };
    }
    if (confidenceScore >= 70) {
      return {
        label: 'Strong Confluence',
        badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/60',
        barClass: 'bg-blue-500',
        description: 'Constructive setup with solid directional alignment'
      };
    }
    return {
      label: 'Moderate Confluence',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60',
      barClass: 'bg-amber-500',
      description: 'Defensive setup; prioritize strict stop-loss adherence'
    };
  }, [confidenceScore]);

  // Contextual icon configuration tailored to active execution state
  const iconConfig = useMemo(() => {
    switch (stateMachine.currentStateId) {
      case 'ACCUMULATION_ZONE':
        return {
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/80',
          Icon: Compass,
        };
      case 'BREAKOUT_CONFIRMATION':
        return {
          badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/80',
          Icon: Navigation,
        };
      case 'TARGET_REACHED':
        return {
          badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/80',
          Icon: Target,
        };
      case 'RISK_INVALIDATED':
        return {
          badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/80',
          Icon: ShieldAlert,
        };
      case 'DEFENSIVE_REASSESS':
        return {
          badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/80',
          Icon: Crosshair,
        };
      case 'HOLD_WAIT':
      default:
        return {
          badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/80',
          Icon: Compass,
        };
    }
  }, [stateMachine.currentStateId]);

  // Signal Agreement Model (concordance across 9 monitored technical criteria)
  const signalAgreement = computeSignalAgreement(data, currency);
  const TacticalIcon = iconConfig.Icon;

  const handleSelectRisk = (newProfile: RiskProfile) => {
    setRiskProfile(newProfile);
    if (onRefreshWithRiskProfile) {
      onRefreshWithRiskProfile(newProfile);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        id="trade-decision-box"
        className={cn(
          "bg-white dark:bg-[#121212] p-3 sm:p-4 md:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col gap-3.5 sm:gap-4",
          className
        )}
      >
        {/* Header: Aligned with Price Performance & Structural Analysis */}
        <div className="space-y-3 pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className={cn(
                  "p-1.5 rounded-lg border shrink-0 flex items-center justify-center transition-all",
                  iconConfig.badgeClass
                )}>
                  <TacticalIcon className="w-4 h-4 stroke-[2.25]" />
                </span>
                <h2 className="font-black text-lg tracking-tight text-neutral-900 dark:text-neutral-100">
                  Trade Decision
                </h2>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70">
                  Tactical Directive
                </span>
                {/* Primary Action Badge */}
                <span className={cn(
                  "text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full tracking-wider uppercase font-black transition-colors shadow-2xs shrink-0 whitespace-nowrap inline-flex items-center gap-1.5",
                  stateMachine.badgeStyle
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {stateMachine.primaryAction}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                  Risk Profile: <strong className="text-neutral-700 dark:text-neutral-300 capitalize">{riskProfile || 'moderate'}</strong>
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Deterministic ATR execution parameters, quantitative confidence weighting, and capital allocation
            </p>
          </div>
        </div>

        {/* 4-Column Tactical Intelligence Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 1: AI Confidence Score & Model Gauge */}
          <button
            type="button"
            onClick={() => setShowConfidenceModal(true)}
            id="ai-confidence-spec-btn"
            title="Inspect AI Confidence model and 4 confluence factors"
            className="col-span-2 sm:col-span-1 lg:col-span-1 p-2.5 sm:p-3 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between group cursor-pointer text-left"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  AI Confidence
                  <Info className="w-2.5 h-2.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" />
                </span>
                <span className={cn(
                  "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-sans shrink-0",
                  confidenceTier.badgeClass
                )}>
                  {confidenceTier.label}
                </span>
              </div>
              <div className="font-mono text-sm sm:text-base font-black text-neutral-900 dark:text-neutral-100 flex items-baseline gap-1 mt-1">
                <span>{confidenceScore}%</span>
                <span className="text-[9px] font-sans font-normal text-neutral-400 dark:text-neutral-500">
                  probability
                </span>
              </div>
            </div>

            {/* Visual Confidence Progress Bar */}
            <div className="mt-2 space-y-1">
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${confidenceScore}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={cn("h-full rounded-full", confidenceTier.barClass)}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-medium text-amber-600 dark:text-amber-400">
                <span>Inspect 4 factors</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            </div>
          </button>

          {/* Card 2: Signal Agreement Model */}
          <button
            type="button"
            onClick={() => setShowSignalModal(true)}
            id="signal-agreement-spec-btn"
            title="Inspect 9 monitored criteria"
            className="col-span-2 sm:col-span-1 lg:col-span-1 p-2.5 sm:p-3 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between group cursor-pointer text-left"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                  Signals Model
                  <Info className="w-2.5 h-2.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" />
                </span>
                <span className="text-[8px] font-bold font-sans text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                  {signalAgreement.alignedCount}/{signalAgreement.totalCount} Aligned
                </span>
              </div>
              <div className="font-mono text-sm sm:text-base font-black text-neutral-900 dark:text-neutral-100 flex items-baseline gap-1 mt-1">
                <span>{signalAgreement.score}/100</span>
                <span className="text-[9px] font-sans font-normal text-neutral-400 dark:text-neutral-500">
                  confluence
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[9px] font-medium text-emerald-600 dark:text-emerald-400 mt-2">
              <span>View 9 technical criteria</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>

          {/* Card 3: Allocation */}
          <div 
            className="col-span-1 p-2.5 sm:p-3 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 flex flex-col justify-between cursor-help"
            title="Recommended maximum position sizing as a percentage of your total liquid investment portfolio to manage concentration risk."
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Allocation
                </span>
                <span className="text-[8px] font-mono text-neutral-400 dark:text-neutral-500 uppercase">
                  Max Weight
                </span>
              </div>
              <div className="font-mono text-sm sm:text-base font-black text-neutral-900 dark:text-neutral-100 mt-1 leading-snug">
                {allocationText}
              </div>
            </div>
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-2 block">
              Risk-weighted sizing
            </span>
          </div>

          {/* Card 4: Time Horizon */}
          <div className="col-span-1 p-2.5 sm:p-3 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Trade Horizon
                </span>
                <span className="text-[8px] font-mono text-neutral-400 dark:text-neutral-500 uppercase">
                  Swing
                </span>
              </div>
              <div className="font-mono text-sm sm:text-base font-black text-neutral-900 dark:text-neutral-100 mt-1 leading-snug">
                {horizonText}
              </div>
            </div>
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-2 block">
              Estimated holding window
            </span>
          </div>
        </div>

        {/* Strategic Operational Directive Box */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-neutral-500" />
              Operational Directive
            </span>
            <div className="flex items-center gap-2">
              {stateMachine.tradeGeometry && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  R:R {stateMachine.tradeGeometry.ratioFormatted}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
            {stateMachine.directive}
          </p>

          {/* Quick Context Summary Strip */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-3">
              <span>Invalidation Stop: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(stateMachine.levels.stopLoss, currency)}</strong></span>
              <span>Take Profit: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(stateMachine.levels.target, currency)}</strong></span>
            </div>
            <span className="text-[9px] text-neutral-400">
              ATR Volatility Buffered
            </span>
          </div>
        </div>

        {/* Unified Key Levels & Execution State Machine Ladder */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Key Levels & Execution Ladder
            </span>

            {/* Risk Posture Selector directly configuring the ladder */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/80">
                <button
                  type="button"
                  id="risk-btn-aggressive"
                  onClick={() => handleSelectRisk('aggressive')}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer",
                    riskProfile === 'aggressive'
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:white"
                  )}
                  title="Aggressive: Triggers active BUY & ACCUMULATION setups on momentum, shallow dips, and breakouts"
                >
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  Aggressive
                </button>
                <button
                  type="button"
                  id="risk-btn-moderate"
                  onClick={() => handleSelectRisk('moderate')}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer",
                    riskProfile === 'moderate'
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:white"
                  )}
                  title="Moderate: Balanced institutional risk-reward (≥1.8:1)"
                >
                  Moderate
                </button>
                <button
                  type="button"
                  id="risk-btn-conservative"
                  onClick={() => handleSelectRisk('conservative')}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer",
                    riskProfile === 'conservative'
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:white"
                  )}
                  title="Conservative: Deep pullbacks to support floors only"
                >
                  Conservative
                </button>
              </div>

              {onRefreshWithRiskProfile && (
                <button
                  type="button"
                  onClick={() => onRefreshWithRiskProfile(riskProfile)}
                  disabled={isUpdating}
                  title="Re-run AI analysis with current risk profile"
                  className="p-1 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/80 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3 h-3", isUpdating && "animate-spin text-emerald-500")} />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden bg-neutral-50/30 dark:bg-neutral-900/20">
            <ExecutionStateMachineTable
              rows={stateMachine.rows}
              currentPrice={stateMachine.currentPrice}
              currency={currency}
              tradeGeometry={stateMachine.tradeGeometry}
            />
          </div>
        </div>
      </motion.div>

      {/* Signal Concordance Inspection Modal */}
      <SignalAgreementModal
        isOpen={showSignalModal}
        onClose={() => setShowSignalModal(false)}
        agreement={signalAgreement}
        ticker={data.ticker}
      />

      {/* AI Confidence Score Breakdown Modal */}
      <AiConfidenceModal
        isOpen={showConfidenceModal}
        onClose={() => setShowConfidenceModal(false)}
        confidenceScore={confidenceScore}
        confidenceTier={confidenceTier}
        data={data}
        currency={currency}
        tradeGeometry={stateMachine.tradeGeometry}
        signalAgreement={signalAgreement}
      />
    </>
  );
};

