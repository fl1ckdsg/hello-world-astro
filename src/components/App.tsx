import React, { useEffect, useState } from 'react';
import {
  loadUserData,
  saveUserData,
  syncUserData,
  loadUserDataFromServer,
  createDefaultUserData,
  type UserData,
} from '../lib/storage';
import { getTelegramUser, initTelegram } from '../lib/telegram';
import type { Language } from '../lib/i18n';

import LanguageScreen from './screens/LanguageScreen';
import NicknameScreen from './screens/NicknameScreen';
import MainMenu from './screens/MainMenu';
import GameScreen from './screens/GameScreen';
import ShopScreen from './screens/ShopScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';

type Screen = 'loading' | 'language' | 'nickname' | 'menu' | 'game' | 'shop' | 'profile' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    initTelegram();

    async function init() {
      // Determine user ID from Telegram or fallback
      const tgUser = getTelegramUser();
      const userId = tgUser ? `tg_${tgUser.id}` : `local_${Math.random().toString(36).slice(2)}`;

      // Try loading from localStorage first
      let data = loadUserData();

      // If we have a Telegram user, try server sync
      if (tgUser && data?.userId !== userId) {
        const serverData = await loadUserDataFromServer(String(tgUser.id));
        if (serverData) {
          data = serverData;
          saveUserData(data);
        }
      }

      if (!data) {
        data = createDefaultUserData(userId);
        // Pre-fill from Telegram if available
        if (tgUser) {
          data.nickname = tgUser.username || tgUser.firstName || '';
          if (tgUser.languageCode === 'ru') data.language = 'RU';
          else if (tgUser.languageCode === 'uk') data.language = 'UK';
          else if (tgUser.languageCode === 'kk') data.language = 'KZ';
          else data.language = 'EN';
        }
      }

      setUserData(data);

      if (!data.setupComplete || !data.language) {
        setScreen('language');
      } else if (!data.nickname || data.nickname.length < 2) {
        setScreen('nickname');
      } else {
        setScreen('menu');
      }
    }

    init();
  }, []);

  const updateAndSync = async (updated: UserData) => {
    setUserData(updated);
    saveUserData(updated);
    await syncUserData(updated);
  };

  const handleLanguageSelect = async (lang: Language) => {
    if (!userData) return;
    const updated = { ...userData, language: lang };
    setUserData(updated);
    saveUserData(updated);
    setScreen('nickname');
  };

  const handleNicknameConfirm = async (nickname: string) => {
    if (!userData) return;
    const updated = { ...userData, nickname, setupComplete: true };
    await updateAndSync(updated);
    setScreen('menu');
  };

  const handleProfileSave = async (updated: UserData) => {
    await updateAndSync(updated);
  };

  const handleSettingsUpdate = async (updated: UserData) => {
    await updateAndSync(updated);
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (screen === 'loading' || !userData) {
    return (
      <div className="screen">
        <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>🥊</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const lang = userData.language as Language;

  return (
    <>
      {screen === 'language' && (
        <LanguageScreen onSelect={handleLanguageSelect} />
      )}
      {screen === 'nickname' && (
        <NicknameScreen lang={lang} onConfirm={handleNicknameConfirm} />
      )}
      {screen === 'menu' && (
        <MainMenu
          userData={userData}
          onPlay={() => setScreen('game')}
          onShop={() => setScreen('shop')}
          onProfile={() => setScreen('profile')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          lang={lang}
          nickname={userData.nickname}
          character={userData.character}
          settings={userData.settings}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'shop' && (
        <ShopScreen lang={lang} onBack={() => setScreen('menu')} />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          userData={userData}
          onSave={handleProfileSave}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          userData={userData}
          onUpdate={handleSettingsUpdate}
          onBack={() => setScreen('menu')}
          onReset={handleReset}
        />
      )}
    </>
  );
}
