declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
            language_code?: string;
          };
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        colorScheme?: string;
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
}

export function isInTelegram(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
}

export function getTelegramUser(): TelegramUser | null {
  if (!isInTelegram()) return null;
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url,
    languageCode: user.language_code,
  };
}

export function initTelegram(): void {
  if (typeof window === 'undefined') return;
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand?.();
  }
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium'): void {
  try {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
    } else if (navigator.vibrate) {
      const duration = type === 'light' ? 30 : type === 'medium' ? 50 : 80;
      navigator.vibrate(duration);
    }
  } catch {
    // Ignore errors
  }
}
