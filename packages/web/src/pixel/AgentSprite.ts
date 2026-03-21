import { Graphics, Text, TextStyle, Container, Spritesheet, Texture, AnimatedSprite, Assets } from 'pixi.js';
import type { Agent } from '../types';
import type { PixelState } from './types';
import { STATUS_TO_PIXEL } from './types';
import { StatusBubble } from './SceneDecorations';

// ──────────────────────────────────────────────
// Sprite sheet registry
// ──────────────────────────────────────────────
const SPRITE_SHEETS: Record<string, string> = {
  xiaoai:   '/sprites/agent-xiaoai.png',
  xiaochan: '/sprites/agent-xiaochan.png',
  xiaokai:  '/sprites/agent-xiaokai.png',
};

const FALLBACK_POOL = Object.values(SPRITE_SHEETS);

/** Stable hash — same key always picks same fallback */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Tint palette for fallback agents — distinguishes reused sprites visually */
const TINTS = [0xffd700, 0x87ceeb, 0xffa07a, 0x98fb98, 0xdda0dd, 0xf0e68c, 0xb0c4de,
               0xff9999, 0x99ff99, 0x9999ff, 0xffcc99];

function resolveSpritePath(key: string): string {
  return SPRITE_SHEETS[key] ?? FALLBACK_POOL[stableHash(key) % FALLBACK_POOL.length];
}

function resolveTint(key: string): number | null {
  if (key in SPRITE_SHEETS) return null; // dedicated sprite, no tint
  return TINTS[stableHash(key) % TINTS.length];
}

// ──────────────────────────────────────────────
// Sprite sheet frame layout (256×192, 64×64/frame, 4 cols × 3 rows)
// ──────────────────────────────────────────────
const FRAME_W = 64;
const FRAME_H = 64;

const ANIM_ROW: Record<PixelState, number> = {
  idle:  0,
  work:  1,
  sleep: 2,
  error: 0,  // reuse idle; error tint applied via Graphics overlay
};

const ANIM_FRAMES: Record<PixelState, number> = {
  idle:  4,
  work:  4,
  sleep: 2,
  error: 4,
};

const ANIM_SPEED: Record<PixelState, number> = {
  idle:  0.06,
  work:  0.10,
  sleep: 0.03,
  error: 0.06,
};

// ──────────────────────────────────────────────
// Shared Spritesheet cache — avoids re-parsing the same texture
// ──────────────────────────────────────────────
const sheetCache = new Map<string, Spritesheet>();

async function getSheet(path: string): Promise<Spritesheet> {
  if (sheetCache.has(path)) return sheetCache.get(path)!;

  const texture = await Assets.load<Texture>(path);

  const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
  const animations: Record<string, string[]> = {};

  for (const state of ['idle', 'work', 'sleep', 'error'] as PixelState[]) {
    const row = ANIM_ROW[state];
    const count = ANIM_FRAMES[state];
    const keys: string[] = [];
    for (let col = 0; col < count; col++) {
      const key = `${path}:${state}_${col}`;
      frames[key] = { frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H } };
      keys.push(key);
    }
    animations[state] = keys;
  }

  const sheet = new Spritesheet(texture, { frames, animations, meta: { scale: 1 } });
  await sheet.parse();
  sheetCache.set(path, sheet);
  return sheet;
}

// ──────────────────────────────────────────────
// AgentSprite
// ──────────────────────────────────────────────
const STATUS_LABEL: Record<string, { text: string; color: number }> = {
  online:  { text: '工作中', color: 0x22c55e },
  busy:    { text: '忙碌',   color: 0xf97316 },
  away:    { text: '休息',   color: 0xeab308 },
  offline: { text: '离线',   color: 0x6b7280 },
  error:   { text: '异常',   color: 0xef4444 },
};

export class AgentSprite {
  readonly container: Container;
  private agent: Agent;
  private animated: AnimatedSprite | null = null;
  private label: Text;
  private statusLabel: Text;
  private errorOverlay: Graphics | null = null;
  private bubble: StatusBubble | null = null;
  private currentState: PixelState;
  private agentKey: string;
  private tint: number | null;
  private destroyed = false;

