import React, { useEffect, useRef, useState, useCallback } from 'react';
import { t } from '../../lib/i18n';
import type { Language } from '../../lib/i18n';
import type { UserData } from '../../lib/storage';
import { hapticFeedback } from '../../lib/telegram';
import { drawFighter } from '../game/FighterRenderer';
import type { FighterState } from '../game/FighterRenderer';
import type { CharacterCustomization } from '../../lib/storage';

interface Props {
  userData: UserData;
  onBack: () => void;
}

interface Fighter {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: FighterState;
  stateTimer: number;
  facing: 1 | -1;
  isBlocking: boolean;
  comboCount: number;
  lastAttackTime: number;
}

interface Fan {
  x: number;
  y: number;
  baseY: number;
  color: string;
  phase: number;
  speed: number;
  excitement: number;
}

type GamePhase = 'countdown' | 'fight' | 'roundEnd' | 'gameOver';

const CANVAS_W = 360;
const CANVAS_H = 480;
const RING_FLOOR_Y = 320;
const RING_LEFT = 20;
const RING_RIGHT = 340;
const FIGHTER_GROUND = RING_FLOOR_Y - 5;
const ROUND_DURATION = 60;
const TOTAL_ROUNDS = 3;
const HIT_DISTANCE = 70;
const ATTACK_DURATIONS: Record<string, number> = {
  jab: 18,
  hook: 28,
  uppercut: 38,
  kick: 32,
};
const ATTACK_DAMAGE: Record<string, number> = {
  jab: 8,
  hook: 15,
  uppercut: 25,
  kick: 18,
};
const ATTACK_HIT_FRAME: Record<string, number> = {
  jab: 8,
  hook: 14,
  uppercut: 19,
  kick: 16,
};

const FAN_COLORS = ['#CC2200', '#002244', '#FFD700', '#006600', '#8B008B', '#FFA500', '#ffffff', '#ff6688'];

const ENEMY_CHAR: CharacterCustomization = {
  skinColor: 2,
  hairStyle: 0,
  bodyType: 2,
  tattoos: 1,
  shortsColor: 1,
  glovesColor: 1,
};

