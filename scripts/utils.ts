import { mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import Papa from 'papaparse';
import type {
  CrawlMode,
  EntitiesSeed,
  LowConfidenceItem,
  Match,
  NormalizedItem,
  RawItem,
  SourceConfig,
  SourceCoverageReport,
  SourceStatus,
  SourceStatusReport,
  TeamEntity,
  TopicCard,
  TopicRules,
  UiRegion,
} from '../src/lib/types';
import { formatBeijingTime } from '../src/lib/time';

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, 'data');
export const SOURCE_DIR = path.join(DATA_DIR, 'sources');
export const SEED_DIR = path.join(DATA_DIR, 'seeds');
export const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data');

export const SOURCE_WEIGHTS: Record<SourceConfig['source_type'], number> = {
  official: 95,
  media: 82,
  media_fixture: 76,
  forum: 62,
  trends: 55,
  open_social: 58,
  media_reference: 40,
};

const AUTO_TEAM_REGION_MAP: Record<string, UiRegion> = {
  墨西哥: '北美',
  南非: '非洲',
  韩国: '亚洲',
  捷克: '欧洲',
  加拿大: '北美',
  波黑: '欧洲',
  美国: '北美',
  巴拉圭: '拉美',
  卡塔尔: '中东与北非',
  瑞士: '欧洲',
  阿根廷: '拉美',
  巴西: '拉美',
  西班牙: '欧洲',
  英格兰: '欧洲',
  日本: '亚洲',
  法国: '欧洲',
  德国: '欧洲',
  荷兰: '欧洲',
  葡萄牙: '欧洲',
  摩洛哥: '中东与北非',
};

const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];

export async function ensureDirs() {
  await Promise.all([
    mkdir(SOURCE_DIR, { recursive: true }),
    mkdir(SEED_DIR, { recursive: true }),
    mkdir(PUBLIC_DATA_DIR, { recursive: true }),
    mkdir(path.join(ROOT, 'docs'), { recursive: true }),
  ]);
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDirs();
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export async function writeTextFile(filePath: string, value: string) {
  await ensureDirs();
  await writeFile(filePath, value, 'utf8');
}

export function uniqueStrings<T extends string>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean))) as T[];
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^\p{L}\p{N}\s/-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsAlias(text: string, alias: string) {
  if (/^[A-Z]{2,4}$/.test(alias.trim())) {
    const acronymPattern = new RegExp(`\\b${alias.trim()}\\b`);
    return acronymPattern.test(text);
  }

  const normalizedText = normalizeText(text);
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) return false;
  if (['america', 'selecao', 'la roja'].includes(normalizedAlias)) return false;
  if (normalizedAlias.length <= 3) {
    const tokens = normalizedText.split(/\s+/);
    return tokens.includes(normalizedAlias);
  }
  return normalizedText.includes(normalizedAlias);
}

export async function copyIfMissing(sourceFile: string, targetFile: string) {
  const content = await readFile(sourceFile, 'utf8');
  await writeFile(targetFile, content, 'utf8');
}

export function getSeedSourcesPath() {
  return path.join(SOURCE_DIR, 'world_cup_radar_mvp_sources_config.json');
}

export function getWhitelistCsvPath() {
  return path.join(SOURCE_DIR, 'world_cup_radar_mvp_source_whitelist_utf8.csv');
}

export function getFullSourcesCsvPath() {
  return path.join(SOURCE_DIR, 'new_world_cup_hotspot_sources_completed_utf8.csv');
}

export function getPublicDataPath(name: string) {
  return path.join(PUBLIC_DATA_DIR, name);
}

function normalizeSourceType(value: string): SourceConfig['source_type'] {
  if (
    value === 'official' ||
    value === 'media' ||
    value === 'media_fixture' ||
    value === 'forum' ||
    value === 'trends' ||
    value === 'open_social' ||
    value === 'media_reference'
  ) {
    return value;
  }
  return 'media';
}