  constructor(agent: Agent) {
    this.agent = agent;
    this.currentState = STATUS_TO_PIXEL[agent.status];
    this.container = new Container();
    this.agentKey = this.resolveKey(agent);
    this.tint = resolveTint(this.agentKey);

    // Name label — show full name without 同学 suffix
    const displayName = agent.name.replace(/同学$/g, '');
    this.label = new Text({
      text: displayName,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0xe0e0e0,
        align: 'center',
        dropShadow: { color: 0x000000, distance: 1, blur: 1, angle: Math.PI / 4, alpha: 1 },
      }),
    });
    this.label.anchor.set(0.5, 0);
    this.label.position.set(32, 67);
    this.container.addChild(this.label);

    // Status label
    const sl = STATUS_LABEL[agent.status] ?? STATUS_LABEL['offline'];
    this.statusLabel = new Text({
      text: sl.text,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 8,
        fill: sl.color,
        align: 'center',
      }),
    });
    this.statusLabel.anchor.set(0.5, 0);
    this.statusLabel.position.set(32, 78);
    this.container.addChild(this.statusLabel);

    this.loadSheet();
    this.syncBubble(); // init bubble based on initial status
  }

  private resolveKey(agent: Agent): string {
    const name = agent.name.toLowerCase().replace(/[\s同学]/g, '');
    if (name.includes('爱')) return 'xiaoai';
    if (name.includes('产') || name.includes('chan')) return 'xiaochan';
    if (name.includes('开') || name.includes('kai'))  return 'xiaokai';
    return agent.id.toLowerCase();
  }

  private async loadSheet() {
    try {
      const sheet = await getSheet(resolveSpritePath(this.agentKey));
      if (this.destroyed) return;

      const textures = sheet.animations[this.currentState] ?? sheet.animations['idle'];
      const anim = new AnimatedSprite(textures);
      anim.animationSpeed = ANIM_SPEED[this.currentState];
      anim.loop = true;
      anim.scale.set(1); // sprites are already 64×64

      // Apply tint for fallback agents
      if (this.tint !== null) anim.tint = this.tint;

      // Offline: desaturate
      if (this.agent.status === 'offline') anim.tint = 0x888888;

      anim.play();
      this.animated = anim;
      this.container.addChildAt(anim, 0);

      // Error overlay (blinking red)
      if (this.currentState === 'error') this.ensureErrorOverlay();
    } catch (err) {
      console.warn('[AgentSprite] sprite load failed:', err);
    }
  }

  private ensureErrorOverlay() {
    if (this.errorOverlay) return;
    const g = new Graphics();
    g.rect(0, 0, 64, 64).fill({ color: 0xff0000, alpha: 0 });
    this.container.addChild(g);
    this.errorOverlay = g;
  }

  tick(frame: number) {
    // Blink red overlay on error every 20 frames
    if (this.errorOverlay) {
      this.errorOverlay.alpha = frame % 40 < 20 ? 0.35 : 0;
    }
    // Animate bubble float
    if (this.bubble) {
      this.bubble.tick(frame / 60);
    }
  }

  private syncBubble() {
    const status = this.agent.status;
    if (status === 'busy') {
      if (!this.bubble) {
        this.bubble = new StatusBubble('💦', 0x2266cc);
        this.bubble.container.position.set(52, -20);
        this.container.addChild(this.bubble.container);
      }
    } else if (status === 'error') {
      if (!this.bubble) {
        this.bubble = new StatusBubble('❗', 0xcc2200);
        this.bubble.container.position.set(52, -20);
        this.container.addChild(this.bubble.container);
      }
    } else {
      if (this.bubble) {
        this.bubble.destroy();
        this.bubble = null;
      }
    }
  }

  moveTo(x: number, y: number) {
    this.container.position.set(x - 32, y - 32); // center of 64px sprite
  }

  setState(agent: Agent) {
    const newState = STATUS_TO_PIXEL[agent.status];
    const changed = this.currentState !== newState || agent.status !== this.agent.status;
    this.agent = agent;
    this.currentState = newState;

    // Update labels
    this.label.text = agent.name.replace(/同学/g, '');
    const sl = STATUS_LABEL[agent.status] ?? STATUS_LABEL['offline'];
    this.statusLabel.text = sl.text;
    (this.statusLabel.style as TextStyle).fill = sl.color;

    if (!changed || !this.animated) return;

    // Offline desaturate
    if (agent.status === 'offline') {
      this.animated.tint = 0x888888;
    } else if (this.tint !== null) {
      this.animated.tint = this.tint;
    } else {
      this.animated.tint = 0xffffff;
    }

    // Error overlay
    if (newState === 'error') this.ensureErrorOverlay();
    else if (this.errorOverlay) {
      this.errorOverlay.alpha = 0;
    }

    this.syncBubble();
  }

  destroy() {
    this.destroyed = true;
    this.container.destroy({ children: true });
  }
}
