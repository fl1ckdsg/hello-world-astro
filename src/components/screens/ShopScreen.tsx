import React from 'react';
import type { Language } from '../../lib/i18n';
import { t } from '../../lib/i18n';

interface Props {
  lang: Language;
  onBack: () => void;
}

export default function ShopScreen({ lang, onBack }: Props) {
  return (
    <div className="screen" style={{ padding: '24px' }}>
      <div style={{
        fontSize: '28px',
        color: '#FFD700',
        letterSpacing: '4px',
        marginBottom: '40px',
        textShadow: '2px 2px 0 #8B4513',
      }}>
        🛒 {t('shop', lang)}
      </div>

      <div style={{
        fontSize: '48px',
        marginBottom: '20px',
      }}>
        🔨
      </div>

      <div style={{
        fontSize: '24px',
        color: '#FFA500',
        letterSpacing: '3px',
        textAlign: 'center',
        marginBottom: '48px',
      }}>
        {t('coming_soon', lang)}
      </div>

      <button className="pixel-btn" onClick={onBack} style={{ maxWidth: '200px' }}>
        ← {t('back', lang)}
      </button>
    </div>
  );
}
