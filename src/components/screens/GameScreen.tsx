import React, { useEffect, useRef, useCallback, useState } from 'react';
import { t, type Language } from '../../lib/i18n';
import { hapticFeedback } from '../../lib/telegram';
import type { CharacterCustomization, GameSettings } from '../../lib/storage';

interface Props {
  lang: Language;
  nickname: string;
  character: CharacterCustomization;
  settings: GameSettings;
  onBack: () => void;
}

// ─── colour palettes ───────────────────────────────────────────────
const SKIN_COLORS = ['#F4C28B', '#E8A96C', '#D4854A', '#B5622A', '#8B4010', '#5C2800'];
const SHORTS_COLORS = ['#CC2200', '#0044CC', '#226622', '#664488', '#CC8800', '#222222'];
const GLOVES_COLORS = ['#CC2200', '#0044CC', '#226622', '#FFD700', '#EE4488', '#222222'];
const CROWD_COLORS = ['#CC2200', '#0044CC', '#226622', '#CC8800', '#884488', '#CC4400'];

// ─── Types ─────────────────────────────────────────────────────────
type FightState = 'idle' | 'jab' | 'hook' | 'uppercut' | 'kick' | 'block' | 'hit' | 'ko';
type PhaseType = 'countdown' | 'fight' | 'roundEnd' | 'win' | 'lose' | 'ko';

interface Fighter {
  x: number;         // 0-100 position on ring
  y: number;         // vertical offset (for hit stagger)
  hp: number;
  maxHp: number;
  state: FightState;
  stateTimer: number;
  facing: 1 | -1;
  comboCount: number;
  comboTimer: number;
}

interface Fan {
  x: number;
  baseY: number;
  w: number;
  h: number;
  color: string;
  phase: number;
  speed: number;
  excitement: number;
}

interface GameState {
  player: Fighter;
  enemy: Fighter;
  round: number;
  roundTimer: number;   // frames remaining in round
  phase: PhaseType;
  phaseTimer: number;
  combo: number;
  fans: Fan[];
  aiTimer: number;
  flashTimer: number;   // combo flash
}

const ROUND_SECONDS = 60;
const TOTAL_ROUNDS = 3;
const FPS = 60;
const ROUND_FRAMES = ROUND_SECONDS * FPS;
const HIT_RANGE = 22;     // position units

