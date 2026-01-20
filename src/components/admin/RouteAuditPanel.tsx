import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { ShieldCheck, Play, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { aRef } from '../../utils/convexRefs';

type CheckResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  durationMs: number;
  details?: unknown;
};

type AuditResult = {
  createdAt: number;
  limit: number;
  checks: Record<string, CheckResult>;
};

export default function RouteAuditPanel() {
  const runAudit = useAction(aRef<{ limit?: number }, AuditResult>('qa:runRouteAudit'));

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setErr(null);
    try {
      const res = await runAudit({ limit: 200 });
      setResult(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const checks = result?.checks ? Object.entries(result.checks) : [];

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">路由读写验收</h2>
            <p className="text-sm text-slate-500 font-medium">
              自动执行每个模块的“写入→回读→回滚/删除”自检（需要管理员）
            </p>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-700 font-bold transition-colors disabled:opacity-60"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? '运行中…' : '运行验收'}
        </button>
      </div>

      {err && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{err}</span>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-3">
          <div className="text-xs text-slate-500 font-bold">
            最近一次运行：{new Date(result.createdAt).toLocaleString()}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-black text-slate-700">模块</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-700">结果</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-700">耗时</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-700">错误</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checks.map(([name, c]) => {
                  const status = c.skipped ? 'SKIPPED' : c.ok ? 'PASS' : 'FAIL';
                  return (
                    <tr key={name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{name}</td>
                      <td className="px-4 py-3">
                        {status === 'PASS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        ) : status === 'SKIPPED' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-black">
                            SKIPPED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-black">
                            <AlertCircle className="w-3 h-3" /> FAIL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {c.durationMs}ms
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{c.error || '-'}</td>
                    </tr>
                  );
                })}
                {checks.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                      暂无结果
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
