import path from 'node:path';
import type { ItemRetentionReport, LowConfidenceItem, NormalizedItem, RawItem, SourceConfig, SourceStatus } from '../src/lib/types';
import { buildLowConfidenceItems, clusterTopics } from './cluster-topics';
import { fetchHtmlListSources } from './fetch-html-list';
import { fetchRssSources } from './fetch-rss';
import { matchEntities } from './match-entities';
import { normalizeItems } from './normalize-items';
import {
  buildCoverageReport,
  buildStatusReport,
  classifyFailure,
  copyIfMissing,
  defaultSourceStatus,
  ensureDirs,
  getPublicDataPath,
  groupPreviousRawItems,
  loadSeeds,
  readJsonFile,
  readSourcesConfig,
  suggestNextAction,
  writeCoreOutputs,
  writeJsonFile,
  writeTextFile,
} from './utils';

function buildSeedRawItems(sources: SourceConfig[], matches: Awaited<ReturnType<typeof loadSeeds>>['matches']) {
  const now = new Date().toISOString();
  const mediaSource = sources.find((source) => source.source_id === 'media_bbc_sport_football');
  const forumSource = sources.find((source) => source.source_id === 'forum_reddit_soccer');
  const opener = matches[0];
  const second = matches[1];

  return [
    mediaSource && opener
      ? {
          raw_id: 'seed_opener_story',
          source_id: mediaSource.source_id,
          source_name: mediaSource.source_name,
          source_type: mediaSource.source_type,
          region: mediaSource.region,
          language: mediaSource.language,
          title: `${opener.home_team} opener brings lineup and training questions`,
          url: mediaSource.homepage_url,
          canonical_url: mediaSource.homepage_url,
          summary: `${opener.display_matchup} is drawing attention around training, selection and host pressure.`,
          content_text: '',
          published_at: now,
          fetched_at: now,
          platform: mediaSource.source_type,
          crawl_strategy: 'seed',
          crawl_mode: 'html_list' as const,
          data_origin: 'seed' as const,
          extraction_level: 'seed' as const,
          item_type: 'article' as const,
          discovered_from_strategy: 'page_reference' as const,
        }
      : null,
    forumSource && second
      ? {
          raw_id: 'seed_var_debate',
          source_id: forumSource.source_id,
          source_name: forumSource.source_name,
          source_type: forumSource.source_type,
          region: forumSource.region,
          language: forumSource.language,
          title: `VAR debate grows before ${second.display_matchup}`,
          url: forumSource.homepage_url,
          canonical_url: forumSource.homepage_url,
          summary: `Fans are focusing on officiating and match pressure around ${second.display_matchup}.`,
          content_text: '',
          published_at: now,
          fetched_at: now,
          platform: forumSource.source_type,
          crawl_strategy: 'seed',
          crawl_mode: 'html_list' as const,
          data_origin: 'seed' as const,
          extraction_level: 'seed' as const,
          item_type: 'article' as const,
          discovered_from_strategy: 'page_reference' as const,
        }
      : null,
  ].filter(Boolean) as RawItem[];
}

function mergeStatuses(
  sources: SourceConfig[],
  currentStatuses: SourceStatus[],
  previousStatuses: SourceStatus[],
  finalRawItems: RawItem[],
) {
  const bySource = new Map(currentStatuses.map((status) => [status.source_id, status]));
  const previousBySource = new Map(previousStatuses.map((status) => [status.source_id, status]));

  return sources.map((source) => {
    const current = bySource.get(source.source_id);
    const previous = previousBySource.get(source.source_id);
    const itemsFetched = finalRawItems.filter((item) => item.source_id === source.source_id).length;

    if (current) {
      if (current.status === 'error' && itemsFetched > 0) {
        const merged = {
          ...current,
          status: 'cached' as const,
          items_fetched: itemsFetched,
          valid_items_count: itemsFetched,
          last_success_at: previous?.last_success_at ?? null,
        };
        merged.failure_category = null;
        merged.next_action = suggestNextAction(merged);
        return merged;
      }

      const merged = {
        ...current,
        items_fetched: itemsFetched,
        valid_items_count: current.valid_items_count ?? itemsFetched,
      };
      merged.failure_category =
        (merged.valid_items_count ?? 0) > 0
          ? merged.status === 'test_pending'
            ? 'trends_test_pending'
            : null
          : current.failure_category ?? classifyFailure(current.error, current.crawl_mode);
      merged.next_action = suggestNextAction(merged);
      return merged;
    }

    const fallback = previous ?? defaultSourceStatus(source);
    const merged = { ...fallback, items_fetched: itemsFetched, valid_items_count: itemsFetched };
    merged.failure_category =
      itemsFetched > 0
        ? merged.status === 'test_pending'
          ? 'trends_test_pending'
          : null
        : fallback.failure_category ?? classifyFailure(fallback.error, fallback.crawl_mode);
    merged.next_action = suggestNextAction(merged);
    return merged;
  });
}

