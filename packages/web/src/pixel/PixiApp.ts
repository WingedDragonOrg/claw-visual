import { Application, ColorMatrixFilter } from 'pixi.js';
import type { Agent, GitHubSummary } from '../types';
import { AgentSprite } from './AgentSprite';
import { SceneDecorations } from './SceneDecorations';
import { assignFixedSlots, SCENE_W, SCENE_H } from './SceneLayout';

/** Callback when an agent sprite is clicked */
export type AgentClickHandler = (agent: Agent, canvasX: number, canvasY: number) => void;

/** Office theme options */
export type OfficeTheme = 'auto' | 'day' | 'night' | 'dusk' | 'holiday';

export class PixiApp {
  private app: Application | null = null;
  private sprites: Map<string, AgentSprite> = new Map();
  private decorations: SceneDecorations | null = null;
  private initialized = false;
  private frame = 0;
  private elapsed = 0;
  private resizeObserver: ResizeObserver | null = null;
  private colorFilter: ColorMatrixFilter | null = null;
  private dayNightTimer = 0;
  private onAgentClick: AgentClickHandler | null = null;
  private currentTheme: OfficeTheme = 'auto';

  setClickHandler(handler: AgentClickHandler) {
    this.onAgentClick = handler;
  }

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

    // Day/night color filter on the whole stage
    const filter = new ColorMatrixFilter();
    app.stage.filters = [filter];
    this.colorFilter = filter;
    this.applyDayNight();

    // Decorations below agents
    const deco = new SceneDecorations();
    this.decorations = deco;
    app.stage.addChild(deco.container);

    // Ticker
    app.ticker.add((ticker) => {
      try {
        this.frame++;
        this.elapsed += ticker.deltaMS / 1000;
        this.dayNightTimer += ticker.deltaMS;

        // Check day/night every 5 minutes
        if (this.dayNightTimer >= 5 * 60 * 1000) {
          this.dayNightTimer = 0;
          this.applyDayNight();
        }

        for (const sprite of this.sprites.values()) sprite.tick(this.frame);
        this.decorations?.tick(this.elapsed, ticker.deltaTime);
      } catch (err) {
        console.error('[PixiApp] tick error:', err);
      }
    });

    // Responsive scale
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
  }

  private applyDayNight() {
    if (!this.colorFilter) return;
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 7;
    const isDusk  = hour >= 18 || hour < 9;

    this.colorFilter.reset();
    if (isNight) {
      this.colorFilter.brightness(0.55, false);
      this.colorFilter.tint(0x8899cc, false);
    } else if (isDusk) {
      this.colorFilter.brightness(0.85, false);
      this.colorFilter.tint(0xffcc88, false);
    }
    // Daytime: no filter change (neutral)
  }

  /** Set office theme */
  setTheme(theme: OfficeTheme) {
    if (!this.colorFilter) return;
    this.currentTheme = theme;
    this.colorFilter.reset();

    switch (theme) {
      case 'auto':
        this.applyDayNight();
        break;
      case 'day':
        // No filter - full brightness
        break;
      case 'night':
        this.colorFilter.brightness(0.55, false);
        this.colorFilter.tint(0x8899cc, false);
        break;
      case 'dusk':
        this.colorFilter.brightness(0.85, false);
        this.colorFilter.tint(0xffcc88, false);
        break;
      case 'holiday':
        this.colorFilter.brightness(0.9, false);
        this.colorFilter.hue(30, false);
        this.colorFilter.saturate(1.2, false);
        break;
    }
  }

  updateWhiteboard(summary: GitHubSummary) {
    this.decorations?.updateWhiteboard(summary);
  }

  isReady(): boolean {
    return this.initialized && this.app !== null;
  }

  updateAgents(agents: Agent[]) {
    if (!this.app || !this.initialized) return;
    const stage = this.app.stage;

    const statuses = agents.map((a) => a.status);
    const slots = assignFixedSlots(agents.length, statuses);
    const monitorSlots: { x: number; y: number; agentId: string; online: boolean }[] = [];

    agents.forEach((agent, i) => {
      const slot = slots[i];
      if (!slot) return;

      const clickHandler = this.onAgentClick
        ? (ag: Agent, cx: number, cy: number) => {
            if (!this.app) return;
            // Convert PixiJS global coords → CSS coords on canvas element
            const canvas = this.app.canvas as HTMLCanvasElement;
            const scaleX = canvas.clientWidth / SCENE_W;
            const scaleY = canvas.clientHeight / SCENE_H;
            const rect = canvas.getBoundingClientRect();
            this.onAgentClick!(ag, rect.left + cx * scaleX, rect.top + cy * scaleY);
          }
        : undefined;

      if (this.sprites.has(agent.id)) {
        const sprite = this.sprites.get(agent.id)!;
        sprite.setState(agent);
        sprite.moveTo(slot.x, slot.y, slot.area === 'desk');
      } else {
        const sprite = new AgentSprite(agent, clickHandler);
        sprite.moveTo(slot.x, slot.y, slot.area === 'desk');
        stage.addChild(sprite.container);
        this.sprites.set(agent.id, sprite);
      }

      if (slot.area === 'desk') {
        monitorSlots.push({
          x: slot.x, y: slot.y, agentId: agent.id,
          online: agent.status === 'online' || agent.status === 'busy',
        });
      }
    });

    this.decorations?.setMonitorSlots(monitorSlots);

    // Prune removed agents
    const currentIds = new Set(agents.map((a) => a.id));
    for (const id of [...this.sprites.keys()]) {
      if (!currentIds.has(id)) {
        this.sprites.get(id)!.destroy();
        this.sprites.delete(id);
      }
    }
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
