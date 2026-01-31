import React from 'react';
import { Trash2, Loader2, ImageIcon } from 'lucide-react';
import {
  TopikQuestion,
  ExamSectionStructure,
  getQuestionConfig,
} from './TopikConstants';

interface QuestionRendererProps {
  q: TopikQuestion;
  examType: 'READING' | 'LISTENING';
  section: ExamSectionStructure;
  isGroupStart: boolean;
  isGrouped: boolean;
  uploadingItems: Set<string>;
  updateQuestion: (id: number, field: keyof TopikQuestion, value: any) => void;
  updateOption: (id: number, idx: number, value: string) => void;
  updateOptionImage: (id: number, idx: number, url: string) => void;
  handleFileUpload: (file: File, onSuccess: (url: string) => void, uploadKey: string) => Promise<void>;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  q,
  examType,
  section,
  isGroupStart,
  isGrouped,
  uploadingItems,
  updateQuestion,
  updateOption,
  updateOptionImage,
  handleFileUpload,
}) => {
  const qConfig = getQuestionConfig(q.id, examType);

  return (
    <div
      key={q.id}
      className="mb-8 p-4 rounded-xl hover:bg-zinc-50 transition-colors border-2 border-transparent hover:border-zinc-200"
    >
      <div className="flex gap-4">
        <span className="text-xl font-bold font-serif pt-1">{q.id}.</span>
        <div className="flex-1 space-y-4">
          {/* 1-4题: 问题即文段（可编辑） */}
          {qConfig?.uiType === 'FILL_QUESTION' && (
            <textarea
              className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-20"
              placeholder="输入句子（含填空或下划线）..."
              aria-label="输入句子（含填空或下划线）"
              value={q.question || ''}
              onChange={e => updateQuestion(q.id, 'question', e.target.value)}
            />
          )}

          {/* 5-8题: 仅图片 */}
          {qConfig?.uiType === 'IMAGE_REQUIRED' && (
            <div className="mb-2">
              {q.image ? (
                <div className="relative inline-block group/img">
                  <img src={q.image} className="max-h-48 border-2 border-zinc-200 rounded-lg" alt="Q" />
                  <button
                    onClick={() => updateQuestion(q.id, 'image', '')}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/img:opacity-100"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="cursor-pointer inline-flex items-center px-4 py-3 bg-blue-50 text-blue-600 text-sm rounded-lg border-2 border-blue-200 hover:border-blue-400"
                  onClick={() => document.getElementById(`file-input-${q.id}`)?.click()}
                  aria-label="Upload question image"
                >
                  {uploadingItems.has(`img-${q.id}`) ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4 mr-2" />
                  )}
                  上传图片 (必须)
                  <input
                    id={`file-input-${q.id}`}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleFileUpload(file, url => updateQuestion(q.id, 'image', url), `img-${q.id}`);
                    }}
                  />
                </button>
              )}
            </div>
          )}

          {/* 9-12题: 图片或文段 */}
          {qConfig?.uiType === 'IMAGE_OR_PASSAGE' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                {q.image ? (
                  <div className="relative inline-block group/img">
                    <img src={q.image} className="max-h-40 border-2 border-zinc-200 rounded-lg" alt="Q" />
                    <button
                      onClick={() => updateQuestion(q.id, 'image', '')}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/img:opacity-100"
                      aria-label="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 text-xs rounded-lg border-2 border-blue-200 hover:border-blue-400"
                    onClick={() => document.getElementById(`file-input-9-12-${q.id}`)?.click()}
                    aria-label="Upload image"
                  >
                    {uploadingItems.has(`img-${q.id}`) ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3 h-3 mr-1" />
                    )}
                    上传图片
                    <input
                      id={`file-input-9-12-${q.id}`}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleFileUpload(file, url => updateQuestion(q.id, 'image', url), `img-${q.id}`);
                      }}
                    />
                  </button>
                )}
              </div>
              <textarea
                className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-24"
                placeholder="或输入阅读文段..."
                aria-label="或输入阅读文段"
                value={q.passage || ''}
                onChange={e => updateQuestion(q.id, 'passage', e.target.value)}
              />
            </div>
          )}

          {/* 13-15题: 排序题 */}
          {qConfig?.uiType === 'ORDERING' && (
            <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">
                보기
              </span>
              <textarea
                className="w-full bg-white p-2 text-[15px] resize-none outline-none h-24"
                placeholder="输入排序内容 (가), (나), (다), (라)..."
                aria-label="输入排序内容"
                value={q.contextBox || ''}
                onChange={e => updateQuestion(q.id, 'contextBox', e.target.value)}
              />
            </div>
          )}

          {/* 16-18, 25-38题: 仅文段 (非分组) */}
          {qConfig?.uiType === 'PASSAGE_ONLY' && (
            <textarea
              className={`w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 ${section.style === 'HEADLINE' ? 'font-bold border-zinc-800 shadow-[3px_3px_0px_#000] h-24' : 'h-32'}`}
              placeholder={section.style === 'HEADLINE' ? '输入新闻标题...' : '输入阅读文段...'}
              aria-label={section.style === 'HEADLINE' ? '输入新闻标题' : '输入阅读文段'}
              value={q.passage || ''}
              onChange={e => updateQuestion(q.id, 'passage', e.target.value)}
            />
          )}

          {/* 39-41题: 句子插入 (非分组) */}
          {qConfig?.uiType === 'INSERT_SENTENCE' && !qConfig?.grouped && (
            <div className="space-y-4">
              <textarea
                className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-40"
                placeholder="输入主文段 (含 ㉠ ㉡ ㉢ ㉣ 标记)..."
                aria-label="输入主文段"
                value={q.passage || ''}
                onChange={e => updateQuestion(q.id, 'passage', e.target.value)}
              />
              <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">
                  &lt;보 기&gt;
                </span>
                <textarea
                  className="w-full bg-white p-2 text-[15px] resize-none outline-none h-16"
                  placeholder="输入要插入的句子..."
                  aria-label="输入要插入的句子"
                  value={q.contextBox || ''}
                  onChange={e => updateQuestion(q.id, 'contextBox', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 46题: 分组的句子插入 - 只显示보기框 */}
          {qConfig?.uiType === 'INSERT_SENTENCE' && qConfig?.grouped && (
            <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">
                &lt;보 기&gt;
              </span>
              <textarea
                className="w-full bg-white p-2 text-[15px] resize-none outline-none h-16"
                placeholder="输入要插入的句子..."
                aria-label="输入要插入的句子"
                value={q.contextBox || ''}
                onChange={e => updateQuestion(q.id, 'contextBox', e.target.value)}
              />
            </div>
          )}

          {/* 分组题 - 只有第一题显示文段输入 */}
          {qConfig?.uiType === 'GROUPED' && isGroupStart && !isGrouped && (
            <div className="space-y-4">
              <textarea
                className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-48"
                placeholder="输入共享阅读文段..."
                aria-label="输入共享阅读文段"
                value={q.passage || ''}
                onChange={e => updateQuestion(q.id, 'passage', e.target.value)}
              />
              {qConfig?.needsContextBox && (
                <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">
                    &lt;보 기&gt;
                  </span>
                  <textarea
                    className="w-full bg-white p-2 text-[15px] resize-none outline-none h-16"
                    placeholder="输入要插入的句子..."
                    aria-label="输入要插入的句子"
                    value={q.contextBox || ''}
                    onChange={e => updateQuestion(q.id, 'contextBox', e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* 可编辑问题输入框 (19-24, 47等) */}
          {qConfig?.needsQuestionInput && (
            <input
              className="w-full font-bold text-[17px] bg-white border-b-2 border-zinc-200 hover:border-zinc-400 focus:border-zinc-900 outline-none py-2"
              placeholder="输入问题..."
              aria-label="输入问题"
              value={q.question || ''}
              onChange={e => updateQuestion(q.id, 'question', e.target.value)}
            />
          )}

          {/* 固定问题文字显示 (非可编辑) */}
          {qConfig?.question && !qConfig?.needsQuestionInput && (
            <div className="font-bold text-[17px] text-zinc-700 py-2 border-b border-zinc-200">
              {qConfig.question}
            </div>
          )}

          {/* 听力题目 - 允许编辑问题文本（当没有特定配置时） */}
          {!qConfig && examType === 'LISTENING' && (
            <input
              className="w-full font-bold text-[17px] bg-white border-b-2 border-zinc-200 hover:border-zinc-400 focus:border-zinc-900 outline-none py-2"
              placeholder="输入问题..."
              aria-label="输入问题"
              value={q.question || ''}
              onChange={e => updateQuestion(q.id, 'question', e.target.value)}
            />
          )}

          {/* Options - 固定选项 (39-41, 46题: ㉠㉡㉢㉣) */}
          {qConfig?.fixedOptions && section.type !== 'IMAGE_CHOICE' && (
            <div className="grid grid-cols-4 gap-3">
              {qConfig.fixedOptions.map((opt, oIdx) => (
                <button
                  key={opt}
                  onClick={() => updateQuestion(q.id, 'correctAnswer', oIdx)}
                  className={`py-3 px-4 rounded-lg border-2 text-lg font-bold transition-colors ${q.correctAnswer === oIdx ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-300 text-zinc-600 hover:border-zinc-600'}`}
                  aria-label={`Select option ${oIdx + 1}: ${opt}`}
                  aria-pressed={q.correctAnswer === oIdx}
                >
                  {oIdx + 1} {opt}
                </button>
              ))}
            </div>
          )}

          {/* Options - 可编辑文本选项 */}
          {!qConfig?.fixedOptions && section.type !== 'IMAGE_CHOICE' && (
            <div
              className={`grid ${q.options.some(o => o.length > 25) ? 'grid-cols-1' : 'grid-cols-2'} gap-x-8 gap-y-2`}
            >
              {q.options.map((opt, oIdx) => (
                <div key={`opt-${q.id}-${oIdx}`} className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuestion(q.id, 'correctAnswer', oIdx)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-sans transition-colors ${q.correctAnswer === oIdx ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-400 hover:border-zinc-600'}`}
                    aria-label={`Mark option ${oIdx + 1} as correct`}
                    aria-pressed={q.correctAnswer === oIdx}
                  >
                    {oIdx + 1}
                  </button>
                  <input
                    className="flex-1 bg-white border-b-2 border-transparent hover:border-zinc-200 focus:border-zinc-900 outline-none text-[16px] py-1"
                    value={opt}
                    onChange={e => updateOption(q.id, oIdx, e.target.value)}
                    placeholder={`选项 ${oIdx + 1}`}
                    aria-label={`选项 ${oIdx + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Options - 图片选项 (听力1-3题) */}
          {section.type === 'IMAGE_CHOICE' && (
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map(optIdx => {
                const img = q.optionImages?.[optIdx];
                return (
                  <div key={`img-opt-${q.id}-${optIdx}`} className="flex flex-col items-center gap-2">
                    <div className="relative w-full aspect-[4/3] group/optImg">
                      {/* Image Area / Upload Area */}
                      <div
                        className={`w-full h-full border-2 rounded-lg flex flex-col items-center justify-center overflow-hidden transition-all ${
                          q.correctAnswer === optIdx
                            ? 'border-zinc-900 ring-2 ring-lime-300'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {img ? (
                          <img
                            src={img}
                            className="w-full h-full object-contain"
                            alt={`Option ${optIdx + 1}`}
                          />
                        ) : (
                          <button
                            type="button"
                            className="flex flex-col items-center text-zinc-400 cursor-pointer w-full h-full justify-center hover:bg-zinc-50 transition-colors border-none bg-transparent"
                            onClick={() => document.getElementById(`file-input-opt-${q.id}-${optIdx}`)?.click()}
                          >
                            {uploadingItems.has(`opt-${q.id}-${optIdx}`) ? (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                              <ImageIcon className="w-8 h-8 mb-2" />
                            )}
                            <span className="text-xs font-bold">上传选项 {optIdx + 1}</span>
                          </button>
                        )}
                      </div>

                      {/* Correct Answer Selection Button (Top Left) */}
                      <button
                        type="button"
                        onClick={() => updateQuestion(q.id, 'correctAnswer', optIdx)}
                        className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm border-2 ${
                          q.correctAnswer === optIdx
                            ? 'bg-zinc-900 text-white border-zinc-900 scale-110'
                            : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-900 hover:text-zinc-900'
                        }`}
                        aria-label={`Select as correct answer`}
                        aria-pressed={q.correctAnswer === optIdx}
                      >
                        {optIdx + 1}
                      </button>

                      {/* Remove Image Button (Top Right, only if img exists) */}
                      {img && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover/optImg:opacity-100 transition-opacity">
                          <button
                            type="button"
                            className="p-1.5 bg-white border-2 border-zinc-900 rounded-full text-red-500 hover:bg-red-50 shadow-[1px_1px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
                            onClick={e => {
                              e.stopPropagation();
                              updateOptionImage(q.id, optIdx, '');
                            }}
                            aria-label="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <input
                        id={`file-input-opt-${q.id}-${optIdx}`}
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          handleFileUpload(
                            file,
                            url => updateOptionImage(q.id, optIdx, url),
                            `opt-${q.id}-${optIdx}`
                          );
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
