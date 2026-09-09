export interface PriceAlert {
  id: string;
  ticker: string;
  name: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW'; // Triggers when price >= targetPrice or price <= targetPrice
  initialPrice: number;
  currency: string;
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  notes?: string;
  alertType?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'ENTRY_ZONE' | 'CUSTOM';
}

const STORAGE_KEY = 'stockpulse_price_alerts';

export function getPriceAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || !raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load price alerts:', e);
    return [];
  }
}

export function savePriceAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>): PriceAlert {
  const alerts = getPriceAlerts();
  const newAlert: PriceAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    triggered: false
  };

  alerts.unshift(newAlert);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent('price_alerts_updated'));
  return newAlert;
}

export function deletePriceAlert(id: string): void {
  const alerts = getPriceAlerts().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent('price_alerts_updated'));
}

export function togglePriceAlertTriggered(id: string): void {
  const alerts = getPriceAlerts().map(a => {
    if (a.id === id) {
      return {
        ...a,
        triggered: !a.triggered,
        triggeredAt: !a.triggered ? new Date().toISOString() : undefined
      };
    }
    return a;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent('price_alerts_updated'));
}

export function checkTriggeredAlerts(currentPrices: Record<string, number>): PriceAlert[] {
  const alerts = getPriceAlerts();
  let updated = false;
  const triggeredNow: PriceAlert[] = [];

  const processed = alerts.map(alert => {
    if (alert.triggered) return alert;

    const currentPrice = currentPrices[alert.ticker.toUpperCase()];
    if (currentPrice === undefined || currentPrice <= 0) return alert;

    const isTriggered = 
      (alert.condition === 'ABOVE' && currentPrice >= alert.targetPrice) ||
      (alert.condition === 'BELOW' && currentPrice <= alert.targetPrice);

    if (isTriggered) {
      updated = true;
      const triggeredAlert = {
        ...alert,
        triggered: true,
        triggeredAt: new Date().toISOString()
      };
      triggeredNow.push(triggeredAlert);
      return triggeredAlert;
    }
    return alert;
  });

  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(processed));
    window.dispatchEvent(new CustomEvent('price_alerts_updated'));
  }

  return triggeredNow;
}
