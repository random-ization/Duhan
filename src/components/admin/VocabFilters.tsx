import React from 'react';

interface VocabFiltersProps {
  meaningFilter: 'all' | 'filled' | 'empty';
  setMeaningFilter: (filter: 'all' | 'filled' | 'empty') => void;
  posFilter: string;
  setPosFilter: (pos: string) => void;
  posOptions: string[];
  unitFrom: string;
  setUnitFrom: (val: string) => void;
  unitTo: string;
  setUnitTo: (val: string) => void;
  filteredCount: number;
}

const VocabFilters: React.FC<VocabFiltersProps> = ({
  meaningFilter,
  setMeaningFilter,
  posFilter,
  setPosFilter,
  posOptions,
  unitFrom,
  setUnitFrom,
  unitTo,
  setUnitTo,
  filteredCount,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
      <span className="text-xs font-bold text-zinc-500 uppercase">筛选：</span>

      <div className="flex items-center gap-1 bg-white rounded-lg border border-zinc-200 p-0.5">
        <button
          onClick={() => setMeaningFilter('all')}
          className={`px-2 py-1 text-xs font-medium rounded ${meaningFilter === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
          aria-label="显示全部"
        >
          全部
        </button>
        <button
          onClick={() => setMeaningFilter('filled')}
          className={`px-2 py-1 text-xs font-medium rounded ${meaningFilter === 'filled' ? 'bg-emerald-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
          aria-label="显示已填充释义"
        >
          已填充
        </button>
        <button
          onClick={() => setMeaningFilter('empty')}
          className={`px-2 py-1 text-xs font-medium rounded ${meaningFilter === 'empty' ? 'bg-amber-500 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
          aria-label="显示未填充释义"
        >
          未填充
        </button>
      </div>

      <select
        value={posFilter}
        onChange={e => setPosFilter(e.target.value)}
        className="px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium"
        aria-label="按词性筛选"
      >
        <option value="ALL">全部词性</option>
        {posOptions.map(pos => (
          <option key={pos} value={pos}>
            {pos}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 text-xs">
        <span className="text-zinc-500">课数：</span>
        <input
          type="number"
          value={unitFrom}
          onChange={e => setUnitFrom(e.target.value)}
          placeholder="从"
          className="w-14 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
          aria-label="起始课数"
        />
        <span className="text-zinc-400">-</span>
        <input
          type="number"
          value={unitTo}
          onChange={e => setUnitTo(e.target.value)}
          placeholder="到"
          className="w-14 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
          aria-label="结束课数"
        />
      </div>

      <span className="ml-auto text-xs text-zinc-500">
        筛选结果：<span className="font-bold text-zinc-900">{filteredCount}</span> 条
      </span>
    </div>
  );
};

export default VocabFilters;
