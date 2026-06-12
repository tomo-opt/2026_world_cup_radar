import * as cheerio from 'cheerio';
import type { CrawlStrategyStep, RawItem, SourceConfig, SourceStatus } from '../src/lib/types';
import {
  classifyFailure,
  dedupeByUrl,
  defaultSourceStatus,
  generateRawId,
  isProbablySameDomain,
  parseXmlLocs,
  readSourcesConfig,
  requestText,
  safeSummary,
  sanitizeUrl,
  suggestNextAction,
} from './utils';

const candidateSelectors = [
  'article a[href]',
  'h1 a[href], h2 a[href], h3 a[href]',
  '[class*="headline"] a[href]',
  '[class*="title"] a[href]',
  '[class*="story"] a[href]',
  '[class*="article"] a[href]',
  '[class*="card"] a[href]',
  '[class*="teaser"] a[href]',
  '[class*="media"] a[href]',
  'a[href*="world-cup"]',
  'a[href*="worldcup"]',
  'a[href*="fifa"]',
  'a[href*="soccer"]',
  'a[href*="football"]',
  'a[href*="/sport/"]',
  'a[href*="/sports/"]',
  'a[href*="/news/"]',
];

const blockedTitlePatterns = [
  /tv guide/i,
  /streaming/i,
  /subscribe/i,
  /how to watch/i,
  /download/i,
  /podcast/i,
  /newsletter/i,
  /fantasy/i,
  /bracket/i,
  /standings/i,
  /privacy/i,
  /terms/i,
];

const blockedUrlPatterns = [
  /subscribe/i,
  /download/i,
  /fantasy/i,
  /podcast/i,
  /\/video\//i,
  /\/watch\//i,
  /youtube\.com/i,
  /privacy/i,
  /terms/i,
  /login/i,
  /signin/i,
  /author\//i,
  /tag\//i,
];

function buildPageCandidates(source: SourceConfig) {
  const base = source.homepage_url;
  return Array.from(
    new Set([
      base,
      `${base}?page=2`,
      base.endsWith('/') ? `${base}page/2` : `${base}/page/2`,
    ]),
  ).slice(0, 3);
}

function isBlockedCandidate(title: string, url: string) {
  if (title.length < 20 || title.length > 180) return true;
  return (
    blockedTitlePatterns.some((pattern) => pattern.test(title)) ||
    blockedUrlPatterns.some((pattern) => pattern.test(url))
  );
}

function isBlockedReference(title: string, url: string) {
  if (title.length < 6 || title.length > 220) return true;
  return blockedUrlPatterns.some((pattern) => pattern.test(url));
}

function buildRawItem(
  source: SourceConfig,
  input: {
    title: string;
    url: string;
    summary?: string;
    content_text?: string;
    published_at?: string;
    extraction_level?: RawItem['extraction_level'];
    item_type?: RawItem['item_type'];
    strategy?: CrawlStrategyStep;
  },
  index: number,
): RawItem {
  const fetchedAt = new Date().toISOString();
  return {
    raw_id: generateRawId(source.source_id, input.title, index),
    source_id: source.source_id,
    source_name: source.source_name,
    source_type: source.source_type,
    region: source.region,
    language: source.language,
    title: input.title.trim(),
    url: sanitizeUrl(input.url, source.homepage_url),
    canonical_url: sanitizeUrl(input.url, source.homepage_url),
    summary: safeSummary(input.summary).slice(0, 360),
    content_text: safeSummary(input.content_text).slice(0, 1400),
    published_at: input.published_at ?? fetchedAt,
    fetched_at: fetchedAt,
    platform: source.source_type,
    crawl_strategy: source.crawl_strategy,
    crawl_mode: source.crawl_mode,
    data_origin: 'live',
    extraction_level:
      input.extraction_level ??
      (input.content_text
        ? 'public_article_text'
        : input.summary
          ? 'title_and_summary'
          : 'title_only'),
    item_type: input.item_type ?? 'article',
    discovered_from_strategy: input.strategy,
  };
}

