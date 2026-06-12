import type { LiveStatus, Match, MatchStatusSource } from './types';

const beijingDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'numeric',
  day: 'numeric',
});

const beijingTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatBeijingTime(isoUtcString: string) {
  const date = new Date(isoUtcString);
  const datePart = beijingDateFormatter.format(date).replace('/', '月') + '日';
  const timePart = beijingTimeFormatter.format(date);
  return `${datePart} ${timePart} 北京时间`;
}

export function getMatchDisplayTime(match: Match) {
  return match.display_time_beijing || formatBeijingTime(match.kickoff_utc);
}

export function formatBuildTime(isoString?: string) {
  if (!isoString) return '等待数据构建';
  return formatBeijingTime(isoString);
}

export function estimateMatchStatus(match: Match): {
  label: string;
  live_status: LiveStatus;
  status_source: MatchStatusSource;
  note: string;
} {
  const kickoff = new Date(match.kickoff_utc).getTime();
  const now = Date.now();
  const endEstimate = kickoff + (2 * 60 + 15) * 60 * 1000;
  const note = '状态按北京时间估算，非实时比分。';

  if (!kickoff || Number.isNaN(kickoff)) {
    return { label: '状态待确认', live_status: 'unknown', status_source: 'time_estimated', note };
  }

  if (now < kickoff) {
    return { label: '未开赛', live_status: 'scheduled', status_source: 'time_estimated', note };
  }

  if (now < endEstimate) {
    return { label: '进行中', live_status: 'live', status_source: 'time_estimated', note };
  }

  return { label: '已结束', live_status: 'finished', status_source: 'time_estimated', note };
}
