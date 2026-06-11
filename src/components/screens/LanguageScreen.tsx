import React from 'react';
import type { Language } from '../../lib/i18n';
import { LANGUAGES } from '../../lib/i18n';

interface Props {
  onSelect: (lang: Language) => void;
}

const LANG_LABELS: Record<Language, string> = {
  RU: '🇷🇺 РУССКИЙ',
  EN: '🇬🇧 ENGLISH',
  UK: '🇺🇦 УКРАЇНСЬКА',
  KZ: '🇰🇿 ҚАЗАҚША',
};

export default function LanguageScreen({ onSelect }: Props) {
  return (
    <div className="screen" style={{ padding: '20px' }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <div style={{
          fontSize: '32px',
          color: '#FFD700',
          fontFamily: 'Courier New, monospace',
          fontWeight: 'bold',
          letterSpacing: '4px',
          textShadow: '2px 2px 0 #8B4513',
          marginBottom: '8px',
        }}>
          🥊 BOX FIGHT
        </div>
        <div style={{
          fontSize: '16px',
          color: '#FFA500',
          letterSpacing: '2px',
        }}>
          ВЫБЕРИ ЯЗЫК / SELECT LANGUAGE
        </div>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            className="pixel-btn"
            onClick={() => onSelect(lang)}
            style={{ fontSize: '16px' }}
          >
            {LANG_LABELS[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
