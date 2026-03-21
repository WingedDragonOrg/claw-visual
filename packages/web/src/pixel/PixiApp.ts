import { Application, Graphics } from 'pixi.js';
import type { Agent } from '../types';
import { AgentSprite } from './AgentSprite';
import { assignSlots } from './SceneLayout';

/**
 * Manages the PixiJS Application lifecycle.
 * Created once per PixelOffice mount, destroyed on unmount.
 */
export class PixiApp {
  private app: Application | null = null;
  private sprites: Map<string, AgentSprite> = new Map();
  private initialized = false;

  async init(canvas: HTMLCanvasElement) {
    const app = new Application();
    await app.init({
      canvas,
      width: canvas.clientWidth || 1200,
      height: 500,
      background: 0x0b0b12,
      antialias: false, // pixel-perfect rendering
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.app = app;
    this.initialized = true;

    this.drawBackground();

    // Ticker for animations
    app.ticker.add(() => {
      for (const sprite of this.sprites.values()) {
        sprite.tick();
      }
    });
  }

  private drawBackground() {
    if (!this.app) return;
    const g = new Graphics();
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // Pixel-art floor grid
    for (let x = 0; x < W; x += 32) {
      for (let y = 0; y < H; y += 32) {
        const shade = ((x / 32 + y / 32) % 2 === 0) ? 0x111119 : 0x0f0f16;
        g.rect(x, y, 32, 32).fill({ color: shade });
      }
    }

    // Desk zone label
    g.rect(20, 20, 140, 18).fill({ color: 0x1a1a2e });

    this.app.stage.addChild(g);
  }

  isReady(): boolean {
    return this.initialized && this.app !== null;
  }

  updateAgents(agents: Agent[]) {
    if (!this.app || !this.initialized) return;

    const slots = assignSlots(agents.length);

    const stage = this.app.stage;
    agents.forEach((agent, i) => {
      const slot = slots[i] || { x: 60, y: 60, area: 'desk' as const };

      if (this.sprites.has(agent.id)) {
        const sprite = this.sprites.get(agent.id)!;
        sprite.setState(agent);
        sprite.moveTo(slot.x, slot.y);
      } else {
        const sprite = new AgentSprite(agent);
        sprite.moveTo(slot.x, slot.y);
        stage.addChild(sprite.container);
        this.sprites.set(agent.id, sprite);
      }
    });

    // Remove sprites for agents no longer in list
    const currentIds = new Set(agents.map((a) => a.id));
    for (const [id, sprite] of this.sprites) {
      if (!currentIds.has(id)) {
        sprite.destroy();
      }
    }
    for (const id of [...this.sprites.keys()]) {
      if (!currentIds.has(id)) this.sprites.delete(id);
    }
  }

  destroy() {
    if (!this.app) return;
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
    this.app.destroy();
    this.app = null;
    this.initialized = false;
  }
}
