const STORAGE_KEY = 'trackfinance_custom_categories';

export function getCustomCategories(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addCustomCategory(category: string): void {
  const existing = getCustomCategories();
  if (!existing.includes(category)) {
    existing.push(category);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}
