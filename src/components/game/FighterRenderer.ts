import type { CharacterCustomization } from '../../lib/storage';

const SKIN_COLORS = ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#4a2c10'];
const SHORTS_COLORS = ['#CC2200', '#002244', '#006600', '#8B008B', '#FFA500', '#1a1a1a'];
const GLOVES_COLORS = ['#CC0000', '#001188', '#006600', '#8B008B', '#FF8C00', '#222222'];

const P = 3; // pixel scale

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x * P), Math.round(y * P), Math.round(w * P), Math.round(h * P));
}

export type FighterState = 'idle' | 'jab' | 'hook' | 'uppercut' | 'kick' | 'block' | 'hit' | 'ko';

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottom: number,
  facing: 1 | -1,
  state: FighterState,
  char: CharacterCustomization,
  isEnemy: boolean
): void {
  const skin = SKIN_COLORS[char.skinColor] || SKIN_COLORS[0];
  const shorts = SHORTS_COLORS[char.shortsColor] || SHORTS_COLORS[0];
  const gloves = GLOVES_COLORS[char.glovesColor] || GLOVES_COLORS[0];
  const shirtColor = isEnemy ? '#334466' : '#CC2200';
  const hairColors = ['#1a0a00', '#FFD700', '#8B4513', '#1a0a00', '#1a0a00'];
  const hairColor = hairColors[char.hairStyle] || '#1a0a00';

  // Convert canvas coords to pixel grid coords
  const scale = P;
  const bx = Math.round(cx / scale);
  const by = Math.round(bottom / scale);

  // Body height depends on body type
  const bodyH = char.bodyType === 0 ? 14 : char.bodyType === 2 ? 18 : 16;
  const bodyW = char.bodyType === 0 ? 8 : char.bodyType === 2 ? 12 : 10;
  const headH = 9;
  const legH = 10;

  const totalH = headH + bodyH + legH;
  const topY = by - totalH;

  // Apply state offsets
  let yOff = 0;
  let jabOff = 0;
  if (state === 'hit') yOff = 2;
  if (state === 'ko') yOff = 5;

  // --- LEGS ---
  const legY = topY + headH + bodyH;
  // Left leg
  px(ctx, bx - bodyW / 2, legY, 4, legH, skin);
  // Right leg
  px(ctx, bx + bodyW / 2 - 4, legY, 4, legH, skin);
  // Shoes
  px(ctx, bx - bodyW / 2 - 1, legY + legH - 2, 6, 2, '#111');
  px(ctx, bx + bodyW / 2 - 5, legY + legH - 2, 6, 2, '#111');
  // Shorts
  px(ctx, bx - bodyW / 2, legY, bodyW, 6, shorts);

  // --- BODY ---
  const bodyY = topY + headH;
  px(ctx, bx - bodyW / 2, bodyY + yOff, bodyW, bodyH, shirtColor);

  // Tattoos on body
  if (char.tattoos === 2 || char.tattoos === 3) {
    px(ctx, bx - 1, bodyY + 2 + yOff, 2, 4, '#333388');
  }

  // --- HEAD ---
  const headY = topY + yOff;
  px(ctx, bx - 4, headY, 9, headH, skin);
  // Eyes
  const eyeY = headY + 3;
  if (facing === 1) {
    px(ctx, bx + 1, eyeY, 2, 2, '#111');
  } else {
    px(ctx, bx - 3, eyeY, 2, 2, '#111');
  }

  // Hair
  if (char.hairStyle === 0) { // short
    px(ctx, bx - 4, headY, 9, 2, hairColor);
  } else if (char.hairStyle === 1) { // mohawk
    px(ctx, bx, headY - 4, 2, 5, hairColor);
    px(ctx, bx - 1, headY - 2, 4, 3, hairColor);
  } else if (char.hairStyle === 2) { // dreads
    for (let d = 0; d < 5; d++) {
      px(ctx, bx - 4 + d * 2, headY - 3, 1, 5, hairColor);
    }
  } else if (char.hairStyle === 3) { // bald - no hair
    // nothing
  } else if (char.hairStyle === 4) { // afro
    px(ctx, bx - 5, headY - 4, 11, 5, hairColor);
    px(ctx, bx - 3, headY - 6, 7, 4, hairColor);
  }

  // --- ARMS ---
  const armY = bodyY + 2 + yOff;

  if (state === 'jab') {
    jabOff = facing * 12;
    // Extended arm (punch)
    px(ctx, bx + (facing > 0 ? bodyW / 2 : -bodyW / 2 - 14 + jabOff), armY, 14, 4, skin);
    px(ctx, bx + (facing > 0 ? bodyW / 2 + 10 : -bodyW / 2 - 14 + jabOff - 4), armY - 1, 6, 6, gloves);
    // Back arm
    px(ctx, bx + (facing > 0 ? -bodyW / 2 - 4 : bodyW / 2), armY + 2, 6, 4, skin);
    px(ctx, bx + (facing > 0 ? -bodyW / 2 - 8 : bodyW / 2 + 4), armY + 1, 5, 5, gloves);
  } else if (state === 'hook') {
    // Wide hook arm
    px(ctx, bx + (facing > 0 ? bodyW / 2 : -bodyW / 2 - 6), armY - 2, 8, 4, skin);
    px(ctx, bx + (facing > 0 ? bodyW / 2 + 6 : -bodyW / 2 - 12), armY - 5, 6, 6, gloves);
    // Other arm guard
    px(ctx, bx + (facing > 0 ? -bodyW / 2 - 4 : bodyW / 2), armY, 6, 4, skin);
    px(ctx, bx + (facing > 0 ? -bodyW / 2 - 6 : bodyW / 2 + 4), armY - 1, 5, 5, gloves);
  } else if (state === 'uppercut') {
    // Uppercut - arm coming up
    px(ctx, bx + (facing > 0 ? bodyW / 2 : -bodyW / 2 - 4), armY - 6, 4, 10, skin);
    px(ctx, bx + (facing > 0 ? bodyW / 2 - 1 : -bodyW / 2 - 7), armY - 10, 6, 6, gloves);
    // Guard arm
    px(ctx, bx + (facing > 0 ? -bodyW / 2 - 4 : bodyW / 2), armY, 6, 4, skin);
    px(ctx, bx + (facing > 0 ? -bodyW / 2 - 6 : bodyW / 2 + 4), armY - 1, 5, 5, gloves);
  } else if (state === 'kick') {
    // Kick leg extended
    px(ctx, bx + (facing > 0 ? bodyW / 2 : -bodyW / 2 - 12), legY + 2, 14, 4, skin);
    // Both arms in guard
    px(ctx, bx - bodyW / 2 - 4, armY, 6, 4, skin);
    px(ctx, bx - bodyW / 2 - 8, armY - 1, 5, 5, gloves);
    px(ctx, bx + bodyW / 2, armY, 6, 4, skin);
    px(ctx, bx + bodyW / 2 + 4, armY - 1, 5, 5, gloves);
  } else if (state === 'block') {
    // Both arms raised in front
    const blockOff = facing > 0 ? bodyW / 2 : -bodyW / 2 - 8;
    px(ctx, bx + blockOff, armY - 4, 6, 10, skin);
    px(ctx, bx + blockOff, armY - 6, 6, 6, gloves);
    px(ctx, bx + blockOff + 2, armY - 4, 6, 10, skin);
    px(ctx, bx + blockOff + 2, armY - 6, 6, 6, gloves);
  } else {
    // Idle / hit / ko - relaxed guard stance
    px(ctx, bx - bodyW / 2 - 4, armY, 6, 5, skin);
    px(ctx, bx - bodyW / 2 - 7, armY - 2, 5, 5, gloves);
    px(ctx, bx + bodyW / 2, armY, 6, 5, skin);
    px(ctx, bx + bodyW / 2 + 3, armY - 2, 5, 5, gloves);
  }

  // Arm tattoos
  if (char.tattoos === 1 || char.tattoos === 3) {
    px(ctx, bx + bodyW / 2 + 2, armY + 2, 3, 2, '#333388');
  }

  // suppress unused variable warning
  void jabOff;
}