// ─── Drawing helpers ────────────────────────────────────────────────
function drawBoxer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  facing: 1 | -1,
  state: FightState,
  skin: string,
  shortsCol: string,
  glovesCol: string,
  hairStyle: number,
  bodyType: number,
  tattoos: number,
  scale: number,
) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, baseY);
  if (facing === -1) ctx.scale(-1, 1);

  const bw = bodyType === 0 ? 10 : bodyType === 2 ? 15 : 12; // body width
  const bx = -bw / 2;

  // Punch offset
  let punchX = 0;
  let punchY = 0;
  if (state === 'jab') { punchX = 8 * s; }
  if (state === 'hook') { punchX = 6 * s; punchY = -2 * s; }
  if (state === 'uppercut') { punchX = 2 * s; punchY = -8 * s; }
  if (state === 'kick') { punchX = 10 * s; punchY = 4 * s; }

  // Hit stagger
  const hitX = state === 'hit' ? -4 * s : 0;

  ctx.translate(hitX, 0);

  // Legs
  const legY = 18 * s;
  ctx.fillStyle = skin;
  if (state === 'kick') {
    // kick leg extended
    ctx.fillRect(-5 * s, legY, 5 * s, 14 * s);
    ctx.fillRect(2 * s, legY, 5 * s, 10 * s);
    ctx.fillRect(2 * s + punchX, legY + 4 * s, 10 * s, 5 * s);
  } else {
    ctx.fillRect(bx + 1 * s, legY, 5 * s, 14 * s);
    ctx.fillRect(bx + 7 * s - (bw - 12) * s / 2, legY, 5 * s, 14 * s);
  }

  // Shoes
  ctx.fillStyle = '#1a1a1a';
  if (state === 'kick') {
    ctx.fillRect(-5 * s, legY + 14 * s, 7 * s, 4 * s);
    ctx.fillRect(2 * s + punchX, legY + 4 * s + 5 * s, 12 * s, 4 * s);
  } else {
    ctx.fillRect(bx, legY + 14 * s, 7 * s, 4 * s);
    ctx.fillRect(bx + 5 * s - (bw - 12) * s / 2, legY + 14 * s, 8 * s, 4 * s);
  }

  // Shorts
  ctx.fillStyle = shortsCol;
  ctx.fillRect(bx * s, legY - 2 * s, bw * s, 8 * s);

  // Belt stripe
  ctx.fillStyle = '#FFD70088';
  ctx.fillRect(bx * s, legY - 2 * s, bw * s, 2 * s);

  // Body
  ctx.fillStyle = '#CC4400'; // shirt base
  ctx.fillRect(bx * s, 8 * s, bw * s, 12 * s);

  // Tattoo on body
  if (tattoos >= 2) {
    ctx.fillStyle = '#00000055';
    ctx.fillRect(bx * s + 2 * s, 9 * s, 3 * s, 8 * s);
  }

  // Left arm (back)
  ctx.fillStyle = skin;
  ctx.fillRect(bx * s - 4 * s, 8 * s, 4 * s, 9 * s);
  // Left glove (back)
  ctx.fillStyle = glovesCol;
  ctx.fillRect(bx * s - 5 * s, 15 * s, 5 * s, 5 * s);

  // Tattoo on arm
  if (tattoos === 1 || tattoos === 3) {
    ctx.fillStyle = '#00000066';
    ctx.fillRect(bx * s - 3 * s, 10 * s, 2 * s, 5 * s);
  }

  // Right arm (front) with punch
  ctx.fillStyle = skin;
  ctx.fillRect((bx + bw) * s, 8 * s + punchY, 4 * s, 9 * s);
  // Right glove (front) extended
  ctx.fillStyle = glovesCol;
  ctx.fillRect((bx + bw) * s + punchX, 14 * s + punchY, 5 * s, 5 * s);

  // Neck
  ctx.fillStyle = skin;
  ctx.fillRect(-2 * s, 3 * s, 4 * s, 6 * s);

  // Head
  ctx.fillStyle = skin;
  ctx.fillRect(-5 * s, -6 * s, 10 * s, 10 * s);

  // Helmet/hair
  if (hairStyle === 3) {
    // bald - slight shine
    ctx.fillStyle = skin;
  } else if (hairStyle === 1) {
    // mohawk
    ctx.fillStyle = '#CC0000';
    ctx.fillRect(-1 * s, -10 * s, 2 * s, 6 * s);
  } else if (hairStyle === 2) {
    // dreads
    ctx.fillStyle = '#3a1a00';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect((-4 + i * 2) * s, -8 * s, s, 10 * s);
    }
  } else if (hairStyle === 4) {
    // afro
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath();
    ctx.arc(0, -8 * s, 7 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // short
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(-5 * s, -6 * s, 10 * s, 4 * s);
  }

  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(-3 * s, -2 * s, 2 * s, 2 * s);
  ctx.fillRect(1 * s, -2 * s, 2 * s, 2 * s);

  // Mouth / expression
  if (state === 'ko') {
    ctx.fillStyle = '#FF000088';
    ctx.fillRect(-3 * s, 1 * s, 6 * s, 2 * s);
  } else if (state === 'hit') {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-2 * s, 1 * s, 4 * s, 2 * s);
  } else {
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(-2 * s, 1 * s, 4 * s, s);
  }

  // Boxing gloves on face (block state)
  if (state === 'block') {
    ctx.fillStyle = glovesCol;
    ctx.fillRect(-8 * s, -4 * s, 5 * s, 7 * s);
    ctx.fillRect(3 * s, -4 * s, 5 * s, 7 * s);
  }

  ctx.restore();
}

