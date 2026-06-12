import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { EvidencePanel } from './components/EvidencePanel';
import { FilterBar } from './components/FilterBar';
import { KeywordTagFlow } from './components/KeywordTagFlow';
import { MatchTimeline } from './components/MatchTimeline';
import { TopicCardGrid } from './components/TopicCardGrid';
import { loadAppData } from './lib/data';
import { buildHotPhraseFlow, filterTopicCards, orderRegions } from './lib/filters';
import { REGION_ORDER } from './lib/presentation';
import type { FilterState, SourceType } from './lib/types';

const defaultFilters: FilterState = {
  region: '全部',
  platform: '全部',
  match: '全部',
  timeWindow: '24h',
};

const platformOrder: SourceType[] = ['official', 'media', 'forum', 'trends', 'media_fixture'];

export default function App() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAppData>> | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = '世界杯海外话题线索雷达';
    loadAppData()
      .then((bundle) => {
        setData(bundle);
        setSelectedTopicId(bundle.topicCards[0]?.topic_id ?? null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : '未知错误');
      });
  }, []);

  const filteredTopicCards = useMemo(() => {
    if (!data) return [];
    return filterTopicCards(data.topicCards, filters, data.matches);
  }, [data, filters]);

  const selectedTopic =
    filteredTopicCards.find((topic) => topic.topic_id === selectedTopicId) ?? filteredTopicCards[0] ?? null;

  const hotPhraseFlow = useMemo(() => buildHotPhraseFlow(filteredTopicCards), [filteredTopicCards]);

  const regions = useMemo(
    () =>
      data
        ? orderRegions(Array.from(new Set(data.topicCards.flatMap((topic) => topic.regions).filter(Boolean))))
        : REGION_ORDER,
    [data],
  );

  const platforms = useMemo(
    () => platformOrder.filter((platform) => data?.sources.some((source) => source.source_type === platform)),
    [data],
  );

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-20">
        <div className="w-full rounded-3xl border border-rose-400/20 bg-rose-400/10 p-8 text-rose-100">
          页面数据加载失败：{error}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 px-8 py-6 text-slate-300">
          正在加载海外话题线索数据...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-6 px-4 py-6 md:px-6 xl:px-8">
      <AppHeader lastBuildAt={data.sourceStatus.last_build_at} topicCount={filteredTopicCards.length} />

      <MatchTimeline
        matches={data.matches}
        selectedMatch={filters.match}
        onSelectMatch={(match) => setFilters((current) => ({ ...current, match: match as FilterState['match'] }))}
      />

      <FilterBar filters={filters} matches={data.matches} regions={regions} platforms={platforms} onChange={setFilters} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <div className="grid gap-6">
          <TopicCardGrid
            topicCards={filteredTopicCards}
            selectedTopicId={selectedTopic?.topic_id ?? null}
            onSelectTopic={setSelectedTopicId}
          />
          <KeywordTagFlow phrases={hotPhraseFlow} />
        </div>

        <EvidencePanel topic={selectedTopic} />
      </section>

      <footer className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 text-sm leading-6 text-slate-400">
        <div>
          本站整理海外公开体育媒体、论坛讨论与趋势信号，帮助球迷从不同地区视角观察世界杯话题。赛程时间以北京时间显示，正式赛程请以 FIFA 官方发布为准。
        </div>
        <details className="mt-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <summary className="cursor-pointer text-slate-200">数据来源说明</summary>
          <div className="mt-3 space-y-2">
            <div>
              这里的“话题线索”不是平台热搜榜，而是从海外公开信源中识别出的世界杯相关讨论线索。
            </div>
            <div>
              当前页面聚合海外公开体育媒体、论坛讨论、RSS 与公开趋势页面，仅展示公开标题、摘要、链接和必要元数据。
            </div>
            <div>抓取失败不会阻断构建，系统会保留缓存或降级为待归纳线索。</div>
          </div>
        </details>
      </footer>
    </main>
  );
}
