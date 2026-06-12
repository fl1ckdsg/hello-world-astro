import type { CharacterCustomization } from '../../lib/storage';

export type FighterState = 'idle' | 'jab' | 'hook' | 'uppercut' | 'kick' | 'block' | 'hit' | 'ko';

const P = 4; // 1 pixel unit = 4 actual pixels

const SKIN_COLORS  = ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#4a2c10'];
const SHORTS_COLORS = ['#CC2200', '#002244', '#006600', '#8B008B', '#FFA500', '#1a1a1a'];
const GLOVES_COLORS = ['#CC0000', '#001188', '#006600', '#8B008B', '#FF8C00', '#222222'];
const HAIR_COLORS   = ['#1a0a00', '#FFD700', '#8B4513', '#111111', '#111111'];

// ── pixel block helper ───────────────────────────────────────────────────────
function b(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  x: number, y: number, w: number, h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + x * P, oy + y * P, w * P, h * P);
}

// ── draw shadow ──────────────────────────────────────────────────────────────
function shadow(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number) {
  ctx.fillStyle = '#00000044';
  ctx.beginPath();
  ctx.ellipse(ox + w * P / 2, oy + 2, w * P * 0.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAYER BOXER
// ══════════════════════════════════════════════════════════════════════════════
export function drawFighter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottom: number,
  facing: 1 | -1,
  state: FighterState,
  char: CharacterCustomization,
  isEnemy: boolean,
): void {
  if (isEnemy) {
    drawIronIvan(ctx, cx, bottom, facing, state);
    return;
  }

  const skin  = SKIN_COLORS[char.skinColor]  || SKIN_COLORS[0];
  const skinD = darken(skin, 0.8);
  const skinL = lighten(skin, 1.15);
  const shorts = SHORTS_COLORS[char.shortsColor] || SHORTS_COLORS[0];
  const gloves = GLOVES_COLORS[char.glovesColor] || GLOVES_COLORS[1];
  const hair   = HAIR_COLORS[char.hairStyle]   || HAIR_COLORS[0];

  // Sprite is 16 wide × 36 tall in pixel-units
  // ox/oy = top-left corner of sprite
  const W = 16;
  const H = 36;
  const ox = Math.round(cx - (W * P) / 2);
  const oy = Math.round(bottom - H * P);

  ctx.save();
  if (facing === -1) {
    ctx.translate(ox * 2 + W * P, 0);
    ctx.scale(-1, 1);
  }

  shadow(ctx, ox, bottom, W);

  if (state === 'ko') {
    // Fallen flat
    b(ctx, ox, oy + 26 * P, 0, 0, 16, 5, skin);
    b(ctx, ox, oy + 26 * P, 2, 0, 5, 6, skin);  // head
    b(ctx, ox, oy + 26 * P, 0, 1, 6, 2, shorts);
    ctx.restore();
    return;
  }

  const hitShake = state === 'hit' ? 1 : 0;

  // ── SHOES ──
  b(ctx, ox, oy, 1,  30, 6, 3, '#222222');
  b(ctx, ox, oy, 9,  30, 6, 3, '#222222');
  b(ctx, ox, oy, 0,  31, 2, 2, '#222222'); // toe overhang
  b(ctx, ox, oy, 14, 31, 2, 2, '#222222');

  // ── LEGS ──
  b(ctx, ox, oy, 2,  22, 4, 9, skin);
  b(ctx, ox, oy, 10, 22, 4, 9, skin);
  b(ctx, ox, oy, 3,  22, 2, 9, skinL);  // highlight
  b(ctx, ox, oy, 11, 22, 2, 9, skinL);

  // ── SHORTS ──
  const bodyW = char.bodyType === 0 ? 10 : char.bodyType === 2 ? 14 : 12;
  const bx = Math.round((W - bodyW) / 2);
  b(ctx, ox, oy, bx, 17, bodyW, 7, shorts);
  b(ctx, ox, oy, bx, 17, bodyW, 1, lighten(shorts, 1.3)); // waistband
  b(ctx, ox, oy, bx, 18, 1,     6, lighten(shorts, 1.2)); // stripe L
  b(ctx, ox, oy, bx + bodyW - 1, 18, 1, 6, lighten(shorts, 1.2)); // stripe R

  // ── TORSO ──
  b(ctx, ox, oy, bx, 8, bodyW, 10, skin);
  // Chest muscle definition
  b(ctx, ox, oy, bx + 1,           9,  Math.floor(bodyW / 2) - 1, 4, skinL);
  b(ctx, ox, oy, bx + Math.floor(bodyW / 2) + 1, 9, Math.floor(bodyW / 2) - 1, 4, skinL);
  b(ctx, ox, oy, bx + Math.floor(bodyW / 2), 9, 1, 9, skinD); // center line
  // Abs
  b(ctx, ox, oy, bx + 2, 13, 2, 2, skinD);
  b(ctx, ox, oy, bx + bodyW - 4, 13, 2, 2, skinD);

  // Tattoos
  if (char.tattoos === 1 || char.tattoos === 3) {
    b(ctx, ox, oy, bx + bodyW - 2, 9, 2, 5, '#1133AA88');
    b(ctx, ox, oy, bx + bodyW - 3, 11, 1, 3, '#1133AA88');
  }
  if (char.tattoos >= 2) {
    b(ctx, ox, oy, bx + 2, 9, 3, 5, '#AA111188');
  }

  // ── HEAD ──
  const headY = 0 + hitShake;
  b(ctx, ox, oy, 4, headY,     8, 8, skin);
  b(ctx, ox, oy, 5, headY,     6, 6, skinL); // highlight
  b(ctx, ox, oy, 3, headY + 2, 1, 4, skin);  // ear L
  b(ctx, ox, oy, 12, headY + 2, 1, 4, skin); // ear R
  // Eyes
  b(ctx, ox, oy, 5, headY + 3, 2, 2, '#111111');
  b(ctx, ox, oy, 9, headY + 3, 2, 2, '#111111');
  b(ctx, ox, oy, 5, headY + 3, 1, 1, '#FFFFFF'); // eye shine
  b(ctx, ox, oy, 9, headY + 3, 1, 1, '#FFFFFF');
  // Nose
  b(ctx, ox, oy, 7, headY + 5, 2, 1, skinD);
  // Mouth
  if (state === 'hit') {
    b(ctx, ox, oy, 6, headY + 6, 4, 1, '#FF4444');
  } else {
    b(ctx, ox, oy, 6, headY + 6, 4, 1, skinD);
  }
  // Hair
  if (char.hairStyle === 0) { // short
    b(ctx, ox, oy, 4, headY,     8, 2, hair);
    b(ctx, ox, oy, 3, headY + 1, 1, 1, hair);
    b(ctx, ox, oy, 12, headY + 1, 1, 1, hair);
  } else if (char.hairStyle === 1) { // mohawk
    b(ctx, ox, oy, 7, headY - 5, 2, 6, '#CC0000');
    b(ctx, ox, oy, 6, headY - 3, 4, 4, '#CC0000');
  } else if (char.hairStyle === 2) { // dreads
    for (let d = 0; d < 5; d++) {
      b(ctx, ox, oy, 4 + d * 2, headY - 4, 1, 6, hair);
    }
    b(ctx, ox, oy, 4, headY, 8, 2, hair);
  } else if (char.hairStyle === 4) { // afro
    b(ctx, ox, oy, 2, headY - 3, 12, 5, '#111111');
    b(ctx, ox, oy, 4, headY - 5, 8,  3, '#111111');
  }

  // ── ARMS ──
  const armTop = 8;
  const gloveSize = 5;

  if (state === 'jab') {
    // Front arm extended
    b(ctx, ox, oy, bx + bodyW, armTop + 1, 8, 3, skin);
    b(ctx, ox, oy, bx + bodyW + 7, armTop - 1, gloveSize, gloveSize + 1, gloves);
    b(ctx, ox, oy, bx + bodyW + 8, armTop, 2, 2, lighten(gloves, 1.3));
    // Back arm guard
    b(ctx, ox, oy, bx - 6, armTop + 2, 5, 3, skin);
    b(ctx, ox, oy, bx - 8, armTop,     gloveSize, gloveSize, gloves);
  } else if (state === 'hook') {
    // Wide hook
    b(ctx, ox, oy, bx + bodyW, armTop - 2, 5, 3, skin);
    b(ctx, ox, oy, bx + bodyW + 4, armTop - 5, gloveSize, gloveSize, gloves);
    b(ctx, ox, oy, bx - 6, armTop + 2, 5, 3, skin);
    b(ctx, ox, oy, bx - 8, armTop,     gloveSize, gloveSize, gloves);
  } else if (state === 'uppercut') {
    // Uppercut coming up
    b(ctx, ox, oy, bx + bodyW - 1, armTop - 4, 3, 6, skin);
    b(ctx, ox, oy, bx + bodyW - 2, armTop - 8, gloveSize, gloveSize, gloves);
    b(ctx, ox, oy, bx - 6, armTop + 2, 5, 3, skin);
    b(ctx, ox, oy, bx - 8, armTop,     gloveSize, gloveSize, gloves);
  } else if (state === 'kick') {
    // Kick - leg flies out, arms guard
    b(ctx, ox, oy, bx + bodyW, 22, 10, 3, skin);
    b(ctx, ox, oy, bx + bodyW + 10, 23, 4, 3, '#222222'); // kick shoe
    b(ctx, ox, oy, bx - 6, armTop + 1, 5, 3, skin);
    b(ctx, ox, oy, bx - 8, armTop - 1, gloveSize, gloveSize, gloves);
    b(ctx, ox, oy, bx + bodyW, armTop + 1, 4, 3, skin);
    b(ctx, ox, oy, bx + bodyW + 3, armTop - 1, gloveSize, gloveSize, gloves);
  } else if (state === 'block') {
    // Cross arms in front of face
    b(ctx, ox, oy, bx + bodyW, armTop - 2, 4, 5, skin);
    b(ctx, ox, oy, bx + bodyW + 3, armTop - 4, gloveSize, gloveSize, gloves);
    b(ctx, ox, oy, bx - 6, armTop - 2, 4, 5, skin);
    b(ctx, ox, oy, bx - 8, armTop - 4, gloveSize, gloveSize, gloves);
  } else {
    // Idle / hit - classic guard stance
    b(ctx, ox, oy, bx + bodyW, armTop + 1, 4, 4, skin);
    b(ctx, ox, oy, bx + bodyW + 3, armTop - 1, gloveSize, gloveSize, gloves);
    b(ctx, ox, oy, bx + bodyW + 4, armTop,     2,         2,          lighten(gloves, 1.3));
    b(ctx, ox, oy, bx - 6, armTop + 1, 5, 4, skin);
    b(ctx, ox, oy, bx - 8, armTop - 1, gloveSize, gloveSize, gloves);
    b(ctx, ox, oy, bx - 7, armTop,     2,         2,          lighten(gloves, 1.3));
  }

  // Arm tattoo
  if (char.tattoos === 1 || char.tattoos === 3) {
    b(ctx, ox, oy, bx + bodyW + 1, armTop + 2, 2, 3, '#1133AAAA');
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════════════════════
// IRON IVAN — robot enemy
// ══════════════════════════════════════════════════════════════════════════════
function drawIronIvan(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottom: number,
  facing: 1 | -1,
  state: FighterState,
) {
  const W = 20;
  const H = 40;
  const ox = Math.round(cx - (W * P) / 2);
  const oy = Math.round(bottom - H * P);

  ctx.save();
  if (facing === 1) {
    ctx.translate(ox * 2 + W * P, 0);
    ctx.scale(-1, 1);
  }

  shadow(ctx, ox, bottom, W);

  if (state === 'ko') {
    b(ctx, ox, oy, 0, 32, 20, 6, '#667788');
    b(ctx, ox, oy, 0, 32, 6,  7, '#556677'); // head side
    ctx.restore();
    return;
  }

  const hitShake = state === 'hit' ? 1 : 0;

  const M  = '#8899AA'; // main metal
  const ML = '#AABBCC'; // light metal
  const MD = '#445566'; // dark metal
  const MB = '#667788'; // mid metal
  const RV = '#FF2200'; // rivets / accents
  const EG = '#00FFAA'; // eye glow

  // ── FEET / BOOTS ──
  b(ctx, ox, oy, 1, 35, 7, 4, MD);
  b(ctx, ox, oy, 11, 35, 7, 4, MD);
  b(ctx, ox, oy, 0, 37, 4, 2, MD); // toe
  b(ctx, ox, oy, 15, 37, 4, 2, MD);

  // ── LEGS ──
  b(ctx, ox, oy, 2, 25, 5, 12, MB);
  b(ctx, ox, oy, 12, 25, 5, 12, MB);
  b(ctx, ox, oy, 3, 25, 2, 12, ML); // highlight
  b(ctx, ox, oy, 13, 25, 2, 12, ML);
  // knee joints
  b(ctx, ox, oy, 1, 30, 7, 3, M);
  b(ctx, ox, oy, 11, 30, 7, 3, M);
  b(ctx, ox, oy, 3, 29, 3, 5, ML);
  b(ctx, ox, oy, 13, 29, 3, 5, ML);

  // ── WAIST / PELVIS ──
  b(ctx, ox, oy, 1, 22, 17, 5, MD);
  b(ctx, ox, oy, 2, 22, 15, 1, MB); // top edge
  b(ctx, ox, oy, 4, 23, 2, 2, RV); // rivets
  b(ctx, ox, oy, 13, 23, 2, 2, RV);

  // ── TORSO ──
  b(ctx, ox, oy, 1, 10, 17, 13, M);
  b(ctx, ox, oy, 2, 10, 5, 13, ML); // left panel
  b(ctx, ox, oy, 12, 10, 5, 13, ML); // right panel
  b(ctx, ox, oy, 7, 10, 5, 13, M);   // center panel
  // Chest plates seams
  b(ctx, ox, oy, 7, 10, 1, 13, MD);
  b(ctx, ox, oy, 11, 10, 1, 13, MD);
  b(ctx, ox, oy, 1, 16, 17, 1, MD); // horizontal seam
  // Chest emblem / power core
  b(ctx, ox, oy, 8, 12, 3, 3, '#004488');
  b(ctx, ox, oy, 9, 13, 1, 1, '#00CCFF');
  // Rivets
  b(ctx, ox, oy, 2, 11, 1, 1, RV);
  b(ctx, ox, oy, 16, 11, 1, 1, RV);
  b(ctx, ox, oy, 2, 20, 1, 1, RV);
  b(ctx, ox, oy, 16, 20, 1, 1, RV);

  // ── HEAD ──
  const headY = 1 + hitShake;
  b(ctx, ox, oy, 2, headY,     15, 10, M);
  b(ctx, ox, oy, 3, headY,     13, 2,  ML); // top highlight
  b(ctx, ox, oy, 2, headY,     2,  10, MB); // left edge
  b(ctx, ox, oy, 15, headY,    2,  10, MD); // right shadow
  // Head bolts
  b(ctx, ox, oy, 1, headY + 2, 2, 2, MD);
  b(ctx, ox, oy, 16, headY + 2, 2, 2, MD);
  // Visor / eyes
  b(ctx, ox, oy, 4, headY + 3, 11, 3, '#001122');
  b(ctx, ox, oy, 5, headY + 4,  4, 1, EG); // left eye glow
  b(ctx, ox, oy, 10, headY + 4, 4, 1, EG); // right eye glow
  b(ctx, ox, oy, 5, headY + 3,  4, 1, '#005533'); // glow base
  b(ctx, ox, oy, 10, headY + 3, 4, 1, '#005533');
  // Jaw
  b(ctx, ox, oy, 3, headY + 7, 13, 3, MB);
  b(ctx, ox, oy, 5, headY + 8,  2, 1, MD); // grille
  b(ctx, ox, oy, 8, headY + 8,  2, 1, MD);
  b(ctx, ox, oy, 11, headY + 8, 2, 1, MD);

  // ── SHOULDERS ──
  b(ctx, ox, oy, 0, 8,  4, 5, MB);  // left shoulder pad
  b(ctx, ox, oy, 15, 8, 4, 5, MB);  // right shoulder pad
  b(ctx, ox, oy, 0, 8,  3, 1, ML);
  b(ctx, ox, oy, 16, 8, 3, 1, ML);

  // ── ARMS ──
  if (state === 'jab') {
    // Front arm punch
    b(ctx, ox, oy, 18, 10, 5, 5, MB); // upper arm
    b(ctx, ox, oy, 22, 12, 8, 4, M);  // forearm extended
    b(ctx, ox, oy, 29, 11, 6, 6, MD); // fist
    b(ctx, ox, oy, 30, 12, 3, 3, ML); // fist highlight
    // Back arm
    b(ctx, ox, oy, -3, 10, 5, 5, MB);
    b(ctx, ox, oy, -5, 12, 5, 4, M);
    b(ctx, ox, oy, -8, 11, 5, 5, MD);
  } else if (state === 'hook') {
    b(ctx, ox, oy, 18, 8,  5, 5, MB);
    b(ctx, ox, oy, 22, 6,  5, 4, M);
    b(ctx, ox, oy, 26, 4,  5, 5, MD);
    b(ctx, ox, oy, -3, 10, 5, 5, MB);
    b(ctx, ox, oy, -6, 12, 5, 4, M);
    b(ctx, ox, oy, -9, 11, 5, 5, MD);
  } else if (state === 'uppercut') {
    b(ctx, ox, oy, 17, 12, 5, 5, MB);
    b(ctx, ox, oy, 18, 6,  4, 7, M);
    b(ctx, ox, oy, 17, 2,  5, 5, MD);
    b(ctx, ox, oy, -3, 10, 5, 5, MB);
    b(ctx, ox, oy, -6, 12, 5, 4, M);
    b(ctx, ox, oy, -9, 11, 5, 5, MD);
  } else if (state === 'block') {
    b(ctx, ox, oy, 18, 6,  5, 8, MB);
    b(ctx, ox, oy, 20, 4,  5, 5, MD);
    b(ctx, ox, oy, -3, 6,  5, 8, MB);
    b(ctx, ox, oy, -5, 4,  5, 5, MD);
  } else {
    // Guard stance
    b(ctx, ox, oy, 18, 10, 5, 6, MB);
    b(ctx, ox, oy, 22, 12, 5, 4, M);
    b(ctx, ox, oy, 26, 11, 5, 5, MD);
    b(ctx, ox, oy, -3, 10, 5, 6, MB);
    b(ctx, ox, oy, -6, 12, 5, 4, M);
    b(ctx, ox, oy, -9, 11, 5, 5, MD);
  }

  ctx.restore();
}

// ── colour helpers ───────────────────────────────────────────────────────────
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const bl = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(bl * factor)})`;
}
function lighten(hex: string, factor: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
  const bl = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(bl)})`;
}
