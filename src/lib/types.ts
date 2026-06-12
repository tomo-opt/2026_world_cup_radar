export type SourceType =
  | 'official'
  | 'media'
  | 'media_fixture'
  | 'forum'
  | 'trends'
  | 'open_social'
  | 'media_reference';

export type CrawlMode =
  | 'rss'
  | 'html_list'
  | 'html_article_links'
  | 'trend_test'
  | 'fixture'
  | 'manual_reference';

export type UiRegion =
  | '全球/英语圈'
  | '北美'
  | '拉美'
  | '欧洲'
  | '中东与北非'
  | '非洲'
  | '亚洲';

export type MatchStatusSource = 'time_estimated' | 'live_api' | 'manual';
export type LiveStatus = 'scheduled' | 'live' | 'finished' | 'unknown';

export type ExtractionLevel =
  | 'title_only'
  | 'title_and_summary'
  | 'public_article_text'
  | 'seed'
  | 'cached';

export type ItemType = 'article' | 'page_reference';
export type EventConfidence = 'high' | 'medium' | 'low';

export type CrawlStrategyStep =
  | 'rss_direct'
  | 'rss_discovered'
  | 'html_list'
  | 'json_ld'
  | 'og_meta'
  | 'sitemap'
  | 'wp_json'
  | 'page_reference';

export interface SourceConfig {
  source_id: string;
  source_name: string;
  region: string;
  country: string;
  language: string;
  source_type: SourceType;
  priority: 'high' | 'medium' | 'low';
  entry_url_type: string;
  crawl_strategy: string;
  crawl_mode: CrawlMode;
  feasibility_grade: 'A' | 'B' | 'C' | 'D';
  mvp_role: string;
  mvp_fetch_phase: 'primary' | 'secondary' | 'reference' | 'test';
  homepage_url: string;
  rss_url: string;
  first_fetch_mode: string;
  access_notes: string;
  notes: string;
  enabled: boolean;
  batch: 'core' | 'expanded' | 'trends_test' | 'defer';
  max_items_per_source: number;
  included_in_frontend?: boolean;
}

export interface Match {
  match_id: string;
  match_number: number;
  round: string;
  group: string;
  home_team: string;
  away_team: string;
  matchup: string;
  matchup_code: string;
  display_matchup: string;
  date_beijing_text: string;
  time_beijing_text: string;
  display_time_beijing: string;
  city: string;
  stadium: string;
  kickoff_beijing: string;
  kickoff_utc: string;
  time_basis: string;
  status: 'scheduled' | 'live' | 'finished';
  source_note: string;
  status_source?: MatchStatusSource;
  live_status?: LiveStatus;
  score_home?: number | null;
  score_away?: number | null;
}

export interface TeamEntity {
  team_id: string;
  name_zh: string;
  name_en: string;
  country_code: string;
  region: UiRegion;
  aliases: string[];
  languages: string[];
  key_players: string[];
}

export interface PlayerEntity {
  player_id: string;
  name_zh?: string;
  name: string;
  team_id: string;
  aliases: string[];
}

export interface RawItem {
  raw_id: string;
  source_id: string;
  source_name: string;
  source_type: SourceType;
  region: string;
  language: string;
  title: string;
  url: string;
  canonical_url?: string;
  summary: string;
  content_text?: string;
  published_at: string;
  fetched_at: string;
  platform: string;
  crawl_strategy: string;
  crawl_mode: CrawlMode;
  data_origin: 'live' | 'cache' | 'seed';
  extraction_level: ExtractionLevel;
  item_type?: ItemType;
  discovered_from_strategy?: CrawlStrategyStep;
  author?: string;
  categories?: string[];
}

export interface TopicCategoryRule {
  key: string;
  label_zh: string;
  label_en: string;
  match_terms: string[];
}

export interface TopicRules {
  stop_terms: string[];
  keyword_stop_terms: string[];
  excluded_content_terms: string[];
  invalid_topic_suffixes: string[];
  topic_categories: TopicCategoryRule[];
}

export interface EventFrame {
  item_id?: string;
  source_id?: string;
  original_title?: string;
  original_summary?: string;
  public_text_excerpt?: string;
  subject: string;
  action: string;
  object: string;
  context: string;
  issue_type: string;
  teams: string[];
  players: string[];
  venues: string[];
  match_ids: string[];
  candidate_event_title_zh?: string;
  candidate_summary_zh?: string;
  event_fingerprint: string;
  confidence: EventConfidence;
  evidence_basis?: 'title_only' | 'title_and_summary' | 'public_text_excerpt';
}

export interface NormalizedItem {
  item_id: string;
  raw_id: string;
  source_id: string;
  source_name: string;
  source_type: SourceType;
  title: string;
  normalized_title: string;
  summary: string;
  content_text?: string;
  url: string;
  published_at: string;
  fetched_at: string;
  language: string;
  raw_region: string;
  ui_region: UiRegion;
  matched_teams: string[];
  matched_players: string[];
  matched_matches: string[];
  topic_terms: string[];
  topic_labels_zh: string[];
  topic_labels_en: string[];
  sports_context_score: number;
  entity_match_score: number;
  trend_bonus: number;
  excluded_reason: string | null;
  crawl_strategy: string;
  crawl_mode: CrawlMode;
  data_origin: 'live' | 'cache' | 'seed';
  extraction_level: ExtractionLevel;
  item_type: ItemType;
  event_frame: EventFrame;
  event_fingerprint: string;
  low_confidence_reason?: string | null;
}

