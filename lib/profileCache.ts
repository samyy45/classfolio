export interface UserProfile {
  full_name: string;
  role: string;
}

const CACHE_KEY = 'classfolio_profile';

export function getCachedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as UserProfile;
    }
  } catch (err) {
    console.error('Error reading profile cache:', err);
  }
  return null;
}

export function setCachedProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Error setting profile cache:', err);
  }
}

export function clearCachedProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.error('Error clearing profile cache:', err);
  }
}
