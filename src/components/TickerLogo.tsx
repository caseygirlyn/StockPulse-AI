import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '../utils';
import { getTickerLogoCandidates, getAuthoritativeCompanyName } from '../utils/tickerLogos';

export interface TickerLogoProps {
  ticker: string;
  logoUrl?: string;
  companyName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  lazy?: boolean;
}

export default function TickerLogo({
  ticker,
  logoUrl,
  companyName,
  size = 'md',
  className,
  lazy = true,
}: TickerLogoProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Authoritative company name fallback
  const effectiveCompanyName = companyName || getAuthoritativeCompanyName(ticker);

  // Ordered candidate URLs (custom SVG -> Google Favicon -> Unavatar)
  const candidates = useMemo(() => {
    return getTickerLogoCandidates(ticker, logoUrl, effectiveCompanyName);
  }, [ticker, logoUrl, effectiveCompanyName]);

  const currentUrl = candidates[candidateIndex] || null;

  // Reset state when inputs change
  useEffect(() => {
    setCandidateIndex(0);
    setHasError(false);
    setIsLoaded(false);
  }, [ticker, candidates]);

  const handleImageError = () => {
    if (candidateIndex < candidates.length - 1) {
      // Try next fallback URL in the candidate chain
      setCandidateIndex(prev => prev + 1);
      setIsLoaded(false);
    } else {
      // All candidates exhausted, show generic black-and-white fallback
      setHasError(true);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Reject pixelated generic globes (Google/services return 16x16 generic globe icons on missing favicons)
    if (img.naturalWidth <= 20 || img.naturalHeight <= 20) {
      handleImageError();
      return;
    }
    setIsLoaded(true);
  };

  // Handle cached image race condition: if browser already cached the image,
  // the onLoad event might not fire after mount. Also reject pixelated globes.
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 20 && imgRef.current.naturalHeight > 20) {
        setIsLoaded(true);
      } else if (imgRef.current.naturalWidth > 0) {
        handleImageError();
      }
    }
  }, [currentUrl]);

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

  const showImage = Boolean(currentUrl && !hasError);

  return (
    <div
      className={cn(
        'relative rounded-full shrink-0 overflow-hidden select-none flex items-center justify-center transition-transform duration-150',
        containerSizeClasses,
        className
      )}
      title={effectiveCompanyName || ticker}
    >
      {/* 1. Generic High-Contrast Black & White Fallback Monogram */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center bg-black text-white dark:bg-white dark:text-black transition-opacity duration-200"
      >
        {monogram ? (
          <span
            className={cn(
              'relative z-10 leading-none uppercase select-none font-black',
              fontClasses
            )}
          >
            {monogram}
          </span>
        ) : (
          <TrendingUp
            className={cn(
              'relative z-10',
              size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'
            )}
          />
        )}
      </div>

      {/* 2. Solid White Background Layer behind the logo (prevents fallback monogram from bleeding through transparent logos) */}
      {showImage && currentUrl && (
        <div
          className={cn(
            'absolute inset-0 z-20 w-full h-full rounded-full bg-white transition-opacity duration-200 pointer-events-none',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* 3. Official Brand Logo Overlay (With smooth fade-in and multi-source fallback) */}
      {showImage && currentUrl && (
        <img
          ref={imgRef}
          src={currentUrl}
          alt={ticker}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            'relative z-30 w-full h-full object-cover rounded-full bg-white transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
