interface KeywordTagFlowProps {
  phrases: Array<{ phrase: string; count: number }>;
}

export function KeywordTagFlow({ phrases }: KeywordTagFlowProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">话题短语流</h2>
        <p className="text-sm text-slate-400">这里只展示带有语义的信息短语，不直接堆国家名、球队名或泛词。</p>
      </div>
      {phrases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
          暂无足够稳定的海外话题短语，等待更多信源汇聚。
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {phrases.map((item) => (
            <span
              key={item.phrase}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100"
            >
              {item.phrase}
              <span className="ml-2 text-xs text-cyan-300/80">{item.count}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