function buildSourceStatusMarkdown(statuses: SourceStatus[]) {
  const lines = [
    '# 数据源状态（内部调试）',
    '',
    '此文档用于记录最近一次抓取结果，不在前台默认展示。',
    '',
    '| 来源 | 状态 | 抓取模式 | 尝试策略 | 有效条目 | 失败分类 | 下一步 |',
    '| --- | --- | --- | --- | ---: | --- | --- |',
    ...statuses.map((status) => {
      return `| ${status.source_name} | ${status.status} | ${status.crawl_mode} | ${(status.attempted_strategies ?? []).join(', ')} | ${status.valid_items_count ?? 0} | ${status.failure_category ?? '—'} | ${status.next_action ?? '—'} |`;
    }),
  ];
  return lines.join('\n');
}

function buildCoverageMarkdown(report: ReturnType<typeof buildCoverageReport>) {
  const byFailure = report.items.reduce<Record<string, number>>((accumulator, item) => {
    const key = item.failure_category ?? 'success';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const byType = report.items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.source_type] = (accumulator[item.source_type] ?? 0) + 1;
    return accumulator;
  }, {});

  const byMode = report.items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.crawl_mode] = (accumulator[item.crawl_mode] ?? 0) + 1;
    return accumulator;
  }, {});

  const lines = [
    '# 数据源覆盖报告',
    '',
    `- 总源数：${report.total_sources}`,
    `- enabled 源数：${report.enabled_sources}`,
    `- 成功源数：${report.success_sources}`,
    `- 成功率：${report.success_rate}%`,
    `- 目标成功率：${report.target_success_rate}%`,
    `- 前台纳入源数：${report.included_in_frontend_sources}`,
    '',
    '## 按失败类型统计',
    ...Object.entries(byFailure).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## 按 source_type 统计',
    ...Object.entries(byType).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## 按 crawl_mode 统计',
    ...Object.entries(byMode).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## 明细',
    '',
    '| 来源 | 类型 | 模式 | 尝试策略 | 成功策略 | 有效条目 | discovered_feeds | discovered_sitemaps | 状态 | 失败分类 | 下一步 |',
    '| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |',
    ...report.items.map((item) => {
      return `| ${item.source_name} | ${item.source_type} | ${item.crawl_mode} | ${item.attempted_strategies.join(', ')} | ${item.successful_strategy ?? '—'} | ${item.valid_items_count} | ${(item.discovered_feeds || []).join('<br/>')} | ${(item.discovered_sitemaps || []).join('<br/>')} | ${item.status} | ${item.failure_category ?? '—'} | ${item.next_action ?? '—'} |`;
    }),
  ];

  return lines.join('\n');
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildItemRetentionReport(
  rawItems: RawItem[],
  normalizedItems: NormalizedItem[],
  lowConfidenceItems: LowConfidenceItem[],
  topicCards: ReturnType<typeof clusterTopics>,
): ItemRetentionReport {
  const topicEvidenceKeys = new Set(
    topicCards.flatMap((topic) => topic.sources.map((source) => `${source.source_id}::${source.url}`)),
  );
  const lowConfidenceIds = new Set(lowConfidenceItems.map((item) => item.item_id));
  const unclusteredItems = normalizedItems.filter(
    (item) => !lowConfidenceIds.has(item.item_id) && !topicEvidenceKeys.has(`${item.source_id}::${item.url}`),
  );

  const perSourceMap = new Map<string, ItemRetentionReport['per_source'][number]>();
  const sourcesSeen = new Set(rawItems.map((item) => item.source_id));

  for (const sourceId of sourcesSeen) {
    perSourceMap.set(sourceId, {
      source_id: sourceId,
      source_name: rawItems.find((item) => item.source_id === sourceId)?.source_name ?? sourceId,
      raw_items: rawItems.filter((item) => item.source_id === sourceId).length,
      normalized_items: normalizedItems.filter((item) => item.source_id === sourceId).length,
      topic_evidence_items: normalizedItems.filter((item) => topicEvidenceKeys.has(`${item.source_id}::${item.url}`)).filter((item) => item.source_id === sourceId).length,
      low_confidence_items: lowConfidenceItems.filter((item) => item.source_id === sourceId).length,
      truly_discarded_items: 0,
    });
  }

  return {
    generated_at: new Date().toISOString(),
    raw_items: rawItems.length,
    normalized_items: normalizedItems.length,
    event_frames: normalizedItems.length,
    topic_evidence_items: normalizedItems.filter((item) => topicEvidenceKeys.has(`${item.source_id}::${item.url}`)).length,
    low_confidence_items: lowConfidenceItems.length,
    unclustered_items: unclusteredItems.length,
    truly_discarded_items: 0,
    discard_reason_counts: {},
    low_confidence_reason_counts: countBy(lowConfidenceItems.map((item) => item.reason)),
    per_source: Array.from(perSourceMap.values()).sort((a, b) => a.source_name.localeCompare(b.source_name)),
  };
}