function inferCrawlMode(row: Record<string, string>): CrawlMode {
  const strategy = row.crawl_strategy || '';
  if (strategy === 'rss') return 'rss';
  if (strategy === 'fixture_parse') return 'fixture';
  if (strategy === 'trend_page_test') return 'trend_test';
  if (strategy === 'manual_check' || strategy === 'manual_check_or_light_html_parse') {
    return 'manual_reference';
  }
  if ((row.entry_url_type || '').includes('article')) return 'html_article_links';
  return 'html_list';
}

function inferBatch(row: Record<string, string>, coreIds: Set<string>): SourceConfig['batch'] {
  const sourceType = normalizeSourceType(row.source_type || '');
  if (sourceType === 'trends') return 'trends_test';
  if (coreIds.has(row.source_id)) return 'core';
  const grade = row.feasibility_grade || 'B';
  return grade === 'D' ? 'defer' : 'expanded';
}

function inferEnabled(row: Record<string, string>, batch: SourceConfig['batch']) {
  const sourceType = normalizeSourceType(row.source_type || '');
  const grade = row.feasibility_grade || 'B';
  if (batch === 'trends_test') return true;
  if (grade === 'D') {
    return sourceType === 'official' || sourceType === 'media_fixture';
  }
  return true;
}

function inferMaxItems(_row: Record<string, string>, crawlMode: CrawlMode) {
  if (crawlMode === 'rss') return 30;
  if (crawlMode === 'html_article_links') return 25;
  if (crawlMode === 'html_list') return 25;
  if (crawlMode === 'trend_test') return 5;
  if (crawlMode === 'fixture') return 5;
  if (crawlMode === 'manual_reference') return 5;
  return 20;
}

function mapCsvRowToSourceConfig(
  row: Record<string, string>,
  coreIds: Set<string>,
  overrides: Map<string, SourceConfig>,
): SourceConfig {
  const sourceType = normalizeSourceType(row.source_type || 'media');
  const crawlMode = inferCrawlMode(row);
  const batch = inferBatch(row, coreIds);
  const baseOverride = overrides.get(row.source_id);

  return {
    source_id: row.source_id,
    source_name: row.source_name,
    region: row.region,
    country: row.country,
    language: row.language,
    source_type: baseOverride?.source_type ?? sourceType,
    priority: (row.priority || 'medium') as SourceConfig['priority'],
    entry_url_type: row.entry_url_type || '',
    crawl_strategy: row.crawl_strategy || '',
    crawl_mode: baseOverride?.crawl_mode ?? crawlMode,
    feasibility_grade: (row.feasibility_grade || 'B') as SourceConfig['feasibility_grade'],
    mvp_role: baseOverride?.mvp_role ?? row.mvp_status ?? 'expanded_source',
    mvp_fetch_phase:
      sourceType === 'trends'
        ? 'test'
        : row.recommended_phase === 'reference'
          ? 'reference'
          : coreIds.has(row.source_id)
            ? 'primary'
            : 'secondary',
    homepage_url: row.homepage_url || baseOverride?.homepage_url || '',
    rss_url: row.rss_url || baseOverride?.rss_url || '',
    first_fetch_mode: row.crawl_strategy || '',
    access_notes: row.access_notes || '',
    notes: row.notes || '',
    enabled: inferEnabled(row, batch),
    batch,
    max_items_per_source: inferMaxItems(row, crawlMode),
    included_in_frontend: false,
  };
}

async function parseCsvFile(filePath: string) {
  try {
    const csvText = await readFile(filePath, 'utf8');
    const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: true,
    });
    return parsed.data;
  } catch {
    return [] as Record<string, string>[];
  }
}

async function readCoreIdSet() {
  const whitelistRows = await parseCsvFile(getWhitelistCsvPath());
  return new Set(whitelistRows.map((row) => row.source_id).filter(Boolean));
}

export async function readSourcesConfig() {
  const fullPool = await parseCsvFile(getFullSourcesCsvPath());
  const baseConfig = await readJsonFile<{ sources: SourceConfig[] }>(getSeedSourcesPath(), { sources: [] });
  const coreIds = await readCoreIdSet();
  const overrides = new Map(baseConfig.sources.map((source) => [source.source_id, source]));

  const sources = fullPool.filter((row) => row.source_id).map((row) => mapCsvRowToSourceConfig(row, coreIds, overrides));

  return {
    project: 'World Cup Hotspot Radar',
    generated_from: 'new_world_cup_hotspot_sources_completed_utf8.csv',
    generated_at: new Date().toISOString().slice(0, 10),
    mvp_source_count: sources.length,
    sources,
  };
}