function drawRing(ctx: CanvasRenderingContext2D, w: number, h: number, ringY: number) {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, ringY);
  grad.addColorStop(0, '#0a0520');
  grad.addColorStop(1, '#1a0800');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, ringY);

  // Ring floor (perspective trapezoid)
  const floorH = h - ringY;
  ctx.fillStyle = '#C8A040';
  ctx.beginPath();
  ctx.moveTo(w * 0.05, ringY);
  ctx.lineTo(w * 0.95, ringY);
  ctx.lineTo(w * 1.1, h);
  ctx.lineTo(w * -0.1, h);
  ctx.closePath();
  ctx.fill();

  // Floor lines
  ctx.strokeStyle = '#A08030';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = ringY + floorH * (i / 5);
    const pct = i / 5;
    ctx.beginPath();
    ctx.moveTo(w * (0.05 - pct * 0.15), y);
    ctx.lineTo(w * (0.95 + pct * 0.15), y);
    ctx.stroke();
  }

  // Center line
  ctx.strokeStyle = '#88601888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, ringY);
  ctx.lineTo(w * 0.5, h);
  ctx.stroke();

  // Ropes
  const ropeColors = ['#CC2200', '#FFFFFF', '#CC2200'];
  const ropeYs = [ringY - 60, ringY - 36, ringY - 16];
  ropeYs.forEach((ry, i) => {
    ctx.strokeStyle = ropeColors[i];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, ry);
    ctx.lineTo(w - 10, ry);
    ctx.stroke();
  });

  // Corner posts
  const postX = [10, w - 10];
  postX.forEach(px => {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(px - 5, ringY - 80, 10, 80);
  });
}

function drawCrowd(ctx: CanvasRenderingContext2D, fans: Fan[], w: number, ringY: number) {
  fans.forEach(fan => {
    fan.phase += fan.speed * (1 + fan.excitement);
    const jump = Math.abs(Math.sin(fan.phase)) * (8 + fan.excitement * 14);
    const y = fan.baseY - jump;
    ctx.fillStyle = fan.color;
    ctx.fillRect(fan.x - fan.w / 2, y, fan.w, fan.h);
    ctx.beginPath();
    ctx.arc(fan.x, y - fan.w * 0.5, fan.w * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Arm raised when excited
    if (fan.excitement > 0.3) {
      ctx.fillRect(fan.x + fan.w / 2, y - fan.h * 0.3, 3, fan.h * 0.5);
    }
  });
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hp: number, maxHp: number, flipped: boolean) {
  const pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = '#0d0500';
  ctx.fillRect(x, y, w, 16);

  let barColor: string;
  if (pct > 0.5) barColor = '#00CC44';
  else if (pct > 0.25) barColor = '#FFD700';
  else barColor = '#CC2200';

  const fillW = w * pct;
  ctx.fillStyle = barColor;
  if (flipped) {
    ctx.fillRect(x + w - fillW, y, fillW, 16);
  } else {
    ctx.fillRect(x, y, fillW, 16);
  }

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, 16);
}

function makeInitialState(char: CharacterCustomization): GameState {
  const fans: Fan[] = [];
  for (let i = 0; i < 55; i++) {
    fans.push({
      x: 20 + Math.random() * 320,
      baseY: 20 + Math.random() * 90,
      w: 10 + Math.random() * 8,
      h: 18 + Math.random() * 10,
      color: CROWD_COLORS[Math.floor(Math.random() * CROWD_COLORS.length)] + 'CC',
      phase: Math.random() * Math.PI * 2,
      speed: 0.04 + Math.random() * 0.03,
      excitement: 0.1,
    });
  }
  return {
    player: { x: 25, y: 0, hp: 100, maxHp: 100, state: 'idle', stateTimer: 0, facing: 1, comboCount: 0, comboTimer: 0 },
    enemy: { x: 75, y: 0, hp: 100, maxHp: 100, state: 'idle', stateTimer: 0, facing: -1, comboCount: 0, comboTimer: 0 },
    round: 1,
    roundTimer: ROUND_FRAMES,
    phase: 'countdown',
    phaseTimer: 2 * FPS,
    combo: 0,
    fans,
    aiTimer: 60,
    flashTimer: 0,
  };
}

