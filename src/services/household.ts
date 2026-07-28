const HOUSEHOLD_KEY = 'gx_household';

export const getHouseholdCode = (): string | null => {
  return localStorage.getItem(HOUSEHOLD_KEY);
};

export const setHouseholdCode = (code: string): void => {
  localStorage.setItem(HOUSEHOLD_KEY, code);
};

export const clearHouseholdCode = (): void => {
  localStorage.removeItem(HOUSEHOLD_KEY);
};

export const generateHouseholdCode = (): string => {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
};
