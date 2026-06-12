import Parser from 'rss-parser';
import type { RawItem, SourceStatus } from '../src/lib/types';
import {
  classifyFailure,
  dedupeByUrl,
  defaultSourceStatus,
  generateRawId,
  readSourcesConfig,
  requestText,
  safeSummary,
  sanitizeUrl,
  suggestNextAction,
} from './utils';

const parser = new Parser();

export async function fetchRssSources(): Promise<{ rawItems: RawItem[]; statuses: SourceStatus[] }> {
  const config = await readSourcesConfig();
  const sources = config.sources.filter((source) => source.enabled && source.crawl_mode === 'rss' && source.rss_url);

  const results: Array<{ items: RawItem[]; status: SourceStatus }> = [];

  for (const source of sources) {
    const status = defaultSourceStatus(source);
    try {
      const feedText = await requestText(source.rss_url);
      const feed = await parser.parseString(feedText);
      const fetchedAt = new Date().toISOString();
      const items: RawItem[] = (feed.items ?? [])
        .slice(0, source.max_items_per_source)
        .map((item, index) => {
          const summary = safeSummary(item.contentSnippet ?? item.content ?? item.summary);
          return {
            raw_id: generateRawId(source.source_id, item.title ?? '', index),
            source_id: source.source_id,
            source_name: source.source_name,
            source_type: source.source_type,
            region: source.region,
            language: source.language,
            title: item.title?.trim() ?? 'Untitled item',
            url: sanitizeUrl(item.link?.trim() ?? source.homepage_url, source.homepage_url),
            canonical_url: sanitizeUrl(item.link?.trim() ?? source.homepage_url, source.homepage_url),
            summary,
            content_text: '',
            published_at: item.isoDate ?? item.pubDate ?? fetchedAt,
            fetched_at: fetchedAt,
            platform: source.source_type,
            crawl_strategy: source.crawl_strategy,
            crawl_mode: source.crawl_mode,
            data_origin: 'live',
            extraction_level: summary ? 'title_and_summary' : 'title_only',
            item_type: 'article',
            discovered_from_strategy: 'rss_direct',
            author: safeSummary((item as { creator?: string }).creator),
            categories: Array.isArray((item as { categories?: string[] }).categories)
              ? (item as { categories?: string[] }).categories
              : [],
          };
        });

      const deduped = dedupeByUrl(items).filter((item) => item.title && item.url);
      const finalStatus: SourceStatus = {
        ...status,
        status: deduped.length > 0 ? 'ok' : 'partial',
        items_fetched: deduped.length,
        valid_items_count: deduped.length,
        discarded_count: Math.max(0, items.length - deduped.length),
        last_success_at: deduped.length > 0 ? fetchedAt : null,
        error: deduped.length > 0 ? null : 'RSS returned no usable items',
        attempted_strategies: ['rss_direct'],
        successful_strategy: deduped.length > 0 ? 'rss_direct' : null,
        discovered_feeds: [source.rss_url],
        discovered_sitemaps: [],
        failure_category: deduped.length > 0 ? null : 'rss_invalid',
      };
      finalStatus.next_action = suggestNextAction(finalStatus);

      results.push({ items: deduped, status: finalStatus });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown RSS error';
      const failedStatus: SourceStatus = {
        ...status,
        status: 'error',
        error: errorMessage,
        attempted_strategies: ['rss_direct'],
        successful_strategy: null,
        valid_items_count: 0,
        discarded_count: 0,
        discovered_feeds: [source.rss_url],
        discovered_sitemaps: [],
        failure_category: classifyFailure(errorMessage, source.crawl_mode),
      };
      failedStatus.next_action = suggestNextAction(failedStatus);

      results.push({ items: [], status: failedStatus });
    }
  }

  return {
    rawItems: results.flatMap((result) => result.items),
    statuses: results.map((result) => result.status),
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  fetchRssSources()
    .then(({ rawItems, statuses }) => {
      console.log(`Fetched ${rawItems.length} RSS items from ${statuses.length} sources`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