function extractAlternateFeeds(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  return Array.from(
    new Set(
      $('link[rel="alternate"]')
        .toArray()
        .map((element) => {
          const type = $(element).attr('type') || '';
          const href = $(element).attr('href') || '';
          if (!/rss|atom|xml/i.test(type) || !href) return '';
          return sanitizeUrl(href, baseUrl);
        })
        .filter(Boolean)
        .concat(
          ['/feed', '/rss', '/rss.xml', '/feed.xml', '/football/rss', '/soccer/rss', '/world-cup/rss', '/feed/']
            .map((suffix) => sanitizeUrl(suffix, baseUrl)),
        ),
    ),
  );
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function flattenJsonLd(input: unknown): unknown[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap((item) => flattenJsonLd(item));
  if (typeof input !== 'object') return [];
  const obj = input as Record<string, unknown>;
  if (Array.isArray(obj['@graph'])) return flattenJsonLd(obj['@graph']);
  return [obj];
}

function extractJsonLdItems(source: SourceConfig, html: string) {
  const $ = cheerio.load(html);
  const nodes = $('script[type="application/ld+json"]').toArray();
  const items: RawItem[] = [];

  nodes.forEach((node, nodeIndex) => {
    const parsed = safeJsonParse<unknown>($(node).contents().text());
    const flattened = flattenJsonLd(parsed);

    flattened.forEach((entry, entryIndex) => {
      const object = entry as Record<string, unknown>;
      const typeValue = object['@type'];
      const types = Array.isArray(typeValue) ? typeValue.map(String) : [String(typeValue ?? '')];
      const joinedTypes = types.join(' ');

      if (/NewsArticle|Article|SportsEvent/i.test(joinedTypes)) {
        const title = safeSummary(String(object.headline ?? object.name ?? ''));
        const summary = safeSummary(String(object.description ?? ''));
        const url = safeSummary(String(object.url ?? source.homepage_url));
        if (title && url) {
          items.push(
            buildRawItem(
              source,
              {
                title,
                url,
                summary,
                published_at: safeSummary(String(object.datePublished ?? '')) || undefined,
                item_type: 'article',
                strategy: 'json_ld',
              },
              nodeIndex * 100 + entryIndex,
            ),
          );
        }
      }

      if (/ItemList|CollectionPage|WebPage/i.test(joinedTypes)) {
        const itemList = Array.isArray(object.itemListElement) ? object.itemListElement : [];
        itemList.forEach((child, childIndex) => {
          const childObject = typeof child === 'object' && child ? (child as Record<string, unknown>) : {};
          const nested = typeof childObject.item === 'object' && childObject.item ? (childObject.item as Record<string, unknown>) : childObject;
          const title = safeSummary(String(nested.headline ?? nested.name ?? ''));
          const url = safeSummary(String(nested.url ?? ''));
          const summary = safeSummary(String(nested.description ?? ''));
          if (title && url) {
            items.push(
              buildRawItem(
                source,
                {
                  title,
                  url,
                  summary,
                  strategy: 'json_ld',
                },
                nodeIndex * 1000 + childIndex,
              ),
            );
          }
        });
      }
    });
  });

  return items;
}

function extractPageReference(source: SourceConfig, html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('meta[name="twitter:title"]').attr('content')?.trim() ||
    $('title').text().trim();
  const summary =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="twitter:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    '';

  if (!title) return null;

  return buildRawItem(
    source,
    {
      title,
      url: pageUrl,
      summary,
      item_type: 'page_reference',
      strategy: 'og_meta',
    },
    9990,
  );
}

function extractHtmlCandidates(source: SourceConfig, html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  for (const selector of candidateSelectors) {
    $(selector).each((index, element) => {
      if (items.length >= 40) return;
      const link = $(element);
      const href = link.attr('href');
      const title =
        link.attr('title')?.trim() ||
        link.find('h1,h2,h3').first().text().trim() ||
        link.text().trim();
      if (!href || !title) return;
      const url = sanitizeUrl(href, pageUrl);
      if (!isProbablySameDomain(url, source.homepage_url) || seen.has(url) || isBlockedCandidate(title, url)) return;
      seen.add(url);
      const summary = safeSummary(
        link.closest('article').find('p').first().text().trim() || link.parent().find('p').first().text().trim(),
      );
      items.push(
        buildRawItem(
          source,
          {
            title,
            url,
            summary,
            strategy: 'html_list',
          },
          index,
        ),
      );
    });
    if (items.length >= 40) break;
  }

  return items;
}

function looksLikeWordPress(html: string) {
  return /wp-content|wordpress|wp-json/i.test(html);
}

async function fetchWpJsonItems(source: SourceConfig) {
  const searches = ['world cup', 'football', 'soccer'];
  const items: RawItem[] = [];

  for (const term of searches) {
    try {
      const url = sanitizeUrl(`/wp-json/wp/v2/posts?per_page=20&search=${encodeURIComponent(term)}`, source.homepage_url);
      const text = await requestText(url);
      const parsed = safeJsonParse<Array<Record<string, unknown>>>(text);
      if (!Array.isArray(parsed)) continue;
      parsed.forEach((post, index) => {
        const title = safeSummary(String((post.title as { rendered?: string } | undefined)?.rendered ?? ''));
        const summary = safeSummary(String((post.excerpt as { rendered?: string } | undefined)?.rendered ?? ''));
        const link = safeSummary(String(post.link ?? ''));
        if (title && link) {
          items.push(
            buildRawItem(
              source,
              {
                title,
                url: link,
                summary,
                published_at: safeSummary(String(post.date ?? '')) || undefined,
                strategy: 'wp_json',
              },
              index,
            ),
          );
        }
      });
      if (items.length > 0) break;
    } catch {
      continue;
    }
  }

  return items;
}

async function fetchSitemapItems(source: SourceConfig) {
  const sitemapCandidates = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/news-sitemap.xml',
    '/post-sitemap.xml',
  ].map((suffix) => sanitizeUrl(suffix, source.homepage_url));

  const discoveredSitemaps: string[] = [];
  const items: RawItem[] = [];

  for (const sitemapUrl of sitemapCandidates.slice(0, 2)) {
    try {
      const xml = await requestText(sitemapUrl);
      const locs = parseXmlLocs(xml).filter((loc) =>
        /world-cup|worldcup|fifa|soccer|football|sport|sports|cup/i.test(loc),
      );
      if (locs.length === 0) continue;
      discoveredSitemaps.push(sitemapUrl);
      for (const [index, loc] of locs.slice(0, 2).entries()) {
        try {
          const html = await requestText(loc);
          const reference = extractPageReference(source, html, loc);
          if (reference && !isBlockedCandidate(reference.title, reference.url)) {
            items.push({ ...reference, item_type: 'article', discovered_from_strategy: 'sitemap', raw_id: generateRawId(source.source_id, reference.title, index) });
          }
        } catch {
          continue;
        }
      }
      if (items.length > 0) break;
    } catch {
      continue;
    }
  }

  return { items, discoveredSitemaps };
}

