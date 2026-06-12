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
  x: number; y: number; hp: number; maxHp: number;
  state: FighterState; stateTimer: number; facing: 1 | -1;
  isBlocking: boolean; comboCount: number; lastAttackTime: number;
}
interface Fan {
  x: number; y: number; baseY: number;
  color: string; phase: number; speed: number; excitement: number;
}
type GamePhase = 'countdown' | 'fight' | 'roundEnd' | 'gameOver';

const CANVAS_W = 360;
const CANVAS_H = 480;
const RING_FLOOR_Y = 300;
const RING_LEFT = 15;
const RING_RIGHT = 345;
const FIGHTER_GROUND = RING_FLOOR_Y + 10;
const ROUND_DURATION = 60;
const TOTAL_ROUNDS = 3;
const HIT_DISTANCE = 75;

const ATTACK_DURATIONS: Record<string, number> = { jab: 18, hook: 28, uppercut: 38, kick: 32 };
const ATTACK_DAMAGE:    Record<string, number> = { jab: 8,  hook: 15, uppercut: 25, kick: 18 };
const ATTACK_HIT_FRAME: Record<string, number> = { jab: 8,  hook: 14, uppercut: 19, kick: 16 };

const FAN_COLORS = ['#CC2200','#0033AA','#FFD700','#006600','#880088','#FF6600','#FFFFFF','#FF4488'];

const ENEMY_CHAR: CharacterCustomization = {
  skinColor: 2, hairStyle: 0, bodyType: 2, tattoos: 1, shortsColor: 1, glovesColor: 1,
};

