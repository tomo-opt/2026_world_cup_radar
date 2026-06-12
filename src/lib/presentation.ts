import type { Match, SourceStatus, SourceType, TopicCard, UiRegion } from './types';
import { getMatchDisplayTime } from './time';

export const REGION_ORDER: UiRegion[] = ['全球/英语圈', '北美', '拉美', '欧洲', '中东与北非', '非洲', '亚洲'];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  official: '官方赛程',
  media_fixture: '媒体赛程',
  media: '体育媒体',
  forum: '论坛讨论',
  trends: '趋势信号',
  open_social: '开放社交',
  media_reference: '参考页',
};

export const SOURCE_STATUS_LABELS: Record<SourceStatus['status'], string> = {
  ok: '正常',
  partial: '部分可用',
  cached: '使用缓存',
  error: '暂不可用',
  test_pending: '待测试',
  manual_export_supported: '支持人工导出',
};

export function translateSourceError(error: string | null) {
  if (!error) return '—';
  if (error.includes('ETIMEDOUT')) return '连接超时';
  if (error.includes('ECONNRESET')) return '连接被重置';
  if (error.includes('HTTP 403')) return '访问受限';
  if (error.includes('fetch failed')) return '抓取失败';
  return '抓取失败';
}

export function formatMatchOption(match: Match) {
  return `${match.display_matchup}｜${getMatchDisplayTime(match)}`;
}

export function summarizeHeat(topic: TopicCard) {
  return `线索强度 ${topic.heat_score} · ${topic.source_count} 个来源 · ${topic.regions.join('、')}`;
}
