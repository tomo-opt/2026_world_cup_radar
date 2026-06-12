import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { estimateMatchStatus, getMatchDisplayTime } from '../lib/time';
import type { Match } from '../lib/types';

interface MatchTimelineProps {
  matches: Match[];
  selectedMatch: string;
  onSelectMatch: (matchId: string) => void;
}

export function MatchTimeline({ matches, selectedMatch, onSelectMatch }: MatchTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleMatches = useMemo(() => {
    if (showAll) return matches;
    const now = Date.now();
    const upcoming = matches.filter((match) => new Date(match.kickoff_utc).getTime() >= now);
    return (upcoming.length > 0 ? upcoming : matches).slice(0, 8);
  }, [matches, showAll]);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">重点赛程时间轴</h2>
          <p className="text-sm text-slate-400">默认显示近期比赛，可展开查看全部赛程。</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400 hover:text-white"
            onClick={() => onSelectMatch('全部')}
          >
            全部比赛
          </button>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400 hover:text-white"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? '收起赛程' : '查看全部赛程'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleMatches.map((match) => {
          const active = selectedMatch === match.match_id;
          const status = estimateMatchStatus(match);

          return (
            <button
              key={match.match_id}
              onClick={() => onSelectMatch(match.match_id)}
              className={clsx(
                'rounded-2xl border p-4 text-left transition',
                active
                  ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-900/20'
                  : 'border-white/8 bg-slate-950/40 hover:border-white/20 hover:bg-slate-950/70',
              )}
              title={status.note}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{match.display_matchup}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {match.round}
                    {match.group ? ` · ${match.group}` : ''}
                  </div>
                </div>
                <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] tracking-[0.2em] text-cyan-200">
                  {status.label}
                </span>
              </div>
              <div className="mt-4 text-sm text-slate-300">{getMatchDisplayTime(match)}</div>
              <div className="mt-1 text-xs text-slate-500">{match.city || match.stadium || '待补充场地'}</div>
              <div className="mt-2 text-[11px] text-slate-500">状态按北京时间估算，非实时比分。</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
