import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '../utils';
import { resolveTickerLogoUrl, getTickerTheme, getAuthoritativeCompanyName } from '../utils/tickerLogos';

export interface TickerLogoProps {
  ticker: string;
  logoUrl?: string;
  companyName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function TickerLogo({
  ticker,
  logoUrl,
  companyName,
  size = 'md',
  className,
}: TickerLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Authoritative company name fallback
  const effectiveCompanyName = companyName || getAuthoritativeCompanyName(ticker);

  // Resolved brand URL (prioritizing custom SVGs, domain overrides, and verified favicons)
  const resolvedUrl = useMemo(() => {
    return resolveTickerLogoUrl(ticker, logoUrl, effectiveCompanyName);
  }, [ticker, logoUrl, effectiveCompanyName]);

  // Reset state when inputs change
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [resolvedUrl, ticker]);

  // Format clean monogram symbol without exchange suffix (e.g., 'VUAG.L' -> 'VUAG', 'BRK.B' -> 'BRK')
  const cleanSymbol = useMemo(() => {
    if (!ticker) return '';
    return ticker.split('.')[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }, [ticker]);

  // Monogram display string (up to 4 characters to display full standard symbols cleanly)
  const monogram = useMemo(() => {
    if (!cleanSymbol) return '';
    if (cleanSymbol.length <= 4) return cleanSymbol;
    return cleanSymbol.slice(0, 4);
  }, [cleanSymbol]);

  // Deterministic luxury theme palette based on ticker string
  const theme = useMemo(() => {
    return getTickerTheme(cleanSymbol || ticker || 'STOCK');
  }, [cleanSymbol, ticker]);

  // Container dimensions
  const containerSizeClasses = {
    sm: 'w-8 h-8 min-w-8 min-h-8',
    md: 'w-11 h-11 min-w-11 min-h-11',
    lg: 'w-14 h-14 min-w-14 min-h-14',
    xl: 'w-16 h-16 min-w-16 min-h-16',
  }[size];

  // Dynamic typography sizing based on monogram length and badge size
  const fontClasses = useMemo(() => {
    const len = monogram.length;
    if (size === 'sm') {
      if (len <= 2) return 'text-[11px] font-black tracking-tight';
      if (len === 3) return 'text-[9.5px] font-black tracking-tight';
      return 'text-[8px] font-mono font-black tracking-tighter';
    }
    if (size === 'md') {
      if (len <= 2) return 'text-sm font-black tracking-tight';
      if (len === 3) return 'text-xs font-black tracking-tight';
      return 'text-[10px] font-mono font-black tracking-tight';
    }
    if (size === 'lg') {
      if (len <= 2) return 'text-base font-black tracking-tight';
      if (len === 3) return 'text-sm font-black tracking-tight';
      return 'text-xs font-mono font-black tracking-tight';
    }
    // xl
    if (len <= 2) return 'text-lg font-black tracking-tight';
    if (len === 3) return 'text-base font-black tracking-tight';
    return 'text-sm font-mono font-black tracking-tight';
  }, [monogram.length, size]);

  const showImage = Boolean(resolvedUrl && !hasError);

  return (
    <div
      className={cn(
        'relative rounded-full shrink-0 overflow-hidden select-none flex items-center justify-center shadow-xs transition-transform duration-150',
        containerSizeClasses,
        className
      )}
      title={effectiveCompanyName || ticker}
    >
      {/* 1. Generative Fallback Monogram (Rendered as base layer & fallback) */}
      <div
        className={cn(
          'absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br transition-opacity duration-200',
          theme.gradient
        )}
      >
        {/* Specular top sheen / highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none" />

        {/* Crisp inner ring */}
        <div className={cn('absolute inset-0 rounded-full ring-1 ring-inset', theme.ring)} />

        {/* Monogram or icon */}
        {monogram ? (
          <span
            className={cn(
              'relative z-10 leading-none uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]',
              theme.text,
              fontClasses
            )}
          >
            {monogram}
          </span>
        ) : (
          <TrendingUp
            className={cn(
              'relative z-10 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]',
              size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'
            )}
          />
        )}
      </div>

      {/* 2. Official Brand Logo Overlay (With smooth fade-in upon successful load) */}
      {showImage && (
        <img
          src={resolvedUrl}
          alt={ticker}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            'relative z-20 w-full h-full object-cover rounded-full bg-white dark:bg-zinc-900 transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          referrerPolicy="no-referrer"
          loading="eager"
        />
      )}
    </div>
  );
}