async function enrichTopItems(items: RawItem[]) {
  const enriched: RawItem[] = [];
  for (const item of items.slice(0, Math.min(items.length, 8))) {
    try {
      const html = await requestText(item.url);
      const reference = extractPageReference(
        {
          source_id: item.source_id,
          source_name: item.source_name,
          source_type: item.source_type,
          region: item.region,
          country: '',
          language: item.language,
          priority: 'medium',
          entry_url_type: '',
          crawl_strategy: item.crawl_strategy,
          crawl_mode: item.crawl_mode,
          feasibility_grade: 'B',
          mvp_role: '',
          mvp_fetch_phase: 'secondary',
          homepage_url: item.url,
          rss_url: '',
          first_fetch_mode: '',
          access_notes: '',
          notes: '',
          enabled: true,
          batch: 'expanded',
          max_items_per_source: 25,
        },
        html,
        item.url,
      );
      const $ = cheerio.load(html);
      const paragraphs = $('article p, main p, [class*="article"] p, [class*="content"] p')
        .slice(0, 10)
        .toArray()
        .map((element) => $(element).text().trim())
        .join(' ');
      enriched.push({
        ...item,
        title: reference?.title || item.title,
        summary: reference?.summary || item.summary,
        content_text: safeSummary(paragraphs).slice(0, 1500),
        extraction_level: paragraphs ? 'public_article_text' : item.summary ? 'title_and_summary' : 'title_only',
      });
    } catch {
      enriched.push(item);
    }
  }
  return [...enriched, ...items.slice(Math.min(items.length, 8))];
}

