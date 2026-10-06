import React from 'react';
import { Target, ArrowUpRight, Pause, Crosshair, AlertTriangle, ShieldAlert } from 'lucide-react';
import { StateMachineRow } from '../utils/executionStateMachine';
import { CanonicalTradeGeometry } from '../utils/canonicalLevels';
import { cn, formatCurrency } from '../utils';

interface ExecutionStateMachineTableProps {
  rows: StateMachineRow[];
  currentPrice: number;
  currency: string;
  tradeGeometry?: CanonicalTradeGeometry;
  className?: string;
}

export const ExecutionStateMachineTable: React.FC<ExecutionStateMachineTableProps> = ({
  rows,
  currentPrice,
  currency,
  tradeGeometry,
  className,
}) => {
  const getLevelIcon = (id: StateMachineRow['id']) => {
    switch (id) {
      case 'TARGET_REACHED':
        return <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'BREAKOUT_CONFIRMATION':
        return <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'HOLD_WAIT':
        return <Pause className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />;
      case 'ACCUMULATION_ZONE':
        return <Crosshair className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'DEFENSIVE_REASSESS':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'RISK_INVALIDATED':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />;
      default:
        return null;
    }
  };

  const getLevelBadgeClass = (row: StateMachineRow) => {
    switch (row.tone) {
      case 'purple':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
      case 'blue':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      case 'danger':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700/80';
    }
  };

  const getToneBadge = (row: StateMachineRow) => {
    switch (row.tone) {
      case 'danger':
        return 'text-rose-600 dark:text-rose-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'blue':
        return 'text-blue-600 dark:text-blue-400';
      case 'purple':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-neutral-700 dark:text-neutral-300';
    }
  };

  const getActiveRowStyle = (row: StateMachineRow) => {
    switch (row.tone) {
      case 'success':
        return 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-2 border-emerald-500 font-semibold text-emerald-950 dark:text-emerald-100';
      case 'blue':
        return 'bg-blue-500/10 dark:bg-blue-500/15 border-l-2 border-blue-500 font-semibold text-blue-950 dark:text-blue-100';
      case 'danger':
        return 'bg-rose-500/10 dark:bg-rose-500/15 border-l-2 border-rose-500 font-semibold text-rose-950 dark:text-rose-100';
      case 'purple':
        return 'bg-purple-500/10 dark:bg-purple-500/15 border-l-2 border-purple-500 font-semibold text-purple-950 dark:text-purple-100';
      case 'warning':
      default:
        return 'bg-amber-500/10 dark:bg-amber-500/15 border-l-2 border-amber-500 font-semibold text-neutral-900 dark:text-neutral-100';
    }
  };

  const getActiveStatusBadge = (row: StateMachineRow) => {
    switch (row.tone) {
      case 'success':
        return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40';
      case 'blue':
        return 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/40';
      case 'danger':
        return 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40';
      case 'purple':
        return 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40';
      case 'warning':
      default:
        return 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40';
    }
  };

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-200/80 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/30">
              <th className="py-2 px-3 font-bold whitespace-nowrap">Level</th>
              <th className="py-2 px-3 font-bold whitespace-nowrap">Technical Role</th>
              <th className="py-2 px-3 font-bold whitespace-nowrap">Price Condition</th>
              <th className="py-2 px-3 font-bold whitespace-nowrap">Execution Action</th>
              <th className="py-2 px-3 font-bold whitespace-nowrap text-right">Active State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
            {rows.map((row) => {
              const cleanProvenance = row.provenance ? row.provenance.replace(/^Model\s*[·•-]\s*/i, '').trim() : '';

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    row.isCurrent
                      ? getActiveRowStyle(row)
                      : "hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 text-neutral-600 dark:text-neutral-400"
                  )}
                >
                  {/* Column 1: Level */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {getLevelIcon(row.id)}
                      <span className={cn(
                        "text-[11px] px-1.5 py-0.5 rounded-md border font-bold inline-flex items-center gap-1",
                        getLevelBadgeClass(row)
                      )}>
                        {row.levelLabel || row.id}
                      </span>
                    </div>
                  </td>

                  {/* Column 2: Technical Role (Resistance, Support, Stop-Loss, Target) */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    {cleanProvenance && (
                      <div className="text-[10px] font-mono text-neutral-700 dark:text-neutral-200 font-medium flex items-center gap-1.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          row.tone === 'danger' ? "bg-rose-500" :
                          row.tone === 'blue' ? "bg-blue-500" :
                          row.tone === 'purple' ? "bg-purple-500" :
                          row.tone === 'success' ? "bg-emerald-500" :
                          row.tone === 'warning' ? "bg-amber-500" :
                          "bg-neutral-400"
                        )} />
                        <span>{cleanProvenance}</span>
                      </div>
                    )}
                  </td>

                  {/* Column 3: Price Condition & Distance */}
                  <td className="py-2 px-3 whitespace-nowrap tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "font-bold text-xs",
                      row.isCurrent ? "text-neutral-950 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                    )}>
                      {row.priceCondition}
                    </span>
                    {row.distanceDisplay && (
                      <>
                        <span className="text-neutral-300 dark:text-neutral-600 font-bold select-none text-[10px]">·</span>
                        <span className={cn(
                          "text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded border",
                          row.tone === 'danger' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" :
                          row.tone === 'blue' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                          row.tone === 'purple' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" :
                          row.tone === 'success' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                          "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200/60 dark:border-neutral-700"
                        )}>
                          {row.distanceDisplay}
                        </span>
                      </>
                    )}
                  </div>
                </td>

                {/* Execution Action */}
                <td className="py-2 px-3 whitespace-nowrap font-sans">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-bold text-xs", getToneBadge(row))}>
                      {row.actionState}
                    </span>
                  </div>
                </td>

                {/* Active State Indicator */}
                <td className="py-2 px-3 whitespace-nowrap text-right">
                  {row.isCurrent ? (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight border",
                      getActiveStatusBadge(row)
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full animate-pulse",
                        row.tone === 'success' ? "bg-emerald-500" :
                        row.tone === 'blue' ? "bg-blue-500" :
                        row.tone === 'danger' ? "bg-rose-500" :
                        row.tone === 'purple' ? "bg-purple-500" : "bg-amber-500"
                      )} />
                      Current · {formatCurrency(currentPrice, currency)}
                    </span>
                  ) : (
                    <span className="text-neutral-300 dark:text-neutral-700 text-[11px] font-sans">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {/* Unified Payoff Ratio & Geometry Footer */}
      {tradeGeometry && (
        <div className="px-3 sm:px-3.5 py-2.5 bg-neutral-50/90 dark:bg-neutral-900/60 border-t border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10.5px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              Payoff Ratio <span className="text-neutral-400 dark:text-neutral-500 font-normal text-[9.5px]">(Target ÷ Stop)</span>:
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
            <span 
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs cursor-help"
              title={`${tradeGeometry.formulaDisplay.ratioFormula}\n\n${tradeGeometry.expectedValueExplanation}`}
            >
              <span>{tradeGeometry.multiplierFormatted}</span>
              <span className="text-[10px] opacity-75 font-normal">({tradeGeometry.ratioFormatted})</span>
            </span>

            <span className="text-[10.5px] text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{tradeGeometry.upsidePct.toFixed(1)}%</span>
              <span className="mx-1 text-neutral-300 dark:text-neutral-700">/</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">−{Math.abs(tradeGeometry.downsidePct).toFixed(1)}%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
