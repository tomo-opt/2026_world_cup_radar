import type { AppDataBundle, EntitiesSeed, Match, NormalizedItem, SourceConfig, SourceStatusReport, TopicCard } from './types';

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(withBase(path));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function loadAppData(): Promise<AppDataBundle> {
  const [sources, matches, entities, topicCards, sourceStatus, normalizedItems] =
    await Promise.all([
      loadJson<SourceConfig[]>('data/sources.json'),
      loadJson<Match[]>('data/matches.json'),
      loadJson<EntitiesSeed>('data/entities.json'),
      loadJson<TopicCard[]>('data/topic_cards.json'),
      loadJson<SourceStatusReport>('data/source_status.json'),
      loadJson<NormalizedItem[]>('data/normalized_items.json'),
    ]);

  return {
    sources,
    matches,
    entities,
    topicCards,
    sourceStatus,
    normalizedItems,
  };
}
