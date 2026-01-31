import React from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface VocabEditModalProps {
  editingWord: any;
  editForm: any;
  setEditForm: (form: any) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

const VocabEditModal: React.FC<VocabEditModalProps> = ({
  editingWord,
  editForm,
  setEditForm,
  isSaving,
  onClose,
  onSave,
}) => {
  if (!editingWord) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h3 className="text-lg font-bold text-zinc-900">编辑词汇: {editingWord.word}</h3>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-zinc-100"
            aria-label="关闭对话框"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="vocab-word" className="block text-sm font-medium text-zinc-700 mb-1">韩语</label>
              <input
                id="vocab-word"
                value={editForm.word || ''}
                onChange={e => setEditForm({ ...editForm, word: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                aria-label="韩语单词"
              />
            </div>
            <div>
              <label htmlFor="vocab-pos" className="block text-sm font-medium text-zinc-700 mb-1">词性</label>
              <input
                id="vocab-pos"
                value={editForm.partOfSpeech || ''}
                onChange={e => setEditForm({ ...editForm, partOfSpeech: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                aria-label="词性"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="vocab-unit" className="block text-sm font-medium text-zinc-700 mb-1">单元</label>
              <input
                id="vocab-unit"
                type="number"
                value={editForm.unitId ?? ''}
                onChange={e =>
                  setEditForm({
                    ...editForm,
                    unitId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                aria-label="单元编号"
              />
            </div>
          </div>
          <div className="border-t border-zinc-200 pt-4">
            <h4 className="text-sm font-bold text-zinc-800 mb-3">多语言释义</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="vocab-meaning-ch" className="block text-sm font-medium text-zinc-700 mb-1">
                  释义(CH) 中文
                </label>
                <input
                  id="vocab-meaning-ch"
                  value={editForm.meaning || ''}
                  onChange={e => setEditForm({ ...editForm, meaning: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  aria-label="中文释义"
                />
              </div>
              <div>
                <label htmlFor="vocab-meaning-en" className="block text-sm font-medium text-zinc-700 mb-1">
                  释义(EN) English
                </label>
                <input
                  id="vocab-meaning-en"
                  value={editForm.meaningEn || ''}
                  onChange={e => setEditForm({ ...editForm, meaningEn: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  aria-label="英文释义"
                />
              </div>
              <div>
                <label htmlFor="vocab-meaning-vi" className="block text-sm font-medium text-zinc-700 mb-1">
                  释义(VN) Tiếng Việt
                </label>
                <input
                  id="vocab-meaning-vi"
                  value={editForm.meaningVi || ''}
                  onChange={e => setEditForm({ ...editForm, meaningVi: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  aria-label="越南语释义"
                />
              </div>
              <div>
                <label htmlFor="vocab-meaning-mn" className="block text-sm font-medium text-zinc-700 mb-1">
                  释义(MN) Монгол
                </label>
                <input
                  id="vocab-meaning-mn"
                  value={editForm.meaningMn || ''}
                  onChange={e => setEditForm({ ...editForm, meaningMn: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  aria-label="蒙古语释义"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-200 pt-4">
            <h4 className="text-sm font-bold text-zinc-800 mb-3">例句</h4>
            <div className="space-y-3">
              <div>
                <label htmlFor="vocab-example" className="block text-sm font-medium text-zinc-700 mb-1">韩语例句</label>
                <textarea
                  id="vocab-example"
                  value={editForm.exampleSentence || ''}
                  onChange={e => setEditForm({ ...editForm, exampleSentence: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  rows={2}
                  aria-label="韩语例句"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vocab-example-ch" className="block text-sm font-medium text-zinc-700 mb-1">
                    例句翻译(CH)
                  </label>
                  <input
                    id="vocab-example-ch"
                    value={editForm.exampleMeaning || ''}
                    onChange={e => setEditForm({ ...editForm, exampleMeaning: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    aria-label="例句中文翻译"
                  />
                </div>
                <div>
                  <label htmlFor="vocab-example-en" className="block text-sm font-medium text-zinc-700 mb-1">
                    例句翻译(EN)
                  </label>
                  <input
                    id="vocab-example-en"
                    value={editForm.exampleMeaningEn || ''}
                    onChange={e =>
                      setEditForm({ ...editForm, exampleMeaningEn: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    aria-label="例句英文翻译"
                  />
                </div>
                <div>
                  <label htmlFor="vocab-example-vi" className="block text-sm font-medium text-zinc-700 mb-1">
                    例句翻译(VN)
                  </label>
                  <input
                    id="vocab-example-vi"
                    value={editForm.exampleMeaningVi || ''}
                    onChange={e =>
                      setEditForm({ ...editForm, exampleMeaningVi: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    aria-label="例句越南语翻译"
                  />
                </div>
                <div>
                  <label htmlFor="vocab-example-mn" className="block text-sm font-medium text-zinc-700 mb-1">
                    例句翻译(MN)
                  </label>
                  <input
                    id="vocab-example-mn"
                    value={editForm.exampleMeaningMn || ''}
                    onChange={e =>
                      setEditForm({ ...editForm, exampleMeaningMn: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    aria-label="例句蒙古语翻译"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            取消
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default VocabEditModal;
