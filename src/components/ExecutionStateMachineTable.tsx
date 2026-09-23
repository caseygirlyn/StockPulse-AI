import React from 'react';
import { StateMachineRow } from '../utils/executionStateMachine';
import { cn, formatCurrency } from '../utils';

interface ExecutionStateMachineTableProps {
  rows: StateMachineRow[];
  currentPrice: number;
  currency: string;
  className?: string;
}

export const ExecutionStateMachineTable: React.FC<ExecutionStateMachineTableProps> = ({
  rows,
  currentPrice,
  currency,
  className,
}) => {
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
        return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 dot-emerald-500';
      case 'blue':
        return 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/40 dot-blue-500';
      case 'danger':
        return 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 dot-rose-500';
      case 'purple':
        return 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40 dot-purple-500';
      case 'warning':
      default:
        return 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 dot-amber-500';
    }
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-neutral-200/80 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/30">
            <th className="py-1.5 px-3 font-bold whitespace-nowrap">Price condition</th>
            <th className="py-1.5 px-3 font-bold whitespace-nowrap">Action state</th>
            <th className="py-1.5 px-3 font-bold whitespace-nowrap text-right">Execution Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "transition-colors",
                row.isCurrent
                  ? getActiveRowStyle(row)
                  : "hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 text-neutral-600 dark:text-neutral-400"
              )}
            >
              {/* Price Condition */}
              <td className="py-1.5 px-3 whitespace-nowrap tabular-nums">
                <span className={cn(
                  "font-bold text-xs",
                  row.isCurrent ? "text-neutral-950 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                )}>
                  {row.priceCondition}
                </span>
              </td>

              {/* Action State */}
              <td className="py-1.5 px-3 whitespace-nowrap font-sans">
                <div className="flex items-center gap-1.5">
                  <span className={cn("font-bold text-xs", getToneBadge(row))}>
                    {row.actionState}
                  </span>
                </div>
              </td>

              {/* Status Indicator */}
              <td className="py-1.5 px-3 whitespace-nowrap text-right">
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
          ))}
        </tbody>
      </table>
    </div>
  );
};
