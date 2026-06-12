import React, { useEffect, useRef, useState, useCallback } from 'react';
import { t } from '../../lib/i18n';
import type { Language } from '../../lib/i18n';
import type { UserData } from '../../lib/storage';
import { hapticFeedback } from '../../lib/telegram';
import { drawFighter } from '../game/FighterRenderer';
import type { FighterState } from '../game/FighterRenderer';
import type { CharacterCustomization } from '../../lib/storage';

interface Props { userData: UserData; onBack: () => void; }

interface Fighter {
  x: number; y: number; hp: number; maxHp: number; stamina: number;
  state: FighterState; stateTimer: number; facing: 1 | -1;
  isBlocking: boolean; comboCount: number; lastAttackTime: number;
}
interface Fan {
  x: number; y: number; baseY: number;
  color: string; phase: number; speed: number; excitement: number;
}
type GamePhase = 'countdown' | 'fight' | 'roundEnd' | 'gameOver';

const CANVAS_W = 360;
const CANVAS_H = 460;
const RING_FLOOR_Y = 290;
const RING_LEFT = 15;
const RING_RIGHT = 345;
const FIGHTER_GROUND = RING_FLOOR_Y + 12;
const ROUND_DURATION = 60;
const TOTAL_ROUNDS = 3;
const HIT_DISTANCE = 80;

const ATTACK_DURATIONS: Record<string, number> = { jab: 18, hook: 28, uppercut: 38, kick: 32 };
const ATTACK_DAMAGE:    Record<string, number> = { jab: 8,  hook: 15, uppercut: 25, kick: 18 };
const ATTACK_HIT_FRAME: Record<string, number> = { jab: 8,  hook: 14, uppercut: 19, kick: 16 };

const ENEMY_CHAR: CharacterCustomization = {
  skinColor: 2, hairStyle: 0, bodyType: 2, tattoos: 1, shortsColor: 1, glovesColor: 1,
};

// ── fire particles ───────────────────────────────────────────────────────────
interface FireParticle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; }
const fireParticles: FireParticle[] = [];
function spawnFire(cx: number, baseY: number) {
  for (let i = 0; i < 4; i++) {
    fireParticles.push({
      x:  cx + (Math.random() - 0.5) * 44,
      y:  baseY - 20 - Math.random() * 70,
      vx: (Math.random() - 0.5) * 1.8,
      vy: -(0.6 + Math.random() * 1.5),
      life: 22 + Math.floor(Math.random() * 22),
      maxLife: 44,
      size: 4 + Math.random() * 7,
    });
  }
  if (fireParticles.length > 140) fireParticles.splice(0, 25);
}
function drawFire(ctx: CanvasRenderingContext2D) {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) { fireParticles.splice(i, 1); continue; }
    const ratio = p.life / p.maxLife;
    ctx.globalAlpha = ratio * 0.88;
    ctx.fillStyle = ratio > 0.6 ? `rgb(255,${Math.round(ratio * 220)},0)` : `rgb(255,${Math.round(ratio * 80)},0)`;
    const s = p.size * ratio + 1;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

// ── background ───────────────────────────────────────────────────────────────
function drawBg(ctx: CanvasRenderingContext2D) {
  // Arena ceiling/wall gradient
  const bg = ctx.createLinearGradient(0, 0, 0, RING_FLOOR_Y - 20);
  bg.addColorStop(0, '#080312');
  bg.addColorStop(0.5, '#100520');
  bg.addColorStop(1, '#1A0A28');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, RING_FLOOR_Y - 20);

  // Wide spotlight cone from ceiling
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2 - 10, 0);
  ctx.lineTo(CANVAS_W / 2 + 10, 0);
  ctx.lineTo(CANVAS_W / 2 + 100, RING_FLOOR_Y - 40);
  ctx.lineTo(CANVAS_W / 2 - 100, RING_FLOOR_Y - 40);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── crowd (dense silhouettes like reference) ─────────────────────────────────
