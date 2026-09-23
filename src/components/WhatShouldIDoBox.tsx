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
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { StockData } from '../services/geminiService';
import { cn } from '../utils';
import { computeExecutionStateMachine } from '../utils/executionStateMachine';
import { ExecutionStateMachineTable } from './ExecutionStateMachineTable';
import { computeSignalAgreement } from '../utils/signalAgreement';
import { SignalAgreementModal } from './SignalAgreementModal';
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
  const { riskProfile, setRiskProfile, meta } = useRiskProfile();

  const allocationText = data.recommendation.positionAllocation || (riskProfile === 'aggressive' ? '5–10%' : '2–5%');
  const horizonText = data.recommendation.timeHorizon || (riskProfile === 'aggressive' ? '14–60 days' : '30–90 days');

  // Authoritative Execution State Machine driven by user's risk tolerance
  const stateMachine = computeExecutionStateMachine(data, currency, avgPrice, riskProfile);
  const addZoneExplanation = data.recommendation?.addZone?.explanation;

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
          "bg-white dark:bg-[#121212] p-4 sm:p-5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xs flex flex-col gap-3.5",
          className
        )}
      >
        {/* Header: Clean, balanced single line */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "p-1 rounded-md border shrink-0 flex items-center justify-center transition-all",
              iconConfig.badgeClass
            )}>
              <TacticalIcon className="w-3.5 h-3.5 stroke-[2.25]" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Trade Decision
            </h2>
          </div>

          <span className={cn(
            "text-xs px-2.5 sm:px-3 py-0.5 rounded-full tracking-wide uppercase font-black transition-colors shadow-2xs shrink-0 whitespace-nowrap",
            stateMachine.badgeStyle
          )}>
            {stateMachine.currentStateHeadline}
          </span>
        </div>

        {/* Risk Tolerance Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-50/80 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Risk Posture:
                </span>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {meta.label} ({meta.tagline})
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight truncate hidden sm:block">
                {meta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            {/* 3-segment switcher */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/80">
              <button
                type="button"
                id="risk-btn-aggressive"
                onClick={() => handleSelectRisk('aggressive')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer",
                  riskProfile === 'aggressive'
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                )}
                title="Aggressive: Triggers active BUY & ACCUMULATION setups on momentum, shallow dips, and breakouts"
              >
                <Zap className="w-3 h-3 fill-current" />
                Aggressive
              </button>
              <button
                type="button"
                id="risk-btn-moderate"
                onClick={() => handleSelectRisk('moderate')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer",
                  riskProfile === 'moderate'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
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
                  "px-2.5 py-1 rounded-md text-[11px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer",
                  riskProfile === 'conservative'
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
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
                className="p-1.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/80 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isUpdating && "animate-spin text-emerald-500")} />
              </button>
            )}
          </div>
        </div>

        {/* 3-Column Tactical Execution Parameters Strip */}
        <div className="grid grid-cols-3 gap-2">
          {/* Signal Agreement Button */}
          <button
            type="button"
            onClick={() => setShowSignalModal(true)}
            id="signal-agreement-spec-btn"
            title="Inspect 9 monitored criteria"
            className="p-2 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex items-center justify-between group cursor-pointer text-left"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                Signals
                <Info className="w-2.5 h-2.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" />
              </div>
              <div className="font-mono text-xs font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 mt-0.5">
                <span>{signalAgreement.score}/100</span>
                <span className="text-[10px] font-bold font-sans text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                  {signalAgreement.alignedCount}/{signalAgreement.totalCount}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* Allocation */}
          <div className="p-2 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Allocation
            </div>
            <div className="font-mono text-xs font-black text-neutral-900 dark:text-neutral-100 mt-0.5 leading-snug break-words">
              {allocationText}
            </div>
          </div>

          {/* Time Horizon */}
          <div className="p-2 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Horizon
            </div>
            <div className="font-mono text-xs font-black text-neutral-900 dark:text-neutral-100 mt-0.5 leading-snug break-words">
              {horizonText}
            </div>
          </div>
        </div>

        {/* Strategic Operational Directive Box */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-50/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-neutral-500" />
              Operational Directive
            </span>
          </div>

          <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
            {stateMachine.directive}
          </p>

          {addZoneExplanation && (
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-start gap-1.5 pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50 leading-snug break-words">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Discipline:</span>
              <span>{addZoneExplanation}</span>
            </div>
          )}
        </div>

        {/* Execution State Machine Ladder */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Price Execution State Machine
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
              6 Monitored Price Thresholds
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden bg-neutral-50/30 dark:bg-neutral-900/20">
            <ExecutionStateMachineTable
              rows={stateMachine.rows}
              currentPrice={stateMachine.currentPrice}
              currency={currency}
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
    </>
  );
};
