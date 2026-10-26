/**
 * Calculates calendar days between today and the target earnings date,
 * ensuring timing pills, horizons, and metrics reflect the actual time
 * until the next catalyst.
 */
export interface CalculatedEarningsTiming {
  daysUntil: number;
  pillText: string;
  displayDate: string;
  isPast: boolean;
}

export function computeEarningsTiming(
  earningsDateStr?: string, 
  defaultDaysFallback?: number
): CalculatedEarningsTiming {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (!earningsDateStr || typeof earningsDateStr !== 'string') {
    const days = defaultDaysFallback ?? 30;
    const target = new Date(todayMidnight + days * 86400000);
    const formatted = `${months[target.getMonth()]} ${target.getDate()}, ${target.getFullYear()}`;
    return {
      daysUntil: days,
      pillText: days === 0 ? 'Reporting Today' : days === 1 ? 'In 1 Day' : `In ${days} Days`,
      displayDate: formatted,
      isPast: false
    };
  }

  let parsed = new Date(earningsDateStr);
  if (isNaN(parsed.getTime())) {
    // If date string contains extra prefixes like 'Q3 · Oct 28, 2026'
    const cleaned = earningsDateStr.replace(/^[^·]*·\s*/, '').trim();
    parsed = new Date(cleaned);
  }

  if (isNaN(parsed.getTime())) {
    const days = defaultDaysFallback ?? 30;
    return {
      daysUntil: days,
      pillText: days === 0 ? 'Reporting Today' : days === 1 ? 'In 1 Day' : `In ${days} Days`,
      displayDate: earningsDateStr,
      isPast: false
    };
  }

  let targetMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  let diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  // If the earnings date was more than 7 days in the past, roll forward quarterly (+91 days)
  // so the catalyst reflects the upcoming NEXT earnings date
  if (diffDays < -7) {
    while (diffDays < 0) {
      parsed = new Date(parsed.getTime() + 91 * 86400000);
      targetMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
      diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
    }
  }

  const formattedDate = `${months[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;

  if (diffDays === 0) {
    return { daysUntil: 0, pillText: 'Reporting Today', displayDate: formattedDate, isPast: false };
  } else if (diffDays === 1) {
    return { daysUntil: 1, pillText: 'In 1 Day', displayDate: formattedDate, isPast: false };
  } else if (diffDays > 1) {
    return { daysUntil: diffDays, pillText: `In ${diffDays} Days`, displayDate: formattedDate, isPast: false };
  } else if (diffDays === -1) {
    return { daysUntil: -1, pillText: 'Reported Yesterday', displayDate: formattedDate, isPast: true };
  } else {
    return { daysUntil: diffDays, pillText: `Reported ${Math.abs(diffDays)}d Ago`, displayDate: formattedDate, isPast: true };
  }
}