function drawCrowd(ctx: CanvasRenderingContext2D, fans: Fan[]) {
  fans.forEach(fan => {
    fan.phase += fan.speed * (0.5 + fan.excitement * 0.9);
    const yOff = Math.abs(Math.sin(fan.phase)) * 10 * (0.3 + fan.excitement * 0.7);
    fan.y = fan.baseY - yOff;
    fan.excitement = Math.max(0.15, fan.excitement * 0.993);

    const dy = fan.y;
    // Body silhouette
    ctx.fillStyle = fan.color;
    ctx.fillRect(fan.x - 5, dy - 15, 10, 15);
    // Head
    ctx.fillStyle = '#2A1840';
    ctx.beginPath();
    ctx.arc(fan.x, dy - 18, 5, 0, Math.PI * 2);
    ctx.fill();
    // Arms raised when excited
    if (fan.excitement > 0.4) {
      ctx.strokeStyle = fan.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fan.x - 4, dy - 10);
      ctx.lineTo(fan.x - 9, dy - 20 - yOff * 0.4);
      ctx.moveTo(fan.x + 4, dy - 10);
      ctx.lineTo(fan.x + 9, dy - 20 - yOff * 0.4);
      ctx.stroke();
    }
  });
}

// ── ring ─────────────────────────────────────────────────────────────────────
function drawRing(ctx: CanvasRenderingContext2D) {
  // Apron
  ctx.fillStyle = '#3A1400';
  ctx.fillRect(0, RING_FLOOR_Y - 55, CANVAS_W, 60);
  ctx.fillStyle = '#4D1C00';
  ctx.fillRect(4, RING_FLOOR_Y - 50, CANVAS_W - 8, 53);

  // Ring floor (perspective trapezoid, warm sandy tone)
  ctx.fillStyle = '#C8A050';
  ctx.beginPath();
  ctx.moveTo(RING_LEFT - 5,  RING_FLOOR_Y - 15);
  ctx.lineTo(RING_RIGHT + 5, RING_FLOOR_Y - 15);
  ctx.lineTo(RING_RIGHT + 42, CANVAS_H);
  ctx.lineTo(RING_LEFT  - 42, CANVAS_H);
  ctx.closePath();
  ctx.fill();

  // Wood grain
  ctx.strokeStyle = '#AA8030';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const y = RING_FLOOR_Y - 15 + i * 26;
    const sp = i * 9;
    ctx.beginPath();
    ctx.moveTo(RING_LEFT - 5 - sp, y);
    ctx.lineTo(RING_RIGHT + 5 + sp, y);
    ctx.stroke();
  }

  // Center circle
  ctx.strokeStyle = '#8B6600';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(CANVAS_W / 2, RING_FLOOR_Y + 35, 58, 20, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Corner posts
  [RING_LEFT - 13, RING_RIGHT + 4].forEach(px => {
    ctx.fillStyle = '#AA7700';
    ctx.fillRect(px, RING_FLOOR_Y - 115, 10, 95);
    ctx.fillStyle = '#FFCC44';
    ctx.fillRect(px + 2, RING_FLOOR_Y - 115, 3, 95);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(px + 5, RING_FLOOR_Y - 117, 8, 0, Math.PI * 2);
    ctx.fill();
    // White post cap
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px + 5, RING_FLOOR_Y - 117, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ropes (3 ropes: red / white / red)
  const ropeHeights = [RING_FLOOR_Y - 92, RING_FLOOR_Y - 70, RING_FLOOR_Y - 50];
  const ropeColors  = ['#DD2200', '#EEEEEE', '#DD2200'];
  ropeHeights.forEach((ry, i) => {
    ctx.strokeStyle = ropeColors[i];
    ctx.lineWidth = i === 1 ? 4 : 5;
    ctx.shadowColor = ropeColors[i];
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(RING_LEFT - 9, ry);
    ctx.lineTo(RING_RIGHT + 14, ry);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
}

// ── HUD (matching reference layout) ──────────────────────────────────────────
function drawHUD(
  ctx: CanvasRenderingContext2D,
  s: {
    player: Fighter; enemy: Fighter;
    round: number; timer: number;
    playerRoundsWon: number; enemyRoundsWon: number;
    comboDisplay: number; comboTimer: number;
    hitEffects: { x: number; y: number; timer: number; text: string }[];
  },
  pName: string,
  lang: Language,
) {
  // Background panel
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, CANVAS_W, 68);
  ctx.fillStyle = '#8B5A00';
  ctx.fillRect(0, 68, CANVAS_W, 2);

  const barW = 116, barH = 16;
  const pPct  = Math.max(0, s.player.hp / s.player.maxHp);
  const ePct  = Math.max(0, s.enemy.hp / s.enemy.maxHp);
  const pStam = Math.max(0, s.player.stamina / 100);
  const eStam = Math.max(0, s.enemy.stamina / 100);

  // ── Player side (left) ──
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 12px "Courier New"';
  ctx.textAlign = 'left';
  ctx.fillText(pName.substring(0, 9).toUpperCase(), 8, 14);

  // HP bar
  ctx.fillStyle = '#330000';
  ctx.fillRect(8, 18, barW, barH);
  const pg = ctx.createLinearGradient(8, 0, 8 + barW, 0);
  pg.addColorStop(0, '#DD1100');
  pg.addColorStop(0.6, '#FF4400');
  pg.addColorStop(1, '#FF8800');
  ctx.fillStyle = pg;
  ctx.fillRect(8, 18, barW * pPct, barH);
  // bar border
  ctx.strokeStyle = '#664400';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 18, barW, barH);

  // Stamina bar (cyan)
  ctx.fillStyle = '#001122';
  ctx.fillRect(8, 36, barW, 8);
  const psg = ctx.createLinearGradient(8, 0, 8 + barW, 0);
  psg.addColorStop(0, '#006688');
  psg.addColorStop(1, '#00CCAA');
  ctx.fillStyle = psg;
  ctx.fillRect(8, 36, barW * pStam, 8);
  ctx.strokeStyle = '#003344';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 36, barW, 8);

  ctx.fillStyle = '#FFA500';
  ctx.font = '10px "Courier New"';
  ctx.fillText(`HP:${s.player.hp}`, 8, 57);

  // ── Enemy side (right) ──
  ctx.fillStyle = '#88CCFF';
  ctx.font = 'bold 12px "Courier New"';
  ctx.textAlign = 'right';
  ctx.fillText('ЖЕЛЕЗНЫЙ ИВАН', CANVAS_W - 8, 14);

  const ex = CANVAS_W - 8 - barW;
  ctx.fillStyle = '#330000';
  ctx.fillRect(ex, 18, barW, barH);
  const eg = ctx.createLinearGradient(ex, 0, ex + barW, 0);
  eg.addColorStop(0, '#FF8800');
  eg.addColorStop(0.4, '#FF4400');
  eg.addColorStop(1, '#DD1100');
  ctx.fillStyle = eg;
  ctx.fillRect(ex + barW * (1 - ePct), 18, barW * ePct, barH);
  ctx.strokeStyle = '#664400';
  ctx.lineWidth = 1;
  ctx.strokeRect(ex, 18, barW, barH);

  ctx.fillStyle = '#001122';
  ctx.fillRect(ex, 36, barW, 8);
  const esg = ctx.createLinearGradient(ex, 0, ex + barW, 0);
  esg.addColorStop(0, '#00CCAA');
  esg.addColorStop(1, '#006688');
  ctx.fillStyle = esg;
  ctx.fillRect(ex + barW * (1 - eStam), 36, barW * eStam, 8);
  ctx.strokeStyle = '#003344';
  ctx.lineWidth = 1;
  ctx.strokeRect(ex, 36, barW, 8);

  ctx.fillStyle = '#88AAFF';
  ctx.font = '10px "Courier New"';
  ctx.fillText(`HP:${s.enemy.hp}`, CANVAS_W - 8, 57);

  // ── Center: Round + Timer ──
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 11px "Courier New"';
  ctx.fillText(`${t('round', lang).toUpperCase()} ${s.round}`, CANVAS_W / 2, 16);
  const sec = Math.max(0, Math.ceil(s.timer));
  ctx.fillStyle = sec <= 10 ? '#FF4400' : '#FFFFFF';
  ctx.font = `bold 28px "Courier New"`;
  ctx.fillText(String(sec), CANVAS_W / 2, 45);
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '9px "Courier New"';
  ctx.fillText(`${s.playerRoundsWon} - ${s.enemyRoundsWon}`, CANVAS_W / 2, 58);

  // ── Combo ──
  if (s.comboDisplay >= 2 && s.comboTimer > 0) {
    const alpha = Math.min(1, s.comboTimer / 30);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 24px "Courier New"';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#8B0000'; ctx.lineWidth = 5;
    ctx.strokeText(`${s.comboDisplay}x COMBO!`, CANVAS_W / 2, RING_FLOOR_Y - 20);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`${s.comboDisplay}x COMBO!`, CANVAS_W / 2, RING_FLOOR_Y - 20);
    ctx.restore();
  }

  // ── Hit effects ──
  s.hitEffects = s.hitEffects.filter(e => e.timer > 0);
  s.hitEffects.forEach(e => {
    e.timer--;
    ctx.save();
    ctx.globalAlpha = e.timer / 28;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(e.text, e.x, e.y - (28 - e.timer) * 0.7);
    ctx.restore();
  });
}

