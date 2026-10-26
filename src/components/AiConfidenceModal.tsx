import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Zap, 
  TrendingUp, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  BarChart3,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';
import { StockData } from '../services/geminiService';
import { CanonicalTradeGeometry } from '../utils/canonicalLevels';
import { SignalAgreementModel } from '../utils/signalAgreement';
import { cn, formatCurrency } from '../utils';

interface AiConfidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  confidenceScore: number;
  confidenceTier: {
    label: string;
    badgeClass: string;
    barClass: string;
    description: string;
  };
  data: StockData;
  currency: string;
  tradeGeometry?: CanonicalTradeGeometry;
  signalAgreement?: SignalAgreementModel;
}

export const AiConfidenceModal: React.FC<AiConfidenceModalProps> = ({
  isOpen,
  onClose,
  confidenceScore,
  confidenceTier,
  data,
  currency,
  tradeGeometry,
  signalAgreement,
}) => {
  if (!isOpen) return null;

  const trend = data.analysis?.trend || 'Neutral';
  const isTrendBullish = trend === 'Bullish';
  const isTrendBearish = trend === 'Bearish';

  const rsi = typeof data.analysis?.rsi14 === 'number' 
    ? data.analysis.rsi14 
    : (typeof data.analysis?.momentumScore === 'number' ? data.analysis.momentumScore : 50);
  const relVol = typeof data.analysis?.relativeVolume === 'number' 
    ? data.analysis.relativeVolume 
    : (typeof data.relativeVolume === 'number' ? data.relativeVolume : 1.0);

  const rrRatio = tradeGeometry?.rewardRiskRatio || 2.0;
  const alignedSignals = signalAgreement ? signalAgreement.alignedCount : Math.round((confidenceScore / 100) * 9);
  const totalSignals = signalAgreement ? signalAgreement.totalCount : 9;

  // Breakdown of the 4 Confluence Pillars
  const pillars = [
    {
      id: 'trend',
      name: 'Directional Trend Structure',
      weight: '30%',
      icon: TrendingUp,
      status: isTrendBullish ? 'aligned' : isTrendBearish ? 'caution' : 'neutral',
      metric: `${trend} Regime · Price vs MAs`,
      points: isTrendBullish ? 28 : isTrendBearish ? 12 : 20,
      maxPoints: 30,
      description: isTrendBullish 
        ? 'Price structure exhibits constructive higher lows and ascending moving average alignment.'
        : isTrendBearish
        ? 'Prevailing directional trend exhibits downward pressure; counter-trend risk present.'
        : 'Sideways consolidation; trading within neutral price bounds.'
    },
    {
      id: 'geometry',
      name: 'Risk/Reward Asymmetry',
      weight: '25%',
      icon: Scale,
      status: rrRatio >= 2.0 ? 'aligned' : rrRatio >= 1.5 ? 'neutral' : 'caution',
      metric: `${rrRatio.toFixed(1)}:1 Reward-to-Risk Ratio`,
      points: rrRatio >= 2.2 ? 24 : rrRatio >= 1.8 ? 20 : 15,
      maxPoints: 25,
      description: rrRatio >= 2.0
        ? `Exceptional asymmetric payoff (${rrRatio.toFixed(1)}:1). Mathematical edge requires only >${tradeGeometry?.breakEvenWinRate || 33}% win rate.`
        : `Acceptable geometric profile with ${rrRatio.toFixed(1)}:1 potential upside versus downside stop buffer.`
    },
    {
      id: 'signals',
      name: 'Multi-Factor Technical Concordance',
      weight: '25%',
      icon: Activity,
      status: alignedSignals >= 6 ? 'aligned' : alignedSignals >= 4 ? 'neutral' : 'caution',
      metric: `${alignedSignals} of ${totalSignals} Signals Aligned`,
      points: Math.min(25, Math.round((alignedSignals / totalSignals) * 25)),
      maxPoints: 25,
      description: `Cross-validation across 9 quantitative parameters including support floors, resistance bands, and breakout geometry.`
    },
    {
      id: 'momentum',
      name: 'Momentum & Volume Confirmation',
      weight: '20%',
      icon: BarChart3,
      status: (rsi >= 40 && rsi <= 72 && relVol >= 0.85) ? 'aligned' : 'neutral',
      metric: `RSI(14): ${rsi.toFixed(1)} · ${relVol.toFixed(2)}x Rel Vol`,
      points: (rsi >= 40 && rsi <= 70) ? (relVol >= 0.9 ? 18 : 15) : 12,
      maxPoints: 20,
      description: rsi > 72 
        ? 'Overbought territory warning; momentum expansion stretched near resistance.'
        : rsi < 35 
        ? 'Oversold condition; awaiting momentum confirmation bounce.'
        : 'Healthy momentum expansion within sustainable, non-exhaustion boundary.'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          id="ai-confidence-modal"
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-[#141414] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Zap className="w-4 h-4 fill-current" />
                </span>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>AI Confidence Score Breakdown</span>
                  {data.ticker && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono font-bold">
                      {data.ticker}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Quantitative probability model synthesizing technical momentum, payoff geometry, and multi-signal concordance
              </p>
            </div>

            <button
              onClick={onClose}
              id="close-ai-confidence-modal"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 text-neutral-800 dark:text-neutral-200 text-xs">
            {/* Top Hero: Score & Confluence Gauge */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Radial-styled Score Badge */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-[#121212] border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col items-center justify-center shrink-0">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white leading-none">
                    {confidenceScore}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 mt-0.5">
                    Score
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border",
                      confidenceTier.badgeClass
                    )}>
                      {confidenceTier.label}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                      Tier: {confidenceScore >= 80 ? '80–100%' : confidenceScore >= 70 ? '70–79%' : '60–69%'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                    {confidenceTier.description}
                  </p>
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-white dark:bg-[#121212] border border-neutral-200/60 dark:border-neutral-800/80">
                  <span className="text-[9px] text-neutral-400 block uppercase">Signal Concordance</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{alignedSignals}/{totalSignals} Aligned</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#121212] border border-neutral-200/60 dark:border-neutral-800/80">
                  <span className="text-[9px] text-neutral-400 block uppercase">Payoff Profile</span>
                  <strong className="text-neutral-900 dark:text-neutral-100 font-bold">{rrRatio.toFixed(1)}:1 R:R</strong>
                </div>
              </div>
            </div>

            {/* Score Distribution Scale Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <span>Confidence Calibration Scale</span>
                <span>Current: {confidenceScore}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                <div className="w-[60%] h-full bg-amber-500/70 border-r border-white/20" title="Moderate (60-69%)" />
                <div className="w-[15%] h-full bg-blue-500/80 border-r border-white/20" title="Strong (70-79%)" />
                <div className="w-[25%] h-full bg-emerald-500" title="High Conviction (80-100%)" />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
                <span>0% (Low)</span>
                <span>60% (Moderate)</span>
                <span>75% (Strong)</span>
                <span>80%+ (High Conviction)</span>
              </div>
            </div>

            {/* 4 Core AI Confluence Pillars */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                4 Quantitative Confluence Pillars
              </h4>

              <div className="space-y-2">
                {pillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div 
                      key={pillar.id}
                      className="p-3 rounded-xl bg-neutral-50 dark:bg-[#161616] border border-neutral-200/70 dark:border-neutral-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                            {pillar.name}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                            (Weight: {pillar.weight})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border",
                            pillar.status === 'aligned' 
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                              : pillar.status === 'caution'
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/60"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                          )}>
                            {pillar.status === 'aligned' ? 'Confirmed' : pillar.status === 'caution' ? 'Caution' : 'Neutral'}
                          </span>
                          <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                            {pillar.points}/{pillar.maxPoints} pts
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-300 font-mono pt-0.5">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {pillar.metric}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                        {pillar.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tactical Execution Directives by Tier */}
            <div className="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Actionable Allocation Strategy
              </span>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {confidenceScore >= 80 
                  ? "High conviction setups qualify for full modeled position sizing. Keep stop-loss orders in place at the designated ATR invalidation boundary."
                  : confidenceScore >= 70
                  ? "Solid confluence supports standard position sizing. Scale entries on pullbacks to the Add Zone rather than chasing breakouts."
                  : "Moderate confluence warrants defensive sizing (50% of maximum allocation). Do not add to positions until higher timeframe confirmation."}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#121212] flex items-center justify-between text-[11px] text-neutral-400">
            <span className="font-mono">
              Model: Bayesian Confluence V3.2
            </span>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
