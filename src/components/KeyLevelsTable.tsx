import React from 'react';
import { Layers, Crosshair, ArrowUpRight, TrendingUp, ShieldAlert } from 'lucide-react';
import { CanonicalLevelsModel, CanonicalLevelRow } from '../utils/canonicalLevels';
import { cn } from '../utils';

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

  const displayRows = levels.rows.filter(row => row.id !== 'current');

  const tableContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-neutral-200/80 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            <th className={cn(compact ? "py-1.5 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "font-bold")}>Level</th>
            <th className={cn(compact ? "py-1.5 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "font-bold")}>Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {displayRows.map((row) => (
            <tr 
              key={row.id}
              className="hover:bg-neutral-50/50 dark:hover:bg-white/[0.01] transition-colors"
            >
              {/* Level Column */}
              <td className={cn(compact ? "py-1.5 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "whitespace-nowrap")}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="shrink-0">{getLevelIcon(row.id)}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1",
                    getLevelBadgeClass(row.id)
                  )}>
                    {row.level}
                  </span>
                </div>
              </td>

              {/* Price Column */}
              <td className={cn(compact ? "py-1.5 px-2.5 sm:px-3" : "py-2.5 px-3 sm:px-4", "whitespace-nowrap font-mono tabular-nums")}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={cn("text-xs sm:text-sm tracking-tight", getPriceClass(row.id))}>
                    {row.priceDisplay}
                  </span>
                  {row.percentage !== undefined && (
                    <span className={cn(
                      "text-[10px] font-bold font-mono px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800",
                      row.id === 'breakout'
                        ? "text-blue-600 dark:text-blue-400"
                        : row.id === 'risk'
                        ? "text-rose-600 dark:text-rose-400"
                        : row.percentage >= 0 
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}>
                      {row.percentage >= 0 ? `+${row.percentage.toFixed(1)}%` : `${row.percentage.toFixed(1)}%`}
                    </span>
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
        <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
          Canonical Reference
        </span>
      </div>
      {tableContent}
    </div>
  );
};
