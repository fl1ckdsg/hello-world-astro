import React, { useState } from 'react';
import { t } from '../../lib/i18n';
import type { Language } from '../../lib/i18n';
import { LANGUAGES } from '../../lib/i18n';
import type { UserData } from '../../lib/storage';

interface Props {
  userData: UserData;
  onUpdate: (data: UserData) => void;
  onBack: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ userData, onUpdate, onBack, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const lang = userData.language as Language;

  const update = (patch: Partial<UserData['settings']>) => {
    onUpdate({
      ...userData,
      settings: { ...userData.settings, ...patch },
    });
  };

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? '#8B4513' : '#2a1200',
    color: active ? '#FFD700' : '#664422',
    border: `2px solid ${active ? '#FFD700' : '#553311'}`,
    fontFamily: 'Courier New, monospace',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    minWidth: '70px',
    textAlign: 'center',
  });

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #3d1a00',
    gap: '10px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#FFD700',
    letterSpacing: '2px',
    flex: 1,
  };

  return (
    <div className="screen" style={{ padding: '16px', justifyContent: 'flex-start', overflowY: 'auto', paddingTop: '24px' }}>
      <div style={{
        fontSize: '22px',
        color: '#FFD700',
        letterSpacing: '3px',
        marginBottom: '24px',
        textShadow: '2px 2px 0 #8B4513',
      }}>
        ⚙️ {t('settings', lang)}
      </div>

      <div style={{ width: '100%', maxWidth: '340px' }}>
        {/* Language */}
        <div style={rowStyle}>
          <span style={labelStyle}>{t('language', lang)}</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {LANGUAGES.map((l) => (
              <button
                key={l}
                style={toggleBtnStyle(userData.language === l)}
                onClick={() => onUpdate({ ...userData, language: l })}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div style={rowStyle}>
          <span style={labelStyle}>{t('sound', lang)}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={toggleBtnStyle(userData.settings.sound)} onClick={() => update({ sound: true })}>
              {t('on', lang)}
            </button>
            <button style={toggleBtnStyle(!userData.settings.sound)} onClick={() => update({ sound: false })}>
              {t('off', lang)}
            </button>
          </div>
        </div>

        {/* Vibration */}
        <div style={rowStyle}>
          <span style={labelStyle}>{t('vibration', lang)}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={toggleBtnStyle(userData.settings.vibration)} onClick={() => update({ vibration: true })}>
              {t('on', lang)}
            </button>
            <button style={toggleBtnStyle(!userData.settings.vibration)} onClick={() => update({ vibration: false })}>
              {t('off', lang)}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div style={rowStyle}>
          <span style={labelStyle}>{t('controls', lang)}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              style={toggleBtnStyle(userData.settings.controlLayout === 'left')}
              onClick={() => update({ controlLayout: 'left' })}
            >
              {t('left_hand', lang)}
            </button>
            <button
              style={toggleBtnStyle(userData.settings.controlLayout === 'right')}
              onClick={() => update({ controlLayout: 'right' })}
            >
              {t('right_hand', lang)}
            </button>
          </div>
        </div>

        {/* Reset */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          {confirmReset ? (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="pixel-btn"
                style={{ background: '#CC2200', maxWidth: '140px' }}
                onClick={() => { setConfirmReset(false); onReset(); }}
              >
                {t('reset_confirm', lang)}
              </button>
              <button
                className="pixel-btn"
                style={{ maxWidth: '100px' }}
                onClick={() => setConfirmReset(false)}
              >
                {t('back', lang)}
              </button>
            </div>
          ) : (
            <button
              className="pixel-btn"
              style={{ background: '#660000', maxWidth: '200px' }}
              onClick={() => setConfirmReset(true)}
            >
              ⚠️ {t('reset', lang)}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <button className="pixel-btn" onClick={onBack} style={{ maxWidth: '200px' }}>
          ← {t('back', lang)}
        </button>
      </div>
    </div>
  );
}
