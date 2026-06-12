import { SOURCE_STATUS_LABELS, translateSourceError } from '../lib/presentation';
import { formatBuildTime } from '../lib/time';
import type { SourceStatusReport } from '../lib/types';

interface SourceStatusBarProps {
  report?: SourceStatusReport;
}

export function SourceStatusBar({ report }: SourceStatusBarProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">数据源状态</h2>
        <p className="text-sm text-slate-400">
          数据源状态用于说明各来源最近一次抓取情况。某些来源失败时，系统会优先使用缓存或示例数据，
          不会影响页面基本浏览。
        </p>
      </div>

      <div className="mb-4 text-xs text-slate-400">
        最近更新：{report?.last_build_at ? formatBuildTime(report.last_build_at) : '等待构建'}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {report?.sources.map((source) => (
          <div
            key={source.source_id}
            className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">{source.source_name}</div>
                <div className="mt-1 text-xs text-slate-500">抓取方式：{source.crawl_strategy}</div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-cyan-200">
                {SOURCE_STATUS_LABELS[source.status]}
              </span>
            </div>
            <div className="mt-3 grid gap-1 text-xs text-slate-400">
              <div>条目数：{source.items_fetched}</div>
              <div>最近成功：{source.last_success_at ? formatBuildTime(source.last_success_at) : '暂无'}</div>
              <div title={source.error ?? ''}>错误信息：{translateSourceError(source.error)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
