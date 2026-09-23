import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck, Activity } from 'lucide-react';
import { SignalAgreementModel } from '../utils/signalAgreement';
import { cn } from '../utils';

interface SignalAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: SignalAgreementModel;
  ticker?: string;
}

export const SignalAgreementModal: React.FC<SignalAgreementModalProps> = ({
  isOpen,
  onClose,
  agreement,
  ticker,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          id="signal-agreement-modal"
          className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-white dark:bg-[#141414] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </span>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>Signal Agreement Breakdown</span>
                  {ticker && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono font-normal">
                      {ticker}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {agreement.alignedCount} of {agreement.totalCount} monitored technical signals currently align with the setup
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="font-mono text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  {agreement.score}<span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">/100</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Alignment Score
                </div>
              </div>

              <button
                onClick={onClose}
                id="close-signal-agreement-modal"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-2"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            {/* Methodology & Definition Box */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-neutral-800 dark:text-neutral-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Definition: Multi-Factor Concordance Index</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                <strong>Signal Agreement (82/100) is NOT a win probability</strong> or statistical guarantee that the stock price will rise. It measures how many independent technical parameters (trend, moving averages, RSI, relative volume, support, and risk-reward geometry) currently point in the same direction without conflict.
              </p>
            </div>

            {/* Signal List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center justify-between px-1">
                <span>9 Monitored Technical Criteria</span>
                <span>{agreement.alignedCount}/{agreement.totalCount} Aligned</span>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden bg-neutral-50/50 dark:bg-neutral-900/30">
                {agreement.signals.map((sig) => (
                  <div 
                    key={sig.id}
                    className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white dark:hover:bg-neutral-900/80 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {sig.isAligned ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">
                            {sig.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                            {sig.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                          {sig.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 pl-6 sm:pl-0">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold",
                        sig.isAligned 
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      )}>
                        {sig.measuredValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
              <span>Independent quantitative rule validation</span>
            </div>
            <button
              onClick={onClose}
              id="confirm-close-signal-agreement"
              className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-semibold text-xs transition-colors self-end sm:self-auto"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
