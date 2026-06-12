import { formatBuildTime } from '../lib/time';

interface AppHeaderProps {
  lastBuildAt?: string;
  topicCount: number;
}

export function AppHeader({ lastBuildAt, topicCount }: AppHeaderProps) {
  return (
    <header className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">世界杯海外话题线索雷达</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            聚合海外体育媒体、论坛讨论与趋势信号，按赛程、球队和球员整理世界杯相关话题线索，帮助你快速了解不同地区正在讨论什么。
          </p>
          <p className="mt-3 text-xs tracking-[0.18em] text-cyan-300/80">海外公开信源观察中</p>
        </div>

        <div className="grid gap-3 text-sm text-slate-300 md:text-right">
          <div>
            <div className="text-xs tracking-[0.2em] text-slate-400">最近更新</div>
            <div className="mt-1 font-medium text-white">{formatBuildTime(lastBuildAt)}</div>
          </div>
          <div>
            <div className="text-xs tracking-[0.2em] text-slate-400">当前线索</div>
            <div className="mt-1 font-medium text-white">{topicCount}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
