import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '../utils';
import { resolveTickerLogoUrl } from '../utils/tickerLogos';

interface TickerLogoProps {
  ticker: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TickerLogo({
  ticker,
  logoUrl,
  size = 'md',
  className
}: TickerLogoProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedUrl = resolveTickerLogoUrl(ticker, logoUrl);

  useEffect(() => {
    setHasError(false);
  }, [resolvedUrl, ticker]);

  const cleanSymbol = (ticker || '').split('.')[0].toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-11 h-11 text-xs',
    lg: 'w-14 h-14 text-sm'
  }[size];

  return (
    <div
      className={cn(
        'rounded-full bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center shrink-0 overflow-hidden select-none',
        sizeClasses,
        className
      )}
    >
      {resolvedUrl && !hasError ? (
        <img
          src={resolvedUrl}
          alt={ticker}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      ) : (
        <span className="font-black tracking-tight uppercase text-black/80 dark:text-white/90">
          {cleanSymbol ? cleanSymbol.slice(0, 3) : <TrendingUp className="w-4 h-4 text-black/60 dark:text-white/60" />}
        </span>
      )}
    </div>
  );
}
