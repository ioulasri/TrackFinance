import React, { createContext, useContext } from 'react';
import { authAPI } from './api';

export const CURRENCIES = {
  MAD: 'Moroccan Dirham', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
  CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CHF: 'Swiss Franc',
  JPY: 'Japanese Yen', CNY: 'Chinese Yuan', INR: 'Indian Rupee',
  AED: 'UAE Dirham', SAR: 'Saudi Riyal',
};
export type Currency = keyof typeof CURRENCIES;
export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'code' }).format(Number(amount) || 0);
}
const CurrencyContext = createContext({
  currency: 'MAD' as Currency,
  formatMoney: (amount: number) => formatMoney(amount, 'MAD'),
  saveCurrency: async (_currency: Currency) => {},
});
export function CurrencyProvider({ currency, onUpdate, children }: {
  currency: Currency; onUpdate: (data: any) => void; children: React.ReactNode;
}) {
  const saveCurrency = async (next: Currency) => {
    const response = await authAPI.updateProfile({ currency: next });
    onUpdate(response.data);
  };
  return <CurrencyContext.Provider value={{ currency, formatMoney: (amount) => formatMoney(amount, currency), saveCurrency }}>{children}</CurrencyContext.Provider>;
}
export const useCurrency = () => useContext(CurrencyContext);

/** Refresh visible account data after an assistant action or receipt save. */
export function useFinanceRefresh(refresh: () => void) {
  const latest = React.useRef(refresh);
  latest.current = refresh;
  React.useEffect(() => {
    const handle = () => latest.current();
    window.addEventListener('tf:data-updated', handle);
    return () => window.removeEventListener('tf:data-updated', handle);
  }, []);
}
