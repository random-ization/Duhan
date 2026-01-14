import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FileText, Loader2, Save } from "lucide-react";

type DocType = "terms" | "privacy" | "refund";

const LegalDocumentEditor: React.FC = () => {
  const [docType, setDocType] = useState<DocType>("terms");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const doc = useQuery(api.legal.getDocument, { type: docType });
  const saveDocument = useMutation(api.legal.saveDocument);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || "");
      setContent(doc.content || "");
    }
  }, [doc]);

  const handleSave = async () => {
    setStatus(null);
    try {
      const token = localStorage.getItem("token") || undefined;
      if (!token) {
        setStatus("错误: 未检测到登录凭证，请先登录后再访问管理后台");
        return;
      }
      await saveDocument({ type: docType, title: title || "", content, token });
      setStatus("已保存并同步到 Convex 数据库");
    } catch (error: any) {
      const errorCode = error?.data?.code || "";
      const errorMessage = error?.data?.message || error?.message || "保存失败";
      setStatus(`错误 [${errorCode}]: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">法律文档管理</h2>
          <p className="text-sm text-zinc-500">
            编辑并保存服务条款、隐私政策与退款政策
          </p>
        </div>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocType)}
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
            {doc.title || "未命名"}
          </div>

          <label className="space-y-1 text-sm font-medium text-zinc-700 block">
            标题
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-zinc-700 block">
            正文 (支持 Markdown)
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
