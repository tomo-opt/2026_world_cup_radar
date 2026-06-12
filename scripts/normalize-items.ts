import type { RawItem, TopicRules } from '../src/lib/types';
import { mapSourceRegionToUiRegion, normalizeText, uniqueStrings } from './utils';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTerm(text: string, term: string) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(?=\\s|$)`, 'i');
  return pattern.test(text);
}

export function normalizeItems(rawItems: RawItem[], topicRules: TopicRules) {
  return rawItems.map((item, index) => {
    const normalizedTitle = normalizeText(item.title);
    const normalizedSummary = normalizeText(item.summary);
    const normalizedContent = normalizeText(item.content_text ?? '');
    const headlineText = `${normalizedTitle} ${normalizedSummary}`.trim();
    const allText = `${headlineText} ${normalizedContent}`.trim();

    const matchedFromTitle = topicRules.topic_categories.filter((category) =>
      category.match_terms.some((term) => containsTerm(normalizedTitle, term)),
    );
    const matchedCategories =
      matchedFromTitle.length > 0
        ? matchedFromTitle
        : topicRules.topic_categories.filter((category) =>
            category.match_terms.some((term) => containsTerm(headlineText, term)),
          );

    const excludedReason = topicRules.excluded_content_terms.find((term) => containsTerm(allText, term));
    const topicTerms = uniqueStrings(matchedCategories.map((category) => category.key));
    const topicLabelsZh = uniqueStrings(matchedCategories.map((category) => category.label_zh));
    const topicLabelsEn = uniqueStrings(matchedCategories.map((category) => category.label_en));

    const sportsContextScore = Math.min(
      100,
      18 + topicLabelsZh.length * 24 + (item.summary ? 8 : 0) + (item.source_type === 'forum' ? 4 : 10),
    );

    return {
      item_id: `norm_${index + 1}`,
      raw_id: item.raw_id,
      source_id: item.source_id,
      source_name: item.source_name,
      source_type: item.source_type,
      title: item.title,
      normalized_title: normalizedTitle,
      summary: item.summary,
      content_text: item.content_text,
      url: item.url,
      published_at: item.published_at,
      fetched_at: item.fetched_at,
      language: item.language,
      raw_region: item.region,
      ui_region: mapSourceRegionToUiRegion(item.region, item.region, item.language),
      matched_teams: [] as string[],
      matched_players: [] as string[],
      matched_matches: [] as string[],
      topic_terms: topicTerms,
      topic_labels_zh: topicLabelsZh,
      topic_labels_en: topicLabelsEn,
      sports_context_score: sportsContextScore,
      entity_match_score: 0,
      trend_bonus: item.source_type === 'trends' ? 35 : 0,
      excluded_reason: excludedReason ?? null,
      crawl_strategy: item.crawl_strategy,
      crawl_mode: item.crawl_mode,
      data_origin: item.data_origin,
      extraction_level: item.extraction_level,
      item_type: item.item_type ?? 'article',
      event_frame: {
        subject: '',
        action: '',
        object: '',
        context: '',
        issue_type: topicTerms[0] ?? 'general',
        teams: [],
        players: [],
        venues: [],
        match_ids: [],
        event_fingerprint: '',
        confidence: item.extraction_level === 'public_article_text' ? 'high' : item.extraction_level === 'title_and_summary' ? 'medium' : 'low',
      },
      event_fingerprint: '',
      low_confidence_reason: null,
    };
  });
}
