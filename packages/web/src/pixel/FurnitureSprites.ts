import { Assets, type Texture } from 'pixi.js';

const BASE = '/sprites/kenney/Isometric';

const FURNITURE_SPRITES: Record<string, string[]> = {
  plantSmall1: [
    `${BASE}/plantSmall1_NE.png`,
    `${BASE}/plantSmall1_NW.png`,
    `${BASE}/plantSmall1_SE.png`,
    `${BASE}/plantSmall1_SW.png`,
  ],
  plantSmall2: [
    `${BASE}/plantSmall2_NE.png`,
    `${BASE}/plantSmall2_NW.png`,
  ],
  lampRoundFloor: [
    `${BASE}/lampRoundFloor_NE.png`,
    `${BASE}/lampRoundFloor_NW.png`,
  ],
  lampRoundTable: [
    `${BASE}/lampRoundTable_NE.png`,
    `${BASE}/lampRoundTable_NW.png`,
  ],
  rugRectangle: [
    `${BASE}/rugRectangle_NE.png`,
    `${BASE}/rugRectangle_NW.png`,
    `${BASE}/rugRectangle_SE.png`,
    `${BASE}/rugRectangle_SW.png`,
  ],
  speaker: [
    `${BASE}/speaker_NE.png`,
    `${BASE}/speaker_NW.png`,
  ],
};

type FurnitureKey = keyof typeof FURNITURE_SPRITES;

const cache = new Map<string, Texture[]>();

export async function loadFurnitureSprites(): Promise<void> {
  const keys = Object.keys(FURNITURE_SPRITES) as FurnitureKey[];
  await Promise.all(
    keys.map(async (key) => {
      const paths = FURNITURE_SPRITES[key];
      const textures = await Promise.all(paths.map((p) => Assets.load<Texture>(p)));
      cache.set(key, textures);
    })
  );
}

export function getFurnitureTexture(key: FurnitureKey, angleIndex = 0): Texture | null {
  const textures = cache.get(key);
  if (!textures || textures.length === 0) return null;
  // NW=1, SE=3 are more visible from typical office viewing angle
  const idx = angleIndex % textures.length;
  return textures[idx] ?? null;
}