export default function GameScreen({ userData, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    player: Fighter;
    enemy: Fighter;
    fans: Fan[];
    phase: GamePhase;
    round: number;
    timer: number;
    frameCount: number;
    countdownTimer: number;
    playerRoundsWon: number;
    enemyRoundsWon: number;
    comboDisplay: number;
    comboTimer: number;
    hitEffects: { x: number; y: number; timer: number; text: string }[];
    aiTimer: number;
    playerMoveDir: number;
    attackHit: Record<string, boolean>;
  }>();
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [gameOverResult, setGameOverResult] = useState<'win' | 'lose' | null>(null);
  const [displayPhase, setDisplayPhase] = useState<GamePhase>('countdown');
  const [displayRound, setDisplayRound] = useState(1);
  const [displayTimer, setDisplayTimer] = useState(ROUND_DURATION);
  const lang = userData.language as Language;

  const createFighters = (): { player: Fighter; enemy: Fighter } => ({
    player: {
      x: 80,
      y: 0,
      hp: 100,
      maxHp: 100,
      state: 'idle',
      stateTimer: 0,
      facing: 1,
      isBlocking: false,
      comboCount: 0,
      lastAttackTime: 0,
    },
    enemy: {
      x: 280,
      y: 0,
      hp: 100,
      maxHp: 100,
      state: 'idle',
      stateTimer: 0,
      facing: -1,
      isBlocking: false,
      comboCount: 0,
      lastAttackTime: 0,
    },
  });

  const createFans = (): Fan[] => {
    const fans: Fan[] = [];
    for (let i = 0; i < 55; i++) {
      const bY = 60 + Math.floor(i / 12) * 28 + Math.random() * 10;
      fans.push({
        x: 20 + Math.random() * 320,
        y: bY,
        baseY: bY,
        color: FAN_COLORS[Math.floor(Math.random() * FAN_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.06 + Math.random() * 0.06,
        excitement: 0.3,
      });
    }
    return fans;
  };

  const initGame = useCallback(() => {
    const { player, enemy } = createFighters();
    stateRef.current = {
      player,
      enemy,
      fans: createFans(),
      phase: 'countdown',
      round: 1,
      timer: ROUND_DURATION,
      frameCount: 0,
      countdownTimer: 180,
      playerRoundsWon: 0,
      enemyRoundsWon: 0,
      comboDisplay: 0,
      comboTimer: 0,
      hitEffects: [],
      aiTimer: 60,
      playerMoveDir: 0,
      attackHit: {},
    };
    setDisplayPhase('countdown');
    setDisplayRound(1);
    setDisplayTimer(ROUND_DURATION);
    setGameOverResult(null);
  }, []);

  const doAttack = useCallback((attackType: string) => {
    const s = stateRef.current;
    if (!s) return;
    const f = s.player;
    if (f.state !== 'idle' && f.state !== 'block') return;
    if (s.phase !== 'fight') return;
    f.state = attackType as FighterState;
    f.stateTimer = ATTACK_DURATIONS[attackType] || 20;
    s.attackHit[attackType + '_player'] = false;
  }, []);

  const doBlock = useCallback((blocking: boolean) => {
    const s = stateRef.current;
    if (!s) return;
    const f = s.player;
    if (blocking) {
      if (f.state === 'idle' || f.state === 'block') {
        f.state = 'block';
        f.isBlocking = true;
      }
    } else {
      if (f.state === 'block') {
        f.state = 'idle';
        f.isBlocking = false;
      }
    }
  }, []);

  const setMoveDir = useCallback((dir: number) => {
    const s = stateRef.current;
    if (!s) return;
    s.playerMoveDir = dir;
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawBackground = (ctx: CanvasRenderingContext2D) => {
      const sky = ctx.createLinearGradient(0, 0, 0, RING_FLOOR_Y - 60);
      sky.addColorStop(0, '#0a0418');
      sky.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, RING_FLOOR_Y - 60);
    };

    const drawCrowd = (ctx: CanvasRenderingContext2D, fans: Fan[]) => {
      fans.forEach(fan => {
        fan.phase += fan.speed * (0.5 + fan.excitement);
        const yOff = Math.abs(Math.sin(fan.phase)) * 10 * (0.5 + fan.excitement);
        fan.y = fan.baseY - yOff;
        fan.excitement = Math.max(0.2, fan.excitement * 0.995);
        ctx.fillStyle = fan.color;
        ctx.fillRect(fan.x - 5, fan.y - 14, 10, 14);
        ctx.fillStyle = '#dda070';
        ctx.beginPath();
        ctx.arc(fan.x, fan.y - 18, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawRing = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#4a2000';
      ctx.fillRect(0, RING_FLOOR_Y - 60, CANVAS_W, 40);

      ctx.fillStyle = '#F0D060';
      ctx.beginPath();
      ctx.moveTo(RING_LEFT - 10, RING_FLOOR_Y - 20);
      ctx.lineTo(RING_RIGHT + 10, RING_FLOOR_Y - 20);
      ctx.lineTo(RING_RIGHT + 30, RING_FLOOR_Y + 80);
      ctx.lineTo(RING_LEFT - 30, RING_FLOOR_Y + 80);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#c0a030';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, RING_FLOOR_Y - 20);
      ctx.lineTo(CANVAS_W / 2, RING_FLOOR_Y + 80);
      ctx.stroke();

      ctx.fillStyle = '#CC2200';
      ctx.fillRect(RING_LEFT - 10, RING_FLOOR_Y - 62, CANVAS_W - RING_LEFT * 2 + 20, 6);

      const postColor = '#8B4513';
      const postW = 8;
      const postH = 50;
      [RING_LEFT - 10, RING_RIGHT + 2].forEach(px => {
        ctx.fillStyle = postColor;
        ctx.fillRect(px, RING_FLOOR_Y - 62 - postH, postW, postH + 6);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(px - 2, RING_FLOOR_Y - 62 - postH - 6, postW + 4, 8);
      });

      [0, 15, 30].forEach((offset, i) => {
        ctx.strokeStyle = i === 1 ? '#CC2200' : '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(RING_LEFT - 6, RING_FLOOR_Y - 62 - offset);
        ctx.lineTo(RING_RIGHT + 6, RING_FLOOR_Y - 62 - offset);
        ctx.stroke();
      });
    };

    const drawHUD = (ctx: CanvasRenderingContext2D, s: typeof stateRef.current) => {
      if (!s) return;

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_W, 50);

      const pHpPct = s.player.hp / s.player.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(10, 10, 130, 16);
      const pGrad = ctx.createLinearGradient(10, 0, 140, 0);
      pGrad.addColorStop(0, '#CC2200');
      pGrad.addColorStop(0.5, '#FF6600');
      pGrad.addColorStop(1, '#FFD700');
      ctx.fillStyle = pGrad;
      ctx.fillRect(10, 10, 130 * pHpPct, 16);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 130, 16);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText(userData.nickname.substring(0, 10) || 'PLAYER', 10, 44);

      const eHpPct = s.enemy.hp / s.enemy.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(CANVAS_W - 140, 10, 130, 16);
      const eGrad = ctx.createLinearGradient(CANVAS_W - 140, 0, CANVAS_W - 10, 0);
      eGrad.addColorStop(0, '#FFD700');
      eGrad.addColorStop(0.5, '#0066FF');
      eGrad.addColorStop(1, '#002244');
      ctx.fillStyle = eGrad;
      ctx.fillRect(CANVAS_W - 140 + 130 * (1 - eHpPct), 10, 130 * eHpPct, 16);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.strokeRect(CANVAS_W - 140, 10, 130, 16);

      ctx.fillStyle = '#88aaff';
      ctx.textAlign = 'right';
      ctx.fillText('CPU', CANVAS_W - 10, 44);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(`R${s.round}`, CANVAS_W / 2, 22);
      ctx.font = 'bold 18px Courier New';
      ctx.fillText(String(Math.ceil(s.timer)).padStart(2, '0'), CANVAS_W / 2, 44);

      if (s.comboDisplay >= 2 && s.comboTimer > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`${s.comboDisplay}x COMBO!`, CANVAS_W / 2, 80);
      }

      s.hitEffects = s.hitEffects.filter(e => e.timer > 0);
      s.hitEffects.forEach(e => {
        e.timer--;
        const alpha = e.timer / 30;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(e.text, e.x, e.y - (30 - e.timer) * 0.5);
        ctx.globalAlpha = 1;
      });
    };

    const drawCountdown = (ctx: CanvasRenderingContext2D, timer: number, round: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 100, CANVAS_W, 120);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(`ROUND ${round}`, CANVAS_W / 2, 140);

      const countNum = Math.ceil(timer / 60);
      ctx.font = 'bold 80px Courier New';
      ctx.fillStyle = countNum <= 1 ? '#CC2200' : '#FFD700';
      ctx.fillText(countNum > 0 ? String(countNum) : 'FIGHT!', CANVAS_W / 2, 200);
    };

    const drawRoundEnd = (ctx: CanvasRenderingContext2D, s: typeof stateRef.current) => {
      if (!s) return;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 100, CANVAS_W, 120);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 32px Courier New';
      ctx.textAlign = 'center';
      const pWon = s.player.hp > s.enemy.hp;
      ctx.fillText(pWon ? 'ROUND WIN!' : 'ROUND LOST', CANVAS_W / 2, 170);
      ctx.font = 'bold 14px Courier New';
      ctx.fillText(`Rounds: YOU ${s.playerRoundsWon} - ${s.enemyRoundsWon} CPU`, CANVAS_W / 2, 200);
    };

    const drawGameOver = (ctx: CanvasRenderingContext2D, result: 'win' | 'lose') => {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 80, CANVAS_W, 200);
      ctx.fillStyle = result === 'win' ? '#FFD700' : '#CC2200';
      ctx.font = 'bold 36px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(result === 'win' ? 'YOU WIN!' : 'YOU LOSE!', CANVAS_W / 2, 160);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px Courier New';
      ctx.fillText('Tap PLAY AGAIN to restart', CANVAS_W / 2, 200);
    };

    const updateAI = (s: typeof stateRef.current) => {
      if (!s) return;
      const ai = s.enemy;
      const player = s.player;
      if (s.phase !== 'fight') return;
      if (ai.state !== 'idle') return;

      s.aiTimer--;
      if (s.aiTimer > 0) return;

      const dist = Math.abs(ai.x - player.x);
      const hpRatio = ai.hp / ai.maxHp;
      const actions: Array<{ weight: number; action: () => void }> = [];

      actions.push({
        weight: dist > 80 ? 40 : 10,
        action: () => {
          const dir = player.x < ai.x ? -1 : 1;
          ai.x = Math.max(RING_LEFT + 20, Math.min(RING_RIGHT - 20, ai.x + dir * 18));
        }
      });

      if (dist < HIT_DISTANCE + 20) {
        actions.push({ weight: 25, action: () => { ai.state = 'jab'; ai.stateTimer = ATTACK_DURATIONS.jab; s.attackHit['jab_enemy'] = false; } });
        actions.push({ weight: 18, action: () => { ai.state = 'hook'; ai.stateTimer = ATTACK_DURATIONS.hook; s.attackHit['hook_enemy'] = false; } });
        actions.push({ weight: 10, action: () => { ai.state = 'kick'; ai.stateTimer = ATTACK_DURATIONS.kick; s.attackHit['kick_enemy'] = false; } });
        if (hpRatio < 0.5) {
          actions.push({ weight: 20, action: () => { ai.state = 'block'; ai.stateTimer = 45; ai.isBlocking = true; } });
        }
      }

      if (hpRatio < 0.3) {
        actions.push({ weight: 30, action: () => { ai.state = 'block'; ai.stateTimer = 60; ai.isBlocking = true; } });
      }

      const total = actions.reduce((sum, a) => sum + a.weight, 0);
      let rng = Math.random() * total;
      for (const a of actions) {
        rng -= a.weight;
        if (rng <= 0) {
          a.action();
          break;
        }
      }

      s.aiTimer = 30 + Math.floor(Math.random() * 30);
    };

    const updateFighter = (f: Fighter, isPlayer: boolean, s: typeof stateRef.current) => {
      if (!s) return;

      if (f.stateTimer > 0) {
        f.stateTimer--;
        if (f.stateTimer === 0) {
          if (f.state !== 'ko') {
            f.state = 'idle';
            f.isBlocking = false;
          }
        }
      }

      if (isPlayer && s.phase === 'fight') {
        if (f.state === 'idle' || f.state === 'block') {
          const moveSpeed = 3;
          if (s.playerMoveDir !== 0) {
            f.x = Math.max(RING_LEFT + 20, Math.min(RING_RIGHT - 20, f.x + s.playerMoveDir * moveSpeed));
          }
        }
      }

      if (isPlayer) {
        f.facing = f.x < s.enemy.x ? 1 : -1;
      } else {
        f.facing = f.x > s.player.x ? -1 : 1;
      }

      if (f.comboCount > 0) {
        f.lastAttackTime++;
        if (f.lastAttackTime > 120) {
          f.comboCount = 0;
          f.lastAttackTime = 0;
        }
      }
    };

    const checkHits = (attacker: Fighter, defender: Fighter, isPlayerAttacking: boolean, s: typeof stateRef.current) => {
      if (!s) return;
      const atkType = attacker.state;
      if (!['jab', 'hook', 'uppercut', 'kick'].includes(atkType)) return;

      const hitKey = `${atkType}_${isPlayerAttacking ? 'player' : 'enemy'}`;
      if (s.attackHit[hitKey]) return;

      const hitFrame = ATTACK_HIT_FRAME[atkType] || 10;
      const framesIntoAttack = (ATTACK_DURATIONS[atkType] || 20) - attacker.stateTimer;
      if (framesIntoAttack < hitFrame - 2 || framesIntoAttack > hitFrame + 4) return;

      const dist = Math.abs(attacker.x - defender.x);
      if (dist > HIT_DISTANCE) return;

      s.attackHit[hitKey] = true;

      if (defender.isBlocking) {
        const blockedDmg = Math.floor((ATTACK_DAMAGE[atkType] || 10) * 0.15);
        defender.hp = Math.max(0, defender.hp - blockedDmg);
        s.hitEffects.push({ x: defender.x, y: FIGHTER_GROUND - 80, timer: 30, text: 'BLOCK!' });
        return;
      }

      const dmg = ATTACK_DAMAGE[atkType] || 10;
      defender.hp = Math.max(0, defender.hp - dmg);

      attacker.comboCount++;
      attacker.lastAttackTime = 0;
      if (isPlayerAttacking) {
        s.comboDisplay = attacker.comboCount;
        s.comboTimer = 90;
      }

      const hitTexts: Record<string, string> = {
        jab: 'JAB!', hook: 'HOOK!', uppercut: 'UPPER!', kick: 'KICK!'
      };
      s.hitEffects.push({
        x: defender.x,
        y: FIGHTER_GROUND - 100,
        timer: 30,
        text: hitTexts[atkType] || 'HIT!'
      });

      s.fans.forEach(fan => {
        fan.excitement = Math.min(1, fan.excitement + 0.3);
      });

      if (isPlayerAttacking) {
        hapticFeedback('medium');
      }

      if (defender.hp <= 0) {
        defender.state = 'ko';
        defender.stateTimer = 999;
      } else {
        defender.state = 'hit';
        defender.stateTimer = 12;
      }
    };

    const gameLoop = (timestamp: number) => {
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      if (dt > 200) {
        animRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const s = stateRef.current;
      if (!s) {
        animRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      s.frameCount++;

      if (s.phase === 'countdown') {
        s.countdownTimer--;
        if (s.countdownTimer <= 0) {
          s.phase = 'fight';
          s.countdownTimer = 180;
          setDisplayPhase('fight');
        }
      } else if (s.phase === 'fight') {
        s.timer -= 1 / 60;
        setDisplayTimer(Math.ceil(s.timer));

        updateFighter(s.player, true, s);
        updateFighter(s.enemy, false, s);
        updateAI(s);

        if (s.player.state !== 'idle' && s.player.state !== 'block' && s.player.state !== 'hit' && s.player.state !== 'ko') {
          checkHits(s.player, s.enemy, true, s);
        }
        if (s.enemy.state !== 'idle' && s.enemy.state !== 'block' && s.enemy.state !== 'hit' && s.enemy.state !== 'ko') {
          checkHits(s.enemy, s.player, false, s);
        }

        if (s.comboTimer > 0) s.comboTimer--;

        if (s.player.hp <= 0 || s.enemy.hp <= 0 || s.timer <= 0) {
          s.phase = 'roundEnd';
          s.countdownTimer = 150;
          const pWon = s.player.hp > s.enemy.hp || s.enemy.hp <= 0;
          if (pWon) s.playerRoundsWon++; else s.enemyRoundsWon++;
          setDisplayPhase('roundEnd');
        }
      } else if (s.phase === 'roundEnd') {
        s.countdownTimer--;
        if (s.countdownTimer <= 0) {
          if (s.round >= TOTAL_ROUNDS || s.playerRoundsWon > 1 || s.enemyRoundsWon > 1) {
            s.phase = 'gameOver';
            const result = s.playerRoundsWon >= s.enemyRoundsWon ? 'win' : 'lose';
            setGameOverResult(result);
            setDisplayPhase('gameOver');
          } else {
            s.round++;
            const { player, enemy } = createFighters();
            s.player = player;
            s.enemy = enemy;
            s.phase = 'countdown';
            s.countdownTimer = 180;
            s.timer = ROUND_DURATION;
            s.attackHit = {};
            s.hitEffects = [];
            setDisplayRound(s.round);
            setDisplayTimer(ROUND_DURATION);
            setDisplayPhase('countdown');
          }
        }
      }

      // === DRAW ===
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      drawBackground(ctx);
      drawCrowd(ctx, s.fans);
      drawRing(ctx);

      drawFighter(ctx, s.player.x, FIGHTER_GROUND, s.player.facing, s.player.state, userData.character, false);
      drawFighter(ctx, s.enemy.x, FIGHTER_GROUND, s.enemy.facing, s.enemy.state, ENEMY_CHAR, true);

      drawHUD(ctx, s);

      if (s.phase === 'countdown') {
        drawCountdown(ctx, s.countdownTimer, s.round);
      } else if (s.phase === 'roundEnd') {
        drawRoundEnd(ctx, s);
      } else if (s.phase === 'gameOver') {
        const res = s.playerRoundsWon >= s.enemyRoundsWon ? 'win' : 'lose';
        drawGameOver(ctx, res);
      }

      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [userData]);

  // suppress unused display state warnings
  void displayPhase;
  void displayRound;
  void displayTimer;

  const isLeftHand = userData.settings.controlLayout === 'left';

  const dpadBtnStyle: React.CSSProperties = {
    background: '#3d1a00',
    border: '2px solid #8B4513',
    color: '#FFD700',
    fontFamily: 'Courier New, monospace',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    touchAction: 'none',
    userSelect: 'none',
  };

  const attackBtnStyle = (color: string): React.CSSProperties => ({
    width: '58px',
    height: '58px',
    background: color,
    border: '3px solid #FFD700',
    color: '#FFD700',
    fontFamily: 'Courier New, monospace',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    boxShadow: '3px 3px 0 #000',
    touchAction: 'none',
    userSelect: 'none',
    flexShrink: 0,
  });

  const blockBtnStyle: React.CSSProperties = {
    width: '80px',
    height: '40px',
    background: '#004488',
    border: '3px solid #88aaff',
    color: '#88aaff',
    fontFamily: 'Courier New, monospace',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    touchAction: 'none',
    userSelect: 'none',
    flexShrink: 0,
  };

  const DPad = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '44px 44px 44px',
      gridTemplateRows: '44px 44px 44px',
      gap: '2px',
    }}>
      <div />
      <button style={dpadBtnStyle}>▲</button>
      <div />
      <button
        style={dpadBtnStyle}
        onPointerDown={() => setMoveDir(-1)}
        onPointerUp={() => setMoveDir(0)}
        onPointerLeave={() => setMoveDir(0)}
      >◄</button>
      <div style={{
        background: '#3d1a00',
        border: '2px solid #8B4513',
        borderRadius: '4px',
      }}/>
      <button
        style={dpadBtnStyle}
        onPointerDown={() => setMoveDir(1)}
        onPointerUp={() => setMoveDir(0)}
        onPointerLeave={() => setMoveDir(0)}
      >►</button>
      <div />
      <div />
      <div />
    </div>
  );

  const AttackButtons = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button style={attackBtnStyle('#880000')} onPointerDown={() => doAttack('jab')}>
          {t('jab', lang)}
        </button>
        <button style={attackBtnStyle('#884400')} onPointerDown={() => doAttack('hook')}>
          {t('hook', lang)}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button style={attackBtnStyle('#006633')} onPointerDown={() => doAttack('uppercut')}>
          {t('uppercut', lang)}
        </button>
        <button style={attackBtnStyle('#440088')} onPointerDown={() => doAttack('kick')}>
          {t('kick', lang)}
        </button>
      </div>
      <button
        style={blockBtnStyle}
        onPointerDown={() => doBlock(true)}
        onPointerUp={() => doBlock(false)}
        onPointerLeave={() => doBlock(false)}
      >
        🛡️ {t('block', lang)}
      </button>
    </div>
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a0a00',
      overflow: 'hidden',
    }}>
      {/* Game Canvas */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            width: '100%',
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'transparent',
            width: '60px',
            height: '20px',
            cursor: 'pointer',
            zIndex: 10,
          }}
        />
      </div>

      {/* Controls */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#0d0500',
        borderTop: '2px solid #8B4513',
        minHeight: '160px',
      }}>
        {isLeftHand ? (
          <>
            <AttackButtons />
            <DPad />
          </>
        ) : (
          <>
            <DPad />
            <AttackButtons />
          </>
        )}
      </div>

      {/* Game Over overlay buttons */}
      {gameOverResult && (
        <div style={{
          position: 'absolute',
          bottom: '200px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          zIndex: 20,
        }}>
          <button
            className="pixel-btn"
            onClick={initGame}
            style={{ minWidth: '120px' }}
          >
            🔄 {t('play_again', lang)}
          </button>
          <button
            className="pixel-btn"
            onClick={onBack}
            style={{ minWidth: '100px', background: '#3d1a00' }}
          >
            ← {t('back', lang)}
          </button>
        </div>
      )}
    </div>
  );
}