// ── fire particles ──────────────────────────────────────────────────────────
interface FireParticle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; }
const fireParticles: FireParticle[] = [];
function spawnFire(cx: number, baseY: number) {
  for (let i = 0; i < 3; i++) {
    fireParticles.push({
      x: cx + (Math.random() - 0.5) * 36,
      y: baseY - Math.random() * 80,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(0.5 + Math.random() * 1.2),
      life: 25 + Math.floor(Math.random() * 20),
      maxLife: 45,
    });
  }
  if (fireParticles.length > 120) fireParticles.splice(0, 20);
}
function drawFire(ctx: CanvasRenderingContext2D) {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) { fireParticles.splice(i, 1); continue; }
    const t2 = p.life / p.maxLife;
    const r = 255;
    const g = Math.round(t2 * 200);
    const b = 0;
    ctx.globalAlpha = t2 * 0.85;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const size = t2 * 7 + 2;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
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
  const animRef  = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [gameOverResult, setGameOverResult] = useState<'win' | 'lose' | null>(null);
  const [displayPhase, setDisplayPhase]   = useState<GamePhase>('countdown');
  const [displayRound, setDisplayRound]   = useState(1);
  const [displayTimer, setDisplayTimer]   = useState(ROUND_DURATION);
  const lang = userData.language as Language;

  const createFighters = (): { player: Fighter; enemy: Fighter } => ({
    player: { x: 90,  y: 0, hp: 100, maxHp: 100, state: 'idle', stateTimer: 0, facing:  1, isBlocking: false, comboCount: 0, lastAttackTime: 0 },
    enemy:  { x: 270, y: 0, hp: 100, maxHp: 100, state: 'idle', stateTimer: 0, facing: -1, isBlocking: false, comboCount: 0, lastAttackTime: 0 },
  });

  const createFans = (): Fan[] => {
    const fans: Fan[] = [];
    for (let i = 0; i < 70; i++) {
      const row = Math.floor(i / 14);
      const bY = 30 + row * 34 + Math.random() * 8;
      fans.push({
        x: 10 + Math.random() * 340,
        y: bY, baseY: bY,
        color: FAN_COLORS[Math.floor(Math.random() * FAN_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.07 + Math.random() * 0.07,
        excitement: 0.4,
      });
    }
    return fans;
  };

  const initGame = useCallback(() => {
    const { player, enemy } = createFighters();
    fireParticles.length = 0;
    stateRef.current = {
      player, enemy, fans: createFans(),
      phase: 'countdown', round: 1, timer: ROUND_DURATION,
      frameCount: 0, countdownTimer: 180,
      playerRoundsWon: 0, enemyRoundsWon: 0,
      comboDisplay: 0, comboTimer: 0,
      hitEffects: [], aiTimer: 60, playerMoveDir: 0, attackHit: {},
    };
    setDisplayPhase('countdown'); setDisplayRound(1);
    setDisplayTimer(ROUND_DURATION); setGameOverResult(null);
  }, []);

  const doAttack = useCallback((attackType: string) => {
    const s = stateRef.current;
    if (!s || s.phase !== 'fight') return;
    const f = s.player;
    if (f.state !== 'idle' && f.state !== 'block') return;
    f.state = attackType as FighterState;
    f.stateTimer = ATTACK_DURATIONS[attackType] || 20;
    s.attackHit[attackType + '_player'] = false;
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
    const s = stateRef.current;
    if (s) s.playerMoveDir = dir;
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── background ──────────────────────────────────────────────────────────
    const drawBg = (ctx: CanvasRenderingContext2D) => {
      // Deep dark arena gradient
      const g = ctx.createLinearGradient(0, 0, 0, RING_FLOOR_Y - 50);
      g.addColorStop(0, '#050210');
      g.addColorStop(1, '#1a0820');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, RING_FLOOR_Y - 50);

      // Distant audience stands (gradient)
      const stands = ctx.createLinearGradient(0, 0, 0, RING_FLOOR_Y - 80);
      stands.addColorStop(0, '#0a0518');
      stands.addColorStop(1, '#1a0828');
      ctx.fillStyle = stands;
      ctx.fillRect(0, 0, CANVAS_W, RING_FLOOR_Y - 80);

      // Spotlights from ceiling
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#FFFFFF';
      const spotX = [90, 180, 270];
      spotX.forEach(sx => {
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx - 60, RING_FLOOR_Y - 60);
        ctx.lineTo(sx + 60, RING_FLOOR_Y - 60);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    };

    // ── crowd ───────────────────────────────────────────────────────────────
    const drawCrowd = (ctx: CanvasRenderingContext2D, fans: Fan[]) => {
      fans.forEach(fan => {
        fan.phase += fan.speed * (0.6 + fan.excitement * 0.8);
        const yOff = Math.abs(Math.sin(fan.phase)) * 12 * (0.4 + fan.excitement);
        fan.y = fan.baseY - yOff;
        fan.excitement = Math.max(0.2, fan.excitement * 0.994);

        // Body
        ctx.fillStyle = fan.color;
        ctx.fillRect(fan.x - 5, fan.y - 16, 10, 16);
        // Head
        ctx.fillStyle = '#DDAA88';
        ctx.beginPath();
        ctx.arc(fan.x, fan.y - 20, 5, 0, Math.PI * 2);
        ctx.fill();
        // Arms raised when excited
        if (fan.excitement > 0.5) {
          ctx.strokeStyle = fan.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fan.x - 4, fan.y - 10);
          ctx.lineTo(fan.x - 9, fan.y - 18 - yOff * 0.3);
          ctx.moveTo(fan.x + 4, fan.y - 10);
          ctx.lineTo(fan.x + 9, fan.y - 18 - yOff * 0.3);
          ctx.stroke();
        }
      });
    };

    // ── ring ────────────────────────────────────────────────────────────────
    const drawRing = (ctx: CanvasRenderingContext2D) => {
      // Apron (dark border around canvas)
      ctx.fillStyle = '#4a1a00';
      ctx.fillRect(0, RING_FLOOR_Y - 55, CANVAS_W, 60);
      ctx.fillStyle = '#5c2200';
      ctx.fillRect(5, RING_FLOOR_Y - 50, CANVAS_W - 10, 52);

      // Ring floor perspective trapezoid
      ctx.fillStyle = '#C8960A';
      ctx.beginPath();
      ctx.moveTo(RING_LEFT - 5,  RING_FLOOR_Y - 18);
      ctx.lineTo(RING_RIGHT + 5, RING_FLOOR_Y - 18);
      ctx.lineTo(RING_RIGHT + 35, CANVAS_H);
      ctx.lineTo(RING_LEFT  - 35, CANVAS_H);
      ctx.closePath();
      ctx.fill();

      // Wood grain lines
      ctx.strokeStyle = '#A07808';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const y = RING_FLOOR_Y - 18 + i * 28;
        const spread = i * 8;
        ctx.beginPath();
        ctx.moveTo(RING_LEFT - 5 - spread, y);
        ctx.lineTo(RING_RIGHT + 5 + spread, y);
        ctx.stroke();
      }

      // Center circle
      ctx.strokeStyle = '#886600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(CANVAS_W / 2, RING_FLOOR_Y + 30, 55, 18, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Corner posts
      const posts = [RING_LEFT - 12, RING_RIGHT + 4];
      posts.forEach(px => {
        // Post
        ctx.fillStyle = '#CC8800';
        ctx.fillRect(px, RING_FLOOR_Y - 110, 10, 90);
        // Sheen
        ctx.fillStyle = '#FFCC44';
        ctx.fillRect(px + 2, RING_FLOOR_Y - 110, 3, 90);
        // Finial (ball on top)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(px + 5, RING_FLOOR_Y - 112, 7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ropes (3 ropes: red, white, red)
      const ropeY = [RING_FLOOR_Y - 88, RING_FLOOR_Y - 68, RING_FLOOR_Y - 50];
      const ropeColors = ['#CC2200', '#EEEEEE', '#CC2200'];
      ropeY.forEach((ry, i) => {
        ctx.strokeStyle = ropeColors[i];
        ctx.lineWidth = i === 1 ? 4 : 5;
        ctx.shadowColor = ropeColors[i];
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(RING_LEFT - 8, ry);
        ctx.lineTo(RING_RIGHT + 14, ry);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    };

    // ── HUD (matching reference layout) ────────────────────────────────────
    const drawHUD = (ctx: CanvasRenderingContext2D, s: NonNullable<typeof stateRef.current>) => {
      // Top bar background
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillRect(0, 0, CANVAS_W, 54);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 54, CANVAS_W, 2);

      // ── Player HP bar (left) ──
      const barW = 118;
      const barH = 14;
      const barY = 8;

      // Player bar (fills left→right)
      const pPct = Math.max(0, s.player.hp / s.player.maxHp);
      ctx.fillStyle = '#1a0800';
      ctx.fillRect(8, barY, barW, barH);
      const pGrad = ctx.createLinearGradient(8, 0, 8 + barW, 0);
      pGrad.addColorStop(0, '#FF2200');
      pGrad.addColorStop(0.5, '#FF6600');
      pGrad.addColorStop(1, '#FFD700');
      ctx.fillStyle = pGrad;
      ctx.fillRect(8, barY, barW * pPct, barH);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, barY, barW, barH);

      // Player name
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px "Courier New"';
      ctx.textAlign = 'left';
      const pName = (userData.nickname || 'ТЫ').substring(0, 8).toUpperCase();
      ctx.fillText(pName, 8, 36);
      // HP number
      ctx.fillStyle = '#FFA500';
      ctx.font = '10px "Courier New"';
      ctx.fillText(String(s.player.hp), 8, 48);

      // ── Enemy HP bar (right, fills right→left) ──
      const ePct = Math.max(0, s.enemy.hp / s.enemy.maxHp);
      ctx.fillStyle = '#1a0800';
      ctx.fillRect(CANVAS_W - 8 - barW, barY, barW, barH);
      const eGrad = ctx.createLinearGradient(CANVAS_W - 8 - barW, 0, CANVAS_W - 8, 0);
      eGrad.addColorStop(0, '#FFD700');
      eGrad.addColorStop(0.5, '#0066FF');
      eGrad.addColorStop(1, '#0033AA');
      ctx.fillStyle = eGrad;
      ctx.fillRect(CANVAS_W - 8 - barW * ePct, barY, barW * ePct, barH);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.strokeRect(CANVAS_W - 8 - barW, barY, barW, barH);

      // Enemy name
      ctx.fillStyle = '#88AAFF';
      ctx.font = 'bold 11px "Courier New"';
      ctx.textAlign = 'right';
      ctx.fillText('ЖЕЛЕЗНЫЙ', CANVAS_W - 8, 36);
      ctx.fillText('ИВАН', CANVAS_W - 8, 48);

      // ── Center: Round + Score ──
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(`${t('round', lang)} ${s.round}`, CANVAS_W / 2, 18);
      ctx.font = 'bold 18px "Courier New"';
      const sec = Math.max(0, Math.ceil(s.timer));
      ctx.fillStyle = sec <= 10 ? '#FF4400' : '#FFD700';
      ctx.fillText(String(sec), CANVAS_W / 2, 36);
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px "Courier New"';
      ctx.fillText(`${s.playerRoundsWon}:${s.enemyRoundsWon}`, CANVAS_W / 2, 50);

      // ── Combo text ──
      if (s.comboDisplay >= 2 && s.comboTimer > 0) {
        const alpha = Math.min(1, s.comboTimer / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px "Courier New"';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 4;
        ctx.strokeText(`${s.comboDisplay}x COMBO!`, CANVAS_W / 2, RING_FLOOR_Y - 30);
        ctx.fillText(`${s.comboDisplay}x COMBO!`, CANVAS_W / 2, RING_FLOOR_Y - 30);
        ctx.restore();
      }

      // ── Hit effects ──
      s.hitEffects = s.hitEffects.filter(e => e.timer > 0);
      s.hitEffects.forEach(e => {
        e.timer--;
        const alpha2 = e.timer / 30;
        ctx.save();
        ctx.globalAlpha = alpha2;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 15px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(e.text, e.x, e.y - (30 - e.timer) * 0.6);
        ctx.restore();
      });
    };

    const drawCountdown = (ctx: CanvasRenderingContext2D, timer: number, round: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(60, 120, CANVAS_W - 120, 140);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, 120, CANVAS_W - 120, 140);

      ctx.fillStyle = '#FFA500';
      ctx.font = 'bold 16px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(`${t('round', lang).toUpperCase()} ${round}`, CANVAS_W / 2, 150);

      const cnt = Math.ceil(timer / 60);
      ctx.font = 'bold 72px "Courier New"';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      const label = cnt > 0 ? String(cnt) : t('fight', lang);
      ctx.strokeText(label, CANVAS_W / 2, 228);
      ctx.fillStyle = cnt <= 1 ? '#FF4400' : '#FFD700';
      ctx.fillText(label, CANVAS_W / 2, 228);
    };

    const drawRoundEnd = (ctx: CanvasRenderingContext2D, s: NonNullable<typeof stateRef.current>) => {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(40, 140, CANVAS_W - 80, 120);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 140, CANVAS_W - 80, 120);
      const pWon = s.player.hp > s.enemy.hp || s.enemy.hp <= 0;
      ctx.fillStyle = pWon ? '#FFD700' : '#FF4444';
      ctx.font = 'bold 26px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(pWon ? '✓ РАУНД ВАШ' : '✗ РАУНД НЕ ВАШ', CANVAS_W / 2, 188);
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '13px "Courier New"';
      ctx.fillText(`Счёт: ${s.playerRoundsWon} — ${s.enemyRoundsWon}`, CANVAS_W / 2, 218);
    };

    const drawGameOver = (ctx: CanvasRenderingContext2D, result: 'win' | 'lose') => {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 100, CANVAS_W, 220);
      ctx.strokeStyle = result === 'win' ? '#FFD700' : '#CC2200';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 108, CANVAS_W - 40, 204);
      ctx.fillStyle = result === 'win' ? '#FFD700' : '#FF4444';
      ctx.font = 'bold 36px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(result === 'win' ? t('you_win', lang) : t('you_lose', lang), CANVAS_W / 2, 178);
      ctx.fillStyle = '#CCCCCC';
      ctx.font = '13px "Courier New"';
      ctx.fillText('↓ СНОВА / НАЗАД ↓', CANVAS_W / 2, 220);
    };

    // ── AI ──────────────────────────────────────────────────────────────────
    const updateAI = (s: NonNullable<typeof stateRef.current>) => {
      const ai = s.enemy;
      const player = s.player;
      if (s.phase !== 'fight' || ai.state !== 'idle') return;
      s.aiTimer--;
      if (s.aiTimer > 0) return;

      const dist = Math.abs(ai.x - player.x);
      const hpRatio = ai.hp / ai.maxHp;
      const acts: Array<{ w: number; fn: () => void }> = [];

      acts.push({ w: dist > 80 ? 40 : 8, fn: () => {
        const dir = player.x < ai.x ? -1 : 1;
        ai.x = Math.max(RING_LEFT + 20, Math.min(RING_RIGHT - 20, ai.x + dir * 20));
      }});
      if (dist < HIT_DISTANCE + 20) {
        acts.push({ w: 22, fn: () => { ai.state = 'jab';      ai.stateTimer = ATTACK_DURATIONS.jab;      s.attackHit['jab_enemy']      = false; } });
        acts.push({ w: 16, fn: () => { ai.state = 'hook';     ai.stateTimer = ATTACK_DURATIONS.hook;     s.attackHit['hook_enemy']     = false; } });
        acts.push({ w: 10, fn: () => { ai.state = 'kick';     ai.stateTimer = ATTACK_DURATIONS.kick;     s.attackHit['kick_enemy']     = false; } });
        acts.push({ w: 8,  fn: () => { ai.state = 'uppercut'; ai.stateTimer = ATTACK_DURATIONS.uppercut; s.attackHit['uppercut_enemy'] = false; } });
        if (hpRatio < 0.5) acts.push({ w: 18, fn: () => { ai.state = 'block'; ai.stateTimer = 50; ai.isBlocking = true; } });
      }
      if (hpRatio < 0.3) acts.push({ w: 28, fn: () => { ai.state = 'block'; ai.stateTimer = 65; ai.isBlocking = true; } });

      const total = acts.reduce((s2, a) => s2 + a.w, 0);
      let rng = Math.random() * total;
      for (const a of acts) { rng -= a.w; if (rng <= 0) { a.fn(); break; } }
      s.aiTimer = 28 + Math.floor(Math.random() * 32);
    };

    const updateFighter = (f: Fighter, isPlayer: boolean, s: NonNullable<typeof stateRef.current>) => {
      if (f.stateTimer > 0) {
        f.stateTimer--;
        if (f.stateTimer === 0 && f.state !== 'ko') { f.state = 'idle'; f.isBlocking = false; }
      }
      if (isPlayer && s.phase === 'fight' && (f.state === 'idle' || f.state === 'block') && s.playerMoveDir !== 0) {
        f.x = Math.max(RING_LEFT + 20, Math.min(RING_RIGHT - 20, f.x + s.playerMoveDir * 3));
      }
      f.facing = isPlayer ? (f.x < s.enemy.x ? 1 : -1) : (f.x > s.player.x ? -1 : 1);
      if (f.comboCount > 0) {
        f.lastAttackTime++;
        if (f.lastAttackTime > 120) { f.comboCount = 0; f.lastAttackTime = 0; }
      }
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
        s.hitEffects.push({ x: defender.x, y: FIGHTER_GROUND - 90, timer: 25, text: 'БЛОК!' });
        return;
      }
      const dmg = ATTACK_DAMAGE[atkType] || 10;
      defender.hp = Math.max(0, defender.hp - dmg);
      attacker.comboCount++; attacker.lastAttackTime = 0;
      if (isPlayerAtk) { s.comboDisplay = attacker.comboCount; s.comboTimer = 90; }

      const labels: Record<string,string> = { jab:'ДЖЕ!', hook:'ХУК!', uppercut:'АПП!', kick:'КИК!' };
      s.hitEffects.push({ x: defender.x, y: FIGHTER_GROUND - 110, timer: 28, text: labels[atkType] || 'ХИТ!' });
      s.fans.forEach(fan => { fan.excitement = Math.min(1, fan.excitement + 0.35); });
      if (isPlayerAtk) hapticFeedback('medium');

      if (defender.hp <= 0) {
        defender.state = 'ko'; defender.stateTimer = 999;
      } else {
        defender.state = 'hit'; defender.stateTimer = 12;
      }
    };

    // ── main loop ────────────────────────────────────────────────────────────
    const loop = (ts: number) => {
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      if (dt > 200) { animRef.current = requestAnimationFrame(loop); return; }

      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      s.frameCount++;

      // ── phase logic ──
      if (s.phase === 'countdown') {
        s.countdownTimer--;
        if (s.countdownTimer <= 0) { s.phase = 'fight'; s.countdownTimer = 180; setDisplayPhase('fight'); }
      } else if (s.phase === 'fight') {
        s.timer -= 1 / 60;
        setDisplayTimer(Math.ceil(s.timer));
        updateFighter(s.player, true, s);
        updateFighter(s.enemy, false, s);
        updateAI(s);
        if (!['idle','block','hit','ko'].includes(s.player.state)) checkHits(s.player, s.enemy, true, s);
        if (!['idle','block','hit','ko'].includes(s.enemy.state))  checkHits(s.enemy, s.player, false, s);
        if (s.comboTimer > 0) s.comboTimer--;

        if (s.player.hp <= 0 || s.enemy.hp <= 0 || s.timer <= 0) {
          s.phase = 'roundEnd'; s.countdownTimer = 150;
          const pWon = s.player.hp > s.enemy.hp || s.enemy.hp <= 0;
          if (pWon) s.playerRoundsWon++; else s.enemyRoundsWon++;
          setDisplayPhase('roundEnd');
        }
      } else if (s.phase === 'roundEnd') {
        s.countdownTimer--;
        if (s.countdownTimer <= 0) {
          if (s.round >= TOTAL_ROUNDS || s.playerRoundsWon > 1 || s.enemyRoundsWon > 1) {
            s.phase = 'gameOver';
            setGameOverResult(s.playerRoundsWon >= s.enemyRoundsWon ? 'win' : 'lose');
            setDisplayPhase('gameOver');
          } else {
            s.round++;
            const { player, enemy } = createFighters();
            s.player = player; s.enemy = enemy;
            s.phase = 'countdown'; s.countdownTimer = 180;
            s.timer = ROUND_DURATION; s.attackHit = {}; s.hitEffects = [];
            setDisplayRound(s.round); setDisplayTimer(ROUND_DURATION); setDisplayPhase('countdown');
          }
        }
      }

      // ── draw ──
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBg(ctx);
      drawCrowd(ctx, s.fans);
      drawRing(ctx);

      // Fire effect around player
      if (s.frameCount % 2 === 0) spawnFire(s.player.x, FIGHTER_GROUND);
      drawFire(ctx);

      // Fighters
      drawFighter(ctx, s.player.x, FIGHTER_GROUND, s.player.facing, s.player.state, userData.character, false);
      drawFighter(ctx, s.enemy.x,  FIGHTER_GROUND, s.enemy.facing,  s.enemy.state,  ENEMY_CHAR, true);

      drawHUD(ctx, s);
      if (s.phase === 'countdown') drawCountdown(ctx, s.countdownTimer, s.round);
      else if (s.phase === 'roundEnd') drawRoundEnd(ctx, s);
      else if (s.phase === 'gameOver') {
        drawGameOver(ctx, s.playerRoundsWon >= s.enemyRoundsWon ? 'win' : 'lose');
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [userData, lang]);

  void displayPhase; void displayRound; void displayTimer;

  const isLeft = userData.settings.controlLayout === 'left';
  const lang2  = userData.language as Language;

  // Button helpers
  const dpadStyle: React.CSSProperties = {
    background: '#2a1005', border: '3px solid #8B4513', color: '#FFD700',
    fontSize: 20, fontWeight: 'bold', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', borderRadius: 6,
    touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
    boxShadow: '0 3px 0 #000',
  };

  const atkStyle = (bg: string, accent: string): React.CSSProperties => ({
    background: bg, border: `3px solid ${accent}`, color: accent,
    fontFamily: '"Courier New", monospace', fontWeight: 'bold',
    fontSize: 12, letterSpacing: 1, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', borderRadius: 8,
    touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
    boxShadow: `0 4px 0 #000, inset 0 1px 0 ${accent}44`,
    lineHeight: 1.2,
  });

  const DPad = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '50px 50px 50px', gridTemplateRows: '50px 50px 50px', gap: 3 }}>
      <div/><button style={dpadStyle}>▲</button><div/>
      <button style={dpadStyle} onPointerDown={() => setMoveDir(-1)} onPointerUp={() => setMoveDir(0)} onPointerLeave={() => setMoveDir(0)}>◄</button>
      <div style={{ background: '#2a1005', borderRadius: 4, border: '2px solid #8B4513' }}/>
      <button style={dpadStyle} onPointerDown={() => setMoveDir(1)} onPointerUp={() => setMoveDir(0)} onPointerLeave={() => setMoveDir(0)}>►</button>
      <div/><div/><div/>
    </div>
  );

  // Buttons layout matches reference: АППЕРКОТ top, JAB+HOOK middle, KICK bottom
  const Attacks = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      {/* АППЕРКОТ - wide top button */}
      <button style={{ ...atkStyle('#1a4400', '#66FF44'), height: 44, width: '100%' }}
        onPointerDown={() => doAttack('uppercut')}>
        <span style={{ fontSize: 13 }}>АППЕРКОТ</span>
      </button>
      {/* JAB + HOOK row */}
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        <button style={{ ...atkStyle('#440000', '#FF6644'), flex: 1, height: 50 }}
          onPointerDown={() => doAttack('jab')}>
          <span>JAB</span>
          <span style={{ fontSize: 9, opacity: 0.7 }}>УДАР</span>
        </button>
        <button style={{ ...atkStyle('#002244', '#4488FF'), flex: 1, height: 50 }}
          onPointerDown={() => doAttack('hook')}>
          <span>HOOK</span>
          <span style={{ fontSize: 9, opacity: 0.7 }}>ХУК</span>
        </button>
      </div>
      {/* KICK - wide bottom button */}
      <button style={{ ...atkStyle('#1a0044', '#AA44FF'), height: 44, width: '100%' }}
        onPointerDown={() => doAttack('kick')}>
        <span style={{ fontSize: 13 }}>KICK</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>УДАР НОГОЙ</span>
      </button>
    </div>
  );

  const BlockBtn = () => (
    <button
      style={{
        width: 52, height: 164, background: '#003366', border: '3px solid #4488FF',
        color: '#88CCFF', fontFamily: '"Courier New", monospace', fontWeight: 'bold',
        fontSize: 12, letterSpacing: 1, cursor: 'pointer', borderRadius: 8,
        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
        boxShadow: '0 4px 0 #000', flexShrink: 0,
      }}
      onPointerDown={() => doBlock(true)}
      onPointerUp={() => doBlock(false)}
      onPointerLeave={() => doBlock(false)}
    >
      {t('block', lang2)}
    </button>
  );

  if (gameOverResult) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#050210', position: 'relative' }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ width: '100%', height: `calc(100% - 190px)`, display: 'block', touchAction: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: '#000000BB',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ fontSize: 64 }}>{gameOverResult === 'win' ? '🏆' : '💀'}</div>
          <div style={{ color: gameOverResult === 'win' ? '#FFD700' : '#CC2200',
            fontSize: 28, letterSpacing: 4, fontFamily: '"Courier New",monospace', fontWeight: 'bold',
            textShadow: '2px 2px 0 #000' }}>
            {t(gameOverResult === 'win' ? 'you_win' : 'you_lose', lang2)}
          </div>
          <div style={{ display: 'flex', gap: 12, padding: '0 24px' }}>
            <button className="pixel-btn" style={{ minWidth: 140 }} onClick={initGame}>
              🔁 {t('play_again', lang2)}
            </button>
            <button className="pixel-btn" style={{ minWidth: 140, background: '#2a1005' }} onClick={onBack}>
              ← {t('back', lang2)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#050210', display: 'flex', flexDirection: 'column' }}>
      {/* Game canvas */}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        style={{ flex: 1, width: '100%', display: 'block', touchAction: 'none' }} />

      {/* Controls — layout flips based on settings */}
      <div style={{
        height: 190, background: '#0d0500',
        borderTop: '3px solid #8B4513',
        display: 'flex',
        flexDirection: isLeft ? 'row-reverse' : 'row',
        alignItems: 'center',
        padding: '8px 10px', gap: 8,
        flexShrink: 0, touchAction: 'none',
      }}>
        <DPad />
        <Attacks />
        <BlockBtn />
      </div>
    </div>
  );
}
