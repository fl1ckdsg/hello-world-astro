import React, { useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import type { Language } from '../../lib/i18n';
import type { UserData, CharacterCustomization } from '../../lib/storage';
import { getTelegramUser } from '../../lib/telegram';
import { drawFighter } from '../game/FighterRenderer';

interface Props {
  userData: UserData;
  onUpdate: (data: UserData) => void;
  onBack: () => void;
}

const SKIN_COLORS = ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#4a2c10'];
const SHORTS_COLORS = ['#CC2200', '#002244', '#006600', '#8B008B', '#FFA500', '#1a1a1a'];
const GLOVES_COLORS = ['#CC0000', '#001188', '#006600', '#8B008B', '#FF8C00', '#222222'];

export default function ProfileScreen({ userData, onUpdate, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [char, setChar] = useState<CharacterCustomization>({ ...userData.character });
  const [editNick, setEditNick] = useState(false);
  const [nickInput, setNickInput] = useState(userData.nickname);
  const lang = userData.language as Language;
  const tgUser = getTelegramUser();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0d0500';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFighter(ctx, canvas.width / 2, canvas.height - 20, 1, 'idle', char, false);
  }, [char]);

  const updateChar = (patch: Partial<CharacterCustomization>) => {
    setChar(prev => ({ ...prev, ...patch }));
  };

  const save = () => {
    const updated = { ...userData, character: char, nickname: editNick ? nickInput.trim() || userData.nickname : userData.nickname };
    onUpdate(updated);
    setEditNick(false);
  };

  const ColorPicker = ({ colors, value, onChange }: { colors: string[]; value: number; onChange: (i: number) => void }) => (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {colors.map((color, i) => (
        <div
          key={i}
          onClick={() => onChange(i)}
          style={{
            width: '28px',
            height: '28px',
            background: color,
            border: `3px solid ${value === i ? '#FFD700' : '#553311'}`,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );

  const HAIR_NAMES = ['hair_short', 'hair_mohawk', 'hair_dreads', 'hair_bald', 'hair_afro'];
  const BODY_NAMES = ['body_slim', 'body_average', 'body_muscular'];
  const TATTOO_NAMES = ['tattoo_none', 'tattoo_arm', 'tattoo_chest', 'tattoo_full'];

  const SelectBtns = ({ count, value, names, onChange }: { count: number; value: number; names: string[]; onChange: (i: number) => void }) => (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{
            padding: '5px 8px',
            background: value === i ? '#8B4513' : '#2a1200',
            color: value === i ? '#FFD700' : '#664422',
            border: `2px solid ${value === i ? '#FFD700' : '#553311'}`,
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {t(names[i], lang)}
        </button>
      ))}
    </div>
  );

  const rowStyle: React.CSSProperties = {
    padding: '8px 0',
    borderBottom: '1px solid #3d1a00',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#FFA500',
    letterSpacing: '2px',
    marginBottom: '6px',
  };

  return (
    <div className="screen" style={{ padding: '16px', justifyContent: 'flex-start', overflowY: 'auto', paddingTop: '20px' }}>
      <div style={{ fontSize: '22px', color: '#FFD700', letterSpacing: '3px', marginBottom: '16px' }}>
        👤 {t('profile', lang)}
      </div>

      {/* Telegram photo + nickname */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        {tgUser?.photoUrl ? (
          <img
            src={tgUser.photoUrl}
            alt="avatar"
            style={{ width: '52px', height: '52px', borderRadius: '50%', border: '3px solid #8B4513' }}
          />
        ) : (
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#3d1a00', border: '3px solid #8B4513',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
          }}>👤</div>
        )}
        <div style={{ flex: 1 }}>
          {editNick ? (
            <input
              className="pixel-input"
              value={nickInput}
              maxLength={16}
              onChange={e => setNickInput(e.target.value)}
              style={{ fontSize: '14px', padding: '6px 10px', userSelect: 'text', WebkitUserSelect: 'text' } as React.CSSProperties}
              autoFocus
            />
          ) : (
            <div
              style={{ fontSize: '18px', color: '#FFD700', letterSpacing: '2px', cursor: 'pointer' }}
              onClick={() => setEditNick(true)}
            >
              {userData.nickname}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#664422', marginTop: '4px' }}>
            {editNick ? '✏️ editing...' : `✏️ ${t('change_nickname', lang)}`}
          </div>
        </div>
      </div>

      {/* Character preview canvas */}
      <canvas
        ref={canvasRef}
        width={200}
        height={240}
        style={{
          border: '2px solid #8B4513',
          background: '#0d0500',
          marginBottom: '16px',
          imageRendering: 'pixelated',
        }}
      />

      {/* Customization options */}
      <div style={{ width: '100%', maxWidth: '340px' }}>
        <div style={rowStyle}>
          <div style={labelStyle}>{t('skin_color', lang)}</div>
          <ColorPicker colors={SKIN_COLORS} value={char.skinColor} onChange={i => updateChar({ skinColor: i })} />
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>{t('hair_style', lang)}</div>
          <SelectBtns count={5} value={char.hairStyle} names={HAIR_NAMES} onChange={i => updateChar({ hairStyle: i })} />
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>{t('body_type', lang)}</div>
          <SelectBtns count={3} value={char.bodyType} names={BODY_NAMES} onChange={i => updateChar({ bodyType: i })} />
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>{t('tattoos', lang)}</div>
          <SelectBtns count={4} value={char.tattoos} names={TATTOO_NAMES} onChange={i => updateChar({ tattoos: i })} />
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>{t('shorts_color', lang)}</div>
          <ColorPicker colors={SHORTS_COLORS} value={char.shortsColor} onChange={i => updateChar({ shortsColor: i })} />
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>{t('gloves_color', lang)}</div>
          <ColorPicker colors={GLOVES_COLORS} value={char.glovesColor} onChange={i => updateChar({ glovesColor: i })} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingBottom: '20px' }}>
        <button className="pixel-btn" onClick={save}>
          💾 {t('save', lang)}
        </button>
        <button className="pixel-btn" onClick={onBack} style={{ background: '#3d1a00' }}>
          ← {t('back', lang)}
        </button>
      </div>
    </div>
  );
}