export async function fetchHtmlListSources(): Promise<{ rawItems: RawItem[]; statuses: SourceStatus[] }> {
  const config = await readSourcesConfig();
  const sources = config.sources.filter((source) => source.enabled && source.crawl_mode !== 'rss');

  const results: Array<{ items: RawItem[]; status: SourceStatus }> = [];

  for (const source of sources) {
    const status = defaultSourceStatus(source);
    const collected: RawItem[] = [];
    const attempted = new Set<CrawlStrategyStep>();
    const discoveredFeeds = new Set<string>();
    const discoveredSitemaps = new Set<string>();
    const isTrendSource = source.crawl_mode === 'trend_test';
    const isReferenceOnlySource = source.crawl_mode === 'manual_reference' || source.crawl_mode === 'fixture';

    try {
      if (isTrendSource) {
        const referenceItem = buildRawItem(
          source,
          {
            title: source.source_name,
            url: source.homepage_url,
            summary: source.notes || source.access_notes || '实验趋势参考页，当前不参与主话题聚类。',
            item_type: 'page_reference',
            strategy: 'page_reference',
          },
          0,
        );
        const trendStatus: SourceStatus = {
          ...status,
          status: 'test_pending',
          items_fetched: 1,
          attempted_strategies: ['page_reference'],
          successful_strategy: 'page_reference',
          valid_items_count: 1,
          discarded_count: 0,
          discovered_feeds: [],
          discovered_sitemaps: [],
          failure_category: 'trends_test_pending',
          next_action: '作为实验源保留，等待后续手动导出或稳定方案。',
        };
        results.push({ items: [referenceItem], status: trendStatus });
        continue;
      }

      if (isReferenceOnlySource) {
        const referenceItem = buildRawItem(
          source,
          {
            title: source.source_name,
            url: source.homepage_url,
            summary: source.notes || source.access_notes || '公开参考页，当前作为赛程或说明参考保留。',
            item_type: 'page_reference',
            strategy: 'page_reference',
          },
          0,
        );
        const referenceStatus: SourceStatus = {
          ...status,
          status: source.crawl_mode === 'manual_reference' ? 'manual_export_supported' : 'partial',
          items_fetched: 1,
          attempted_strategies: ['page_reference'],
          successful_strategy: 'page_reference',
          valid_items_count: 1,
          discarded_count: 0,
          discovered_feeds: [],
          discovered_sitemaps: [],
          failure_category: null,
          next_action:
            source.crawl_mode === 'manual_reference'
              ? '作为参考源保留，后续可人工补充结构化导出。'
              : '作为赛程参考页保留，后续可补强动态解析。',
        };
        results.push({ items: [referenceItem], status: referenceStatus });
        continue;
      }

      const pageCandidates = buildPageCandidates(source);
      let homepageHtml = '';

      for (const pageUrl of pageCandidates) {
        if (collected.length >= source.max_items_per_source) break;
        let html = '';
        try {
          html = await requestText(pageUrl);
        } catch {
          continue;
        }

        if (!homepageHtml) homepageHtml = html;
        const reference = extractPageReference(source, html, pageUrl);
        if (reference) {
          attempted.add('og_meta');
          collected.push(reference);
        }

        if (isReferenceOnlySource) {
          continue;
        }

        attempted.add('html_list');
        extractHtmlCandidates(source, html, pageUrl).forEach((item) => collected.push(item));

        attempted.add('json_ld');
        extractJsonLdItems(source, html).forEach((item) => collected.push(item));

        extractAlternateFeeds(html, pageUrl).forEach((feed) => discoveredFeeds.add(feed));
      }

      if (!isReferenceOnlySource && looksLikeWordPress(homepageHtml)) {
        attempted.add('wp_json');
        const wpItems = await fetchWpJsonItems(source);
        wpItems.forEach((item) => collected.push(item));
      }

      if (
        !isReferenceOnlySource &&
        collected.filter((item) => item.item_type !== 'page_reference').length === 0
      ) {
        attempted.add('sitemap');
        const sitemapItems = await fetchSitemapItems(source);
        sitemapItems.items.forEach((item) => collected.push(item));
        sitemapItems.discoveredSitemaps.forEach((item) => discoveredSitemaps.add(item));
      }

      const deduped = dedupeByUrl(
        collected
          .filter((item) => item.title && item.url)
          .filter((item) =>
            item.item_type === 'page_reference'
              ? !isBlockedReference(item.title, item.url)
              : !isBlockedCandidate(item.title, item.url),
          )
          .slice(0, 40),
      ).slice(0, source.max_items_per_source);

      const enriched = await enrichTopItems(deduped);
      const validItems = dedupeByUrl(enriched).filter((item) => item.title && item.url).slice(0, source.max_items_per_source);

      const finalStatus: SourceStatus = {
        ...status,
        status: validItems.length > 0 ? 'ok' : status.status,
        items_fetched: validItems.length,
        valid_items_count: validItems.length,
        discarded_count: Math.max(0, collected.length - validItems.length),
        last_success_at: validItems.length > 0 ? new Date().toISOString() : null,
        error: validItems.length > 0 ? null : 'No usable HTML items found',
        attempted_strategies: Array.from(attempted),
        successful_strategy:
          validItems.find((item) => item.item_type !== 'page_reference')?.discovered_from_strategy ??
          validItems[0]?.discovered_from_strategy ??
          null,
        discovered_feeds: Array.from(discoveredFeeds),
        discovered_sitemaps: Array.from(discoveredSitemaps),
        failure_category: validItems.length > 0 ? null : 'html_parse_no_items',
      };
      finalStatus.next_action = suggestNextAction(finalStatus);

      results.push({ items: validItems, status: finalStatus });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown HTML fetch error';
      const failedStatus: SourceStatus = {
        ...status,
        status: source.crawl_mode === 'trend_test' ? 'test_pending' : source.crawl_mode === 'manual_reference' ? 'manual_export_supported' : 'error',
        error: errorMessage,
        attempted_strategies: Array.from(attempted),
        successful_strategy: null,
        valid_items_count: 0,
        discarded_count: collected.length,
        discovered_feeds: Array.from(discoveredFeeds),
        discovered_sitemaps: Array.from(discoveredSitemaps),
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
  fetchHtmlListSources()
    .then(({ rawItems, statuses }) => {
      console.log(`Fetched ${rawItems.length} HTML items from ${statuses.length} sources`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
