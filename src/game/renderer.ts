import type {
  CakeFlavor,
  CakeLayer,
  FallingDebris,
  FloatingCallout,
  Particle,
  SwingingCake,
} from './types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const clamped = clamp(t, 0, 1);
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const r = Math.round(lerp(r1, r2, clamped));
  const g = Math.round(lerp(g1, g2, clamped));
  const b = Math.round(lerp(b1, b2, clamped));
  return `rgb(${r}, ${g}, ${b})`;
}

interface SkyStop {
  altitude: number;
  top: string;
  bottom: string;
}

const SKY_STOPS: SkyStop[] = [
  { altitude: 0, top: '#FBF1E4', bottom: '#F4DFCC' },     // Warm vanilla salon
  { altitude: 320, top: '#FDE8E1', bottom: '#F8D4C9' },   // Rose patisserie morning
  { altitude: 720, top: '#DCE8F7', bottom: '#F7E7DA' },   // Sunlit conservatory sky
  { altitude: 1180, top: '#9B89B3', bottom: '#F3B8B2' },  // Parisian lavender dusk
  { altitude: 1750, top: '#242042', bottom: '#584273' },  // Starry macaron night
];

export function drawPatisserieBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraY: number,
  groundScreenY: number,
  elapsed: number
): void {
  const altitude = Math.max(0, -cameraY);

  // Interpolate sky gradient based on climbed altitude
  let lower = SKY_STOPS[0];
  let upper = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    if (altitude >= SKY_STOPS[i].altitude && altitude <= SKY_STOPS[i + 1].altitude) {
      lower = SKY_STOPS[i];
      upper = SKY_STOPS[i + 1];
      break;
    }
  }
  const span = Math.max(1, upper.altitude - lower.altitude);
  const t = altitude >= upper.altitude ? 1 : clamp((altitude - lower.altitude) / span, 0, 1);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, lerpColor(lower.top, upper.top, t));
  grad.addColorStop(1, lerpColor(lower.bottom, upper.bottom, t));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Twinkling stars at high altitude
  if (altitude > 850) {
    const starAlpha = clamp((altitude - 850) / 500, 0, 0.85);
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 79 + 37) % 100) * 0.01 * width;
      const sy = (((i * 53 + 19) % 100) * 0.01 * height + altitude * 0.06) % height;
      const twinkle = 0.45 + 0.55 * Math.sin(elapsed * 2.2 + i * 1.7);
      ctx.fillStyle = `rgba(255, 244, 204, ${starAlpha * twinkle})`;
      const r = i % 3 === 0 ? 2.1 : 1.3;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Soft drifting clouds in mid-to-high altitude
  if (altitude > 220 && altitude < 1650) {
    const cloudFadeIn = clamp((altitude - 220) / 220, 0, 1);
    const cloudFadeOut = altitude > 1300 ? clamp(1 - (altitude - 1300) / 350, 0, 1) : 1;
    const cloudAlpha = 0.48 * cloudFadeIn * cloudFadeOut;

    ctx.save();
    ctx.fillStyle = `rgba(255, 252, 248, ${cloudAlpha})`;
    for (let i = 0; i < 5; i++) {
      const baseScreenY = ((i * 155 + 90) + altitude * 0.22) % (height + 160) - 80;
      const driftX = ((elapsed * (8 + i * 2) + i * 110) % (width + 140)) - 70;
      drawSoftCloud(ctx, driftX, baseScreenY, 34 + (i % 3) * 10);
    }
    ctx.restore();
  }

  // Bakery salon interior elements near ground level (parallax off downward as tower rises)
  const salonOffsetY = altitude * 0.85;
  if (salonOffsetY < height + 240) {
    ctx.save();
    ctx.translate(0, salonOffsetY);

    // Subtle striped French patisserie wallpaper texture
    ctx.fillStyle = 'rgba(218, 178, 148, 0.13)';
    const stripeWidth = 28;
    for (let x = 0; x < width; x += stripeWidth * 2) {
      ctx.fillRect(x, -salonOffsetY, stripeWidth, height + salonOffsetY);
    }

    // Arched sunlit conservatory window frame behind cake stand
    const archW = Math.min(276, width * 0.72);
    const archX = (width - archW) / 2;
    const archBottom = groundScreenY + 10;
    const archTop = groundScreenY - 340;
    const archRadius = archW / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(archX, archBottom);
    ctx.lineTo(archX, archTop + archRadius);
    ctx.arc(archX + archRadius, archTop + archRadius, archRadius, Math.PI, 0, false);
    ctx.lineTo(archX + archW, archBottom);
    ctx.closePath();

    const winGrad = ctx.createLinearGradient(0, archTop, 0, archBottom);
    winGrad.addColorStop(0, 'rgba(255, 250, 238, 0.72)');
    winGrad.addColorStop(1, 'rgba(255, 236, 214, 0.35)');
    ctx.fillStyle = winGrad;
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(176, 134, 102, 0.28)';
    ctx.stroke();

    // Window mullions
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, archTop + 8);
    ctx.lineTo(width / 2, archBottom);
    ctx.moveTo(archX + 8, archTop + archRadius + 46);
    ctx.lineTo(archX + archW - 8, archTop + archRadius + 46);
    ctx.stroke();
    ctx.restore();

    // Wainscoting / bakery wooden counter surface below groundScreenY
    const counterTop = groundScreenY + 38;
    ctx.fillStyle = '#E8CCB4';
    ctx.fillRect(0, counterTop, width, height - counterTop + 200);
    ctx.fillStyle = '#D3AE8E';
    ctx.fillRect(0, counterTop, width, 6);
    ctx.fillStyle = '#C39977';
    ctx.fillRect(0, counterTop + 6, width, 2);

    ctx.restore();
  }
}

function drawSoftCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.arc(x + r * 0.45, y - r * 0.14, r * 0.45, 0, Math.PI * 2);
  ctx.arc(x + r * 0.9, y, r * 0.4, 0, Math.PI * 2);
  ctx.arc(x - r * 0.42, y + r * 0.05, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCakeStand(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  surfaceScreenY: number,
  standWidth: number
): void {
  if (surfaceScreenY > ctx.canvas.height + 140) return;

  ctx.save();

  // Soft shadow on counter
  ctx.fillStyle = 'rgba(110, 72, 48, 0.16)';
  ctx.beginPath();
  ctx.ellipse(centerX, surfaceScreenY + 42, standWidth * 0.34, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pedestal base & stem (warm porcelain)
  ctx.fillStyle = '#FFFDF9';
  ctx.strokeStyle = '#C9A88E';
  ctx.lineWidth = 2;

  // Foot
  ctx.beginPath();
  ctx.moveTo(centerX - 54, surfaceScreenY + 40);
  ctx.quadraticCurveTo(centerX, surfaceScreenY + 32, centerX + 54, surfaceScreenY + 40);
  ctx.lineTo(centerX + 46, surfaceScreenY + 46);
  ctx.quadraticCurveTo(centerX, surfaceScreenY + 48, centerX - 46, surfaceScreenY + 46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stem
  ctx.beginPath();
  ctx.moveTo(centerX - 18, surfaceScreenY + 12);
  ctx.quadraticCurveTo(centerX - 10, surfaceScreenY + 26, centerX - 28, surfaceScreenY + 38);
  ctx.lineTo(centerX + 28, surfaceScreenY + 38);
  ctx.quadraticCurveTo(centerX + 10, surfaceScreenY + 26, centerX + 18, surfaceScreenY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top plate lip
  const halfW = standWidth / 2;
  const plateGrad = ctx.createLinearGradient(centerX - halfW, surfaceScreenY, centerX + halfW, surfaceScreenY);
  plateGrad.addColorStop(0, '#F5ECE2');
  plateGrad.addColorStop(0.5, '#FFFFFF');
  plateGrad.addColorStop(1, '#EFE2D4');

  ctx.fillStyle = plateGrad;
  ctx.beginPath();
  ctx.roundRect(centerX - halfW, surfaceScreenY, standWidth, 13, 6.5);
  ctx.fill();
  ctx.stroke();

  // Brass rim accent line
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(centerX - halfW + 10, surfaceScreenY + 9);
  ctx.lineTo(centerX + halfW - 10, surfaceScreenY + 9);
  ctx.stroke();

  // Scalloped lace doily overhang
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const scallopCount = 13;
  const step = (standWidth - 18) / scallopCount;
  for (let i = 0; i < scallopCount; i++) {
    const sx = centerX - halfW + 9 + step * (i + 0.5);
    ctx.beginPath();
    ctx.arc(sx, surfaceScreenY + 13, step * 0.42, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
}

export function drawCakeBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  flavor: CakeFlavor,
  squash = 0,
  flash = 0,
  widthBonusFlash = 0
): void {
  if (width <= 0.5 || height <= 0.5) return;

  ctx.save();

  // Apply impact squash & stretch anchored at bottom-center of the cake slice
  if (squash > 0.001) {
    const scaleY = 1 - Math.sin(squash * Math.PI) * 0.18;
    const scaleX = 1 + Math.sin(squash * Math.PI) * 0.1;
    ctx.translate(x, y + height);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-x, -(y + height));
  }

  const left = x - width / 2;
  const radius = Math.min(7, width * 0.22);

  // Drop shadow separating layers
  ctx.fillStyle = 'rgba(84, 50, 34, 0.13)';
  ctx.beginPath();
  ctx.roundRect(left + 1, y + height - 2, width - 2, 4, 2);
  ctx.fill();

  // Sponge body gradient
  const spongeGrad = ctx.createLinearGradient(left, y, left, y + height);
  spongeGrad.addColorStop(0, flavor.spongeTop);
  spongeGrad.addColorStop(1, flavor.spongeBottom);

  ctx.fillStyle = spongeGrad;
  ctx.beginPath();
  ctx.roundRect(left, y, width, height, radius);
  ctx.fill();

  // Clip interior details strictly inside cake silhouette
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(left, y, width, height, radius);
  ctx.clip();

  // Subtle side shading for 2.5D cylindrical volume
  const sideGrad = ctx.createLinearGradient(left, 0, left + width, 0);
  sideGrad.addColorStop(0, 'rgba(92, 56, 36, 0.12)');
  sideGrad.addColorStop(0.16, 'rgba(255, 255, 255, 0.12)');
  sideGrad.addColorStop(0.84, 'rgba(255, 255, 255, 0.0)');
  sideGrad.addColorStop(1, 'rgba(92, 56, 36, 0.16)');
  ctx.fillStyle = sideGrad;
  ctx.fillRect(left, y, width, height);

  // Center cream filling band
  const creamY = y + height * 0.54;
  const creamH = Math.max(5, height * 0.17);
  ctx.fillStyle = flavor.creamColor;
  ctx.fillRect(left, creamY, width, creamH);

  // Top frosting glaze with scalloped drips
  const glazeH = Math.max(8, height * 0.25);
  ctx.fillStyle = flavor.frostingColor;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + width, y);
  ctx.lineTo(left + width, y + glazeH * 0.82);

  const dripCount = Math.max(2, Math.round(width / 19));
  const dripStep = width / dripCount;
  for (let i = dripCount - 1; i >= 0; i--) {
    const dx = left + i * dripStep;
    const midX = dx + dripStep * 0.5;
    const dripDepth = glazeH + ((i % 2 === 0 ? 4.5 : 1.5) * Math.min(1, width / 55));
    ctx.quadraticCurveTo(midX, y + dripDepth, dx, y + glazeH * 0.82);
  }
  ctx.closePath();
  ctx.fill();

  // Frosting specular highlight
  ctx.fillStyle = flavor.frostingHighlight;
  ctx.beginPath();
  ctx.roundRect(left + 6, y + 2.5, Math.max(0, width - 12), 3, 1.5);
  ctx.fill();

  // Tiny hand-crafted patisserie garnish on top edge (when wide enough)
  if (width >= 38) {
    drawCakeGarnish(ctx, x, y + 2, width, flavor);
  }

  // Perfect / width-recovery golden sheen flash
  if (flash > 0.01 || widthBonusFlash > 0.01) {
    const intensity = Math.max(flash, widthBonusFlash);
    ctx.fillStyle = `rgba(255, 240, 175, ${intensity * 0.52})`;
    ctx.fillRect(left, y, width, height);
  }

  ctx.restore();

  // Crisp hand-drawn outline
  ctx.strokeStyle = flavor.spongeStroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(left, y, width, height, radius);
  ctx.stroke();

  // Golden border glow on combo width recovery
  if (widthBonusFlash > 0.02) {
    ctx.strokeStyle = `rgba(212, 175, 55, ${widthBonusFlash * 0.9})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(left - 1, y - 1, width + 2, height + 2, radius + 1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCakeGarnish(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  width: number,
  flavor: CakeFlavor
): void {
  const count = width > 110 ? 3 : width > 65 ? 2 : 1;
  const spread = Math.min(width * 0.52, count * 30);

  for (let i = 0; i < count; i++) {
    const gx = count === 1 ? centerX : centerX - spread / 2 + (spread / (count - 1)) * i;
    if (flavor.topping === 'strawberry') {
      ctx.fillStyle = '#D93B58';
      ctx.beginPath();
      ctx.ellipse(gx, topY + 1.5, 4.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6A9E4A';
      ctx.fillRect(gx - 2, topY - 2, 4, 2);
    } else if (flavor.topping === 'pistachio') {
      ctx.fillStyle = '#5B8442';
      ctx.beginPath();
      ctx.ellipse(gx, topY + 2, 4, 2.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (flavor.topping === 'blueberry') {
      ctx.fillStyle = '#4A407A';
      ctx.beginPath();
      ctx.arc(gx, topY + 1.5, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(gx - 1, topY + 0.5, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (flavor.topping === 'caramel') {
      ctx.fillStyle = '#F7D27A';
      ctx.beginPath();
      ctx.arc(gx, topY + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (flavor.topping === 'chocolate') {
      ctx.fillStyle = '#382015';
      ctx.beginPath();
      ctx.roundRect(gx - 4, topY, 8, 3.5, 1.5);
      ctx.fill();
    } else {
      ctx.fillStyle = '#FFFDF5';
      ctx.beginPath();
      ctx.arc(gx, topY + 1.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawPendulumAndSuspendedCake(
  ctx: CanvasRenderingContext2D,
  swinging: SwingingCake,
  cameraY: number,
  groundScreenY: number,
  elapsed = 0,
  isPerfectAligned = false
): void {
  const bobX = swinging.pivotX + Math.sin(swinging.angle) * swinging.ropeLength;
  const bobY = swinging.pivotY + Math.cos(swinging.angle) * swinging.ropeLength;

  ctx.save();

  // Subtle brass arc guide track near pivot
  ctx.strokeStyle = 'rgba(166, 124, 82, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(
    swinging.pivotX,
    swinging.pivotY,
    swinging.ropeLength * 0.62,
    Math.PI / 2 - swinging.maxAngle,
    Math.PI / 2 + swinging.maxAngle
  );
  ctx.stroke();
  ctx.setLineDash([]);

  // Swinging brass pendulum rod
  const rodGrad = ctx.createLinearGradient(swinging.pivotX - 3, 0, swinging.pivotX + 3, 0);
  rodGrad.addColorStop(0, '#9C6D3B');
  rodGrad.addColorStop(0.5, '#E9C982');
  rodGrad.addColorStop(1, '#8D5E30');
  ctx.strokeStyle = rodGrad;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(swinging.pivotX, swinging.pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  // Ornate French patisserie clock dial mounted above pivot
  const clockX = swinging.pivotX;
  const clockY = swinging.pivotY - 14;
  const clockR = 19;

  // Top hanging bracket
  ctx.strokeStyle = '#7B542C';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(clockX, 0);
  ctx.lineTo(clockX, clockY - clockR);
  ctx.stroke();

  // Clock outer brass casing
  ctx.fillStyle = '#C99B49';
  ctx.strokeStyle = '#6E4B26';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Clock cream dial face
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(clockX, clockY, clockR - 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 12-hour tick dots
  ctx.fillStyle = '#8C5E32';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const tr = clockR - 6;
    ctx.beginPath();
    ctx.arc(clockX + Math.cos(a) * tr, clockY + Math.sin(a) * tr, i % 3 === 0 ? 1.2 : 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Animated clock hands
  const minAngle = elapsed * 0.4 - Math.PI / 2;
  const hourAngle = elapsed * 0.05 - Math.PI / 6;
  ctx.strokeStyle = '#4A2E23';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX + Math.cos(hourAngle) * 7, clockY + Math.sin(hourAngle) * 7);
  ctx.stroke();

  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX + Math.cos(minAngle) * 10.5, clockY + Math.sin(minAngle) * 10.5);
  ctx.stroke();

  // Center pivot pin
  ctx.fillStyle = '#B83B5E';
  ctx.beginPath();
  ctx.arc(clockX, clockY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Pivot eyelet at bottom of clock
  ctx.fillStyle = '#D4A853';
  ctx.beginPath();
  ctx.arc(swinging.pivotX, swinging.pivotY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Pastry clamp / tongs at end of pendulum
  const clampOpen = swinging.status === 'FALLING' ? 0.35 : 0;
  ctx.save();
  ctx.translate(bobX, bobY);
  ctx.rotate(swinging.status === 'SWINGING' ? -swinging.angle * 0.45 : 0);

  // Brass finial knot
  ctx.fillStyle = '#D4A853';
  ctx.strokeStyle = '#6E4B26';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Left & right pastry tong arms
  ctx.strokeStyle = '#8C5E32';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, 3);
  ctx.quadraticCurveTo(-12 - clampOpen * 10, 9, -11 - clampOpen * 12, 16);
  ctx.moveTo(2, 3);
  ctx.quadraticCurveTo(12 + clampOpen * 10, 9, 11 + clampOpen * 12, 16);
  ctx.stroke();
  ctx.restore();

  // Draw the cake either suspended from the clamp or falling in world space
  if (swinging.status === 'SWINGING') {
    ctx.save();
    ctx.translate(bobX, bobY + 12);
    ctx.rotate(-swinging.angle * 0.22);
    drawCakeBody(ctx, 0, 0, swinging.width, swinging.height, swinging.flavor, 0, 0, 0);
    drawCakeCenterMarker(ctx, 0, swinging.height * 0.5, swinging.width, swinging.height, isPerfectAligned);
    ctx.restore();
  } else {
    const cakeScreenY = swinging.y - cameraY + groundScreenY;
    drawCakeBody(
      ctx,
      swinging.x,
      cakeScreenY,
      swinging.width,
      swinging.height,
      swinging.flavor,
      0,
      0,
      0
    );
    drawCakeCenterMarker(
      ctx,
      swinging.x,
      cakeScreenY + swinging.height * 0.5,
      swinging.width,
      swinging.height,
      isPerfectAligned
    );
  }

  ctx.restore();
}

function drawCakeCenterMarker(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  cakeWidth: number,
  cakeHeight: number,
  isPerfectAligned: boolean
): void {
  if (cakeWidth < 8) return;

  ctx.save();
  ctx.translate(centerX, centerY);

  const scale = Math.min(1, cakeWidth / 28);
  const badgeR = 6.5 * scale;
  const accent = isPerfectAligned ? '#16A34A' : '#B83B5E';
  const ringStroke = isPerfectAligned ? '#15803D' : '#7A233D';

  // Vertical alignment ticks inside the cake body pointing to the center
  const tickReach = cakeHeight * 0.42;
  ctx.strokeStyle = isPerfectAligned
    ? 'rgba(22, 163, 74, 0.92)'
    : 'rgba(184, 59, 94, 0.65)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -tickReach);
  ctx.lineTo(0, -badgeR - 1.5);
  ctx.moveTo(0, badgeR + 1.5);
  ctx.lineTo(0, tickReach);
  ctx.stroke();

  // Crisp ivory porcelain alignment badge
  ctx.fillStyle = '#FFFDF9';
  ctx.strokeStyle = ringStroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner colored alignment dot
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.8, badgeR * 0.44), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawAimingGuide(
  ctx: CanvasRenderingContext2D,
  swinging: SwingingCake,
  layers: CakeLayer[],
  cameraY: number,
  groundScreenY: number,
  standCenterX: number,
  standWidth: number,
  perfectTolerance: number,
  canvasHeight: number
): void {
  if (swinging.status !== 'SWINGING') return;

  const bobX = swinging.pivotX + Math.sin(swinging.angle) * swinging.ropeLength;
  const bobY = swinging.pivotY + Math.cos(swinging.angle) * swinging.ropeLength;
  const startY = bobY + 12 + swinging.height + 4;
  const standScreenY = 0 - cameraY + groundScreenY;

  let endScreenY = standScreenY;
  let isPerfect = false;
  let isAimingAtCake = false;
  let showSurfaceMarker = false;

  if (layers.length === 0) {
    const overStand = Math.abs(bobX - standCenterX) <= standWidth / 2;
    isAimingAtCake = overStand;
    isPerfect = Math.abs(bobX - standCenterX) <= perfectTolerance * 1.3;
    endScreenY = overStand ? standScreenY : Math.min(canvasHeight - 18, standScreenY + 28);
    showSurfaceMarker = overStand;
  } else {
    const topLayer = layers[layers.length - 1];
    const topScreenY = topLayer.y - cameraY + groundScreenY;
    const overTopLayer = Math.abs(bobX - topLayer.x) <= topLayer.width / 2;
    const overStand =
      Math.abs(bobX - standCenterX) <= standWidth / 2 && standScreenY <= canvasHeight - 8;

    isAimingAtCake = overTopLayer;
    isPerfect = overTopLayer && Math.abs(bobX - topLayer.x) <= perfectTolerance;

    if (overTopLayer) {
      endScreenY = topScreenY;
      showSurfaceMarker = true;
    } else if (overStand) {
      endScreenY = standScreenY;
      showSurfaceMarker = true;
    } else {
      endScreenY = Math.min(canvasHeight - 18, topScreenY + 48);
      showSurfaceMarker = false;
    }
  }

  ctx.save();

  // Draw red/green highlight frame around the target cake (or stand on layer 0) when aimed at
  if (isAimingAtCake) {
    const frameColor = isPerfect ? '#16A34A' : '#EF4444';
    const frameGlow = isPerfect ? 'rgba(34, 197, 94, 0.22)' : 'rgba(239, 68, 68, 0.20)';

    if (layers.length === 0) {
      const fx = standCenterX - standWidth / 2 - 3;
      const fy = standScreenY - 3;
      const fw = standWidth + 6;
      const fh = 19;
      ctx.fillStyle = frameGlow;
      ctx.beginPath();
      ctx.roundRect(fx, fy, fw, fh, 9);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      const topLayer = layers[layers.length - 1];
      const topScreenY = topLayer.y - cameraY + groundScreenY;
      const radius = Math.min(7, topLayer.width * 0.22) + 2;
      const fx = topLayer.x - topLayer.width / 2 - 3;
      const fy = topScreenY - 3;
      const fw = topLayer.width + 6;
      const fh = topLayer.height + 6;

      ctx.fillStyle = frameGlow;
      ctx.beginPath();
      ctx.roundRect(fx, fy, fw, fh, radius);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  if (endScreenY > startY + 6) {
    const lineColor = isPerfect
      ? 'rgba(22, 163, 74, 0.85)'
      : isAimingAtCake
        ? 'rgba(239, 68, 68, 0.68)'
        : 'rgba(139, 107, 90, 0.30)';

    const grad = ctx.createLinearGradient(bobX, startY, bobX, endScreenY);
    grad.addColorStop(0, lineColor);
    grad.addColorStop(0.7, lineColor);
    grad.addColorStop(1, isPerfect ? 'rgba(22, 163, 74, 0.96)' : lineColor);

    ctx.strokeStyle = grad;
    ctx.lineWidth = isPerfect ? 2.2 : 1.6;
    ctx.lineCap = 'round';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(bobX, startY);
    ctx.lineTo(bobX, endScreenY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target reticle on the cake stand or top cake surface
    if (showSurfaceMarker) {
      ctx.strokeStyle = isPerfect
        ? 'rgba(22, 163, 74, 0.92)'
        : isAimingAtCake
          ? 'rgba(239, 68, 68, 0.8)'
          : 'rgba(139, 107, 90, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(bobX, endScreenY, isPerfect ? 8 : 6.5, 2.6, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isPerfect
        ? '#16A34A'
        : isAimingAtCake
          ? '#EF4444'
          : 'rgba(139, 107, 90, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bobX, endScreenY, 3, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawStackedLayers(
  ctx: CanvasRenderingContext2D,
  layers: CakeLayer[],
  cameraY: number,
  groundScreenY: number,
  canvasHeight: number
): void {
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const screenY = layer.y - cameraY + groundScreenY;
    if (screenY > canvasHeight + 60 || screenY + layer.height < -60) {
      continue;
    }
    drawCakeBody(
      ctx,
      layer.x,
      screenY,
      layer.width,
      layer.height,
      layer.flavor,
      layer.squash,
      layer.perfectFlash,
      layer.widthBonusFlash
    );
  }
}

export function drawDebris(
  ctx: CanvasRenderingContext2D,
  debrisList: FallingDebris[],
  cameraY: number,
  groundScreenY: number
): void {
  for (let i = 0; i < debrisList.length; i++) {
    const d = debrisList[i];
    const screenY = d.y - cameraY + groundScreenY;
    ctx.save();
    ctx.globalAlpha = clamp(d.alpha, 0, 1);
    ctx.translate(d.x, screenY);
    ctx.rotate(d.angle);
    drawCakeBody(ctx, 0, -d.height / 2, d.width, d.height, d.flavor, 0, 0, 0);
    ctx.restore();
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  cameraY: number,
  groundScreenY: number
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const screenY = p.y - cameraY + groundScreenY;
    const progress = 1 - p.life / p.maxLife;

    ctx.save();
    if (p.kind === 'ring') {
      const radius = p.size + progress * 52;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = (1 - progress) * 0.85;
      ctx.lineWidth = 2.5 * (1 - progress * 0.6);
      ctx.beginPath();
      ctx.ellipse(p.x, screenY, radius, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'sparkle') {
      ctx.globalAlpha = (1 - progress) * p.alpha;
      ctx.fillStyle = p.color;
      const s = p.size * (1 - progress * 0.4);
      ctx.translate(p.x, screenY);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.35, -s * 0.35);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.35, s * 0.35);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.35, s * 0.35);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s * 0.35, -s * 0.35);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.globalAlpha = (1 - progress) * p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.size * (1 - progress * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawFloatingCallouts(
  ctx: CanvasRenderingContext2D,
  callouts: FloatingCallout[],
  cameraY: number,
  groundScreenY: number
): void {
  for (let i = 0; i < callouts.length; i++) {
    const c = callouts[i];
    const progress = 1 - c.life / c.maxLife;
    const screenY = c.y - cameraY + groundScreenY - progress * 34;
    const alpha = progress < 0.2 ? progress / 0.2 : clamp(1 - (progress - 0.2) / 0.8, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '700 16px "Noto Sans TC", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 252, 247, 0.92)';
    ctx.strokeText(c.text, c.x, screenY);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, screenY);

    if (c.subtext) {
      ctx.font = '600 12px "Noto Sans TC", sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeText(c.subtext, c.x, screenY + 19);
      ctx.fillStyle = '#7A523B';
      ctx.fillText(c.subtext, c.x, screenY + 19);
    }

    ctx.restore();
  }
}