function drawCountdown(ctx: CanvasRenderingContext2D, timer: number, round: number, lang: Language) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(50, 110, CANVAS_W - 100, 150);
  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3;
  ctx.strokeRect(50, 110, CANVAS_W - 100, 150);
  ctx.fillStyle = '#FFA500';
  ctx.font = 'bold 16px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText(`${t('round', lang).toUpperCase()} ${round}`, CANVAS_W / 2, 140);
  const cnt = Math.ceil(timer / 60);
  const label = cnt > 0 ? String(cnt) : t('fight', lang);
  ctx.font = 'bold 72px "Courier New"';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 7;
  ctx.strokeText(label, CANVAS_W / 2, 228);
  ctx.fillStyle = cnt <= 1 ? '#FF4400' : '#FFD700';
  ctx.fillText(label, CANVAS_W / 2, 228);
}

function drawRoundEnd(ctx: CanvasRenderingContext2D, pWon: boolean, pRW: number, eRW: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(30, 130, CANVAS_W - 60, 130);
  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3;
  ctx.strokeRect(30, 130, CANVAS_W - 60, 130);
  ctx.fillStyle = pWon ? '#FFD700' : '#FF4444';
  ctx.font = 'bold 24px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText(pWon ? '★ РАУНД ВАШ' : '✗ НЕ ВАШ', CANVAS_W / 2, 180);
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '14px "Courier New"';
  ctx.fillText(`Счёт: ${pRW} — ${eRW}`, CANVAS_W / 2, 220);
}

