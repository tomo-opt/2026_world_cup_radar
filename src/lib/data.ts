import type { AppDataBundle, EntitiesSeed, Match, NormalizedItem, SourceConfig, SourceStatusReport, TopicCard } from './types';

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function loadAppData(): Promise<AppDataBundle> {
  const [sources, matches, entities, topicCards, sourceStatus, normalizedItems] =
    await Promise.all([
      loadJson<SourceConfig[]>('/data/sources.json'),
      loadJson<Match[]>('/data/matches.json'),
      loadJson<EntitiesSeed>('/data/entities.json'),
      loadJson<TopicCard[]>('/data/topic_cards.json'),
      loadJson<SourceStatusReport>('/data/source_status.json'),
      loadJson<NormalizedItem[]>('/data/normalized_items.json'),
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
