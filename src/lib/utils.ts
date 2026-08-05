import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx.
 * Resolves conflicting Tailwind classes using twMerge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a price value as Vietnamese Dong (VND).
 * e.g. 25500 -> "25,500 \u20AB"
 */
export function formatPrice(price: number): string {
  if (price == null || isNaN(price)) return '---';
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Math.round(price)) + ' \u20AB'
  );
}

/**
 * Format volume with K/M/B suffixes.
 * e.g. 1500 -> "1.5K", 2500000 -> "2.5M", 3000000000 -> "3.0B"
 */
export function formatVolume(vol: number): string {
  if (vol == null || isNaN(vol)) return '---';
  const abs = Math.abs(vol);
  const sign = vol < 0 ? '-' : '';
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
  return sign + abs.toString();
}

/**
 * Format a percentage value with sign and %.
 * e.g. 2.35 -> "+2.35%", -1.5 -> "-1.50%"
 */
export function formatPercent(pct: number): string {
  if (pct == null || isNaN(pct)) return '---';
  const sign = pct > 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}

/**
 * Format a Unix timestamp (seconds or ms) to a locale date string.
 * Auto-detects seconds vs milliseconds.
 */
export function formatDate(timestamp: number): string {
  if (!timestamp) return '---';
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

/**
 * Generic debounce utility.
 * Returns a debounced version of the given function.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * Generic throttle utility.
 * Returns a throttled version of the given function that
 * fires at most once per `limit` ms.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = limit - (now - lastCall);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Return a Tailwind text-color class based on price change.
 * Green for positive, red for negative, gray for zero.
 */
export function colorForChange(change: number): string {
  if (change > 0) return 'text-green-500';
  if (change < 0) return 'text-red-500';
  return 'text-gray-500';
}

/**
 * Format a number with Vietnamese locale formatting.
 * e.g. 1500000 -> "1,500,000"
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (value == null || isNaN(value)) return '---';
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Promise-based sleep utility.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