export function generateRawId(sourceId: string, title: string, index: number) {
  const compact = normalizeText(title).replace(/\s+/g, '-').slice(0, 60);
  return `${sourceId}_${compact || 'item'}_${index}`;
}

export function sanitizeUrl(input: string, baseUrl?: string) {
  try {
    const url = baseUrl ? new URL(input, baseUrl) : new URL(input);
    for (const key of TRACKING_PARAMS) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return baseUrl ?? input;
  }
}

export function isProbablySameDomain(candidateUrl: string, sourceUrl: string) {
  try {
    const candidate = new URL(candidateUrl);
    const source = new URL(sourceUrl);
    return candidate.hostname === source.hostname || candidate.hostname.endsWith(`.${source.hostname}`);
  } catch {
    return false;
  }
}

export function classifyFailure(error: string | null, crawlMode?: CrawlMode) {
  const text = (error ?? '').toLowerCase();
  if (!text) {
    if (crawlMode === 'trend_test') return 'trends_test_pending';
    if (crawlMode === 'manual_reference') return 'manual_reference';
    return null;
  }
  if (text.includes('timedout') || text.includes('econnreset') || text.includes('socket')) return 'timeout_or_connection';
  if (text.includes('enotfound') || text.includes('eai_again') || text.includes('cert') || text.includes('tls')) return 'dns_tls_connection';
  if (text.includes('http 403') || text.includes('http 401') || text.includes('http 429')) return 'http_blocked';
  if (text.includes('no usable html') || text.includes('no usable items') || text.includes('html')) return 'html_parse_no_items';
  if (text.includes('rss')) return 'rss_invalid';
  if (text.includes('dynamic')) return 'dynamic_rendering';
  return 'other';
}

export function suggestNextAction(status: SourceStatus) {
  switch (status.failure_category) {
    case 'timeout_or_connection':
      return '建议后续补充备用网址、降低页面深度或改用已发现 feed。';
    case 'http_blocked':
      return '建议保留公开元数据策略，不做付费墙或登录绕过；可人工补 RSS。';
    case 'html_parse_no_items':
      return '建议补充站点专用 selector、JSON-LD 或 sitemap 规则。';
    case 'rss_invalid':
      return '建议自动发现 feed 或改走 HTML/JSON-LD。';
    case 'dynamic_rendering':
      return '建议后续使用 Playwright 本地调试，不引入付费代理。';
    case 'trends_test_pending':
      return '作为实验源保留，等待后续手动导出或稳定方案。';
    case 'manual_reference':
      return '作为参考源保留，当前不进入主抓取。';
    default:
      return status.items_fetched > 0 ? '已抓到有效条目，可继续优化相关性。' : '建议人工检查该源结构。';
  }
}

export function defaultSourceStatus(source: SourceConfig): SourceStatus {
  const initialStatus =
    source.crawl_mode === 'trend_test'
      ? 'test_pending'
      : source.crawl_mode === 'manual_reference'
        ? 'manual_export_supported'
        : 'partial';

  return {
    source_id: source.source_id,
    source_name: source.source_name,
    status: initialStatus,
    crawl_strategy: source.crawl_strategy,
    crawl_mode: source.crawl_mode,
    items_fetched: 0,
    last_success_at: null,
    error: null,
    homepage_url: source.homepage_url,
    enabled: source.enabled,
    batch: source.batch,
    max_items_per_source: source.max_items_per_source,
    included_in_frontend: false,
    attempted_strategies: [],
    successful_strategy: null,
    valid_items_count: 0,
    discarded_count: 0,
    discovered_feeds: [],
    discovered_sitemaps: [],
    failure_category: classifyFailure(null, source.crawl_mode),
    next_action: null,
  };
}