export interface TopicEvidence {
  source_id: string;
  source_name: string;
  title: string;
  summary?: string;
  url: string;
  published_at: string;
  fetched_at: string;
  language: string;
  region: UiRegion;
  source_type: SourceType;
  crawl_strategy: string;
  crawl_mode: CrawlMode;
  data_origin: 'live' | 'cache' | 'seed';
  extraction_level: ExtractionLevel;
  item_type?: ItemType;
}

export type InterpretationBasis =
  | '根据公开标题识别'
  | '根据公开标题与摘要识别'
  | '根据公开正文片段识别'
  | '示例数据';

export type ConfidenceLevel = '低' | '中' | '较高';

export interface TopicCard {
  topic_id: string;
  topic_key: string;
  issue_type: string;
  topic_title: string;
  lead_source_title: string;
  lead_source_summary: string;
  topic_summary: string;
  summary_zh: string;
  heat_score: number;
  related_matches: string[];
  related_teams: string[];
  related_players: string[];
  regions: UiRegion[];
  languages: string[];
  source_count: number;
  evidence_count: number;
  source_names: string[];
  sources: TopicEvidence[];
  topic_phrases: string[];
  last_updated: string;
  source_count_score: number;
  recency_score: number;
  cross_region_score: number;
  source_priority_score: number;
  match_relevance_score: number;
  is_example_heat: boolean;
  interpretation_basis: InterpretationBasis;
  confidence: ConfidenceLevel;
  included_in_frontend?: boolean;
}

export interface SourceStatus {
  source_id: string;
  source_name: string;
  status: 'ok' | 'partial' | 'error' | 'cached' | 'test_pending' | 'manual_export_supported';
  crawl_strategy: string;
  crawl_mode: CrawlMode;
  items_fetched: number;
  last_success_at: string | null;
  error: string | null;
  homepage_url: string;
  enabled: boolean;
  batch: SourceConfig['batch'];
  max_items_per_source: number;
  included_in_frontend?: boolean;
  attempted_strategies?: CrawlStrategyStep[];
  successful_strategy?: CrawlStrategyStep | null;
  valid_items_count?: number;
  discarded_count?: number;
  discovered_feeds?: string[];
  discovered_sitemaps?: string[];
  failure_category?: string | null;
  next_action?: string | null;
}

export interface SourceStatusReport {
  last_build_at: string;
  sources: SourceStatus[];
}

export interface SourceCoverageReportItem {
  source_id: string;
  source_name: string;
  source_type: SourceType;
  homepage_url: string;
  rss_url: string;
  enabled: boolean;
  batch: SourceConfig['batch'];
  crawl_mode: CrawlMode;
  attempted_strategies: CrawlStrategyStep[];
  successful_strategy: CrawlStrategyStep | null;
  fetched_count: number;
  valid_items_count: number;
  discarded_count: number;
  discovered_feeds: string[];
  discovered_sitemaps: string[];
  status: SourceStatus['status'];
  failure_category: string | null;
  failure_reason: string | null;
  next_action: string | null;
  included_in_frontend: boolean;
}

export interface SourceCoverageReport {
  generated_at: string;
  total_sources: number;
  enabled_sources: number;
  success_sources: number;
  failed_sources: number;
  included_in_frontend_sources: number;
  success_rate: number;
  target_success_rate: number;
  items: SourceCoverageReportItem[];
}

export interface LowConfidenceItem {
  item_id: string;
  source_id: string;
  source_name: string;
  title: string;
  summary: string;
  url: string;
  language: string;
  reason:
    | 'title_too_short'
    | 'summary_missing'
    | 'language_rule_missing'
    | 'event_frame_incomplete'
    | 'topic_title_low_quality'
    | 'page_reference_only'
    | 'general_discussion_only';
  next_action: 'needs_manual_review' | 'needs_language_rule' | 'needs_selector_improvement' | 'wait_more_evidence';
  candidate_event_title_zh?: string;
  candidate_summary_zh?: string;
}

export interface RetentionPerSource {
  source_id: string;
  source_name: string;
  raw_items: number;
  normalized_items: number;
  topic_evidence_items: number;
  low_confidence_items: number;
  truly_discarded_items: number;
}

export interface ItemRetentionReport {
  generated_at: string;
  raw_items: number;
  normalized_items: number;
  event_frames: number;
  topic_evidence_items: number;
  low_confidence_items: number;
  unclustered_items: number;
  truly_discarded_items: number;
  discard_reason_counts: Record<string, number>;
  low_confidence_reason_counts: Record<string, number>;
  per_source: RetentionPerSource[];
}

export interface EntitiesSeed {
  teams: TeamEntity[];
  players: PlayerEntity[];
}

export interface FilterState {
  region: '全部' | UiRegion;
  platform: '全部' | SourceType;
  match: '全部' | string;
  timeWindow: '1h' | '6h' | '24h' | '72h' | 'all';
}

export interface AppDataBundle {
  sources: SourceConfig[];
  matches: Match[];
  entities: EntitiesSeed;
  topicCards: TopicCard[];
  sourceStatus: SourceStatusReport;
  normalizedItems: NormalizedItem[];
}
