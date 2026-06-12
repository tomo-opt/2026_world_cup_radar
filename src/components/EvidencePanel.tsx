import { useEffect, useMemo, useState } from 'react';
import { SOURCE_TYPE_LABELS } from '../lib/presentation';
import { formatBuildTime } from '../lib/time';
import type { TopicCard } from '../lib/types';

interface EvidencePanelProps {
  topic: TopicCard | null;
}

export function EvidencePanel({ topic }: EvidencePanelProps) {
  const [showAllSources, setShowAllSources] = useState(false);

  useEffect(() => {
    setShowAllSources(false);
  }, [topic?.topic_id]);

  const visibleSources = useMemo(() => {
    if (!topic) return [];
    return showAllSources ? topic.sources : topic.sources.slice(0, 5);
  }, [showAllSources, topic]);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">信源链详情</h2>
        <p className="text-sm text-slate-400">点击话题线索后，查看代表性原始标题与完整信源列表。</p>
      </div>

      {!topic ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-400">
          请先点击一个话题线索，查看它的来源与证据。
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-2xl bg-slate-950/50 p-4">
            <h3 className="text-base font-semibold text-white">{topic.topic_title}</h3>
            <div className="mt-1 text-sm text-slate-400">{topic.lead_source_title}</div>
            {topic.lead_source_summary ? (
              <div className="mt-2 text-sm text-slate-500">{topic.lead_source_summary}</div>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-slate-300">{topic.summary_zh}</p>
            <div className="mt-4 grid gap-2 text-xs text-slate-400">
              <div>
                线索强度 {topic.heat_score} · {topic.source_count} 个来源 · {topic.regions.join('、')}
              </div>
              <div>最近更新：{formatBuildTime(topic.last_updated)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-300">
            <div>共 {topic.sources.length} 条信源</div>
            {topic.sources.length > 5 ? (
              <button
                onClick={() => setShowAllSources((value) => !value)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400 hover:text-white"
              >
                {showAllSources ? '收起部分信源' : '展开全部信源'}
              </button>
            ) : null}
          </div>

          {visibleSources.map((source) => (
            <a
              key={`${topic.topic_id}-${source.url}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400 hover:bg-slate-950/80"
            >
              <div className="text-sm font-medium text-white">{source.title}</div>
              {source.summary ? <div className="mt-2 text-sm text-slate-400">{source.summary}</div> : null}
              <div className="mt-3 text-xs text-slate-500">
                {source.source_name} · {SOURCE_TYPE_LABELS[source.source_type]} · {source.region}
              </div>
              <div className="mt-2 text-xs text-slate-500">发布时间：{formatBuildTime(source.published_at)}</div>
              <div className="mt-2 text-xs text-cyan-200">查看原文</div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
