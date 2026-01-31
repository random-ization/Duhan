import React from 'react';
import { FileText, Mic, Upload, Loader2, RefreshCw, Save } from 'lucide-react';

export interface UnitContent {
  id?: string; // Convex ID
  unitIndex: number;
  articleIndex: number;
  title: string;
  readingText: string;
  translation: string; // Chinese
  translationEn: string; // English
  translationVi: string; // Vietnamese
  translationMn: string; // Mongolian
  audioUrl: string;
  hasAnalysis?: boolean;
  analysisData?: unknown;
  transcriptData?: unknown;
  _id?: string; // Add internal Convex ID
}

interface ReadingEditorProps {
  editingUnit: UnitContent;
  setEditingUnit: React.Dispatch<React.SetStateAction<UnitContent | null>>;
  availableArticles: UnitContent[];
  onSwitchArticle: (index: number) => void;
  onAddNewArticle: () => void;
  onReanalyze: () => void;
  onSave: () => void;
  saving: boolean;
  analyzing: boolean;
  audioUploading: boolean;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ReadingEditor: React.FC<ReadingEditorProps> = ({
  editingUnit,
  setEditingUnit,
  availableArticles,
  onSwitchArticle,
  onAddNewArticle,
  onReanalyze,
  onSave,
  saving,
  analyzing,
  audioUploading,
  onAudioUpload,
}) => {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header: Article Tabs */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex gap-2">
          {availableArticles.map(a => (
            <button
              key={a._id ?? String(a.articleIndex ?? 0)}
              type="button"
              onClick={() => onSwitchArticle(a.articleIndex || 1)}
              className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                editingUnit.articleIndex === (a.articleIndex || 1)
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
              }`}
              aria-label={`切换到文章 ${a.articleIndex || 1}`}
            >
              文章 {a.articleIndex || 1}
            </button>
          ))}
          <button
            type="button"
            onClick={onAddNewArticle}
            className="px-3 py-1 rounded-full text-xs font-bold border-2 border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900"
            aria-label="添加新文章"
          >
            + 添加文章
          </button>
        </div>
        <div className="text-xs text-zinc-400">
          正在编辑：第 {editingUnit.unitIndex} 课 - 文章 {editingUnit.articleIndex}
        </div>
      </div>

      {/* Fields */}
      <div className="flex gap-4">
        <div className="w-24">
          <label htmlFor="unit-index" className="block text-xs font-bold mb-1">
            课号
          </label>
          <input
            id="unit-index"
            type="number"
            className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
            value={editingUnit.unitIndex}
            onChange={e =>
              setEditingUnit({ ...editingUnit, unitIndex: Number.parseInt(e.target.value, 10) || 1 })
            }
            aria-label="课号"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="unit-title" className="block text-xs font-bold mb-1">
            标题
          </label>
          <input
            id="unit-title"
            type="text"
            className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
            value={editingUnit.title}
            onChange={e => setEditingUnit({ ...editingUnit, title: e.target.value })}
            placeholder="例如：自我介绍"
            aria-label="标题"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reading-text" className="block text-xs font-bold mb-1 flex items-center gap-2">
          <FileText size={14} /> 韩语正文
        </label>
        <textarea
          id="reading-text"
          className="w-full h-64 p-4 border-2 border-zinc-900 rounded-lg font-serif text-lg leading-loose resize-none focus:shadow-[4px_4px_0px_0px_#18181B] transition-all outline-none"
          value={editingUnit.readingText}
          onChange={e => setEditingUnit({ ...editingUnit, readingText: e.target.value })}
          placeholder="在此粘贴韩语文章..."
          aria-label="韩语正文"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="translation-zh" className="block text-xs font-bold mb-1">
            中文翻译
          </label>
          <textarea
            id="translation-zh"
            className="w-full h-28 p-3 border-2 border-zinc-900 rounded-lg resize-none text-sm"
            value={editingUnit.translation}
            onChange={e => setEditingUnit({ ...editingUnit, translation: e.target.value })}
            placeholder="输入中文翻译..."
            aria-label="中文翻译"
          />
        </div>
        <div>
          <label htmlFor="translation-en" className="block text-xs font-bold mb-1">
            English Translation
          </label>
          <textarea
            id="translation-en"
            className="w-full h-28 p-3 border-2 border-zinc-900 rounded-lg resize-none text-sm"
            value={editingUnit.translationEn}
            onChange={e => setEditingUnit({ ...editingUnit, translationEn: e.target.value })}
            placeholder="Enter English translation..."
            aria-label="English Translation"
          />
        </div>
        <div>
          <label htmlFor="translation-vi" className="block text-xs font-bold mb-1">
            Bản dịch tiếng Việt
          </label>
          <textarea
            id="translation-vi"
            className="w-full h-28 p-3 border-2 border-zinc-900 rounded-lg resize-none text-sm"
            value={editingUnit.translationVi}
            onChange={e => setEditingUnit({ ...editingUnit, translationVi: e.target.value })}
            placeholder="Nhập bản dịch tiếng Việt..."
            aria-label="Bản dịch tiếng Việt"
          />
        </div>
        <div>
          <label htmlFor="translation-mn" className="block text-xs font-bold mb-1">
            Монгол орчуулга
          </label>
          <textarea
            id="translation-mn"
            className="w-full h-28 p-3 border-2 border-zinc-900 rounded-lg resize-none text-sm"
            value={editingUnit.translationMn}
            onChange={e => setEditingUnit({ ...editingUnit, translationMn: e.target.value })}
            placeholder="Монгол орчуулга оруулна уу..."
            aria-label="Монгол орчуулга"
          />
        </div>
      </div>

      <div>
        <label htmlFor="audio-url" className="block text-xs font-bold mb-1 flex items-center gap-2">
          <Mic size={14} /> 音频文件
        </label>
        <div className="flex gap-2 items-center">
          <input
            id="audio-url"
            type="text"
            className="flex-1 p-3 border-2 border-zinc-900 rounded-lg font-mono text-xs bg-zinc-50"
            value={editingUnit.audioUrl}
            onChange={e => setEditingUnit({ ...editingUnit, audioUrl: e.target.value })}
            placeholder="音频URL（可直接输入或上传文件）"
            readOnly={audioUploading}
            aria-label="音频URL"
          />
          <label className="relative">
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.ogg"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={audioUploading}
              onChange={onAudioUpload}
              aria-label="上传音频文件"
            />
            <span
              className={`px-4 py-3 rounded-lg font-bold text-sm flex items-center gap-2 border-2 border-zinc-900 transition-colors ${audioUploading ? 'bg-zinc-200 cursor-wait' : 'bg-lime-300 hover:bg-lime-400 cursor-pointer'}`}
            >
              {audioUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              上传
            </span>
          </label>
        </div>
      </div>

      <div className="pt-4 flex justify-between items-center">
        <div>
          <button
            type="button"
            onClick={onReanalyze}
            disabled={analyzing || !editingUnit.readingText}
            className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-50 disabled:opacity-50"
            aria-label="重新分析 AI"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            重新分析 AI
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setEditingUnit(null)}
            className="px-6 py-2 border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-100"
            aria-label="取消"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !editingUnit.title}
            className="px-8 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center gap-2 hover:bg-lime-400 shadow-[4px_4px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
            aria-label="保存并分析"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
            保存并分析
          </button>
        </div>
      </div>
    </div>
  );
};