export function buildStatusReport(statuses: SourceStatus[]): SourceStatusReport {
  return {
    last_build_at: new Date().toISOString(),
    sources: statuses,
  };
}

function csvToMatches(csvText: string): Match[] {
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.map((row) => mapScheduleRecord(row));
}

function mapScheduleRecord(row: Record<string, unknown>): Match {
  return {
    match_id: String(row.match_id ?? ''),
    match_number: Number(row.match_number ?? 0),
    round: String(row.round ?? ''),
    group: String(row.group ?? ''),
    home_team: String(row.home_team ?? ''),
    away_team: String(row.away_team ?? ''),
    matchup: String(row.matchup ?? ''),
    matchup_code: String(row.matchup_code ?? ''),
    display_matchup: String(row.display_matchup ?? row.matchup ?? ''),
    date_beijing_text: String(row.date_beijing_text ?? ''),
    time_beijing_text: String(row.time_beijing_text ?? ''),
    display_time_beijing: String(row.display_time_beijing ?? ''),
    city: String(row.city ?? ''),
    stadium: String(row.stadium ?? ''),
    kickoff_beijing: String(row.kickoff_beijing ?? ''),
    kickoff_utc: String(row.kickoff_utc ?? ''),
    time_basis: String(row.time_basis ?? ''),
    status: 'scheduled',
    source_note: String(row.source_note ?? ''),
    status_source: 'time_estimated',
    live_status: 'scheduled',
    score_home: null,
    score_away: null,
  };
}

function normalizeSchedule(matches: Match[]) {
  return matches
    .map((match) => ({
      ...match,
      display_time_beijing: match.display_time_beijing || formatBeijingTime(match.kickoff_utc),
      display_matchup:
        match.display_matchup || [match.home_team, match.away_team].filter(Boolean).join(' vs '),
    }))
    .filter((match) => match.match_id)
    .sort(
      (a, b) =>
        new Date(a.kickoff_beijing || a.kickoff_utc).getTime() -
        new Date(b.kickoff_beijing || b.kickoff_utc).getTime(),
    );
}

function inferTeamRegion(teamName: string): UiRegion {
  return AUTO_TEAM_REGION_MAP[teamName] ?? '全球/英语圈';
}

function augmentEntitiesWithSchedule(entities: EntitiesSeed, matches: Match[]): EntitiesSeed {
  const existing = new Map(entities.teams.map((team) => [team.name_zh, team]));
  const inferredTeams = uniqueStrings(matches.flatMap((match) => [match.home_team, match.away_team]).filter(Boolean));

  for (const name of inferredTeams) {
    if (existing.has(name)) continue;
    const slug = normalizeText(name).replace(/\s+/g, '_') || `team_${existing.size + 1}`;
    existing.set(name, {
      team_id: slug,
      name_zh: name,
      name_en: name,
      country_code: '',
      region: inferTeamRegion(name),
      aliases: [name],
      languages: ['zh'],
      key_players: [],
    });
  }

  return {
    teams: Array.from(existing.values()),
    players: entities.players,
  };
}

export interface SeedBundle {
  matches: Match[];
  entities: EntitiesSeed;
  topicRules: TopicRules;
}

export async function loadSeeds(): Promise<SeedBundle> {
  const scheduleJsonPath = path.join(SEED_DIR, 'world_cup_2026_latest_image_schedule.json');
  const scheduleCsvPath = path.join(SEED_DIR, 'world_cup_2026_latest_image_schedule_utf8.csv');
  const fallbackMatchesPath = path.join(SEED_DIR, 'matches_seed.json');

  const scheduleJson = await readJsonFile<unknown[]>(scheduleJsonPath, []);
  let matches = Array.isArray(scheduleJson)
    ? normalizeSchedule(scheduleJson.map((row) => mapScheduleRecord(row as Record<string, unknown>)))
    : [];

  if (matches.length === 0) {
    try {
      const csvText = await readFile(scheduleCsvPath, 'utf8');
      matches = normalizeSchedule(csvToMatches(csvText));
    } catch {
      matches = [];
    }
  }

  if (matches.length === 0) {
    matches = normalizeSchedule(await readJsonFile<Match[]>(fallbackMatchesPath, []));
  }

  const entities = augmentEntitiesWithSchedule(
    await readJsonFile<EntitiesSeed>(path.join(SEED_DIR, 'entities_seed.json'), { teams: [], players: [] }),
    matches,
  );

  const topicRules = await readJsonFile<TopicRules>(path.join(SEED_DIR, 'topic_rules.json'), {
    stop_terms: [],
    keyword_stop_terms: [],
    excluded_content_terms: [],
    invalid_topic_suffixes: [],
    topic_categories: [],
  });

  return { matches, entities, topicRules };
}

