import React, { useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { FileText, Loader2, Save } from 'lucide-react';
import { mRef, qRef } from '../../utils/convexRefs';

type DocType = 'terms' | 'privacy' | 'refund';

const LegalDocumentEditor: React.FC = () => {
  const [docType, setDocType] = useState<DocType>('terms');
  const [status, setStatus] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const doc = useQuery(
    qRef<{ type: DocType }, { title?: string; content?: string } | null>('legal:getDocument'),
    { type: docType }
  );
  const saveDocument = useMutation(
    mRef<{ type: DocType; title: string; content: string }, unknown>('legal:saveDocument')
  );

  const handleSave = async () => {
    setStatus(null);
    try {
      const title = titleRef.current?.value ?? '';
      const content = contentRef.current?.value ?? '';
      await saveDocument({ type: docType, title: title || '', content });
      setStatus('已保存并同步到 Convex 数据库');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`错误: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">法律文档管理</h2>
          <p className="text-sm text-zinc-500">编辑并保存服务条款、隐私政策与退款政策</p>
        </div>
        <select
          value={docType}
          onChange={e => setDocType(e.target.value as DocType)}
          className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium"
        >
          <option value="terms">服务条款</option>
          <option value="privacy">隐私政策</option>
          <option value="refund">退款政策</option>
        </select>
      </div>

      {!doc ? (
        <div className="flex items-center justify-center py-10 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          正在加载文档...
        </div>
      ) : (
        <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <FileText className="w-4 h-4" />
            {doc.title || '未命名'}
          </div>

          <label className="space-y-1 text-sm font-medium text-zinc-700 block">
            标题
            <input
              key={`${docType}-${doc?.title ?? ''}`}
              ref={titleRef}
              defaultValue={doc.title || ''}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-zinc-700 block">
            正文 (支持 Markdown)
            <textarea
              key={`${docType}-${doc?.content ?? ''}`}
              ref={contentRef}
              defaultValue={doc.content || ''}
              rows={16}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 font-mono text-sm"
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存并发布
          </button>
        </div>
      )}

      {status && (
        <div className="px-4 py-3 rounded-xl border-2 border-zinc-900 bg-amber-50 text-sm text-zinc-800">
          {status}
        </div>
      )}
    </div>
  );
};

export default LegalDocumentEditor;
