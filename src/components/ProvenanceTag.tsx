import React from 'react';
import { EpistemicStatus, ProvenanceInfo } from '../utils/provenance';
import { cn } from '../utils';

interface ProvenanceTagProps {
  info: ProvenanceInfo;
  className?: string;
  showStatusBadge?: boolean;
  showDot?: boolean;
  size?: 'xs' | 'sm';
}

/**
 * Clean, unboxed provenance metadata display that visually and semantically
 * differentiates epistemic statuses (Market Data, Extended Hours, Analyst Consensus,
 * Model-Generated Thresholds, and Sentiment Heuristics).
 */
export const ProvenanceTag: React.FC<ProvenanceTagProps> = ({
  info,
  className,
  showStatusBadge = false,
  showDot = true,
  size = 'xs'
}) => {
  // Visual cues for epistemic status (colors, font style, and status text)
  const getEpistemicStyling = (status: EpistemicStatus) => {
    switch (status) {
      case 'market':
        return {
          textColor: 'text-neutral-500 dark:text-neutral-400',
          badgeColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 font-bold',
          dotColor: 'bg-emerald-500',
          abbr: 'MARKET',
          borderStyle: ''
        };
      case 'extended':
        return {
          textColor: 'text-indigo-600/90 dark:text-indigo-400/90',
          badgeColor: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/20 font-bold',
          dotColor: 'bg-indigo-500',
          abbr: 'EXTENDED',
          borderStyle: ''
        };
      case 'analyst':
        return {
          textColor: 'text-amber-700/90 dark:text-amber-400/90',
          badgeColor: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 font-bold',
          dotColor: 'bg-amber-500',
          abbr: 'ESTIMATE',
          borderStyle: 'border-b border-dashed border-amber-500/40'
        };
      case 'financials':
        return {
          textColor: 'text-neutral-500 dark:text-neutral-400',
          badgeColor: 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-bold',
          dotColor: 'bg-neutral-400 dark:bg-neutral-500',
          abbr: 'REPORTED',
          borderStyle: ''
        };
      case 'model':
        return {
          textColor: 'text-purple-600/90 dark:text-purple-400/90',
          badgeColor: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-500/20 font-mono font-bold',
          dotColor: 'bg-purple-500',
          abbr: 'MODEL',
          borderStyle: ''
        };
      case 'sentiment':
        return {
          textColor: 'text-teal-600/90 dark:text-teal-400/90',
          badgeColor: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-500/20 font-bold',
          dotColor: 'bg-teal-500',
          abbr: 'HEURISTIC',
          borderStyle: ''
        };
    }
  };

  const style = getEpistemicStyling(info.epistemicStatus);

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 leading-none transition-colors font-mono",
        size === 'xs' ? "text-[10px]" : "text-xs",
        style.textColor,
        className
      )}
      title={info.tooltip || `${info.statusLabel}: ${info.compositeText}`}
    >
      {showStatusBadge && (
        <span className={cn(
          "uppercase tracking-wider text-[8.5px] px-1.5 py-0.5 rounded shrink-0",
          style.badgeColor
        )}>
          {style.abbr}
        </span>
      )}

      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dotColor)} />
      )}

      <span className={cn("font-medium tracking-tight", style.borderStyle)}>
        {info.compositeText}
      </span>
    </div>
  );
};
