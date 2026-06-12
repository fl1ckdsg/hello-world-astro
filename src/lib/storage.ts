import type { Language } from './i18n';

export interface CharacterCustomization {
  skinColor: number;   // 0-5
  hairStyle: number;   // 0-4: short, mohawk, dreads, bald, afro
  bodyType: number;    // 0-2: slim, average, muscular
  tattoos: number;     // 0-3: none, arm, chest, full
  shortsColor: number; // 0-5
  glovesColor: number; // 0-5
}

export interface GameSettings {
  sound: boolean;
  vibration: boolean;
  controlLayout: 'right' | 'left'; // dpad on left, buttons on right (or swapped)
}

export interface UserData {
  userId: string;
  nickname: string;
  language: Language;
  character: CharacterCustomization;
  settings: GameSettings;
  setupComplete: boolean;
}

const DEFAULT_CHARACTER: CharacterCustomization = {
  skinColor: 0,
  hairStyle: 0,
  bodyType: 1,
  tattoos: 0,
  shortsColor: 0,
  glovesColor: 1,
};

const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
  vibration: true,
  controlLayout: 'right',
};

export function createDefaultUserData(userId: string): UserData {
  return {
    userId,
    nickname: '',
    language: 'RU',
    character: { ...DEFAULT_CHARACTER },
    settings: { ...DEFAULT_SETTINGS },
    setupComplete: false,
  };
}

const STORAGE_KEY = 'boxfight_user';

export function loadUserData(): UserData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

export function saveUserData(data: UserData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export async function syncUserData(data: UserData): Promise<UserData> {
  try {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
    const response = await fetch(`${base}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      const saved = await response.json() as UserData;
      saveUserData(saved);
      return saved;
    }
  } catch {
    // Ignore sync errors - use local data
  }
  return data;
}

export async function loadUserDataFromServer(userId: string): Promise<UserData | null> {
  try {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
    const response = await fetch(`${base}/api/user?userId=${encodeURIComponent(userId)}`);
    if (response.ok) {
      return await response.json() as UserData;
    }
  } catch {
    // Ignore
  }
  return null;
}
