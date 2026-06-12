import { useState } from 'react';
import { formatMatchOption, SOURCE_TYPE_LABELS } from '../lib/presentation';
import type { FilterState, Match, SourceType, UiRegion } from '../lib/types';

interface FilterBarProps {
  filters: FilterState;
  matches: Match[];
  regions: UiRegion[];
  platforms: SourceType[];
  onChange: (next: FilterState) => void;
}

const timeOptions: Array<{ label: string; value: FilterState['timeWindow'] }> = [
  { label: '近1小时', value: '1h' },
  { label: '近6小时', value: '6h' },
  { label: '近24小时', value: '24h' },
  { label: '近72小时', value: '72h' },
  { label: '全部', value: 'all' },
];

export function FilterBar({ filters, matches, regions, platforms, onChange }: FilterBarProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">筛选条件</h2>
          <p className="text-sm text-slate-400">按区域、来源类型、比赛和时间范围查看海外话题线索。</p>
        </div>
        <button
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 md:hidden"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? '展开筛选' : '收起筛选'}
        </button>
      </div>

      <div className={`${collapsed ? 'hidden' : 'grid'} gap-4 md:grid md:grid-cols-2 xl:grid-cols-4`}>
        <Select
          label="区域"
          value={filters.region}
          options={['全部', ...regions]}
          onChange={(region) => onChange({ ...filters, region: region as FilterState['region'] })}
        />
        <Select
          label="来源类型"
          value={filters.platform}
          options={['全部', ...platforms]}
          renderOption={(value) => (value === '全部' ? '全部' : SOURCE_TYPE_LABELS[value as SourceType])}
          onChange={(platform) => onChange({ ...filters, platform: platform as FilterState['platform'] })}
        />
        <Select
          label="比赛"
          value={filters.match}
          options={['全部', ...matches.map((match) => match.match_id)]}
          renderOption={(value) =>
            value === '全部' ? '全部比赛' : formatMatchOption(matches.find((match) => match.match_id === value)!)
          }
          onChange={(match) => onChange({ ...filters, match: match as FilterState['match'] })}
        />
        <Select
          label="时间范围"
          value={filters.timeWindow}
          options={timeOptions.map((option) => option.value)}
          renderOption={(value) => timeOptions.find((option) => option.value === value)?.label ?? value}
          onChange={(timeWindow) => onChange({ ...filters, timeWindow: timeWindow as FilterState['timeWindow'] })}
        />
      </div>
    </section>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  renderOption?: (value: string) => string;
}

function Select({ label, value, options, onChange, renderOption }: SelectProps) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span className="text-xs tracking-[0.2em] text-slate-400">{label}</span>
      <select
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {renderOption?.(option) ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