function buildItemRetentionMarkdown(report: ItemRetentionReport) {
  const lines = [
    '# Item Retention Report',
    '',
    `- raw_items: ${report.raw_items}`,
    `- normalized_items: ${report.normalized_items}`,
    `- event_frames: ${report.event_frames}`,
    `- topic_evidence_items: ${report.topic_evidence_items}`,
    `- low_confidence_items: ${report.low_confidence_items}`,
    `- unclustered_items: ${report.unclustered_items}`,
    `- truly_discarded_items: ${report.truly_discarded_items}`,
    '',
    '## low_confidence_reason_counts',
    ...Object.entries(report.low_confidence_reason_counts).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## per_source',
    '',
    '| source_name | raw | normalized | topic_evidence | low_confidence | discarded |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...report.per_source.map((item) => {
      return `| ${item.source_name} | ${item.raw_items} | ${item.normalized_items} | ${item.topic_evidence_items} | ${item.low_confidence_items} | ${item.truly_discarded_items} |`;
    }),
  ];
  return lines.join('\n');
}

async function main() {
  await ensureDirs();

  await Promise.all([
    copyIfMissing(
      path.join(process.cwd(), 'new_world_cup_hotspot_sources_completed_utf8.csv'),
      path.join(process.cwd(), 'data', 'sources', 'new_world_cup_hotspot_sources_completed_utf8.csv'),
    ),
    copyIfMissing(
      path.join(process.cwd(), 'world_cup_radar_mvp_source_whitelist_utf8.csv'),
      path.join(process.cwd(), 'data', 'sources', 'world_cup_radar_mvp_source_whitelist_utf8.csv'),
    ),
    copyIfMissing(
      path.join(process.cwd(), 'world_cup_radar_mvp_sources_config.json'),
      path.join(process.cwd(), 'data', 'sources', 'world_cup_radar_mvp_sources_config.json'),
    ),
    copyIfMissing(
      path.join(process.cwd(), 'world_cup_2026_latest_image_schedule_utf8.csv'),
      path.join(process.cwd(), 'data', 'seeds', 'world_cup_2026_latest_image_schedule_utf8.csv'),
    ),
    copyIfMissing(
      path.join(process.cwd(), 'world_cup_2026_latest_image_schedule.json'),
      path.join(process.cwd(), 'data', 'seeds', 'world_cup_2026_latest_image_schedule.json'),
    ),
  ]);

  const { sources } = await readSourcesConfig();
  const seeds = await loadSeeds();
  const previousRawItems = (await readJsonFile<RawItem[]>(getPublicDataPath('raw_items.json'), [])).filter(
    (item) => item.crawl_strategy !== 'seed',
  );
  const previousStatusReport = await readJsonFile<{ last_build_at: string; sources: SourceStatus[] }>(
    getPublicDataPath('source_status.json'),
    { last_build_at: '', sources: [] },
  );

  const [rssResult, htmlResult] = await Promise.all([fetchRssSources(), fetchHtmlListSources()]);
  const liveRawItems: RawItem[] = [...rssResult.rawItems, ...htmlResult.rawItems].map((item) => ({
    ...item,
    data_origin: 'live' as const,
  }));
  const previousMap = groupPreviousRawItems(previousRawItems);

  const mergedRawItems: RawItem[] = sources.flatMap((source): RawItem[] => {
    const currentForSource = liveRawItems.filter((item) => item.source_id === source.source_id);

    const currentRealArticles = currentForSource.filter(
      (item) =>
        item.item_type === 'article' &&
        !!item.published_at &&
        !/live commentary|live score|scores-fixtures|fixtures|schedule|how to watch|watch guide|tv channel|standings|bracket|en vivo y directo|sigue el partido/i.test(
          `${item.title} ${item.summary} ${item.url}`,
        ),
    );
  
    if (currentRealArticles.length > 0) return currentRealArticles;
    if (source.source_type === 'trends') return [];
  
    return (previousMap.get(source.source_id) ?? []).map((item) => ({
      ...item,
      data_origin: 'cache' as const,
      extraction_level: item.data_origin === 'seed' ? 'seed' : 'cached',
    }));
  });

  const fallbackSeedItems: RawItem[] = mergedRawItems.length === 0 ? buildSeedRawItems(sources, seeds.matches) : [];
  const finalRawItems = [...mergedRawItems, ...fallbackSeedItems];

  const normalized = normalizeItems(finalRawItems, seeds.topicRules);
    const matched = await matchEntities(normalized, seeds.entities, seeds.matches);
  const lowConfidenceItems = buildLowConfidenceItems(matched);
  const topicCards = clusterTopics(matched, seeds.topicRules, seeds.matches);

  const statuses = mergeStatuses(
    sources,
    [...rssResult.statuses, ...htmlResult.statuses],
    previousStatusReport.sources,
    finalRawItems,
  ).map((status) => ({
    ...status,
    included_in_frontend: topicCards.some((topic) => topic.sources.some((source) => source.source_id === status.source_id)),
  }));

  const sourceStatus = buildStatusReport(statuses);
  const sourceCoverageReport = buildCoverageReport(sources, statuses, topicCards);
  const retentionReport = buildItemRetentionReport(finalRawItems, matched, lowConfidenceItems, topicCards);
  const topicEvidenceKeys = new Set(topicCards.flatMap((topic) => topic.sources.map((source) => `${source.source_id}::${source.url}`)));
  const lowConfidenceIds = new Set(lowConfidenceItems.map((item) => item.item_id));
  const unclusteredItems = matched.filter((item) => !lowConfidenceIds.has(item.item_id) && !topicEvidenceKeys.has(`${item.source_id}::${item.url}`));

  await writeCoreOutputs({
    sources,
    matches: seeds.matches,
    entities: seeds.entities,
    rawItems: finalRawItems,
    normalizedItems: matched,
    topicCards,
    sourceStatus,
    sourceCoverageReport,
    lowConfidenceItems,
  });

  await Promise.all([
    writeJsonFile(getPublicDataPath('event_frames.json'), matched.map((item) => item.event_frame)),
    writeJsonFile(getPublicDataPath('unclustered_items.json'), unclusteredItems),
    writeJsonFile(getPublicDataPath('discarded_items.json'), []),
    writeJsonFile(getPublicDataPath('item_retention_report.json'), retentionReport),
    writeTextFile(path.join(process.cwd(), 'docs', 'source-status.md'), buildSourceStatusMarkdown(statuses)),
    writeTextFile(path.join(process.cwd(), 'docs', 'source-coverage-report.md'), buildCoverageMarkdown(sourceCoverageReport)),
    writeTextFile(path.join(process.cwd(), 'docs', 'item-retention-report.md'), buildItemRetentionMarkdown(retentionReport)),
  ]);

  console.log(`Built data: ${finalRawItems.length} raw, ${matched.length} normalized, ${topicCards.length} topic cards`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
