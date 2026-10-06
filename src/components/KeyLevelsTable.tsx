import React from 'react';
import { Layers, Crosshair, ArrowUpRight, TrendingUp, ShieldAlert } from 'lucide-react';
import { CanonicalLevelsModel, CanonicalLevelRow } from '../utils/canonicalLevels';
import { cn, formatCurrency } from '../utils';

interface KeyLevelsTableProps {
  levels: CanonicalLevelsModel;
  className?: string;
  showCardWrapper?: boolean;
  compact?: boolean;
}

export const KeyLevelsTable: React.FC<KeyLevelsTableProps> = ({
  levels,
  className,
  showCardWrapper = true,
  compact = true,
}) => {
  const getLevelIcon = (id: CanonicalLevelRow['id']) => {
    switch (id) {
      case 'add_zone':
        return <Crosshair className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'breakout':
        return <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'target':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'risk':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      default:
        return null;
    }
  };

  const getLevelBadgeClass = (_id: CanonicalLevelRow['id']) => {
    return 'bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700/80 font-medium';
  };

  const getPriceClass = (id: CanonicalLevelRow['id']) => {
    switch (id) {
      case 'add_zone':
        return 'text-emerald-600 dark:text-emerald-400 font-bold';
      case 'breakout':
        return 'text-blue-600 dark:text-blue-400 font-bold';
      case 'target':
        return 'text-emerald-600 dark:text-emerald-400 font-bold';
      case 'risk':
        return 'text-rose-600 dark:text-rose-400 font-bold';
      default:
        return 'text-neutral-900 dark:text-neutral-100 font-bold';
    }
  };

  const getLevelProvenance = (id: CanonicalLevelRow['id']) => {
    switch (id) {
      case 'add_zone':
        return 'Support Floor (Accumulation)';
      case 'breakout':
        return 'Resistance Ceiling';
      case 'target':
        return 'Profit Target (2.5R)';
      case 'risk':
        return 'Stop-Loss (14D ATR)';
      default:
        return 'Technical Level';
    }
  };

  const displayRows = levels.rows.filter(row => row.id !== 'current');

  const tableContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-neutral-200/80 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            <th className={cn(compact ? "py-1.5 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "font-bold")}>Level & Technical Role</th>
            <th className={cn(compact ? "py-1.5 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "font-bold text-right")}>Target Threshold</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {displayRows.map((row) => (
            <tr 
              key={row.id}
              className="hover:bg-neutral-50/50 dark:hover:bg-white/[0.01] transition-colors"
            >
              {/* Level & Technical Role Column */}
              <td className={cn(compact ? "py-2 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "whitespace-nowrap")}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="shrink-0">{getLevelIcon(row.id)}</span>
                  <div className="min-w-0">
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1",
                      getLevelBadgeClass(row.id)
                    )}>
                      {row.level}
                    </span>
                    <div className="text-[9px] font-mono text-neutral-600 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        row.id === 'risk' ? "bg-rose-500" :
                        row.id === 'breakout' ? "bg-blue-500" :
                        row.id === 'target' ? "bg-purple-500" :
                        row.id === 'add_zone' ? "bg-emerald-500" :
                        "bg-neutral-400"
                      )} />
                      <span>{getLevelProvenance(row.id)}</span>
                    </div>
                  </div>
                </div>
              </td>

              {/* Price & Contextual Distance Column */}
              <td className={cn(compact ? "py-2 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "whitespace-nowrap font-mono tabular-nums text-right")}>
                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                  <span className={cn("text-xs sm:text-sm tracking-tight font-bold", getPriceClass(row.id))}>
                    {row.priceDisplay}
                  </span>
                  {row.distanceDisplay && (
                    <>
                      <span className="text-neutral-300 dark:text-neutral-600 font-bold select-none">·</span>
                      <span 
                        className={cn(
                          "text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded cursor-help transition-colors",
                          row.id === 'breakout'
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : row.id === 'risk'
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : row.id === 'target'
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700"
                        )}
                        title={
                          row.id === 'risk' && levels.tradeGeometry
                            ? levels.tradeGeometry.formulaDisplay.riskFormula
                            : row.id === 'target' && levels.tradeGeometry
                            ? levels.tradeGeometry.formulaDisplay.rewardFormula
                            : row.id === 'breakout'
                            ? `Breakout trigger: ${row.priceDisplay} (${row.distanceDisplay} from ${formatCurrency(levels.currentPrice, levels.currency)})`
                            : undefined
                        }
                      >
                        {row.distanceDisplay}
                      </span>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!showCardWrapper) {
    return <div className={className}>{tableContent}</div>;
  }

  return (
    <div className={cn(
      "bg-white dark:bg-[#121212] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs",
      className
    )}>
      <div className="p-3.5 sm:p-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            Key levels
          </h3>
        </div>
      </div>
      {tableContent}
      {levels.tradeGeometry && (
        <div className="px-3 sm:px-3.5 py-2.5 bg-neutral-50/90 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10.5px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              Payoff Ratio <span className="text-neutral-400 dark:text-neutral-500 font-normal text-[9.5px]">(Target ÷ Stop)</span>:
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
            <span 
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs cursor-help"
              title={`${levels.tradeGeometry.formulaDisplay.ratioFormula}\n\n${levels.tradeGeometry.expectedValueExplanation}`}
            >
              <span>{levels.tradeGeometry.multiplierFormatted}</span>
              <span className="text-[10px] opacity-75 font-normal">({levels.tradeGeometry.ratioFormatted})</span>
            </span>
            <span className="text-[10.5px] text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{levels.tradeGeometry.upsidePct.toFixed(1)}%</span>
              <span className="mx-1 text-neutral-300 dark:text-neutral-700">/</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">−{Math.abs(levels.tradeGeometry.downsidePct).toFixed(1)}%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
