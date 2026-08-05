const STORAGE_KEY = "vn-stock-search-history";
const MAX_HISTORY = 10;

interface SearchHistoryItem {
  ticker: string;
  name: string;
  timestamp: number;
}

function getFromStorage(): SearchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchHistoryItem[];
  } catch {
    return [];
  }
}

function saveToStorage(items: SearchHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

export function addToHistory(ticker: string, name: string): void {
  const items = getFromStorage().filter(
    (item) => item.ticker.toUpperCase() !== ticker.toUpperCase()
  );

  items.unshift({
    ticker: ticker.toUpperCase(),
    name,
    timestamp: Date.now(),
  });

  saveToStorage(items.slice(0, MAX_HISTORY));
}

export function getHistory(): SearchHistoryItem[] {
  return getFromStorage();
}

export function getRecentHistory(count: number = 5): SearchHistoryItem[] {
  return getFromStorage().slice(0, count);
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function removeFromHistory(ticker: string): void {
  const items = getFromStorage().filter(
    (item) => item.ticker.toUpperCase() !== ticker.toUpperCase()
  );
  saveToStorage(items);
}

export type { SearchHistoryItem };