function drawGameOverCanvas(ctx: CanvasRenderingContext2D, result: 'win' | 'lose', lang: Language) {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 80, CANVAS_W, 260);
  ctx.strokeStyle = result === 'win' ? '#FFD700' : '#CC2200';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 90, CANVAS_W - 40, 240);
  ctx.fillStyle = result === 'win' ? '#FFD700' : '#FF4444';
  ctx.font = 'bold 38px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText(result === 'win' ? t('you_win', lang) : t('you_lose', lang), CANVAS_W / 2, 180);
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '13px "Courier New"';
  ctx.fillText('↓ СНОВА / НАЗАД ↓', CANVAS_W / 2, 230);
}

export default function GameScreen({ userData, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    player: Fighter; enemy: Fighter; fans: Fan[];
    phase: GamePhase; round: number; timer: number;
    frameCount: number; countdownTimer: number;
    playerRoundsWon: number; enemyRoundsWon: number;
    comboDisplay: number; comboTimer: number;
    hitEffects: { x: number; y: number; timer: number; text: string }[];
    aiTimer: number; playerMoveDir: number; attackHit: Record<string, boolean>;
  }>();
  const animRef      = useRef<number>(0);
  const lastTimeRef  = useRef<number>(0);
  const [gameOverResult, setGameOverResult] = useState<'win' | 'lose' | null>(null);
  const lang = userData.language as Language;

  const createFighters = () => ({
    player: { x: 88,  y: 0, hp: 100, maxHp: 100, stamina: 100, state: 'idle' as FighterState, stateTimer: 0, facing:  1 as const, isBlocking: false, comboCount: 0, lastAttackTime: 0 },
    enemy:  { x: 272, y: 0, hp: 100, maxHp: 100, stamina: 100, state: 'idle' as FighterState, stateTimer: 0, facing: -1 as const, isBlocking: false, comboCount: 0, lastAttackTime: 0 },
  });

  const createFans = (): Fan[] => {
    const darkColors = ['#1E1030', '#231240', '#190E28', '#1A0E38', '#221034', '#180C30', '#201040', '#1C0E2C', '#180820', '#200E38'];
    const fans: Fan[] = [];
    for (let i = 0; i < 80; i++) {
      const row = Math.floor(i / 16);
      const bY = 28 + row * 32 + Math.random() * 6;
      fans.push({
        x: 8 + Math.random() * 344,
        y: bY, baseY: bY,
        color: darkColors[Math.floor(Math.random() * darkColors.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.06 + Math.random() * 0.08,
        excitement: 0.3,
      });
    }
    return fans;
  };

  const initGame = useCallback(() => {
    fireParticles.length = 0;
    const { player, enemy } = createFighters();
    stateRef.current = {
      player, enemy, fans: createFans(),
      phase: 'countdown', round: 1, timer: ROUND_DURATION,
      frameCount: 0, countdownTimer: 180,
      playerRoundsWon: 0, enemyRoundsWon: 0,
      comboDisplay: 0, comboTimer: 0,
      hitEffects: [], aiTimer: 60, playerMoveDir: 0, attackHit: {},
    };
    setGameOverResult(null);
  }, []);

  const doAttack = useCallback((attackType: string) => {
    const s = stateRef.current;
    if (!s || s.phase !== 'fight') return;
    const f = s.player;
    if (f.state !== 'idle' && f.state !== 'block') return;
    f.state = attackType as FighterState;
    f.stateTimer = ATTACK_DURATIONS[attackType] || 20;
    s.attackHit[attackType + '_player'] = false;
    f.stamina = Math.max(0, f.stamina - 12);
  }, []);

  const doBlock = useCallback((blocking: boolean) => {
    const s = stateRef.current;
    if (!s) return;
    const f = s.player;
    if (blocking && (f.state === 'idle' || f.state === 'block')) {
      f.state = 'block'; f.isBlocking = true;
    } else if (!blocking && f.state === 'block') {
      f.state = 'idle'; f.isBlocking = false;
    }
  }, []);

  const setMoveDir = useCallback((dir: number) => {
    if (stateRef.current) stateRef.current.playerMoveDir = dir;
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateAI = (s: NonNullable<typeof stateRef.current>) => {
      const ai = s.enemy, pl = s.player;
      if (s.phase !== 'fight' || ai.state !== 'idle') return;
      s.aiTimer--;
      if (s.aiTimer > 0) return;
      const dist = Math.abs(ai.x - pl.x);
      const hpR = ai.hp / ai.maxHp;
      const acts: Array<{ w: number; fn: () => void }> = [];
      acts.push({ w: dist > 90 ? 40 : 8, fn: () => {
        ai.x = Math.max(RING_LEFT + 25, Math.min(RING_RIGHT - 25, ai.x + (pl.x < ai.x ? -1 : 1) * 22));
      }});
      if (dist < HIT_DISTANCE + 20) {
        acts.push({ w: 22, fn: () => { ai.state = 'jab';      ai.stateTimer = ATTACK_DURATIONS.jab;      s.attackHit['jab_enemy']      = false; }});
        acts.push({ w: 16, fn: () => { ai.state = 'hook';     ai.stateTimer = ATTACK_DURATIONS.hook;     s.attackHit['hook_enemy']     = false; }});
        acts.push({ w: 10, fn: () => { ai.state = 'kick';     ai.stateTimer = ATTACK_DURATIONS.kick;     s.attackHit['kick_enemy']     = false; }});
        acts.push({ w: 8,  fn: () => { ai.state = 'uppercut'; ai.stateTimer = ATTACK_DURATIONS.uppercut; s.attackHit['uppercut_enemy'] = false; }});
        if (hpR < 0.5) acts.push({ w: 16, fn: () => { ai.state = 'block'; ai.stateTimer = 50; ai.isBlocking = true; }});
      }
      if (hpR < 0.3) acts.push({ w: 28, fn: () => { ai.state = 'block'; ai.stateTimer = 65; ai.isBlocking = true; }});
      let rng = Math.random() * acts.reduce((a, x) => a + x.w, 0);
      for (const a of acts) { rng -= a.w; if (rng <= 0) { a.fn(); break; } }
      s.aiTimer = 26 + Math.floor(Math.random() * 34);
    };

    const updateFighter = (f: Fighter, isPlayer: boolean, s: NonNullable<typeof stateRef.current>) => {
      if (f.stateTimer > 0) {
        f.stateTimer--;
        if (f.stateTimer === 0 && f.state !== 'ko') { f.state = 'idle'; f.isBlocking = false; }
      }
      if (isPlayer && s.phase === 'fight' && (f.state === 'idle' || f.state === 'block') && s.playerMoveDir !== 0) {
        f.x = Math.max(RING_LEFT + 25, Math.min(RING_RIGHT - 25, f.x + s.playerMoveDir * 3));
      }
      f.facing = isPlayer ? (f.x < s.enemy.x ? 1 : -1) : (f.x > s.player.x ? -1 : 1);
      if (f.comboCount > 0) { f.lastAttackTime++; if (f.lastAttackTime > 120) { f.comboCount = 0; f.lastAttackTime = 0; } }
      f.stamina = Math.min(100, f.stamina + 0.25);
    };

    const checkHits = (attacker: Fighter, defender: Fighter, isPlayerAtk: boolean, s: NonNullable<typeof stateRef.current>) => {
      const atkType = attacker.state;
      if (!['jab','hook','uppercut','kick'].includes(atkType)) return;
      const hitKey = `${atkType}_${isPlayerAtk ? 'player' : 'enemy'}`;
      if (s.attackHit[hitKey]) return;
      const hitFrame = ATTACK_HIT_FRAME[atkType] || 10;
      const elapsed = (ATTACK_DURATIONS[atkType] || 20) - attacker.stateTimer;
      if (elapsed < hitFrame - 2 || elapsed > hitFrame + 4) return;
      if (Math.abs(attacker.x - defender.x) > HIT_DISTANCE) return;
      s.attackHit[hitKey] = true;
      if (defender.isBlocking) {
        defender.hp = Math.max(0, defender.hp - Math.floor((ATTACK_DAMAGE[atkType] || 10) * 0.15));
        s.hitEffects.push({ x: defender.x, y: FIGHTER_GROUND - 100, timer: 25, text: 'БЛОК!' });
        return;
      }
      const dmg = ATTACK_DAMAGE[atkType] || 10;
      defender.hp = Math.max(0, defender.hp - dmg);
      attacker.comboCount++; attacker.lastAttackTime = 0;
      if (isPlayerAtk) { s.comboDisplay = attacker.comboCount; s.comboTimer = 90; }
      const labels: Record<string, string> = { jab: 'ДЖЕ!', hook: 'ХУК!', uppercut: 'АПП!', kick: 'КИК!' };
      s.hitEffects.push({ x: defender.x, y: FIGHTER_GROUND - 120, timer: 28, text: labels[atkType] || 'ХИТ!' });
      s.fans.forEach(fan => { fan.excitement = Math.min(1, fan.excitement + 0.4); });
      if (isPlayerAtk) hapticFeedback('medium');
      if (defender.hp <= 0) { defender.state = 'ko'; defender.stateTimer = 999; }
      else { defender.state = 'hit'; defender.stateTimer = 12; }
    };

    const loop = (ts: number) => {
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      if (dt > 200) { animRef.current = requestAnimationFrame(loop); return; }
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      s.frameCount++;

      if (s.phase === 'countdown') {
        s.countdownTimer--;
        if (s.countdownTimer <= 0) { s.phase = 'fight'; s.countdownTimer = 180; }
      } else if (s.phase === 'fight') {
        s.timer -= 1 / 60;
        updateFighter(s.player, true, s);
        updateFighter(s.enemy, false, s);
        updateAI(s);
        if (!['idle','block','hit','ko'].includes(s.player.state)) checkHits(s.player, s.enemy, true, s);
        if (!['idle','block','hit','ko'].includes(s.enemy.state))  checkHits(s.enemy, s.player, false, s);
        if (s.comboTimer > 0) s.comboTimer--;
        if (s.player.hp <= 0 || s.enemy.hp <= 0 || s.timer <= 0) {
          s.phase = 'roundEnd'; s.countdownTimer = 160;
          if (s.player.hp > s.enemy.hp || s.enemy.hp <= 0) s.playerRoundsWon++; else s.enemyRoundsWon++;
        }
      } else if (s.phase === 'roundEnd') {
        s.countdownTimer--;
        if (s.countdownTimer <= 0) {
          if (s.round >= TOTAL_ROUNDS || s.playerRoundsWon > 1 || s.enemyRoundsWon > 1) {
            s.phase = 'gameOver';
            setGameOverResult(s.playerRoundsWon >= s.enemyRoundsWon ? 'win' : 'lose');
          } else {
            s.round++;
            const { player, enemy } = createFighters();
            Object.assign(s, { player, enemy, phase: 'countdown', countdownTimer: 180, timer: ROUND_DURATION, attackHit: {}, hitEffects: [] });
          }
        }
      }

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBg(ctx);
      drawCrowd(ctx, s.fans);
      drawRing(ctx);

      if (s.frameCount % 2 === 0) spawnFire(s.player.x, FIGHTER_GROUND);
      drawFire(ctx);

      drawFighter(ctx, s.player.x, FIGHTER_GROUND, s.player.facing, s.player.state, userData.character, false);
      drawFighter(ctx, s.enemy.x,  FIGHTER_GROUND, s.enemy.facing,  s.enemy.state,  ENEMY_CHAR, true);

      drawHUD(ctx, s, userData.nickname || 'ТЫ', lang);
      if (s.phase === 'countdown') drawCountdown(ctx, s.countdownTimer, s.round, lang);
      else if (s.phase === 'roundEnd') drawRoundEnd(ctx, s.player.hp > s.enemy.hp || s.enemy.hp <= 0, s.playerRoundsWon, s.enemyRoundsWon);
      else if (s.phase === 'gameOver') drawGameOverCanvas(ctx, s.playerRoundsWon >= s.enemyRoundsWon ? 'win' : 'lose', lang);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [userData, lang]);

  const isLeft = userData.settings.controlLayout === 'left';
  const lang2  = userData.language as Language;

  // ── control panel styles ──────────────────────────────────────────────────

  const panelBg: React.CSSProperties = {
    background: 'linear-gradient(180deg, #1C0A00 0%, #100500 100%)',
    borderTop: '3px solid #8B5A00',
  };

  const octBtn = (bg: string, border: string, col: string, wide = false): React.CSSProperties => ({
    background: bg,
    border: `2px solid ${border}`,
    color: col,
    fontFamily: '"Courier New", monospace',
    fontWeight: 'bold',
    fontSize: wide ? 13 : 12,
    letterSpacing: 1,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    clipPath: 'polygon(15% 0%,85% 0%,100% 15%,100% 85%,85% 100%,15% 100%,0% 85%,0% 15%)',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    lineHeight: 1.3,
    gap: 2,
  });

  const DPad = () => (
    <div style={{
      width: 116, height: 116, flexShrink: 0,
      background: 'radial-gradient(circle, #2A1400 60%, #1A0A00 100%)',
      borderRadius: '50%',
      border: '3px solid #8B5A00',
      position: 'relative',
      boxShadow: '0 0 12px #00000066',
    }}>
      {/* up */}
      <button style={{
        position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
        width: 36, height: 36, background: '#2A1800', border: '2px solid #6B4000',
        color: '#FFD700', fontSize: 16, cursor: 'pointer', borderRadius: 4, touchAction: 'none',
      }}>▲</button>
      {/* left */}
      <button onPointerDown={() => setMoveDir(-1)} onPointerUp={() => setMoveDir(0)} onPointerLeave={() => setMoveDir(0)}
        style={{
          position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
          width: 36, height: 36, background: '#2A1800', border: '2px solid #6B4000',
          color: '#FFD700', fontSize: 16, cursor: 'pointer', borderRadius: 4, touchAction: 'none',
        }}>◄</button>
      {/* center dot */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 20, height: 20, borderRadius: '50%',
        background: '#3A2000', border: '2px solid #6B4000',
      }}/>
      {/* right */}
      <button onPointerDown={() => setMoveDir(1)} onPointerUp={() => setMoveDir(0)} onPointerLeave={() => setMoveDir(0)}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          width: 36, height: 36, background: '#2A1800', border: '2px solid #6B4000',
          color: '#FFD700', fontSize: 16, cursor: 'pointer', borderRadius: 4, touchAction: 'none',
        }}>►</button>
      {/* down */}
      <button style={{
        position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
        width: 36, height: 36, background: '#2A1800', border: '2px solid #6B4000',
        color: '#FFD700', fontSize: 16, cursor: 'pointer', borderRadius: 4, touchAction: 'none',
      }}>▼</button>
    </div>
  );

  const AttackButtons = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* АППЕРКОТ - wide top */}
      <button style={{ ...octBtn('#162800', '#55AA00', '#88FF44', true), height: 48, width: '100%' }}
        onPointerDown={() => doAttack('uppercut')}>
        <span>АППЕРКОТ</span>
      </button>
      {/* JAB | HOOK */}
      <div style={{ display: 'flex', gap: 5, flex: 1 }}>
        <button style={{ ...octBtn('#280000', '#CC4400', '#FF8844'), flex: 1, height: 52 }}
          onPointerDown={() => doAttack('jab')}>
          <span>JAB</span>
          <span style={{ fontSize: 9, opacity: 0.7 }}>УДАР</span>
        </button>
        <button style={{ ...octBtn('#000A22', '#2255AA', '#6699FF'), flex: 1, height: 52 }}
          onPointerDown={() => doAttack('hook')}>
          <span>HOOK</span>
          <span style={{ fontSize: 9, opacity: 0.7 }}>ХУК</span>
        </button>
      </div>
      {/* KICK / УДАР НОГОЙ */}
      <button style={{ ...octBtn('#140028', '#7733BB', '#BB66FF', true), height: 44, width: '100%' }}
        onPointerDown={() => doAttack('kick')}>
        <span>KICK</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>УДАР НОГОЙ</span>
      </button>
    </div>
  );

  // ПРИГНУТЬСЯ + POWER row
  const BottomRow = () => (
    <div style={{ display: 'flex', gap: 5, padding: '0 0 4px 0' }}>
      <button
        style={{
          flex: 1, height: 38,
          background: '#001A1A', border: '2px solid #006655',
          color: '#00CCAA', fontFamily: '"Courier New", monospace',
          fontWeight: 'bold', fontSize: 12, letterSpacing: 1,
          cursor: 'pointer', clipPath: 'polygon(3% 0%,97% 0%,100% 20%,100% 80%,97% 100%,3% 100%,0% 80%,0% 20%)',
          touchAction: 'none', userSelect: 'none',
        }}
        onPointerDown={() => doBlock(true)}
        onPointerUp={() => doBlock(false)}
        onPointerLeave={() => doBlock(false)}
      >
        ПРИГНУТЬСЯ
      </button>
      <button
        style={{
          width: 40, height: 38,
          background: '#1A0800', border: '2px solid #664400',
          color: '#FF8800', fontFamily: '"Courier New", monospace',
          fontWeight: 'bold', fontSize: 18,
          cursor: 'pointer', borderRadius: '50%',
          touchAction: 'none', userSelect: 'none',
        }}
        onClick={onBack}
      >
        ⏻
      </button>
    </div>
  );

  if (gameOverResult) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#080312', position: 'relative' }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ width: '100%', height: `calc(100% - 220px)`, display: 'block', touchAction: 'none' }} />
        <div style={{
          position: 'absolute', inset: 0, background: '#000000CC',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          <div style={{ fontSize: 72 }}>{gameOverResult === 'win' ? '🏆' : '💀'}</div>
          <div style={{
            color: gameOverResult === 'win' ? '#FFD700' : '#CC2200',
            fontSize: 30, letterSpacing: 4, fontFamily: '"Courier New",monospace',
            fontWeight: 'bold', textShadow: '3px 3px 0 #000',
          }}>
            {t(gameOverResult === 'win' ? 'you_win' : 'you_lose', lang2)}
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <button className="pixel-btn" style={{ minWidth: 140 }} onClick={initGame}>
              🔁 {t('play_again', lang2)}
            </button>
            <button className="pixel-btn" style={{ minWidth: 120, background: '#2a1005' }} onClick={onBack}>
              ← {t('back', lang2)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#080312', display: 'flex', flexDirection: 'column' }}>
      {/* Game canvas */}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        style={{ flex: 1, width: '100%', display: 'block', touchAction: 'none', minHeight: 0 }} />

      {/* Controls panel */}
      <div style={{
        ...panelBg,
        display: 'flex',
        flexDirection: 'column',
        padding: '6px 8px 0',
        gap: 5,
        flexShrink: 0,
        touchAction: 'none',
      }}>
        {/* Main controls row */}
        <div style={{
          display: 'flex',
          flexDirection: isLeft ? 'row-reverse' : 'row',
          gap: 8,
          alignItems: 'center',
        }}>
          <DPad />
          <AttackButtons />
        </div>

        {/* Bottom row: duck + power */}
        <BottomRow />

        {/* Energy bar */}
        <div style={{
          height: 8,
          background: '#001A10',
          border: '1px solid #004422',
          marginBottom: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: '72%',
            background: 'linear-gradient(90deg, #006644, #00CC88)',
            boxShadow: '0 0 6px #00AA66',
          }}/>
        </div>
      </div>
    </div>
  );
}
