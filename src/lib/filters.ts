import { differenceInHours, parseISO } from 'date-fns';
import { REGION_ORDER } from './presentation';
import type { FilterState, Match, TopicCard } from './types';

const GENERIC_PHRASES = new Set(['赛事组织', '赛前看点', '伤病情况', '球星状态', '话题线索', '赛前动态']);

export function filterTopicCards(topicCards: TopicCard[], filters: FilterState, _matches: Match[]) {
  const now = new Date();

  return topicCards.filter((topic) => {
    if (filters.region !== '全部' && !topic.regions.includes(filters.region)) return false;
    if (filters.platform !== '全部' && !topic.sources.some((source) => source.source_type === filters.platform)) return false;
    if (filters.match !== '全部' && !topic.related_matches.includes(filters.match)) return false;
    if (filters.timeWindow === 'all') return true;

    const hoursAgo = differenceInHours(now, parseISO(topic.last_updated));
    const maxHours =
      filters.timeWindow === '1h' ? 1 : filters.timeWindow === '6h' ? 6 : filters.timeWindow === '24h' ? 24 : 72;

    return hoursAgo <= maxHours;
  });
}

export function buildHotPhraseFlow(topicCards: TopicCard[]) {
  const counts = new Map<string, number>();

  for (const topic of topicCards) {
    const qualifies =
      topic.evidence_count >= 2 ||
      (topic.source_count >= 1 && topic.confidence !== '低') ||
      ['lineup_selection', 'injury_training', 'referee_assignment', 'event_operations'].includes(topic.issue_type);

    if (!qualifies) continue;

    const phrases = topic.topic_phrases.length > 0 ? topic.topic_phrases : [topic.topic_title.trim()];
    for (const phrase of phrases) {
      if (!phrase || GENERIC_PHRASES.has(phrase)) continue;
      counts.set(phrase, (counts.get(phrase) ?? 0) + topic.evidence_count);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase, count]) => ({ phrase, count }));
}

export function orderRegions(regions: string[]) {
  return REGION_ORDER.filter((region) => regions.includes(region));
}
