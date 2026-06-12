import type { TopicCard as TopicCardType } from '../lib/types';
import { TopicCard } from './TopicCard';

interface TopicCardGridProps {
  topicCards: TopicCardType[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
}

export function TopicCardGrid({ topicCards, selectedTopicId, onSelectTopic }: TopicCardGridProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">海外话题线索</h2>
          <p className="text-sm text-slate-400">当前阶段以话题线索为主，不把单一来源包装成稳定热榜。</p>
        </div>
        <div className="text-xs tracking-[0.2em] text-slate-400">按线索强度排序</div>
      </div>

      {topicCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-400">
          当前筛选条件下还没有足够稳定的海外话题线索。
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {topicCards.map((topic) => (
            <TopicCard
              key={topic.topic_id}
              topic={topic}
              active={selectedTopicId === topic.topic_id}
              onClick={() => onSelectTopic(topic.topic_id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