export type PreviousRawMap = Map<string, RawItem[]>;

export function groupPreviousRawItems(items: RawItem[]) {
  const map: PreviousRawMap = new Map();
  for (const item of items) {
    const group = map.get(item.source_id) ?? [];
    group.push(item);
    map.set(item.source_id, group);
  }
  return map;
}

export function mapSourceRegionToUiRegion(region: string, country: string, language: string): UiRegion {
  const text = `${region} ${country} ${language}`.toLowerCase();
  if (
    text.includes('latin') ||
    text.includes('argentina') ||
    text.includes('brazil') ||
    text.includes('mexico') ||
    language === 'es' ||
    language === 'pt'
  ) {
    return '拉美';
  }
  if (
    text.includes('middle east') ||
    text.includes('north africa') ||
    text.includes('qatar') ||
    text.includes('saudi') ||
    text.includes('morocco')
  ) {
    return '中东与北非';
  }
  if (text.includes('africa') || text.includes('south africa')) {
    return '非洲';
  }
  if (text.includes('asia') || text.includes('japan') || text.includes('korea')) {
    return '亚洲';
  }
  if (text.includes('united states') || text.includes('canada') || text.includes('north america')) {
    return '北美';
  }
  if (
    text.includes('europe') ||
    text.includes('uk') ||
    text.includes('spain') ||
    text.includes('france') ||
    text.includes('germany') ||
    text.includes('switzerland')
  ) {
    return '欧洲';
  }
  return '全球/英语圈';
}

export function findTeamByAlias(teams: TeamEntity[], text: string) {
  return teams.filter((team) => team.aliases.some((alias) => containsAlias(text, alias)));
}

