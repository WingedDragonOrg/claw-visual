import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import type { Agent } from '../types';
import { AgentSprite } from './AgentSprite';
import { SceneDecorations } from './SceneDecorations';
import { assignSlotsByStatus, SCENE_W, SCENE_H, ZONES } from './SceneLayout';

export class PixiApp {
  private app: Application | null = null;
  private sprites: Map<string, AgentSprite> = new Map();
  private decorations: SceneDecorations | null = null;
  private initialized = false;
  private frame = 0;
  private elapsed = 0; // seconds since init
  private resizeObserver: ResizeObserver | null = null;

  async init(canvas: HTMLCanvasElement) {
    const app = new Application();
    await app.init({
      canvas,
      width: SCENE_W,
      height: SCENE_H,
      background: 0x0d0d1a,
      antialias: false,
      resolution: 1,
      autoDensity: false,
    });
    this.app = app;
    this.initialized = true;

    this.drawBackground();

    // Decorations layer (plants, clouds, monitors) — added above background
    const deco = new SceneDecorations();
    this.decorations = deco;
    app.stage.addChild(deco.container);

    // #28: Scale stage to container width while preserving SCENE_W×SCENE_H coordinate system
    const applyScale = () => {
      if (!this.app || !canvas.parentElement) return;
      const containerW = canvas.parentElement.clientWidth || SCENE_W;
      const scale = containerW / SCENE_W;
      canvas.style.width = `${containerW}px`;
      canvas.style.height = `${Math.round(SCENE_H * scale)}px`;
    };

    applyScale();
    this.resizeObserver = new ResizeObserver(applyScale);
    if (canvas.parentElement) this.resizeObserver.observe(canvas.parentElement);

    app.ticker.add((ticker) => {
      this.frame++;
      this.elapsed += ticker.deltaMS / 1000;
      for (const sprite of this.sprites.values()) sprite.tick(this.frame);
      this.decorations?.tick(this.elapsed, ticker.deltaTime);
    });
  }

  private drawBackground() {
    if (!this.app) return;
    const g = new Graphics();
    const stage = this.app.stage;

    // ── Floor grid ──────────────────────────────────
    for (let x = 0; x < SCENE_W; x += 32) {
      for (let y = 0; y < SCENE_H; y += 32) {
        const shade = ((x / 32 + y / 32) % 2 === 0) ? 0x111120 : 0x0d0d1a;
        g.rect(x, y, 32, 32).fill({ color: shade });
      }
    }

    // ── Desk zone ────────────────────────────────────
    const dz = ZONES.desk;
    g.rect(dz.x, dz.y, dz.w, dz.h).fill({ color: 0x151528, alpha: 0.7 });
    g.rect(dz.x, dz.y, dz.w, 2).fill({ color: 0x4040aa });     // top border
    g.rect(dz.x, dz.y, 2, dz.h).fill({ color: 0x4040aa });     // left border

    // Desk rows decoration (subtle)
    for (let row = 1; row < 3; row++) {
      const ry = dz.y + (dz.h / 3) * row;
      g.rect(dz.x + 4, ry, dz.w - 8, 1).fill({ color: 0x2a2a55, alpha: 0.5 });
    }

    // ── Lounge zone ──────────────────────────────────
    const lz = ZONES.lounge;
    g.rect(lz.x, lz.y, lz.w, lz.h).fill({ color: 0x0f2018, alpha: 0.7 });
    g.rect(lz.x, lz.y, lz.w, 2).fill({ color: 0x20aa55 });
    g.rect(lz.x, lz.y, 2, lz.h).fill({ color: 0x20aa55 });

    // Sofa/plant decoration
    g.roundRect(lz.x + 12, lz.y + lz.h - 30, 60, 20, 4).fill({ color: 0x1a4a2a });
    g.roundRect(lz.x + 80, lz.y + lz.h - 30, 60, 20, 4).fill({ color: 0x1a4a2a });
    // Plant pot
    g.rect(lz.x + lz.w - 30, lz.y + lz.h - 36, 16, 28).fill({ color: 0x8b4513 });
    g.ellipse(lz.x + lz.w - 22, lz.y + lz.h - 36, 20, 14).fill({ color: 0x228b22 });

    // ── Edge zone (offline row) ───────────────────────
    const ez = ZONES.edge;
    g.rect(ez.x, ez.y, ez.w, ez.h).fill({ color: 0x1a0d0d, alpha: 0.5 });
    g.rect(ez.x, ez.y, ez.w, 1).fill({ color: 0x553333 });

    stage.addChild(g);

    // ── Zone labels ──────────────────────────────────
    const labelStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: 0x555577 });
    const mkLabel = (text: string, x: number, y: number) => {
      const t = new Text({ text, style: labelStyle });
      t.position.set(x, y);
      stage.addChild(t);
    };
    mkLabel('[ WORK ZONE ]', dz.x + 4, dz.y + 4);
    mkLabel('[ LOUNGE ]', lz.x + 4, lz.y + 4);
    mkLabel('[ OFFLINE ]', ez.x + 4, ez.y + 4);
  }

  isReady(): boolean {
    return this.initialized && this.app !== null;
  }

  updateAgents(agents: Agent[]) {
    if (!this.app || !this.initialized) return;
    const stage = this.app.stage;

    const statuses = agents.map((a) => a.status);
    const slots = assignSlotsByStatus(statuses);

    // Build monitor slot info (only desk area agents get a monitor)
    const monitorSlots: { x: number; y: number; agentId: string; online: boolean }[] = [];

    agents.forEach((agent, i) => {
      const slot = slots[i];
      if (!slot) return;

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

      if (slot.area === 'desk') {
        monitorSlots.push({ x: slot.x, y: slot.y, agentId: agent.id, online: agent.status !== 'offline' && agent.status !== 'error' });
      }
    });

    // Refresh monitors (only rebuild if count changed to avoid flicker)
    if (this.decorations) {
      this.decorations.setMonitorSlots(monitorSlots);
    }

    // Remove stale sprites
    const currentIds = new Set(agents.map((a) => a.id));
    for (const id of [...this.sprites.keys()]) {
      if (!currentIds.has(id)) {
        this.sprites.get(id)!.destroy();
        this.sprites.delete(id);
      }
    }
  }

  resize(containerWidth: number) {
    if (!this.app) return;
    const scale = containerWidth / SCENE_W;
    this.app.renderer.resize(containerWidth, SCENE_H * scale);
    this.app.stage.scale.set(scale);
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (!this.app) return;
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
    this.decorations?.container.destroy({ children: true });
    this.decorations = null;
    this.app.destroy();
    this.app = null;
    this.initialized = false;
  }
}
