export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type ToppingType =
  | 'strawberry'
  | 'pistachio'
  | 'caramel'
  | 'blueberry'
  | 'chocolate'
  | 'vanilla';

export interface CakeFlavor {
  id: string;
  nameZh: string;
  nameFr: string;
  spongeTop: string;
  spongeBottom: string;
  spongeStroke: string;
  creamColor: string;
  frostingColor: string;
  frostingHighlight: string;
  topping: ToppingType;
  accentColor: string;
}

export interface CakeLayer {
  id: number;
  x: number; // center X in logical coordinates
  y: number; // top Y in world coordinates (negative goes up, 0 is cake stand surface)
  width: number;
  height: number;
  flavor: CakeFlavor;
  squash: number; // 0..1 decaying impact squash-and-stretch
  perfectFlash: number; // 0..1 decaying golden highlight
  widthBonusFlash: number; // 0..1 when widened via combo
}

export interface SwingingCake {
  phase: number;
  speed: number;
  maxAngle: number;
  angle: number;
  pivotX: number;
  pivotY: number;
  ropeLength: number;
  x: number; // current center X
  y: number; // current top Y in world coords (when falling) or screen coords (converted on drop)
  screenY: number; // current top Y in screen coords while swinging
  width: number;
  height: number;
  flavor: CakeFlavor;
  status: 'SWINGING' | 'FALLING';
  vy: number;
  tilt: number;
}

export interface FallingDebris {
  x: number; // center X
  y: number; // center Y in world coords
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  flavor: CakeFlavor;
  alpha: number;
}

export interface Particle {
  x: number; // world X
  y: number; // world Y
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'crumb' | 'sparkle' | 'ring';
}

export interface FloatingCallout {
  x: number; // world X
  y: number; // world Y
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface GameSnapshot {
  gameState: GameState;
  score: number;
  height: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  widthPercent: number;
  currentFlavor: CakeFlavor;
  isNewBest: boolean;
  lastMissReason?: 'missed_stand' | 'missed_stack';
}

export interface PersistentStats {
  bestScore: number;
  bestHeight: number;
  bestCombo: number;
  isMuted: boolean;
}