export function safeSummary(value: string | undefined) {
  return value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

export function dedupeByUrl<T extends { url: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export function recencyScoreFromDate(dateIso: string) {
  const hours = Math.max(0, (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60));
  return Math.max(8, Math.min(100, 100 - hours * 2.5));
}

export function toPriorityScore(sourceType: SourceConfig['source_type']) {
  return SOURCE_WEIGHTS[sourceType];
}

export async function requestText(url: string, redirectCount = 0, userAgent?: string): Promise<string> {
  if (redirectCount > 3) {
    throw new Error('Too many redirects');
  }

  const client = url.startsWith('https:') ? https : http;
  const agents = [
    userAgent,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36',
  ].filter(Boolean) as string[];

  const attempt = (ua: string) =>
    new Promise<string>((resolve, reject) => {
      const request = client.get(
        url,
        {
          headers: {
            'user-agent': ua,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.9,*/*;q=0.8',
          },
        },
        (response) => {
          const statusCode = response.statusCode ?? 0;
          const location = response.headers.location;

          if (statusCode >= 300 && statusCode < 400 && location) {
            response.resume();
            const nextUrl = new URL(location, url).toString();
            requestText(nextUrl, redirectCount + 1, ua).then(resolve).catch(reject);
            return;
          }

          if (statusCode < 200 || statusCode >= 300) {
            response.resume();
            reject(new Error(`HTTP ${statusCode}`));
            return;
          }

          let body = '';
          const encoding = String(response.headers['content-encoding'] ?? '').toLowerCase();
          const stream =
            encoding.includes('br')
              ? response.pipe(createBrotliDecompress())
              : encoding.includes('gzip')
                ? response.pipe(createGunzip())
                : encoding.includes('deflate')
                  ? response.pipe(createInflate())
                  : response;

          stream.setEncoding('utf8');
          stream.on('data', (chunk) => {
            body += chunk;
          });
          stream.on('end', () => resolve(body));
          stream.on('error', reject);
        },
      );

      request.setTimeout(9000, () => {
        request.destroy(new Error('ETIMEDOUT'));
      });
      request.on('error', reject);
    });

  let lastError: unknown = null;
  for (const ua of agents) {
    try {
      return await attempt(ua);
    } catch (error) {
      lastError = error;
      const text = error instanceof Error ? error.message : String(error);
      if (/HTTP 403|HTTP 401|HTTP 429/.test(text)) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export function parseXmlLocs(xml: string) {
  return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gi)).map((match) => safeSummary(match[1]));
}

export function buildCoverageReport(
  sources: SourceConfig[],
  statuses: SourceStatus[],
  topicCards: TopicCard[],
): SourceCoverageReport {
  const includedSourceIds = new Set(topicCards.flatMap((topic) => topic.sources.map((source) => source.source_id)));
  const statusMap = new Map(statuses.map((status) => [status.source_id, status]));

  const items = sources.map((source) => {
    const status = statusMap.get(source.source_id);
    return {
      source_id: source.source_id,
      source_name: source.source_name,
      source_type: source.source_type,
      homepage_url: source.homepage_url,
      rss_url: source.rss_url,
      enabled: source.enabled,
      batch: source.batch,
      crawl_mode: source.crawl_mode,
      attempted_strategies: status?.attempted_strategies ?? [],
      successful_strategy: status?.successful_strategy ?? null,
      fetched_count: status?.items_fetched ?? 0,
      valid_items_count: status?.valid_items_count ?? 0,
      discarded_count: status?.discarded_count ?? 0,
      discovered_feeds: status?.discovered_feeds ?? [],
      discovered_sitemaps: status?.discovered_sitemaps ?? [],
      status: status?.status ?? 'partial',
      failure_category: status?.failure_category ?? null,
      failure_reason: status?.error ?? null,
      next_action: status?.next_action ?? null,
      included_in_frontend: includedSourceIds.has(source.source_id),
    };
  });

  const enabledSources = items.filter((item) => item.enabled).length;
  const successSources = items.filter((item) => item.valid_items_count > 0).length;
  const failedSources = items.filter(
    (item) => item.enabled && item.valid_items_count === 0 && !['test_pending', 'manual_export_supported'].includes(item.status),
  ).length;

  return {
    generated_at: new Date().toISOString(),
    total_sources: sources.length,
    enabled_sources: enabledSources,
    success_sources: successSources,
    failed_sources: failedSources,
    included_in_frontend_sources: items.filter((item) => item.included_in_frontend).length,
    success_rate: enabledSources > 0 ? Number(((successSources / enabledSources) * 100).toFixed(2)) : 0,
    target_success_rate: 60,
    items,
  };
}

export function writeCoreOutputs(args: {
  sources: SourceConfig[];
  matches: Match[];
  entities: EntitiesSeed;
  rawItems: RawItem[];
  normalizedItems: NormalizedItem[];
  topicCards: TopicCard[];
  sourceStatus: SourceStatusReport;
  sourceCoverageReport: SourceCoverageReport;
  lowConfidenceItems?: LowConfidenceItem[];
}) {
  return Promise.all([
    writeJsonFile(getPublicDataPath('sources.json'), args.sources),
    writeJsonFile(getPublicDataPath('matches.json'), args.matches),
    writeJsonFile(getPublicDataPath('entities.json'), args.entities),
    writeJsonFile(getPublicDataPath('raw_items.json'), args.rawItems),
    writeJsonFile(getPublicDataPath('normalized_items.json'), args.normalizedItems),
    writeJsonFile(getPublicDataPath('topic_cards.json'), args.topicCards),
    writeJsonFile(getPublicDataPath('source_status.json'), args.sourceStatus),
    writeJsonFile(getPublicDataPath('source_coverage_report.json'), args.sourceCoverageReport),
    writeJsonFile(getPublicDataPath('low_confidence_items.json'), args.lowConfidenceItems ?? []),
  ]);
}
