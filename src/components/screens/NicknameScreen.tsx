import React, { useState } from 'react';
import type { Language } from '../../lib/i18n';
import { t } from '../../lib/i18n';

interface Props {
  lang: Language;
  onConfirm: (nickname: string) => void;
}

export default function NicknameScreen({ lang, onConfirm }: Props) {
  const [nickname, setNickname] = useState('');

  const handleConfirm = () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) return;
    onConfirm(trimmed);
  };

  return (
    <div className="screen" style={{ padding: '24px' }}>
      {/* Pixel character */}
      <div style={{
        width: '80px',
        height: '100px',
        margin: '0 auto 20px',
        position: 'relative',
      }}>
        {/* Simple pixel art character */}
        <div style={{
          width: '40px',
          height: '40px',
          background: '#FDBCB4',
          borderRadius: '50%',
          margin: '0 auto',
          border: '3px solid #8B4513',
          position: 'relative',
        }}>
          {/* Eyes */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '8px',
            width: '6px',
            height: '6px',
            background: '#1a0a00',
            borderRadius: '50%',
          }}/>
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '8px',
            width: '6px',
            height: '6px',
            background: '#1a0a00',
            borderRadius: '50%',
          }}/>
          {/* Smile */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '16px',
            height: '8px',
            border: '3px solid #1a0a00',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
          }}/>
        </div>
        {/* Body */}
        <div style={{
          width: '50px',
          height: '50px',
          background: '#CC2200',
          margin: '0 auto',
          border: '3px solid #8B4513',
          borderTop: 'none',
        }}/>
        {/* Speech bubble */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          left: '50%',
          background: '#FFD700',
          color: '#1a0a00',
          padding: '4px 8px',
          fontSize: '11px',
          fontFamily: 'Courier New, monospace',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          border: '2px solid #8B4513',
          borderRadius: '4px',
        }}>
          {t('hello_enter_nick', lang)}
        </div>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          fontSize: '20px',
          color: '#FFD700',
          textAlign: 'center',
          letterSpacing: '3px',
        }}>
          {t('enter_nickname', lang)}
        </div>

        <input
          className="pixel-input"
          type="text"
          maxLength={16}
          placeholder={t('nickname_placeholder', lang)}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          style={{ userSelect: 'text', WebkitUserSelect: 'text' } as React.CSSProperties}
        />

        <button
          className="pixel-btn"
          onClick={handleConfirm}
          disabled={nickname.trim().length < 2}
          style={{
            opacity: nickname.trim().length < 2 ? 0.5 : 1,
          }}
        >
          {t('confirm', lang)}
        </button>
      </div>
    </div>
  );
}
