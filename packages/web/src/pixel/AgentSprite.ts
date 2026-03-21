import {
  Graphics, Text, TextStyle, Container,
  Spritesheet, Texture, AnimatedSprite, Assets,
} from 'pixi.js';
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

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TINTS = [0xffd700, 0x87ceeb, 0xffa07a, 0x98fb98, 0xdda0dd,
               0xf0e68c, 0xb0c4de, 0xff9999, 0x99ff99, 0x9999ff, 0xffcc99];

function resolveSpritePath(key: string): string {
  return SPRITE_SHEETS[key] ?? FALLBACK_POOL[stableHash(key) % FALLBACK_POOL.length];
}

function resolveTint(key: string): number | null {
  return key in SPRITE_SHEETS ? null : TINTS[stableHash(key) % TINTS.length];
}

// ──────────────────────────────────────────────
// Sprite sheet frame layout (256×192, 64×64/frame)
// ──────────────────────────────────────────────
const FRAME_W = 64;
const FRAME_H = 64;

const ANIM_ROW: Record<PixelState, number> = {
  idle:  0,
  work:  1,
  sleep: 2,
  error: 0,
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
// Lerp movement constants
// ──────────────────────────────────────────────
const LERP_SPEED = 0.06; // fraction of distance per frame

// ──────────────────────────────────────────────
// AgentSprite
// ──────────────────────────────────────────────
export class AgentSprite {
  readonly container: Container;
  private agent: Agent;
  private animated: AnimatedSprite | null = null;
  private label: Text;
  private errorOverlay: Graphics | null = null;
  private bubble: StatusBubble | null = null;
  private currentState: PixelState;
  private agentKey: string;
  private tint: number | null;
  private destroyed = false;
  private highlightBox: Graphics | null = null;
  private isHovered = false;
  private targetScale = 1.0;

  // Lerp target
  private targetX = 0;
  private targetY = 0;

  constructor(agent: Agent, onClickCallback?: (agent: Agent, screenX: number, screenY: number) => void) {
    this.agent = agent;
    this.currentState = STATUS_TO_PIXEL[agent.status];
    this.container = new Container();
    this.agentKey = this.resolveKey(agent);
    this.tint = resolveTint(this.agentKey);

    // Interaction
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    if (onClickCallback) {
      this.container.on('pointerdown', (e) => {
        onClickCallback(agent, e.global.x, e.global.y);
      });
    }

    // Hover highlight
    const hlBox = new Graphics();
    hlBox.roundRect(0, 0, 64, 64, 4).fill({ color: 0xffffff, alpha: 1 });
    hlBox.alpha = 0;
    this.container.addChild(hlBox);
    this.highlightBox = hlBox;

    this.container.on('pointerover', () => {
      this.isHovered = true;
      this.targetScale = 1.15;
      if (this.highlightBox) this.highlightBox.alpha = 0.18;
      if (this.animated) {
        const baseTint = this.animated.tint as number;
        const r = Math.min(0xff, ((baseTint >> 16) & 0xff) * 1.2) | 0;
        const g = Math.min(0xff, ((baseTint >> 8) & 0xff) * 1.2) | 0;
        const b = Math.min(0xff, (baseTint & 0xff) * 1.2) | 0;
        this.animated.tint = (r << 16) | (g << 8) | b;
      }
    });

    this.container.on('pointerout', () => {
      this.isHovered = false;
      this.targetScale = 1.0;
      if (this.highlightBox) this.highlightBox.alpha = 0;
      // Restore original tint
      if (this.animated) {
        if (this.agent.status === 'offline') {
          this.animated.tint = 0x888888;
        } else if (this.tint !== null) {
          this.animated.tint = this.tint;
        } else {
          this.animated.tint = 0xffffff;
        }
      }
    });

    // Name label
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

    this.applyOfflineAlpha();
    this.loadSheet();
    this.syncBubble();
  }

  private resolveKey(agent: Agent): string {
    const name = agent.name.toLowerCase().replace(/[\s同学]/g, '');
    if (name.includes('爱')) return 'xiaoai';
    if (name.includes('产') || name.includes('chan')) return 'xiaochan';
    if (name.includes('开') || name.includes('kai'))  return 'xiaokai';
    return agent.id.toLowerCase();
  }

  private applyOfflineAlpha() {
    this.container.alpha = this.agent.status === 'offline' ? 0.38 : 1;
  }

  private async loadSheet() {
    try {
      const sheet = await getSheet(resolveSpritePath(this.agentKey));
      if (this.destroyed) return;

      const textures = sheet.animations[this.currentState] ?? sheet.animations['idle'];
      const anim = new AnimatedSprite(textures);
      anim.animationSpeed = ANIM_SPEED[this.currentState];
      anim.loop = true;
      anim.scale.set(1);

      if (this.tint !== null) anim.tint = this.tint;
      if (this.agent.status === 'offline') anim.tint = 0x888888;

      anim.play();
      this.animated = anim;
      this.container.addChildAt(anim, 0);

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

  private syncBubble() {
    const status = this.agent.status;
    if (status === 'busy' && !this.bubble) {
      this.bubble = new StatusBubble('💦', 0x2266cc);
      this.bubble.container.position.set(54, -22);
      this.container.addChild(this.bubble.container);
    } else if (status === 'error' && !this.bubble) {
      this.bubble = new StatusBubble('❗', 0xcc2200);
      this.bubble.container.position.set(54, -22);
      this.container.addChild(this.bubble.container);
    } else if (status !== 'busy' && status !== 'error' && this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
  }

  tick(frame: number) {
    // Lerp towards target position
    const cx = this.container.x;
    const cy = this.container.y;
    const dx = this.targetX - cx;
    const dy = this.targetY - cy;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      this.container.x += dx * LERP_SPEED;
      this.container.y += dy * LERP_SPEED;
    }

    // Smooth scale lerp
    this.container.scale.x += (this.targetScale - this.container.scale.x) * 0.15;
    this.container.scale.y = this.container.scale.x;

    // Error overlay blink
    if (this.errorOverlay) {
      this.errorOverlay.alpha = frame % 40 < 20 ? 0.35 : 0;
    }

    // Bubble float
    if (this.bubble) {
      this.bubble.tick(frame / 60);
    }
  }

  /** Set target position; container lerps there over subsequent frames */
  moveTo(x: number, y: number) {
    this.targetX = x - 32;
    this.targetY = y - 32;
    // Snap on first placement (container is at 0,0)
    if (this.container.x === 0 && this.container.y === 0) {
      this.container.position.set(this.targetX, this.targetY);
    }
  }

  setState(agent: Agent) {
    const newState = STATUS_TO_PIXEL[agent.status];
    const changed = this.currentState !== newState || agent.status !== this.agent.status;
    this.agent = agent;
    this.currentState = newState;

    this.label.text = agent.name.replace(/同学$/g, '');
    this.applyOfflineAlpha();

    if (!changed || !this.animated) {
      this.syncBubble();
      return;
    }

    if (agent.status === 'offline') {
      this.animated.tint = 0x888888;
    } else if (this.tint !== null) {
      this.animated.tint = this.tint;
    } else {
      this.animated.tint = 0xffffff;
    }

    if (newState === 'error') this.ensureErrorOverlay();
    else if (this.errorOverlay) this.errorOverlay.alpha = 0;

    this.syncBubble();
  }

  destroy() {
    this.destroyed = true;
    this.bubble?.destroy();
    this.container.destroy({ children: true });
  }
}
