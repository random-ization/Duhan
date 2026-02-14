import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Loader2, Radio, Database, RefreshCw, Play } from 'lucide-react';
import { NEWS } from '../../utils/convexRefs';

type SourceItem = {
  key: string;
  name: string;
  type: 'rss' | 'api';
  endpoint: string;
  pollMinutes: number;
  enabled: boolean;
};

type ProjectionStats = {
  courseId: string;
  recentActiveCount: number;
  projectedCount: number;
  pendingCount: number;
};

type SourceHealthItem = {
  sourceKey: string;
  name: string;
  enabled: boolean;
  pollMinutes: number;
  degradeThreshold: number;
  totalRuns: number;
  totalFailures: number;
  consecutiveFailures: number;
  degraded: boolean;
  degradedSince?: number;
  lastRunAt?: number;
  lastStatus?: string;
  lastError?: string;
  lastSuccessAt?: number;
};

const NewsPipelinePanel: React.FC = () => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [allLoading, setAllLoading] = useState(false);

  const sources = useQuery(NEWS.listSources) as SourceItem[] | undefined;
  const sourceHealth = useQuery(NEWS.getSourceHealth) as SourceHealthItem[] | undefined;
  const projectionStats = useQuery(NEWS.getProjectionStats, {}) as ProjectionStats | undefined;

  const triggerSource = useMutation(NEWS.triggerSource);
  const triggerAllSources = useMutation(NEWS.triggerAllSources);
  const triggerProjection = useMutation(NEWS.triggerProjection);

  const onTriggerSource = async (sourceKey: string) => {
    setLoadingKey(sourceKey);
    try {
      await triggerSource({ sourceKey });
    } finally {
      setLoadingKey(null);
    }
  };

  const onTriggerAll = async () => {
    setAllLoading(true);
    try {
      await triggerAllSources({});
    } finally {
      setAllLoading(false);
    }
  };

  const onTriggerProjection = async () => {
    setProjectionLoading(true);
    try {
      await triggerProjection({ limit: 120 });
    } finally {
      setProjectionLoading(false);
    }
  };

  const loading =
    sources === undefined || projectionStats === undefined || sourceHealth === undefined;
  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-zinc-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        加载新闻管线状态...
      </div>
    );
  }

  const healthMap = new Map((sourceHealth || []).map(item => [item.sourceKey, item]));
  const degradedSources = (sourceHealth || []).filter(item => item.degraded);

  return (
    <div className="p-6 space-y-6">
      {degradedSources.length > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          检测到 {degradedSources.length} 个数据源连续失败超过阈值（12
          次），请优先检查网络、源站可用性和选择器。
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black">新闻数据管线（MVP）</h3>
          <p className="text-sm text-zinc-500">
            手动触发抓取与投影，目标课程：`{projectionStats?.courseId || 'news_ko_mvp'}`
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerAll}
            disabled={allLoading}
            className="px-3 py-2 rounded-lg border-2 border-zinc-900 text-sm font-bold hover:bg-zinc-100 disabled:opacity-50 flex items-center gap-2"
          >
            {allLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Radio className="w-4 h-4" />
            )}
            全源抓取
          </button>
          <button
            onClick={onTriggerProjection}
            disabled={projectionLoading}
            className="px-3 py-2 rounded-lg border-2 border-zinc-900 bg-lime-300 text-sm font-bold hover:bg-lime-400 disabled:opacity-50 flex items-center gap-2"
          >
            {projectionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            执行投影
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border-2 border-zinc-900 p-4 bg-white">
          <div className="text-xs text-zinc-500">最近 active 新闻</div>
          <div className="text-2xl font-black">{projectionStats.recentActiveCount}</div>
        </div>
        <div className="rounded-xl border-2 border-zinc-900 p-4 bg-white">
          <div className="text-xs text-zinc-500">已投影</div>
          <div className="text-2xl font-black text-emerald-600">
            {projectionStats.projectedCount}
          </div>
        </div>
        <div className="rounded-xl border-2 border-zinc-900 p-4 bg-white">
          <div className="text-xs text-zinc-500">待投影</div>
          <div className="text-2xl font-black text-amber-600">{projectionStats.pendingCount}</div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-zinc-900 overflow-hidden bg-white">
        <div className="px-4 py-3 border-b-2 border-zinc-900 flex items-center justify-between">
          <div className="font-black">数据源</div>
          <div className="text-xs text-zinc-500 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            实时状态由 Convex Query 刷新
          </div>
        </div>
        <div className="divide-y divide-zinc-200">
          {(sources || []).map(source => (
            <div key={source.key} className="px-4 py-3 flex items-center justify-between gap-4">
              {(() => {
                const health = healthMap.get(source.key);
                const statusLabel = health?.lastStatus || 'unknown';
                const statusClass =
                  statusLabel === 'ok'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : statusLabel === 'partial'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-red-100 text-red-700 border-red-200';
                return (
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{source.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {source.type}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded border ${
                          source.enabled
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                        }`}
                      >
                        {source.enabled ? 'enabled' : 'disabled'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${statusClass}`}>
                        {statusLabel}
                      </span>
                      {health?.degraded && (
                        <span className="text-xs px-1.5 py-0.5 rounded border bg-red-100 text-red-700 border-red-200">
                          degraded
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 truncate">
                      每 {source.pollMinutes} 分钟 | 连续失败 {health?.consecutiveFailures ?? 0}/
                      {health?.degradeThreshold ?? 12} | 最近运行{' '}
                      {health?.lastRunAt ? new Date(health.lastRunAt).toLocaleString() : '-'}
                    </div>
                    {health?.lastError && health.lastStatus !== 'ok' && (
                      <div className="text-xs text-red-600 mt-1 truncate">
                        错误：{health.lastError}
                      </div>
                    )}
                  </div>
                );
              })()}
              <button
                onClick={() => onTriggerSource(source.key)}
                disabled={!source.enabled || loadingKey === source.key}
                className="px-3 py-2 rounded-lg border-2 border-zinc-900 text-sm font-bold hover:bg-zinc-100 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingKey === source.key ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                抓取
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsPipelinePanel;
