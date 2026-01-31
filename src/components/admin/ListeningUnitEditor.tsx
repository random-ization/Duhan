import React from 'react';
import { Headphones, Music, Loader2, Upload, Save } from 'lucide-react';

export interface UnitListeningData {
  id?: string;
  unitIndex: number;
  title: string;
  audioUrl: string;
  transcriptData: unknown;
}

interface ListeningUnitEditorProps {
  editingUnit: UnitListeningData;
  setEditingUnit: React.Dispatch<React.SetStateAction<UnitListeningData | null>>;
  transcriptText: string;
  setTranscriptText: (text: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  saving: boolean;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ListeningUnitEditor: React.FC<ListeningUnitEditorProps> = ({
  editingUnit,
  setEditingUnit,
  transcriptText,
  setTranscriptText,
  fileInputRef,
  uploading,
  saving,
  onAudioUpload,
  onCancel,
  onSave,
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Headphones className="w-8 h-8 text-lime-600" />
        <h2 className="text-xl font-black">第 {editingUnit.unitIndex} 课 · 听力内容</h2>
      </div>
      <div>
        <label htmlFor="unit-title" className="block text-sm font-bold mb-2">
          标题 *
        </label>
        <input
          id="unit-title"
          type="text"
          className="w-full p-3 border-2 border-zinc-900 rounded-lg font-bold"
          value={editingUnit.title}
          onChange={e => setEditingUnit({ ...editingUnit, title: e.target.value })}
          aria-label="标题"
        />
      </div>
      <div>
        <label htmlFor="unit-audio-upload" className="block text-sm font-bold mb-2 flex items-center gap-2">
          <Music size={16} /> 音频文件
        </label>
        <input
          id="unit-audio-upload"
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={onAudioUpload}
          className="hidden"
          aria-label="上传音频文件"
        />
        {editingUnit.audioUrl ? (
          <div className="space-y-3">
            <div className="p-4 bg-lime-50 border-2 border-lime-200 rounded-lg">
              <audio controls src={editingUnit.audioUrl} className="w-full">
                <track kind="captions" />
                您的浏览器不支持音频元素。
              </audio>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 border-2 border-zinc-300 rounded-lg font-bold text-sm hover:bg-zinc-100 flex items-center gap-2"
              aria-label="替换音频"
            >
              {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload size={16} />}
              替换音频
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full p-6 border-2 border-dashed border-zinc-400 rounded-lg hover:bg-zinc-50 flex flex-col items-center justify-center gap-2"
            aria-label="点击上传音频"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin w-6 h-6 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-500">上传中...</span>
              </>
            ) : (
              <>
                <Upload size={24} className="text-zinc-400" />
                <span className="text-sm font-bold text-zinc-500">点击上传音频</span>
              </>
            )}
          </button>
        )}
      </div>
      <div>
        <label htmlFor="unit-transcript" className="block text-sm font-bold mb-2">
          时间戳文稿 (JSON)
        </label>
        <textarea
          id="unit-transcript"
          className="w-full h-64 p-4 border-2 border-zinc-900 rounded-lg font-mono text-xs"
          value={transcriptText}
          onChange={e => setTranscriptText(e.target.value)}
          placeholder="[{ start, end, text }...]"
          aria-label="时间戳文稿 (JSON)"
        />
      </div>
      <div className="pt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-100"
          aria-label="取消"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !editingUnit.title}
          className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center gap-2 hover:bg-lime-400 shadow-[2px_2px_0px_0px_#18181B]"
          aria-label="保存"
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={18} />} 保存
        </button>
      </div>
    </div>
  );
};
