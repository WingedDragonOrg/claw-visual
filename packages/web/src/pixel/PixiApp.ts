import { Application, ColorMatrixFilter, Container } from 'pixi.js';
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
  private world: Container | null = null;   // pan/zoom container wrapping everything
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

  // Zoom state
  private _scale = 1;
  private _offsetX = 0;
  private _offsetY = 0;
  private readonly MIN_SCALE = 0.5;
  private readonly MAX_SCALE = 3;

  setClickHandler(handler: AgentClickHandler) {
    this.onAgentClick = handler;
  }

  /** Current zoom scale */
  get scale() { return this._scale; }

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

    // Pan/zoom world container
    const world = new Container();
    world.sortableChildren = true;
    app.stage.addChild(world);
    this.world = world;

    // Day/night color filter on the whole stage
    const filter = new ColorMatrixFilter();
    app.stage.filters = [filter];
    this.colorFilter = filter;
    this.applyDayNight();

    // Decorations below agents
    const deco = new SceneDecorations();
    this.decorations = deco;
    world.addChild(deco.container);

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

    // Pan state
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let offsetXAtPanStart = 0;
    let offsetYAtPanStart = 0;

    // Wheel zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, this._scale * zoomFactor));
      const scaleRatio = newScale / this._scale;

      // Zoom toward mouse position
      this._offsetX = mouseX - (mouseX - this._offsetX) * scaleRatio;
      this._offsetY = mouseY - (mouseY - this._offsetY) * scaleRatio;
      this._scale = newScale;
      this.applyWorldTransform();
    }, { passive: false });

    // Pan via drag
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      offsetXAtPanStart = this._offsetX;
      offsetYAtPanStart = this._offsetY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isPanning) return;
      this._offsetX = offsetXAtPanStart + (e.clientX - panStartX);
      this._offsetY = offsetYAtPanStart + (e.clientY - panStartY);
      this.applyWorldTransform();
    });

    canvas.addEventListener('pointerup', (e) => {
      isPanning = false;
    });

    canvas.addEventListener('pointercancel', () => {
      isPanning = false;
    });

    // Responsive scale
    const applyScale = () => {
      if (!this.app || !canvas.parentElement) return;
      const containerW = canvas.parentElement.clientWidth || SCENE_W;
      const containerH = canvas.parentElement.clientHeight || SCENE_H;
      const scale = Math.min(containerW / SCENE_W, containerH / SCENE_H);
      canvas.style.width = `${Math.round(SCENE_W * scale)}px`;
      canvas.style.height = `${Math.round(SCENE_H * scale)}px`;
      // Re-center after resize
      const canvasW = SCENE_W * scale;
      const canvasH = SCENE_H * scale;
      this._offsetX = (containerW - canvasW) / 2;
      this._offsetY = (containerH - canvasH) / 2;
      this._scale = scale;
      this.applyWorldTransform();
    };

    applyScale();
    this.resizeObserver = new ResizeObserver(applyScale);
    if (canvas.parentElement) this.resizeObserver.observe(canvas.parentElement);
  }

  private applyWorldTransform() {
    if (!this.world) return;
    this.world.scale.set(this._scale);
    this.world.position.set(this._offsetX, this._offsetY);
  }

  /** Reset pan and zoom to default */
  resetView() {
    if (!this.app) return;
    const canvas = this.app.canvas as HTMLCanvasElement;
    const containerW = canvas.parentElement?.clientWidth || SCENE_W;
    const containerH = canvas.parentElement?.clientHeight || SCENE_H;
    const scale = Math.min(containerW / SCENE_W, containerH / SCENE_H);
    const canvasW = SCENE_W * scale;
    const canvasH = SCENE_H * scale;
    this._offsetX = (containerW - canvasW) / 2;
    this._offsetY = (containerH - canvasH) / 2;
    this._scale = scale;
    this.applyWorldTransform();
  }

  /** Set zoom scale directly (1 = default fit-to-container) */
  setScale(scale: number) {
    if (!this.app) return;
    this._scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, scale));
    const canvas = this.app.canvas as HTMLCanvasElement;
    const containerW = canvas.parentElement?.clientWidth || SCENE_W;
    const containerH = canvas.parentElement?.clientHeight || SCENE_H;
    const canvasW = SCENE_W * this._scale;
    const canvasH = SCENE_H * this._scale;
    this._offsetX = (containerW - canvasW) / 2;
    this._offsetY = (containerH - canvasH) / 2;
    this.applyWorldTransform();
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
    if (!this.app || !this.initialized || !this.world) return;

    const statuses = agents.map((a) => a.status);
    const slots = assignFixedSlots(agents.length, statuses);
    const monitorSlots: { x: number; y: number; agentId: string; online: boolean }[] = [];

    agents.forEach((agent, i) => {
      const slot = slots[i];
      if (!slot) return;

      const clickHandler = this.onAgentClick
        ? (ag: Agent, cx: number, cy: number) => {
            if (!this.app) return;
            const canvas = this.app.canvas as HTMLCanvasElement;
            const rect = canvas.getBoundingClientRect();
            // Convert from world coordinates (logical slot pos) to CSS canvas coords
            const cssX = this._offsetX + cx * this._scale;
            const cssY = this._offsetY + cy * this._scale;
            this.onAgentClick!(ag, rect.left + cssX, rect.top + cssY);
          }
        : undefined;

      if (this.sprites.has(agent.id)) {
        const sprite = this.sprites.get(agent.id)!;
        sprite.setState(agent);
        sprite.moveTo(slot.x, slot.y, slot.area === 'desk');
      } else {
        const sprite = new AgentSprite(agent, clickHandler);
        sprite.moveTo(slot.x, slot.y, slot.area === 'desk');
        this.world!.addChild(sprite.container);
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
    this.world?.destroy({ children: true });
    this.world = null;
    this.decorations = null;
    this.app.destroy();
    this.app = null;
    this.initialized = false;
  }
}
