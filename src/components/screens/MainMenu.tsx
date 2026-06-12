import React, { useEffect, useRef } from 'react';
import type { Language } from '../../lib/i18n';
import { t } from '../../lib/i18n';
import type { UserData } from '../../lib/storage';

interface Props {
  userData: UserData;
  onPlay: () => void;
  onShop: () => void;
  onProfile: () => void;
  onSettings: () => void;
}

export default function MainMenu({ userData, onPlay, onShop, onProfile, onSettings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fans: { x: number; y: number; color: string; phase: number; speed: number }[] = [];
    const colors = ['#CC2200', '#002244', '#FFD700', '#006600', '#8B008B', '#FFA500'];
    for (let i = 0; i < 50; i++) {
      fans.push({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.3 + Math.random() * canvas.height * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.05 + Math.random() * 0.05,
      });
    }

    const draw = () => {
      ctx.fillStyle = '#0d0500';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw crowd
      fans.forEach(fan => {
        fan.phase += fan.speed;
        const yOff = Math.abs(Math.sin(fan.phase)) * 8;
        // Body
        ctx.fillStyle = fan.color;
        ctx.fillRect(fan.x - 5, fan.y - 14 - yOff, 10, 14);
        // Head
        ctx.fillStyle = '#FDBCB4';
        ctx.beginPath();
        ctx.arc(fan.x, fan.y - 18 - yOff, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const lang = userData.language as Language;

  return (
    <div className="screen" style={{ position: 'relative' }}>
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        width={360}
        height={200}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '55%',
          opacity: 0.5,
        }}
      />

      {/* Title */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        marginBottom: '32px',
      }}>
        <div style={{
          fontSize: '42px',
          color: '#FFD700',
          fontFamily: 'Courier New, monospace',
          fontWeight: 'bold',
          letterSpacing: '6px',
          textShadow: '3px 3px 0 #8B4513, 6px 6px 0 #3d1a00',
          lineHeight: 1,
        }}>
          BOX
        </div>
        <div style={{
          fontSize: '42px',
          color: '#CC2200',
          fontFamily: 'Courier New, monospace',
          fontWeight: 'bold',
          letterSpacing: '6px',
          textShadow: '3px 3px 0 #8B4513, 6px 6px 0 #3d1a00',
          lineHeight: 1,
        }}>
          FIGHT
        </div>
        {userData.nickname && (
          <div style={{
            fontSize: '13px',
            color: '#FFA500',
            marginTop: '8px',
            letterSpacing: '2px',
          }}>
            👤 {userData.nickname}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '260px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <button className="pixel-btn" onClick={onPlay} style={{ fontSize: '20px', padding: '16px' }}>
          🥊 {t('play', lang)}
        </button>
        <button className="pixel-btn" onClick={onShop}>
          🛒 {t('shop', lang)}
        </button>
        <button className="pixel-btn" onClick={onProfile}>
          👤 {t('profile', lang)}
        </button>
        <button className="pixel-btn" onClick={onSettings}>
          ⚙️ {t('settings', lang)}
        </button>
      </div>
    </div>
  );
}
