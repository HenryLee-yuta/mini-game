import { patisserieAudio } from './audio';
import { getFlavorForLayer } from './flavors';
import {
  drawAimingGuide,
  drawCakeStand,
  drawDebris,
  drawFloatingCallouts,
  drawParticles,
  drawPatisserieBackground,
  drawPendulumAndSuspendedCake,
  drawStackedLayers,
} from './renderer';
import type {
  CakeLayer,
  FallingDebris,
  FloatingCallout,
  GameSnapshot,
  GameState,
  Particle,
  SwingingCake,
} from './types';

const LOGICAL_WIDTH = 390;
const INITIAL_CAKE_WIDTH = 136;
const MIN_VIABLE_WIDTH = 8;
const CAKE_HEIGHT = 36;
const CAKE_STAND_WIDTH = 228;
const PENDULUM_PIVOT_Y = 46;
const PERFECT_TOLERANCE = 6.5;
const COMBO_WIDEN_THRESHOLD = 3;
const COMBO_WIDEN_AMOUNT = 10;
const GRAVITY = 2500;

export interface EngineCallbacks {
  onSnapshot: (snapshot: GameSnapshot) => void;
  onGameOver: (finalSnapshot: GameSnapshot) => void;
}

export class CakeStackEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  private logicalWidth = LOGICAL_WIDTH;
  private logicalHeight = 760;
  private dpr = 1;

  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;

  private gameState: GameState = 'TITLE_MENU';
  private layers: CakeLayer[] = [];
  private swinging: SwingingCake | null = null;
  private missedCake: FallingDebris | null = null;
  private missWaitTimer = 0;

  private debris: FallingDebris[] = [];
  private particles: Particle[] = [];
  private callouts: FloatingCallout[] = [];

  private cameraY = 0;
  private targetCameraY = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private perfectCount = 0;
  private bestScore = 0;
  private isNewBest = false;
  private lastMissReason: 'missed_stand' | 'missed_stack' | undefined;

  private resizeObserver: ResizeObserver | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: EngineCallbacks,
    initialBestScore = 0
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.callbacks = callbacks;
    this.bestScore = initialBestScore;

    this.resize();
    this.setupTitleShowcase();
    this.bindResize();
    this.startLoop();
  }

  public setBestScore(bestScore: number): void {
    this.bestScore = bestScore;
  }

  private bindResize(): void {
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement);
    } else {
      window.addEventListener('resize', this.handleWindowResize);
    }
  }

  private handleWindowResize = (): void => {
    this.resize();
  };

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.logicalWidth = LOGICAL_WIDTH;
    const aspect = rect.height / rect.width;
    this.logicalHeight = Math.max(580, Math.min(880, LOGICAL_WIDTH * aspect));

    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);

    if (this.swinging && this.swinging.status === 'SWINGING') {
      this.swinging.ropeLength = this.getRopeLength();
      this.swinging.maxAngle = this.getMaxAngle(this.swinging.ropeLength);
    }
  }

  private getGroundScreenY(): number {
    return this.logicalHeight * 0.82;
  }

  private getRopeLength(): number {
    return Math.min(144, this.logicalHeight * 0.20);
  }

  private getMaxAngle(ropeLength: number): number {
    const desiredHorizontalTravel = 118;
    return Math.asin(Math.min(0.88, desiredHorizontalTravel / Math.max(90, ropeLength)));
  }

  private setupTitleShowcase(): void {
    this.gameState = 'TITLE_MENU';
    this.layers = [
      {
        id: 1,
        x: LOGICAL_WIDTH / 2,
        y: -CAKE_HEIGHT,
        width: INITIAL_CAKE_WIDTH,
        height: CAKE_HEIGHT,
        flavor: getFlavorForLayer(0),
        squash: 0,
        perfectFlash: 0,
        widthBonusFlash: 0,
      },
      {
        id: 2,
        x: LOGICAL_WIDTH / 2 + 3,
        y: -CAKE_HEIGHT * 2,
        width: INITIAL_CAKE_WIDTH - 10,
        height: CAKE_HEIGHT,
        flavor: getFlavorForLayer(1),
        squash: 0,
        perfectFlash: 0,
        widthBonusFlash: 0,
      },
    ];
    this.debris = [];
    this.particles = [];
    this.callouts = [];
    this.missedCake = null;
    this.missWaitTimer = 0;
    this.cameraY = 0;
    this.targetCameraY = 0;

    const ropeLength = this.getRopeLength();
    this.swinging = {
      phase: 0,
      speed: 0.825,
      maxAngle: this.getMaxAngle(ropeLength) * 0.65,
      angle: 0,
      pivotX: LOGICAL_WIDTH / 2,
      pivotY: PENDULUM_PIVOT_Y,
      ropeLength,
      x: LOGICAL_WIDTH / 2,
      y: 0,
      screenY: PENDULUM_PIVOT_Y + ropeLength + 12,
      width: INITIAL_CAKE_WIDTH - 10,
      height: CAKE_HEIGHT,
      flavor: getFlavorForLayer(2),
      status: 'SWINGING',
      vy: 0,
      tilt: 0,
    };
    this.emitSnapshot();
  }

  public startNewGame(): void {
    this.gameState = 'PLAYING';
    this.layers = [];
    this.debris = [];
    this.particles = [];
    this.callouts = [];
    this.missedCake = null;
    this.missWaitTimer = 0;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.isNewBest = false;
    this.lastMissReason = undefined;

    this.spawnNextSwingingCake(INITIAL_CAKE_WIDTH, 0);
    this.emitSnapshot();
  }

  public returnToTitle(): void {
    this.setupTitleShowcase();
  }

  public setPaused(paused: boolean): void {
    if (paused && this.gameState === 'PLAYING' && !this.missedCake) {
      this.gameState = 'PAUSED';
      this.emitSnapshot();
    } else if (!paused && this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.lastTime = performance.now();
      this.emitSnapshot();
    }
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  private spawnNextSwingingCake(width: number, layerIndex: number): void {
    const ropeLength = this.getRopeLength();
    const maxAngle = this.getMaxAngle(ropeLength);
    // Smooth asymptotic swing speed progression (relaxed 0.5x pace)
    const speed = 1.025 + 0.925 * (1 - Math.exp(-layerIndex / 22));
    // Alternate starting side each layer for dynamic rhythm
    const startPhase = layerIndex % 2 === 0 ? -Math.PI * 0.38 : Math.PI * 0.38;

    const angle = maxAngle * Math.sin(startPhase);
    const bobX = LOGICAL_WIDTH / 2 + Math.sin(angle) * ropeLength;
    const bobY = PENDULUM_PIVOT_Y + Math.cos(angle) * ropeLength;

    this.swinging = {
      phase: startPhase,
      speed,
      maxAngle,
      angle,
      pivotX: LOGICAL_WIDTH / 2,
      pivotY: PENDULUM_PIVOT_Y,
      ropeLength,
      x: bobX,
      y: 0,
      screenY: bobY + 12,
      width,
      height: CAKE_HEIGHT,
      flavor: getFlavorForLayer(layerIndex),
      status: 'SWINGING',
      vy: 0,
      tilt: 0,
    };
  }

  public dropCake(): boolean {
    if (this.gameState !== 'PLAYING') return false;
    if (!this.swinging || this.swinging.status !== 'SWINGING') return false;
    if (this.missedCake) return false;

    const groundScreenY = this.getGroundScreenY();
    const bobX =
      this.swinging.pivotX + Math.sin(this.swinging.angle) * this.swinging.ropeLength;
    const bobY =
      this.swinging.pivotY + Math.cos(this.swinging.angle) * this.swinging.ropeLength;

    this.swinging.status = 'FALLING';
    this.swinging.x = bobX;
    this.swinging.screenY = bobY + 12;
    this.swinging.y = this.swinging.screenY + this.cameraY - groundScreenY;
    this.swinging.vy = 140;

    patisserieAudio.playDrop();
    return true;
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    if (this.gameState === 'PAUSED') return;

    this.elapsed += dt;

    // Decaying camera shake
    if (this.shakeIntensity > 0.05) {
      this.shakeIntensity *= Math.exp(-16 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    // Brief hitstop on heavy slice or miss
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Smooth exponential camera pan upward
    const camLerp = 1 - Math.exp(-6.5 * dt);
    this.cameraY += (this.targetCameraY - this.cameraY) * camLerp;

    // Decay squash & glow animations on existing layers
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.squash > 0) {
        layer.squash = Math.max(0, layer.squash - dt * 5.2);
      }
      if (layer.perfectFlash > 0) {
        layer.perfectFlash = Math.max(0, layer.perfectFlash - dt * 2.1);
      }
      if (layer.widthBonusFlash > 0) {
        layer.widthBonusFlash = Math.max(0, layer.widthBonusFlash - dt * 1.4);
      }
    }

    // Update swinging or falling cake
    if (this.swinging) {
      if (this.swinging.status === 'SWINGING') {
        this.swinging.phase += this.swinging.speed * dt;
        this.swinging.angle =
          this.swinging.maxAngle * Math.sin(this.swinging.phase);
        this.swinging.x =
          this.swinging.pivotX +
          Math.sin(this.swinging.angle) * this.swinging.ropeLength;
        this.swinging.screenY =
          this.swinging.pivotY +
          Math.cos(this.swinging.angle) * this.swinging.ropeLength +
          12;
      } else if (this.gameState === 'PLAYING') {
        this.swinging.vy += GRAVITY * dt;
        this.swinging.y += this.swinging.vy * dt;

        const targetTopY =
          this.layers.length === 0
            ? 0
            : this.layers[this.layers.length - 1].y;

        if (this.swinging.y + this.swinging.height >= targetTopY) {
          this.resolveLanding(targetTopY);
        }
      }
    }

    // Update missed cake tumbling out of view
    if (this.missedCake) {
      this.missedCake.vy += GRAVITY * 0.9 * dt;
      this.missedCake.x += this.missedCake.vx * dt;
      this.missedCake.y += this.missedCake.vy * dt;
      this.missedCake.angle += this.missedCake.angularVel * dt;

      this.missWaitTimer -= dt;
      if (this.missWaitTimer <= 0 && this.gameState === 'PLAYING') {
        this.finishGameOver();
      }
    }

    // Update sliced debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += GRAVITY * 0.85 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.angle += d.angularVel * dt;
      d.alpha -= dt * 0.65;
      const screenY = d.y - this.cameraY + this.getGroundScreenY();
      if (d.alpha <= 0 || screenY > this.logicalHeight + 120) {
        this.debris.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.kind !== 'ring') {
        p.vy += 580 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    // Update floating callouts
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      this.callouts[i].life -= dt;
      if (this.callouts[i].life <= 0) {
        this.callouts.splice(i, 1);
      }
    }
  }

  private resolveLanding(targetTopY: number): void {
    if (!this.swinging) return;

    const falling = this.swinging;
    const fallingLeft = falling.x - falling.width / 2;
    const fallingRight = falling.x + falling.width / 2;

    // Base drop onto the porcelain cake stand
    if (this.layers.length === 0) {
      const standLeft = LOGICAL_WIDTH / 2 - CAKE_STAND_WIDTH / 2;
      const standRight = LOGICAL_WIDTH / 2 + CAKE_STAND_WIDTH / 2;
      const overlapLeft = Math.max(fallingLeft, standLeft);
      const overlapRight = Math.min(fallingRight, standRight);
      const overlapWidth = overlapRight - overlapLeft;

      if (overlapWidth < MIN_VIABLE_WIDTH) {
        this.triggerMiss(falling, LOGICAL_WIDTH / 2, 'missed_stand');
        return;
      }

      // If completely inside stand, keep full width; if overhanging stand rim, slice excess
      const landedCenterX = (overlapLeft + overlapRight) / 2;
      const overhangLeft = overlapLeft - fallingLeft;
      const overhangRight = fallingRight - overlapRight;

      if (overhangLeft > 2) {
        this.spawnDebris(
          fallingLeft + overhangLeft / 2,
          targetTopY - CAKE_HEIGHT / 2,
          overhangLeft,
          CAKE_HEIGHT,
          falling.flavor,
          -1
        );
      }
      if (overhangRight > 2) {
        this.spawnDebris(
          fallingRight - overhangRight / 2,
          targetTopY - CAKE_HEIGHT / 2,
          overhangRight,
          CAKE_HEIGHT,
          falling.flavor,
          1
        );
      }

      const isCenteredOnStand =
        Math.abs(falling.x - LOGICAL_WIDTH / 2) <= PERFECT_TOLERANCE * 1.3 &&
        overhangLeft <= 1 &&
        overhangRight <= 1;

      const placedX = isCenteredOnStand ? LOGICAL_WIDTH / 2 : landedCenterX;
      const placedWidth = isCenteredOnStand ? falling.width : overlapWidth;

      if (isCenteredOnStand) {
        this.combo = 1;
        this.maxCombo = Math.max(this.maxCombo, 1);
        this.perfectCount += 1;
        this.score += 15;
        patisserieAudio.playPerfect(1, false);
        this.spawnPerfectParticles(placedX, targetTopY - CAKE_HEIGHT, placedWidth);
        this.addCallout(placedX, targetTopY - CAKE_HEIGHT - 16, '完美開局！', '+15', '#B83B5E');
      } else {
        this.combo = 0;
        this.score += 10;
        patisserieAudio.playSliceLand();
        this.spawnLandingCrumbs(placedX, targetTopY, falling.flavor);
        this.addCallout(placedX, targetTopY - CAKE_HEIGHT - 16, '+10', undefined, '#7A523B');
      }

      this.layers.push({
        id: 1,
        x: placedX,
        y: targetTopY - CAKE_HEIGHT,
        width: placedWidth,
        height: CAKE_HEIGHT,
        flavor: falling.flavor,
        squash: 1,
        perfectFlash: isCenteredOnStand ? 1 : 0,
        widthBonusFlash: 0,
      });

      this.updateCameraTarget();
      this.spawnNextSwingingCake(placedWidth, this.layers.length);
      this.emitSnapshot();
      return;
    }

    // Subsequent layers: align & trim against top layer
    const prev = this.layers[this.layers.length - 1];
    const prevLeft = prev.x - prev.width / 2;
    const prevRight = prev.x + prev.width / 2;
    const dx = falling.x - prev.x;

    const overlapLeft = Math.max(fallingLeft, prevLeft);
    const overlapRight = Math.min(fallingRight, prevRight);
    const overlapWidth = overlapRight - overlapLeft;

    // Complete miss -> Game Over
    if (overlapWidth < MIN_VIABLE_WIDTH) {
      this.triggerMiss(falling, prev.x, 'missed_stack');
      return;
    }

    // Perfect alignment!
    if (Math.abs(dx) <= PERFECT_TOLERANCE) {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.perfectCount += 1;

      let finalWidth = prev.width;
      let widened = false;
      if (this.combo >= COMBO_WIDEN_THRESHOLD && prev.width < INITIAL_CAKE_WIDTH) {
        finalWidth = Math.min(INITIAL_CAKE_WIDTH, prev.width + COMBO_WIDEN_AMOUNT);
        widened = finalWidth > prev.width + 0.5;
      }

      const gained = 10 + this.combo * 5 + (widened ? 15 : 0);
      this.score += gained;
      if (this.score > this.bestScore) {
        this.isNewBest = true;
      }

      this.layers.push({
        id: this.layers.length + 1,
        x: prev.x,
        y: targetTopY - CAKE_HEIGHT,
        width: finalWidth,
        height: CAKE_HEIGHT,
        flavor: falling.flavor,
        squash: 1,
        perfectFlash: 1,
        widthBonusFlash: widened ? 1 : 0,
      });

      patisserieAudio.playPerfect(this.combo, widened);
      this.spawnPerfectParticles(prev.x, targetTopY - CAKE_HEIGHT, finalWidth, widened);

      if (widened) {
        this.addCallout(
          prev.x,
          targetTopY - CAKE_HEIGHT - 18,
          `連擊 ×${this.combo} · 蛋糕加寬！`,
          `+${gained}`,
          '#B8860B'
        );
      } else {
        this.addCallout(
          prev.x,
          targetTopY - CAKE_HEIGHT - 16,
          this.combo > 1 ? `完美 ×${this.combo}` : '完美對齊！',
          `+${gained}`,
          '#B83B5E'
        );
      }

      this.updateCameraTarget();
      this.spawnNextSwingingCake(finalWidth, this.layers.length);
      this.emitSnapshot();
      return;
    }

    // Partial overlap -> Trim excess overhang!
    this.combo = 0;
    const newCenterX = (overlapLeft + overlapRight) / 2;
    const cutSide: -1 | 1 = dx < 0 ? -1 : 1;
    const cutWidth = falling.width - overlapWidth;
    const cutCenterX =
      cutSide < 0
        ? fallingLeft + cutWidth / 2
        : fallingRight - cutWidth / 2;

    this.spawnDebris(
      cutCenterX,
      targetTopY - CAKE_HEIGHT / 2,
      cutWidth,
      CAKE_HEIGHT,
      falling.flavor,
      cutSide
    );
    this.spawnLandingCrumbs(
      cutSide < 0 ? overlapLeft : overlapRight,
      targetTopY - CAKE_HEIGHT * 0.5,
      falling.flavor
    );

    this.hitstopTimer = 0.032;
    this.shakeIntensity = Math.min(6, 2.2 + cutWidth * 0.05);

    const gained = 10;
    this.score += gained;
    if (this.score > this.bestScore) {
      this.isNewBest = true;
    }

    this.layers.push({
      id: this.layers.length + 1,
      x: newCenterX,
      y: targetTopY - CAKE_HEIGHT,
      width: overlapWidth,
      height: CAKE_HEIGHT,
      flavor: falling.flavor,
      squash: 0.9,
      perfectFlash: 0,
      widthBonusFlash: 0,
    });

    patisserieAudio.playSliceLand();
    this.addCallout(newCenterX, targetTopY - CAKE_HEIGHT - 14, `+${gained}`, undefined, '#7A523B');

    this.updateCameraTarget();
    this.spawnNextSwingingCake(overlapWidth, this.layers.length);
    this.emitSnapshot();
  }

  private triggerMiss(
    falling: SwingingCake,
    referenceX: number,
    reason: 'missed_stand' | 'missed_stack'
  ): void {
    const dir = falling.x < referenceX ? -1 : 1;
    this.swinging = null;
    this.missedCake = {
      x: falling.x,
      y: falling.y + falling.height / 2,
      width: falling.width,
      height: falling.height,
      vx: dir * 68,
      vy: Math.max(120, falling.vy * 0.45),
      angle: 0,
      angularVel: dir * 3.8,
      flavor: falling.flavor,
      alpha: 1,
    };
    this.lastMissReason = reason;
    this.missWaitTimer = 0.48;
    this.hitstopTimer = 0.055;
    this.shakeIntensity = 10;
    patisserieAudio.playGameOver();
  }

  private finishGameOver(): void {
    this.missedCake = null;
    this.gameState = 'GAME_OVER';
    const snap = this.buildSnapshot();
    this.callbacks.onSnapshot(snap);
    this.callbacks.onGameOver(snap);
  }

  private updateCameraTarget(): void {
    const groundScreenY = this.getGroundScreenY();
    const desiredTopScreenY = this.logicalHeight * 0.67;
    const topWorldY = -this.layers.length * CAKE_HEIGHT;
    this.targetCameraY = Math.min(0, topWorldY + groundScreenY - desiredTopScreenY);
  }

  private spawnDebris(
    x: number,
    y: number,
    width: number,
    height: number,
    flavor: SwingingCake['flavor'],
    dir: -1 | 1
  ): void {
    this.debris.push({
      x,
      y,
      width,
      height,
      vx: dir * (72 + Math.random() * 48),
      vy: -85 - Math.random() * 55,
      angle: 0,
      angularVel: dir * (2.6 + Math.random() * 2.5),
      flavor,
      alpha: 1,
    });
  }

  private spawnLandingCrumbs(
    x: number,
    y: number,
    flavor: SwingingCake['flavor']
  ): void {
    const colors = [flavor.creamColor, flavor.frostingColor, flavor.spongeTop];
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI * Math.random();
      const speed = 45 + Math.random() * 115;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: 2.5 + Math.random() * 3,
        color: colors[i % colors.length],
        alpha: 0.95,
        life: 0.48 + Math.random() * 0.25,
        maxLife: 0.72,
        kind: 'crumb',
      });
    }
  }

  private spawnPerfectParticles(
    x: number,
    y: number,
    width: number,
    widened = false
  ): void {
    this.particles.push({
      x,
      y: y + CAKE_HEIGHT * 0.5,
      vx: 0,
      vy: 0,
      size: width * 0.45,
      color: widened ? '#D4AF37' : '#E87A90',
      alpha: 1,
      life: 0.45,
      maxLife: 0.45,
      kind: 'ring',
    });

    const count = widened ? 18 : 11;
    for (let i = 0; i < count; i++) {
      const px = x + (Math.random() - 0.5) * (width + 18);
      const py = y + Math.random() * CAKE_HEIGHT;
      this.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 90,
        vy: -60 - Math.random() * 110,
        size: widened ? 5.5 + Math.random() * 3.5 : 4 + Math.random() * 2.5,
        color: i % 2 === 0 ? '#F3C64F' : '#FFFDF5',
        alpha: 1,
        life: 0.55 + Math.random() * 0.25,
        maxLife: 0.8,
        kind: 'sparkle',
      });
    }
  }

  private addCallout(
    x: number,
    y: number,
    text: string,
    subtext: string | undefined,
    color: string
  ): void {
    this.callouts.push({
      x,
      y,
      text,
      subtext,
      color,
      life: 0.9,
      maxLife: 0.9,
    });
  }

  private buildSnapshot(): GameSnapshot {
    const currentWidth =
      this.layers.length > 0
        ? this.layers[this.layers.length - 1].width
        : INITIAL_CAKE_WIDTH;
    return {
      gameState: this.gameState,
      score: this.score,
      height: this.layers.length,
      combo: this.combo,
      maxCombo: this.maxCombo,
      perfectCount: this.perfectCount,
      widthPercent: Math.round((currentWidth / INITIAL_CAKE_WIDTH) * 100),
      currentFlavor:
        this.swinging?.flavor ?? getFlavorForLayer(this.layers.length),
      isNewBest: this.isNewBest,
      lastMissReason: this.lastMissReason,
    };
  }

  private emitSnapshot(): void {
    this.callbacks.onSnapshot(this.buildSnapshot());
  }

  private render(): void {
    const ctx = this.ctx;
    const scaleX = this.canvas.width / this.logicalWidth;
    const scaleY = this.canvas.height / this.logicalHeight;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    if (this.shakeIntensity > 0.05) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
    }

    const groundScreenY = this.getGroundScreenY();

    drawPatisserieBackground(
      ctx,
      this.logicalWidth,
      this.logicalHeight,
      this.cameraY,
      groundScreenY,
      this.elapsed
    );

    const standScreenY = 0 - this.cameraY + groundScreenY;
    drawCakeStand(ctx, this.logicalWidth / 2, standScreenY, CAKE_STAND_WIDTH);

    drawStackedLayers(
      ctx,
      this.layers,
      this.cameraY,
      groundScreenY,
      this.logicalHeight
    );

    if (this.swinging) {
      const targetX =
        this.layers.length === 0
          ? this.logicalWidth / 2
          : this.layers[this.layers.length - 1].x;
      const tolerance =
        this.layers.length === 0 ? PERFECT_TOLERANCE * 1.3 : PERFECT_TOLERANCE;
      const currentCakeX =
        this.swinging.status === 'SWINGING'
          ? this.swinging.pivotX + Math.sin(this.swinging.angle) * this.swinging.ropeLength
          : this.swinging.x;
      const isPerfectAligned = Math.abs(currentCakeX - targetX) <= tolerance;

      if (this.gameState === 'PLAYING' && this.swinging.status === 'SWINGING') {
        drawAimingGuide(
          ctx,
          this.swinging,
          this.layers,
          this.cameraY,
          groundScreenY,
          this.logicalWidth / 2,
          CAKE_STAND_WIDTH,
          PERFECT_TOLERANCE,
          this.logicalHeight
        );
      }

      drawPendulumAndSuspendedCake(
        ctx,
        this.swinging,
        this.cameraY,
        groundScreenY,
        this.elapsed,
        this.gameState === 'PLAYING' && isPerfectAligned
      );
    }

    if (this.missedCake) {
      drawDebris(ctx, [this.missedCake], this.cameraY, groundScreenY);
    }

    drawDebris(ctx, this.debris, this.cameraY, groundScreenY);
    drawParticles(ctx, this.particles, this.cameraY, groundScreenY);
    drawFloatingCallouts(ctx, this.callouts, this.cameraY, groundScreenY);

    ctx.restore();
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.handleWindowResize);
  }
}
