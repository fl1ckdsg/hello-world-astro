import type { CharacterCustomization } from '../../lib/storage';

export type FighterState = 'idle' | 'jab' | 'hook' | 'uppercut' | 'kick' | 'block' | 'hit' | 'ko';

const SKIN_COLORS  = ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#4a2c10'];
const SHORTS_COLORS = ['#CC2200', '#002244', '#006600', '#8B008B', '#FFA500', '#1a1a1a'];
const GLOVES_COLORS = ['#CC0000', '#001188', '#006600', '#8B008B', '#FF8C00', '#222222'];

function darken(hex: string, f: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
}
function lighten(hex: string, f: number): string {
  return `rgb(${Math.min(255,Math.round(parseInt(hex.slice(1,3),16)*f))},${Math.min(255,Math.round(parseInt(hex.slice(3,5),16)*f))},${Math.min(255,Math.round(parseInt(hex.slice(5,7),16)*f))})`;
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  cx: number, bottom: number,
  facing: 1 | -1,
  state: FighterState,
  char: CharacterCustomization,
  isEnemy: boolean,
): void {
  if (isEnemy) { drawIronIvan(ctx, cx, bottom, facing, state); return; }
  drawBoxer(ctx, cx, bottom, facing, state, char);
}

// ═══════════════════════════════════════════════
// PLAYER BOXER  — 22×44 units @ P=4  (88×176 px)
// ═══════════════════════════════════════════════
function drawBoxer(
  ctx: CanvasRenderingContext2D,
  cx: number, bottom: number,
  facing: 1 | -1,
  state: FighterState,
  char: CharacterCustomization,
) {
  const P = 4;
  const W = 22, H = 44;
  const ox = Math.round(cx - W * P / 2);
  const oy = Math.round(bottom - H * P);

  const skin  = SKIN_COLORS[char.skinColor]   || SKIN_COLORS[0];
  const skinL = lighten(skin, 1.22);
  const skinD = darken(skin, 0.72);
  const sh    = SHORTS_COLORS[char.shortsColor] || SHORTS_COLORS[0];
  const shL   = lighten(sh, 1.35);
  const shD   = darken(sh, 0.65);
  const gl    = GLOVES_COLORS[char.glovesColor] || GLOVES_COLORS[0];
  const glL   = lighten(gl, 1.35);
  const glD   = darken(gl, 0.65);

  ctx.save();
  if (facing === -1) { ctx.translate(Math.round(ox * 2 + W * P), 0); ctx.scale(-1, 1); }

  const b = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x * P, oy + y * P, w * P, h * P);
  };

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(ox + W*P/2, bottom + 3, W*P*0.38, 5, 0, 0, Math.PI*2);
  ctx.fill();

  if (state === 'ko') {
    b(0,38, 22,5, skin); b(0,38, 5,6, '#CC2200');
    b(3,39, 13,4, sh); ctx.restore(); return;
  }

  const hk = state === 'hit' ? 1 : 0;

  // ── SHOES ──
  b(4, 41, 6, 3, '#1a0800');
  b(12,41, 6, 3, '#1a0800');
  b(3, 43, 2, 1, '#1a0800');   // left toe
  b(17,43, 2, 1, '#1a0800');   // right toe
  b(5, 41, 3, 1, '#554433');   // shine L
  b(13,41, 3, 1, '#554433');   // shine R

  // ── SOCKS ──
  b(5, 38, 5, 4, '#FFFFFF');
  b(12,38, 5, 4, '#FFFFFF');
  b(6, 38, 3, 3, '#EEEEEE');
  b(13,38, 3, 3, '#EEEEEE');

  // ── LOWER LEGS ──
  b(5, 31, 5, 8, skin);
  b(12,31, 5, 8, skin);
  b(6, 31, 3, 7, skinL);
  b(13,31, 3, 7, skinL);
  b(9, 32, 1, 6, skinD);
  b(16,32, 1, 6, skinD);

  // ── SHORTS ──
  b(4, 23, 14, 9, sh);
  b(4, 23, 14, 2, '#FFD700');  // gold waistband
  b(4, 25, 2, 7, shL);        // left stripe
  b(16,25, 2, 7, shL);        // right stripe
  b(10,23, 2, 9, shD);        // center seam

  // ── TORSO ──
  b(2, 12, 18, 12, skin);      // full body block
  b(3, 12, 8, 6, skinL);      // left pec
  b(11,12, 8, 6, skinL);      // right pec
  b(9, 12, 2, 11, skinD);     // pec center line
  // abs
  b(5, 19, 3, 2, skinD);
  b(13,19, 3, 2, skinD);
  b(5, 22, 3, 2, skinD);
  b(13,22, 3, 2, skinD);
  b(10,22, 2, 1, skinD);      // belly button

  // tattoos
  if (char.tattoos === 1 || char.tattoos === 3) {
    b(14,13, 2, 9, '#2244AA55');
    b(16,15, 1, 6, '#2244AA33');
  }
  if (char.tattoos >= 2) {
    b(4, 14, 5, 8, '#AA222255');
  }

  // ── NECK ──
  b(9, 10, 4, 3, skin);
  b(10,10, 2, 2, skinL);

  // ── HEAD & HELMET ──
  const hy = hk;
  // Helmet outer shell (dark red)
  b(4, hy+0, 14, 10, '#882200');
  // Helmet main surface (red)
  b(5, hy+0, 12,  9, '#CC2200');
  b(6, hy+0,  9,  1, '#EE4422'); // top shine
  b(5, hy+1,  1,  7, '#EE3311'); // left shine
  // Ear pads
  b(3, hy+1, 2, 7, '#AA1100');
  b(17,hy+1, 2, 7, '#AA1100');
  // Face opening
  b(6, hy+2, 10, 7, skin);
  b(7, hy+2,  7, 6, skinL);
  // Eyes
  b(7, hy+3, 3, 2, '#111111');
  b(13,hy+3, 3, 2, '#111111');
  b(7, hy+3, 1, 1, '#FFFFFF');
  b(13,hy+3, 1, 1, '#FFFFFF');
  // Nose
  b(10,hy+5, 2, 1, skinD);
  // Mouth
  if (state === 'hit') { b(7,hy+7, 8, 1, '#FF2222'); }
  else { b(7,hy+7, 8, 1, skinD); }
  // Chin strap
  b(5, hy+9, 12, 1, '#882200');

  // ── ARMS ──
  const ay = 12;
  const gloveShine = (gx: number, gy: number) => { b(gx,gy,3,2,glL); };

  if (state === 'jab') {
    b(20,ay+2,  8, 3, skin);           // front forearm extended
    b(27,ay+0,  6, 6, gl);             // front glove out
    b(28,ay+1,  3, 2, glL);
    b(1, ay+3,  5, 3, skin);           // back arm
    b(-3,ay+1,  5, 5, gl);             // back glove guard
  } else if (state === 'hook') {
    b(20,ay-1,  5, 3, skin);
    b(24,ay-5,  6, 6, gl);
    gloveShine(25,ay-4);
    b(1, ay+3,  5, 3, skin);
    b(-3,ay+1,  5, 5, gl);
  } else if (state === 'uppercut') {
    b(17,ay-3,  3, 9, skin);
    b(15,ay-8,  6, 6, gl);
    gloveShine(16,ay-7);
    b(1, ay+3,  5, 3, skin);
    b(-3,ay+1,  5, 5, gl);
  } else if (state === 'kick') {
    b(20,27,   12, 3, skin);           // kick leg extended
    b(31,28,    5, 3, '#1a0800');      // kick shoe
    b(1, ay+3,  5, 3, skin);
    b(-3,ay+1,  5, 5, gl);
    b(20,ay+2,  4, 3, skin);
    b(23,ay+0,  5, 5, gl);
  } else if (state === 'block') {
    b(20,ay-2,  4, 6, skin);
    b(23,ay-4,  6, 6, gl);
    b(1, ay-2,  4, 6, skin);
    b(-3,ay-4,  6, 6, gl);
  } else {
    // guard stance
    b(20,ay+2,  5, 3, skin);
    b(24,ay+0,  6, 6, gl);
    gloveShine(25,ay+1);
    b(1, ay+3,  5, 3, skin);
    b(-3,ay+1,  5, 5, gl);
    gloveShine(-2,ay+2);
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════
// IRON IVAN  — 20×40 units @ P=5  (100×200 px)
// ═══════════════════════════════════════════════
function drawIronIvan(
  ctx: CanvasRenderingContext2D,
  cx: number, bottom: number,
  facing: 1 | -1,
  state: FighterState,
) {
  const P = 5;
  const W = 20, H = 40;
  const ox = Math.round(cx - W * P / 2);
  const oy = Math.round(bottom - H * P);

  ctx.save();
  if (facing === 1) { ctx.translate(Math.round(ox * 2 + W * P), 0); ctx.scale(-1, 1); }

  const b = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x * P, oy + y * P, w * P, h * P);
  };

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(ox + W*P/2, bottom + 3, W*P*0.42, 6, 0, 0, Math.PI*2);
  ctx.fill();

  if (state === 'ko') {
    b(0,33, 20,6, '#445566');
    b(0,34, 5, 6, '#778899'); ctx.restore(); return;
  }

  const hk = state === 'hit' ? 1 : 0;

  // Metal palette
  const M  = '#7A8C9A';   // main steel
  const ML = '#9BBCCC';   // light highlight
  const MD = '#3A4C5A';   // dark shadow
  const MB = '#556678';   // mid tone
  const RV = '#CC3300';   // rivet/accent red
  const EY = '#00CCFF';   // eye glow
  const EC = '#004488';   // eye deep
  const BK = '#1A2830';   // near-black panel lines

  // ── BOOTS ──
  b(1, 36, 7, 4, MD);
  b(11,36, 7, 4, MD);
  b(0, 38, 5, 2, MD);    // left toe
  b(14,38, 5, 2, MD);
  b(1, 36, 5, 1, MB);    // boot top shine
  b(11,36, 5, 1, MB);

  // ── LEGS ──
  b(2, 26, 6, 11, M);
  b(12,26, 6, 11, M);
  b(3, 26, 3, 10, ML);   // front shine
  b(13,26, 3, 10, ML);
  b(7, 27, 1, 9, MD);    // back shadow
  b(17,27, 1, 9, MD);
  // knee joints
  b(1, 30, 8, 3, BK);
  b(11,30, 8, 3, BK);
  b(2, 31, 5, 2, MB);
  b(12,31, 5, 2, MB);
  b(3, 31, 2, 1, ML);
  b(13,31, 2, 1, ML);

  // ── PELVIS ──
  b(2, 22, 16, 5, MD);
  b(3, 22, 14, 1, MB);
  b(4, 23, 3, 2, RV);    // left rivet
  b(13,23, 3, 2, RV);    // right rivet
  b(8, 23, 4, 2, BK);    // center gap

  // ── TORSO ──
  b(1, 10, 18, 13, M);
  b(2, 11,  7, 11, ML);  // left armor plate
  b(11,11,  7, 11, ML);  // right armor plate
  b(8, 10,  4, 12, M);   // center panel
  b(8, 10,  1, 13, BK);  // left panel line
  b(11,10,  1, 13, BK);  // right panel line
  b(1, 16, 18,  1, BK);  // horizontal seam
  // power core
  b(8, 12,  4,  4, '#001133');
  b(9, 13,  2,  2, '#0055FF');
  b(9, 12,  2,  1, '#88BBFF');
  // rivets
  b(2, 11,  1, 1, RV); b(17,11, 1, 1, RV);
  b(2, 21,  1, 1, RV); b(17,21, 1, 1, RV);

  // ── SHOULDER PADS ──
  b(0, 8,  4, 5, MB);
  b(16,8,  4, 5, MB);
  b(0, 8,  3, 1, ML);
  b(17,8,  2, 1, ML);
  b(0,11,  2, 2, MD);    // shoulder bolt L
  b(18,11, 2, 2, MD);

  // ── HEAD ──
  const hy = hk;
  b(3, hy+1, 14, 9, M);
  b(4, hy+1, 11, 2, ML); // top shine
  b(3, hy+2,  2, 7, ML); // left shine
  b(15,hy+2,  2, 7, MD); // right shadow
  // ear bumps
  b(1, hy+3,  2, 4, MB);
  b(17,hy+3,  2, 4, MB);
  b(1, hy+3,  1, 2, ML);
  // bolts on sides
  b(2, hy+2, 2, 2, MD);
  b(16,hy+2, 2, 2, MD);
  // visor
  b(4, hy+3, 12, 3, BK);
  // eyes
  b(5,  hy+4, 4, 1, EY);
  b(11, hy+4, 4, 1, EY);
  b(5,  hy+3, 4, 1, EC);
  b(11, hy+3, 4, 1, EC);
  b(6,  hy+4, 2, 1, '#AAEEFF');
  b(12, hy+4, 2, 1, '#AAEEFF');
  // jaw / grille
  b(4, hy+6, 12, 3, MB);
  b(5, hy+7,  1, 1, MD); b(7,hy+7, 1,1, MD); b(9,hy+7, 1,1, MD); b(11,hy+7,1,1,MD);
  b(5, hy+7, 10, 1, BK);
  b(6, hy+8,  8, 1, MD);

  // ── ARMS ──
  const ay = 10;
  if (state === 'jab') {
    b(19,ay,   5, 5, MB); b(23,ay+2,  8,4, M); b(30,ay+1,  5,5, MD); b(31,ay+2,  2,2, ML);
    b(-4,ay,   5, 5, MB); b(-7,ay+2,  5,4, M); b(-10,ay+1, 5,5, MD);
  } else if (state === 'hook') {
    b(19,ay-2, 5,5,MB); b(23,ay-5,  5,4,M);  b(27,ay-7,5,5,MD);
    b(-4,ay,   5,5,MB); b(-7,ay+2,  5,4,M);  b(-10,ay+1,5,5,MD);
  } else if (state === 'uppercut') {
    b(18,ay+1, 5,5,MB); b(19,ay-5,  4,7,M);  b(18,ay-9,5,5,MD);
    b(-4,ay,   5,5,MB); b(-7,ay+2,  5,4,M);  b(-10,ay+1,5,5,MD);
  } else if (state === 'block') {
    b(19,ay-2, 5,7,MB); b(21,ay-5,  5,5,MD);
    b(-4,ay-2, 5,7,MB); b(-7,ay-5,  5,5,MD);
  } else {
    // guard
    b(19,ay,   5,6,MB); b(23,ay+2,  5,4,M);  b(27,ay+1,5,5,MD); b(28,ay+2,2,2,ML);
    b(-4,ay,   5,6,MB); b(-7,ay+2,  5,4,M);  b(-10,ay+1,5,5,MD); b(-9,ay+2,2,2,ML);
  }

  ctx.restore();
}
