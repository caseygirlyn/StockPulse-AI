import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellRing, 
  X, 
  Trash2, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle 
} from 'lucide-react';
import { 
  getPriceAlerts, 
  deletePriceAlert, 
  togglePriceAlertTriggered, 
  type PriceAlert 
} from '../services/alertService';
import { getLocalPortfolio } from '../services/portfolioService';
import { cn, formatCurrency } from '../utils';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PriceAlertsModal({ isOpen, onClose }: PriceAlertsModalProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAlerts = () => {
    setAlerts(getPriceAlerts());
  };

  useEffect(() => {
    loadAlerts();
    const handleUpdate = () => loadAlerts();
    window.addEventListener('price_alerts_updated', handleUpdate);
    return () => window.removeEventListener('price_alerts_updated', handleUpdate);
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeAlertsCount = alerts.filter(a => !a.triggered).length;
  const triggeredAlertsCount = alerts.filter(a => a.triggered).length;

  // Attempt to find latest live prices from local portfolio if available
  const localPortfolio = getLocalPortfolio();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative max-h-[85vh] flex flex-col my-auto"
          >
            {/* Modal Toast */}
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 z-10"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{toastMessage}</span>
              </motion.div>
            )}

            {/* Modal Header */}
            <div className="flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-black dark:text-white">
                    Price Alerts Center
                  </h3>
                </div>
                <p className="text-xs font-medium text-black/60 dark:text-white/60 mt-1">
                  Manage active target price notifications and review triggered milestone alerts across your watchlist and portfolio.
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alerts List Body */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {alerts.length === 0 ? (
                <div className="p-10 text-center space-y-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/5 dark:border-white/5">
                  <Bell className="w-8 h-8 text-black/20 dark:text-white/20 mx-auto" />
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">
                    No price alerts configured yet
                  </p>
                  <p className="text-[11px] text-black/40 dark:text-white/40 max-w-xs mx-auto">
                    Click the bell icon next to any stock in your Portfolio or Market Watchlist to configure custom target price notifications.
                  </p>
                </div>
              ) : (
                alerts.map((al) => {
                  const pos = localPortfolio.find(p => p.ticker.toUpperCase() === al.ticker.toUpperCase());
                  const currentPrice = pos?.currentPrice || pos?.lastAnalyzedPrice || al.initialPrice;
                  const distance = currentPrice > 0 ? ((al.targetPrice - currentPrice) / currentPrice) * 100 : 0;

                  return (
                    <div
                      key={al.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                        al.triggered
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-black dark:text-white">
                            {al.ticker}
                          </span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60">
                            {al.condition === 'ABOVE' ? 'Rise ≥' : 'Drop ≤'} {formatCurrency(al.targetPrice, al.currency)}
                          </span>
                          {al.triggered ? (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Triggered
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-medium text-black/60 dark:text-white/60">
                          Current: <span className="font-mono font-bold text-black dark:text-white">{formatCurrency(currentPrice, al.currency)}</span>
                          {' • '}
                          Distance: <span className="font-mono font-bold">{distance >= 0 ? `+${distance.toFixed(1)}%` : `${distance.toFixed(1)}%`}</span>
                          {al.notes && ` • ${al.notes}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            togglePriceAlertTriggered(al.id);
                            showToast(al.triggered ? `Alert for ${al.ticker} re-armed` : `Alert for ${al.ticker} marked triggered`);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[10px] font-black uppercase tracking-wider text-black dark:text-white transition-all cursor-pointer"
                        >
                          {al.triggered ? 'Re-Arm' : 'Mark Triggered'}
                        </button>
                        
                        <button
                          onClick={() => {
                            deletePriceAlert(al.id);
                            showToast(`Alert for ${al.ticker} deleted`);
                          }}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white transition-all cursor-pointer"
                          title="Delete Alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-black/50 dark:text-white/50">
                {alerts.length} Total Alerts ({activeAlertsCount} Active, {triggeredAlertsCount} Triggered)
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-black transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