export default function GameScreen({ lang, nickname, character, settings, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const pressedRef = useRef<Set<string>>(new Set());
  const [uiPhase, setUiPhase] = useState<PhaseType>('countdown');
  const [uiRound, setUiRound] = useState(1);
  const [uiTime, setUiTime] = useState(ROUND_SECONDS);
  const [uiCombo, setUiCombo] = useState(0);

  const skin = SKIN_COLORS[character.skinColor] || SKIN_COLORS[0];
  const shortsCol = SHORTS_COLORS[character.shortsColor] || SHORTS_COLORS[0];
  const glovesCol = GLOVES_COLORS[character.glovesColor] || GLOVES_COLORS[1];

  const doPlayerAction = useCallback((action: string) => {
    const gs = stateRef.current;
    if (!gs || gs.phase !== 'fight') return;
    const p = gs.player;
    if (p.state !== 'idle' && p.state !== 'block') return;

    if (action === 'block') {
      p.state = 'block';
      p.stateTimer = 0;
      return;
    }

    const dist = Math.abs(p.x - gs.enemy.x);
    if (dist > HIT_RANGE) return; // out of range

    let dmg = 0;
    let newState: FightState = 'idle';
    if (action === 'jab') { dmg = 8; newState = 'jab'; }
    else if (action === 'hook') { dmg = 15; newState = 'hook'; }
    else if (action === 'uppercut') { dmg = 25; newState = 'uppercut'; }
    else if (action === 'kick') { dmg = 18; newState = 'kick'; }

    if (dmg === 0) return;
    p.state = newState;
    p.stateTimer = 0;

    if (gs.enemy.state === 'block') {
      dmg = Math.floor(dmg * 0.2);
    }

    gs.enemy.hp = Math.max(0, gs.enemy.hp - dmg);
    gs.enemy.state = 'hit';
    gs.enemy.stateTimer = 0;

    gs.combo++;
    gs.flashTimer = 30;
    gs.fans.forEach(f => { f.excitement = Math.min(1, f.excitement + 0.3); });
    hapticFeedback('medium');

    if (gs.enemy.hp <= 0) {
      gs.enemy.state = 'ko';
      gs.phase = 'ko';
      gs.phaseTimer = 3 * FPS;
      gs.fans.forEach(f => { f.excitement = 1; });
    }
  }, []);

  const startGame = useCallback(() => {
    stateRef.current = makeInitialState(character);
  }, [character]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const gs = stateRef.current;
      if (!gs) { rafRef.current = requestAnimationFrame(loop); return; }

      const ctx = canvas.getContext('2d')!;
      const W = canvas.width;
      const H = canvas.height;
      const ringY = H * 0.4;

      ctx.clearRect(0, 0, W, H);
      drawRing(ctx, W, H, ringY);
      drawCrowd(ctx, gs.fans, W, ringY);

      // Convert ring positions to screen coords
      const toScreenX = (pos: number) => W * 0.05 + pos / 100 * W * 0.9;
      const fighterScale = W / 100;

      const playerScreenX = toScreenX(gs.player.x);
      const enemyScreenX = toScreenX(gs.enemy.x);

      // ── AI ──
      if (gs.phase === 'fight') {
        gs.aiTimer--;
        const e = gs.enemy;
        const p = gs.player;

        if (gs.aiTimer <= 0) {
          gs.aiTimer = 50 + Math.floor(Math.random() * 40);
          if (e.state === 'idle') {
            const dist = Math.abs(e.x - p.x);
            const roll = Math.random();
            if (dist > HIT_RANGE + 5) {
              // Move toward player
              e.x += e.facing === -1 ? -5 : 5;
              e.x = Math.max(5, Math.min(95, e.x));
            } else if (roll < 0.25) {
              // AI jab
              e.state = 'jab';
              e.stateTimer = 0;
              if (p.state !== 'block') {
                const d = 6 + Math.floor(Math.random() * 6);
                p.hp = Math.max(0, p.hp - d);
                p.state = 'hit';
                p.stateTimer = 0;
                gs.fans.forEach(f => { f.excitement = Math.min(1, f.excitement + 0.1); });
              }
            } else if (roll < 0.4) {
              e.state = 'hook';
              e.stateTimer = 0;
              if (p.state !== 'block') {
                const d = 12 + Math.floor(Math.random() * 8);
                p.hp = Math.max(0, p.hp - d);
                p.state = 'hit';
                p.stateTimer = 0;
              }
            } else if (roll < 0.5) {
              e.state = 'block';
              e.stateTimer = 0;
            } else if (roll < 0.6) {
              // Move back
              e.x += 5;
              e.x = Math.min(95, e.x);
            }
          }
          if (p.hp <= 0) {
            p.state = 'ko';
            gs.phase = 'ko';
            gs.phaseTimer = 3 * FPS;
          }
        }

        // Player movement
        const pressed = pressedRef.current;
        if (pressed.has('left') && p.state === 'idle') {
          p.x = Math.max(5, p.x - 1.2);
        }
        if (pressed.has('right') && p.state === 'idle') {
          p.x = Math.min(90, p.x + 1.2);
        }

        // Update facing
        p.facing = p.x < e.x ? 1 : -1;
        e.facing = e.x < p.x ? 1 : -1;

        // Round timer
        gs.roundTimer--;
        if (gs.roundTimer <= 0) {
          if (gs.round < TOTAL_ROUNDS) {
            gs.phase = 'roundEnd';
            gs.phaseTimer = 2 * FPS;
          } else {
            // Decision
            if (p.hp > e.hp) {
              gs.phase = 'win';
            } else {
              gs.phase = 'lose';
            }
            gs.phaseTimer = 0;
          }
        }
      }

      // Phase transitions
      if (gs.phaseTimer > 0) {
        gs.phaseTimer--;
        if (gs.phaseTimer === 0) {
          if (gs.phase === 'countdown') {
            gs.phase = 'fight';
          } else if (gs.phase === 'roundEnd') {
            gs.round++;
            gs.roundTimer = ROUND_FRAMES;
            gs.player.hp = gs.player.maxHp;
            gs.enemy.hp = gs.enemy.maxHp;
            gs.player.state = 'idle';
            gs.enemy.state = 'idle';
            gs.phase = 'countdown';
            gs.phaseTimer = 2 * FPS;
          } else if (gs.phase === 'ko') {
            if (gs.player.hp <= 0) {
              gs.phase = 'lose';
            } else {
              gs.phase = 'win';
            }
          }
        }
      }

      // State timers
      const updateFighter = (f: Fighter) => {
        if (f.state !== 'idle' && f.state !== 'block' && f.state !== 'ko') {
          f.stateTimer++;
          const dur = f.state === 'uppercut' ? 25 : f.state === 'hook' ? 20 : 15;
          if (f.stateTimer >= dur) {
            f.state = 'idle';
            f.stateTimer = 0;
          }
        }
        if (f.state === 'block' && !pressedRef.current.has('block')) {
          f.stateTimer++;
          if (f.stateTimer > 3) { f.state = 'idle'; f.stateTimer = 0; }
        }
        f.comboTimer = Math.max(0, f.comboTimer - 1);
      };
      updateFighter(gs.player);
      updateFighter(gs.enemy);

      // Decay combo
      if (gs.combo > 0) {
        gs.player.comboTimer = 120;
      }
      if (gs.player.comboTimer <= 0) {
        gs.combo = 0;
      }
      gs.flashTimer = Math.max(0, gs.flashTimer - 1);

      // ── Draw fighters ──
      const pY = ringY + (gs.player.state === 'hit' ? -4 : 0);
      const eY = ringY + (gs.enemy.state === 'hit' ? -4 : 0);

      drawBoxer(ctx, playerScreenX, pY, gs.player.facing, gs.player.state,
        skin, shortsCol, glovesCol, character.hairStyle, character.bodyType, character.tattoos, fighterScale * 0.35);
      // Enemy (fixed gray/steel appearance)
      drawBoxer(ctx, enemyScreenX, eY, gs.enemy.facing, gs.enemy.state,
        '#B0B0B0', '#002244', '#444444', 3, 2, 0, fighterScale * 0.35);

      // Punch flash
      if ((gs.player.state === 'jab' || gs.player.state === 'hook' || gs.player.state === 'uppercut') && gs.player.stateTimer < 8) {
        ctx.fillStyle = '#FFFF0066';
        ctx.beginPath();
        ctx.arc(enemyScreenX, ringY - 20, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── UI overlays ──
      // HP bars
      const barW = W * 0.36;
      const barY = 12;
      drawHpBar(ctx, 12, barY, barW, gs.player.hp, gs.player.maxHp, false);
      drawHpBar(ctx, W - 12 - barW, barY, barW, gs.enemy.hp, gs.enemy.maxHp, true);

      // Names
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${Math.floor(W * 0.032)}px 'Courier New', monospace`;
      ctx.fillText(nickname.substring(0, 10).toUpperCase(), 12, barY + 32);
      ctx.textAlign = 'right';
      ctx.fillText('ЖЕЛЕЗНЫЙ', W - 12, barY + 32);
      ctx.textAlign = 'left';

      // Round / timer display
      const secs = Math.ceil(gs.roundTimer / FPS);
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${Math.floor(W * 0.038)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${t('round', lang)} ${gs.round}`, W / 2, barY + 16);
      ctx.fillText(String(secs), W / 2, barY + 32);
      ctx.textAlign = 'left';

      // Combo display
      if (gs.combo >= 2 || gs.flashTimer > 0) {
        ctx.font = `bold ${Math.floor(W * 0.05)}px 'Courier New', monospace`;
        ctx.fillStyle = gs.flashTimer > 0 ? `rgba(255,${Math.floor(gs.flashTimer * 8)},0,1)` : '#FF8800';
        ctx.textAlign = 'center';
        ctx.fillText(`${gs.combo}x ${t('combo', lang)}!`, W / 2, ringY - 10);
        ctx.textAlign = 'left';
      }

      // Phase overlays
      if (gs.phase === 'countdown') {
        ctx.fillStyle = '#00000088';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${Math.floor(W * 0.12)}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        const cntSecs = Math.ceil(gs.phaseTimer / FPS);
        ctx.fillText(cntSecs > 0 ? String(cntSecs) : t('fight', lang), W / 2, H * 0.5);
        ctx.textAlign = 'left';
      }
      if (gs.phase === 'roundEnd') {
        ctx.fillStyle = '#00000088';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${Math.floor(W * 0.07)}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${t('round', lang)} ${gs.round}`, W / 2, H * 0.5);
        ctx.textAlign = 'left';
      }

      // Update UI state
      setUiPhase(gs.phase);
      setUiRound(gs.round);
      setUiTime(Math.ceil(gs.roundTimer / FPS));
      setUiCombo(gs.combo);

      // Excitement decay
      gs.fans.forEach(f => { f.excitement = Math.max(0, f.excitement - 0.003); });

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [lang, nickname, character, skin, shortsCol, glovesCol]);

  const handleRelease = useCallback((action: string) => {
    pressedRef.current.delete(action);
    if (action === 'block') {
      const p = stateRef.current?.player;
      if (p?.state === 'block') {
        p.state = 'idle';
        p.stateTimer = 0;
      }
    }
  }, []);

  const btnProps = (action: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (action === 'left' || action === 'right') {
        pressedRef.current.add(action);
      } else {
        doPlayerAction(action);
      }
    },
    onPointerUp: () => handleRelease(action),
    onPointerLeave: () => handleRelease(action),
  });

  const dpadLeft = settings.controlLayout === 'right';
  const btnColors: Record<string, string> = {
    jab: '#CC2200',
    hook: '#0044CC',
    uppercut: '#226622',
    kick: '#664488',
    block: '#8B4513',
  };
  const btnLabels: Record<string, string> = {
    jab: t('jab', lang),
    hook: t('hook', lang),
    uppercut: t('uppercut', lang),
    kick: t('kick', lang),
    block: t('block', lang),
  };

  const endPhase = uiPhase === 'win' || uiPhase === 'lose';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0520', position: 'relative' }}>
      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: '100%', display: 'block', touchAction: 'none' }}
      />

      {/* Win/Lose overlay */}
      {endPhase && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#000000CC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          zIndex: 10,
        }}>
          <div style={{ fontSize: 64 }}>{uiPhase === 'win' ? '🏆' : '💀'}</div>
          <div style={{
            color: uiPhase === 'win' ? '#FFD700' : '#CC2200',
            fontSize: 28,
            letterSpacing: 4,
            textShadow: '2px 2px 0 #000',
          }}>
            {t(uiPhase === 'win' ? 'you_win' : 'you_lose', lang)}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
            <button className="pixel-btn" style={{ minWidth: 140 }} onClick={() => {
              stateRef.current = makeInitialState(character);
            }}>
              🔁 {t('play_again', lang)}
            </button>
            <button className="pixel-btn" style={{ minWidth: 140, background: '#2a1005' }} onClick={onBack}>
              ← {t('back', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      {!endPhase && (
        <div style={{
          height: 200,
          background: '#0d0500',
          borderTop: '3px solid #8B4513',
          display: 'flex',
          flexDirection: dpadLeft ? 'row' : 'row-reverse',
          alignItems: 'center',
          padding: '8px 12px',
          gap: 12,
          flexShrink: 0,
          touchAction: 'none',
        }}>
          {/* D-Pad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '54px 54px 54px',
            gridTemplateRows: '54px 54px 54px',
            gap: 3,
          }}>
            {/* Row 1: empty, up, empty */}
            <div />
            <DpadBtn label="▲" action="up" {...btnProps('up')} />
            <div />
            {/* Row 2: left, center, right */}
            <DpadBtn label="◄" action="left" {...btnProps('left')} />
            <div style={{ background: '#1a0800', borderRadius: 4 }} />
            <DpadBtn label="►" action="right" {...btnProps('right')} />
            {/* Row 3: empty, down, empty */}
            <div />
            <DpadBtn label="▼" action="down" {...btnProps('down')} />
            <div />
          </div>

          {/* Action buttons */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, height: 164 }}>
            {(['jab', 'hook', 'uppercut', 'kick'] as const).map(a => (
              <ActionBtn key={a} label={btnLabels[a]} color={btnColors[a]} {...btnProps(a)} />
            ))}
          </div>

          {/* Block button */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              style={{
                width: 54,
                height: 120,
                background: btnColors.block,
                color: '#FFD700',
                border: '2px solid #FFD700',
                fontSize: 12,
                letterSpacing: 1,
                fontFamily: "'Courier New', monospace",
                fontWeight: 'bold',
                cursor: 'pointer',
                touchAction: 'none',
                borderRadius: 4,
              }}
              {...btnProps('block')}
            >
              {btnLabels.block}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DpadBtn({ label, action, ...props }: { label: string; action: string } & Record<string, unknown>) {
  return (
    <button
      style={{
        background: '#2a1005',
        color: '#FFD700',
        border: '2px solid #8B4513',
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'monospace',
        touchAction: 'none',
        borderRadius: 4,
        WebkitTapHighlightColor: 'transparent',
      }}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {label}
    </button>
  );
}

function ActionBtn({ label, color, ...props }: { label: string; color: string } & Record<string, unknown>) {
  return (
    <button
      style={{
        background: color,
        color: '#FFD700',
        border: '2px solid #FFD70088',
        fontSize: 13,
        letterSpacing: 1,
        fontFamily: "'Courier New', monospace",
        fontWeight: 'bold',
        cursor: 'pointer',
        touchAction: 'none',
        borderRadius: 4,
        WebkitTapHighlightColor: 'transparent',
      }}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {label}
    </button>
  );
}
