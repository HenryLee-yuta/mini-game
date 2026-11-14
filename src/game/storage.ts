import type { PersistentStats } from './types';

const STORAGE_KEY = 'maison_meringue_cake_stack_v1';

const DEFAULT_STATS: PersistentStats = {
  bestScore: 0,
  bestHeight: 0,
  bestCombo: 0,
  isMuted: false,
};

export function loadPersistentStats(): PersistentStats {
  if (typeof window === 'undefined') return { ...DEFAULT_STATS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<PersistentStats>;
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      bestHeight: typeof parsed.bestHeight === 'number' ? parsed.bestHeight : 0,
      bestCombo: typeof parsed.bestCombo === 'number' ? parsed.bestCombo : 0,
      isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : false,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function savePersistentStats(stats: PersistentStats): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}
