import clsx from 'clsx';
import { formatBuildTime } from '../lib/time';
import type { TopicCard as TopicCardType } from '../lib/types';

interface TopicCardProps {
  topic: TopicCardType;
  active: boolean;
  onClick: () => void;
}

export function TopicCard({ topic, active, onClick }: TopicCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex h-full flex-col rounded-3xl border p-5 text-left transition',
        active
          ? 'border-cyan-400 bg-cyan-400/8 shadow-lg shadow-cyan-950/30'
          : 'border-white/10 bg-slate-900/55 hover:border-white/20 hover:bg-slate-900/80',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.2em] text-cyan-300">话题线索</div>
          <h3 className="mt-2 text-lg font-semibold text-white">{topic.topic_title}</h3>
          <div className="mt-2 line-clamp-2 text-sm text-slate-400">{topic.lead_source_title}</div>
        </div>
        <div className="rounded-2xl bg-white/8 px-3 py-2 text-center">
          <div className="text-[10px] tracking-[0.2em] text-slate-400">线索强度</div>
          <div className="text-lg font-semibold text-white">{topic.heat_score}</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">{topic.topic_summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {topic.topic_phrases.slice(0, 3).map((phrase) => (
          <span
            key={phrase}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200"
          >
            {phrase}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-2 text-xs text-slate-400">
        <div>
          线索强度 {topic.heat_score} · {topic.source_count} 个来源 · {topic.regions.join('、')}
        </div>
        <div>最近更新：{formatBuildTime(topic.last_updated)}</div>
      </div>
    </button>
  );
}
