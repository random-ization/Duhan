import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { CheckCircle2, ClipboardPaste, ImageIcon, Loader2, PenLine, Upload } from 'lucide-react';
import { mRef, TOPIK } from '../../utils/convexRefs';
import { useFileUpload } from '../../hooks/useFileUpload';
import { api } from '../../../convex/_generated/api';

type WritingQuestionType = 'FILL_BLANK' | 'GRAPH_ESSAY' | 'OPINION_ESSAY';

type WritingQuestionInput = {
  number: number;
  questionType: WritingQuestionType;
  instruction?: string;
  contextBox?: string;
  image?: string;
  score: number;
  modelAnswer?: string;
  gradingCriteria?: Record<string, unknown>;
};

type SaveWritingExamArgs = {
  id: string;
  title: string;
  round: number;
  timeLimit: number;
  description?: string;
  isPaid?: boolean;
  questions: WritingQuestionInput[];
};

type SaveWritingExamResult = {
  success: boolean;
  examId: string;
  questionCount: number;
};

type TopikExamMeta = {
  id: string;
  _id: string;
  title: string;
  round: number;
  type: string;
  timeLimit: number;
  description?: string;
  isPaid?: boolean;
};

const REQUIRED_IMAGE_QUESTIONS = [51, 53] as const;

const INITIAL_QUESTIONS: WritingQuestionInput[] = [
  { number: 51, questionType: 'FILL_BLANK', score: 10, instruction: '', contextBox: '', image: '' },
  { number: 52, questionType: 'FILL_BLANK', score: 10, instruction: '', contextBox: '', image: '' },
  { number: 53, questionType: 'GRAPH_ESSAY', score: 30, instruction: '', contextBox: '', image: '' },
  {
    number: 54,
    questionType: 'OPINION_ESSAY',
    score: 50,
    instruction: '',
    contextBox: '',
    image: '',
  },
];

function createNewLegacyId() {
  return `writing-exam-${Date.now()}`;
}

function normalizeQuestionType(type: string, number: number): WritingQuestionType {
  if (type === 'FILL_BLANK' || type === 'GRAPH_ESSAY' || type === 'OPINION_ESSAY') return type;
  if (number <= 52) return 'FILL_BLANK';
  if (number === 53) return 'GRAPH_ESSAY';
  return 'OPINION_ESSAY';
}

function buildQuestionInputsFromServer(
  serverQuestions: Array<{
    number: number;
    questionType: string;
    instruction?: string;
    contextBox?: string;
    image?: string;
    score: number;
    modelAnswer?: string;
  }>
): WritingQuestionInput[] {
  const numberToQuestion = new Map(serverQuestions.map(q => [q.number, q]));
  return INITIAL_QUESTIONS.map(base => {
    const server = numberToQuestion.get(base.number);
    if (!server) return { ...base };
    return {
      number: server.number,
      questionType: normalizeQuestionType(server.questionType, server.number),
      instruction: server.instruction || '',
      contextBox: server.contextBox || '',
      image: server.image || '',
      score: typeof server.score === 'number' ? server.score : base.score,
      modelAnswer: server.modelAnswer || '',
      gradingCriteria: undefined,
    };
  }).sort((a, b) => a.number - b.number);
}

function labelForQuestionType(type: WritingQuestionType) {
  if (type === 'FILL_BLANK') return '填空题';
  if (type === 'GRAPH_ESSAY') return '图表作文';
  return '论述作文';
}

function toInt(value: string, fallback = 0): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function isLikelyImageUrl(url: string): boolean {
  return /^https?:\/\/.+\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(url);
}

function toUploadReadyImageFile(questionNumber: number, sourceFile: File, sourceTag: string): File {
  const extension = sourceFile.type.split('/')[1] || 'png';
  return new File(
    [sourceFile],
    `q${questionNumber}-${sourceTag}-${Date.now()}.${extension}`,
    { type: sourceFile.type || 'image/png' }
  );
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1];
  const base64Data = match[2];
  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: contentType });
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('文件读取结果异常'));
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export const TopikWritingImporter: React.FC = () => {
  const saveWritingExam = useMutation(
    mRef<SaveWritingExamArgs, SaveWritingExamResult>('topikWriting:saveWritingExam')
  );
  const { uploadFile, uploading } = useFileUpload();
  const examsQuery = useQuery(TOPIK.getExams, {});

  const [legacyId, setLegacyId] = useState(createNewLegacyId());
  const [title, setTitle] = useState('TOPIK II 写作 - 新试卷');
  const [round, setRound] = useState(64);
  const [timeLimit, setTimeLimit] = useState(50);
  const [isPaid, setIsPaid] = useState(false);
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<WritingQuestionInput[]>(INITIAL_QUESTIONS);
  const [selectedExamDbId, setSelectedExamDbId] = useState('');
  const [uploadingImageQuestion, setUploadingImageQuestion] = useState<number | null>(null);
  const [questionStatus, setQuestionStatus] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const loadedExamIdRef = useRef<string | null>(null);

  const allExams = useMemo<TopikExamMeta[]>(() => {
    if (!examsQuery) return [];
    return (Array.isArray(examsQuery) ? examsQuery : examsQuery.page || []) as TopikExamMeta[];
  }, [examsQuery]);

  const writingExams = useMemo(
    () => allExams.filter(exam => exam.type === 'WRITING').sort((a, b) => b.round - a.round),
    [allExams]
  );

  const selectedExistingExam = useMemo(
    () => writingExams.find(exam => exam._id === selectedExamDbId) ?? null,
    [writingExams, selectedExamDbId]
  );

  const writingQuestions = useQuery(
    api.topikWriting.getWritingQuestions,
    selectedExistingExam ? { examId: selectedExistingExam._id as any } : 'skip'
  );

  const totalScore = useMemo(
    () => questions.reduce((acc, item) => acc + (item.score || 0), 0),
    [questions]
  );

  const updateQuestion = (questionNumber: number, updates: Partial<WritingQuestionInput>) => {
    setQuestions(prev =>
      prev.map(item => (item.number === questionNumber ? { ...item, ...updates } : item))
    );
  };

  const resetToNewForm = () => {
    loadedExamIdRef.current = null;
    setSelectedExamDbId('');
    setLegacyId(createNewLegacyId());
    setTitle('TOPIK II 写作 - 新试卷');
    setRound(64);
    setTimeLimit(50);
    setIsPaid(false);
    setDescription('');
    setQuestions(INITIAL_QUESTIONS.map(q => ({ ...q })));
    setQuestionStatus({});
    setStatus('已切换到新建写作试卷');
  };

  const setQuestionMessage = (questionNumber: number, message: string) => {
    setQuestionStatus(prev => ({ ...prev, [questionNumber]: message }));
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return '未知错误';
    }
  };

  const handleQuestionImageUpload = async (questionNumber: number, file: File) => {
    setUploadingImageQuestion(questionNumber);
    setQuestionMessage(questionNumber, `正在上传 Q${questionNumber} 图片...`);
    setStatus(`正在上传 Q${questionNumber} 图片...`);
    try {
      const { url } = await uploadFile(file, 'topik-writing');
      updateQuestion(questionNumber, { image: url });
      setQuestionMessage(questionNumber, `Q${questionNumber} 图片上传成功`);
      setStatus(`已上传 Q${questionNumber} 图片`);
    } catch (error) {
      const message = getErrorMessage(error);
      const isNetworkError =
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('Load failed');
      if (isNetworkError) {
        try {
          const dataUrl = await fileToDataUrl(file);
          updateQuestion(questionNumber, { image: dataUrl });
          setQuestionMessage(
            questionNumber,
            `Q${questionNumber} 外链上传失败，已自动转为内嵌图片保存`
          );
          setStatus(
            `Q${questionNumber} 外链上传失败（${message}），已自动转为内嵌图片保存`
          );
        } catch (fallbackError) {
          const fallbackMessage = getErrorMessage(fallbackError);
          setQuestionMessage(
            questionNumber,
            `Q${questionNumber} 图片上传失败：${message}；兜底失败：${fallbackMessage}`
          );
          setStatus(
            `Q${questionNumber} 图片上传失败：${message}；兜底失败：${fallbackMessage}`
          );
        }
      } else {
        setQuestionMessage(questionNumber, `Q${questionNumber} 图片上传失败：${message}`);
        setStatus(`Q${questionNumber} 图片上传失败：${message}`);
      }
    } finally {
      setUploadingImageQuestion(null);
    }
  };

  const getClipboardImageFile = (clipboardData: DataTransfer): File | null => {
    const fileFromFiles = Array.from(clipboardData.files).find(file =>
      file.type.startsWith('image/')
    );
    if (fileFromFiles) return fileFromFiles;

    const item = Array.from(clipboardData.items).find(
      clipboardItem => clipboardItem.kind === 'file' && clipboardItem.type.startsWith('image/')
    );
    return item?.getAsFile() ?? null;
  };

  const handleImagePasteFromClipboardData = async (
    questionNumber: number,
    clipboardData: DataTransfer
  ): Promise<boolean> => {
    const fileFromClipboard = getClipboardImageFile(clipboardData);
    if (fileFromClipboard) {
      const normalizedFile = toUploadReadyImageFile(questionNumber, fileFromClipboard, 'paste');
      await handleQuestionImageUpload(questionNumber, normalizedFile);
      return true;
    }

    const plainText = clipboardData.getData('text/plain').trim();
    if (plainText.startsWith('data:image/')) {
      const dataUrlFile = dataUrlToFile(
        plainText,
        `q${questionNumber}-dataurl-${Date.now()}.png`
      );
      if (dataUrlFile) {
        await handleQuestionImageUpload(questionNumber, dataUrlFile);
        return true;
      }
    }

    if (isLikelyImageUrl(plainText)) {
      updateQuestion(questionNumber, { image: plainText });
      setStatus(`已粘贴 Q${questionNumber} 图片链接`);
      return true;
    }

    const html = clipboardData.getData('text/html');
    const imageSrcMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imageSrcMatch?.[1]) {
      updateQuestion(questionNumber, { image: imageSrcMatch[1] });
      setStatus(`已粘贴 Q${questionNumber} 图片链接`);
      return true;
    }

    return false;
  };

  const handleImagePaste = async (
    questionNumber: number,
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const handled = await handleImagePasteFromClipboardData(questionNumber, event.clipboardData);
    if (handled) {
      event.preventDefault();
    }
  };

  const handleQuestionCardPaste = async (
    questionNumber: number,
    event: React.ClipboardEvent<HTMLDivElement>
  ) => {
    const handled = await handleImagePasteFromClipboardData(questionNumber, event.clipboardData);
    if (handled) {
      event.preventDefault();
    }
  };

  const handlePasteFromClipboardButton = async (questionNumber: number) => {
    setStatus(`正在读取 Q${questionNumber} 剪贴板...`);
    if (!navigator.clipboard || !navigator.clipboard.read) {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text.startsWith('data:image/')) {
          const file = dataUrlToFile(text, `q${questionNumber}-clipboard-text-${Date.now()}.png`);
          if (file) {
            await handleQuestionImageUpload(questionNumber, file);
            return;
          }
        }
        const trimmed = text.trim();
        if (isLikelyImageUrl(trimmed)) {
          updateQuestion(questionNumber, { image: trimmed });
          setStatus(`已读取 Q${questionNumber} 剪贴板链接`);
          return;
        }
      }
      setStatus('当前浏览器不支持直接读取图片剪贴板，请在题卡区域按 Ctrl/Cmd+V 或文件上传。');
      return;
    }

    setUploadingImageQuestion(questionNumber);
    try {
      const clipboardItems = await navigator.clipboard.read();
      const imageClipboardItem = clipboardItems.find(item =>
        item.types.some(type => type.startsWith('image/'))
      );

      if (!imageClipboardItem) {
        setStatus(`Q${questionNumber} 剪贴板中没有图片`);
        return;
      }

      const preferredType =
        imageClipboardItem.types.find(type => type === 'image/png') ??
        imageClipboardItem.types.find(type => type.startsWith('image/'));
      if (!preferredType) {
        setStatus(`Q${questionNumber} 剪贴板中没有可用图片类型`);
        return;
      }

      const blob = await imageClipboardItem.getType(preferredType);
      const ext = preferredType.split('/')[1] || 'png';
      const file = new File([blob], `q${questionNumber}-clipboard-${Date.now()}.${ext}`, {
        type: preferredType,
      });
      await handleQuestionImageUpload(questionNumber, file);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setStatus(`Q${questionNumber} 读取剪贴板失败：${message}`);
    } finally {
      setUploadingImageQuestion(null);
    }
  };

  const validateBeforeSubmit = () => {
    if (!legacyId.trim() || !title.trim()) {
      return '请先填写试卷 ID 和标题';
    }

    for (const number of [51, 52, 53, 54]) {
      if (!questions.find(q => q.number === number)) {
        return `缺少第${number}题`;
      }
    }

    const q53 = questions.find(q => q.number === 53);
    if (!q53 || q53.questionType !== 'GRAPH_ESSAY') {
      return '第53题题型必须为 GRAPH_ESSAY';
    }

    for (const number of REQUIRED_IMAGE_QUESTIONS) {
      const q = questions.find(item => item.number === number);
      if (!q || !q.image || !q.image.trim()) {
        return `第${number}题必须上传图片`;
      }
    }

    for (const q of questions) {
      const hasBody = Boolean(
        q.instruction?.trim() || q.contextBox?.trim() || q.modelAnswer?.trim() || q.image?.trim()
      );
      if (!hasBody) {
        return `第${q.number}题内容为空，请至少填写题目要求或材料`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setStatus(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = questions
        .slice()
        .sort((a, b) => a.number - b.number)
        .map(q => ({
          ...q,
          instruction: q.instruction?.trim() || undefined,
          contextBox: q.contextBox?.trim() || undefined,
          modelAnswer: q.modelAnswer?.trim() || undefined,
          image: q.image?.trim() || undefined,
        }));

      const result = await saveWritingExam({
        id: legacyId.trim(),
        title: title.trim(),
        round,
        timeLimit,
        isPaid,
        description: description.trim() || undefined,
        questions: payload,
      });

      setStatus(`✅ 上传成功：${result.examId}（${result.questionCount} 题）`);
      loadedExamIdRef.current = selectedExistingExam?._id ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setStatus(`❌ 上传失败：${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedExistingExam) {
      loadedExamIdRef.current = null;
      return;
    }

    if (loadedExamIdRef.current === selectedExistingExam._id) return;

    if (writingQuestions === undefined) {
      setStatus(`正在加载写作试卷：${selectedExistingExam.title} ...`);
      return;
    }

    setLegacyId(selectedExistingExam.id);
    setTitle(selectedExistingExam.title);
    setRound(selectedExistingExam.round);
    setTimeLimit(selectedExistingExam.timeLimit || 50);
    setIsPaid(Boolean(selectedExistingExam.isPaid));
    setDescription(selectedExistingExam.description || '');
    setQuestions(buildQuestionInputsFromServer(writingQuestions));
    setQuestionStatus({});
    setStatus(`已加载写作试卷：${selectedExistingExam.title}`);
    loadedExamIdRef.current = selectedExistingExam._id;
  }, [selectedExistingExam, writingQuestions]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
          <PenLine className="w-6 h-6" />
          TOPIK 写作题目上传
        </h2>
        <p className="text-sm text-zinc-500">写作试卷专用编辑器（51~54），不再复用阅读/听力编辑器</p>
      </div>

      <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-3">
        <div className="text-sm font-bold text-zinc-700">加载已有写作试卷进行编辑</div>
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={selectedExamDbId}
            onChange={e => {
              const value = e.target.value;
              if (!value) {
                resetToNewForm();
                return;
              }
              loadedExamIdRef.current = null;
              setSelectedExamDbId(value);
            }}
            className="flex-1 rounded-lg border-2 border-zinc-300 px-3 py-2 font-medium focus:border-zinc-900 outline-none bg-white"
          >
            <option value="">新建写作试卷（空白）</option>
            {writingExams.map(exam => (
              <option key={exam._id} value={exam._id}>
                {exam.title} · Round {exam.round}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetToNewForm}
            className="px-4 py-2 rounded-lg border-2 border-zinc-900 font-bold text-sm bg-zinc-100 hover:bg-zinc-200 transition"
          >
            新建空白试卷
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-bold text-zinc-700">
            试卷 ID (legacyId)
            <input
              value={legacyId}
              onChange={e => setLegacyId(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 font-medium focus:border-zinc-900 outline-none"
              placeholder="writing-exam-64"
            />
          </label>
          <label className="text-sm font-bold text-zinc-700">
            标题
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 font-medium focus:border-zinc-900 outline-none"
              placeholder="第64届 TOPIK II 写作"
            />
          </label>
          <label className="text-sm font-bold text-zinc-700">
            届数
            <input
              type="number"
              value={round}
              onChange={e => setRound(toInt(e.target.value, round))}
              className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 font-medium focus:border-zinc-900 outline-none"
            />
          </label>
          <label className="text-sm font-bold text-zinc-700">
            时长 (分钟)
            <input
              type="number"
              value={timeLimit}
              onChange={e => setTimeLimit(toInt(e.target.value, timeLimit))}
              className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 font-medium focus:border-zinc-900 outline-none"
            />
          </label>
          <label className="text-sm font-bold text-zinc-700 md:col-span-2">
            描述 (可选)
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 font-medium focus:border-zinc-900 outline-none"
              placeholder="TOPIK II 写作模拟卷（51~54题）"
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={e => setIsPaid(e.target.checked)}
            className="w-4 h-4"
          />
          设为付费试卷
        </label>
      </div>

      <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
        <div className="font-bold text-zinc-800 flex items-center justify-between">
          <span>题目编辑（Q51~Q54）</span>
          <span className="text-xs text-zinc-500">总分：{totalScore}</span>
        </div>

        <div className="space-y-4">
          {questions
            .slice()
            .sort((a, b) => a.number - b.number)
            .map(question => {
              const imageRequired = REQUIRED_IMAGE_QUESTIONS.includes(
                question.number as (typeof REQUIRED_IMAGE_QUESTIONS)[number]
              );

              return (
                <div
                  key={`writing-editor-${question.number}`}
                  className="rounded-xl border-2 border-zinc-200 bg-zinc-50 p-4 space-y-3"
                  onPasteCapture={e => {
                    void handleQuestionCardPaste(question.number, e);
                  }}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="font-black text-zinc-800">
                      第{question.number}题 · {labelForQuestionType(question.questionType)}
                      {imageRequired && <span className="ml-2 text-rose-600">（图片必填）</span>}
                    </div>
                    <label className="text-xs font-bold text-zinc-600 flex items-center gap-2">
                      分值
                      <input
                        type="number"
                        value={question.score}
                        onChange={e =>
                          updateQuestion(question.number, {
                            score: toInt(e.target.value, question.score),
                          })
                        }
                        className="w-20 rounded-md border border-zinc-300 px-2 py-1 bg-white"
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-bold text-zinc-700">
                    题目要求
                    <textarea
                      value={question.instruction || ''}
                      onChange={e => updateQuestion(question.number, { instruction: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 text-sm bg-white focus:border-zinc-900 outline-none"
                      placeholder="请输入题目要求文本"
                    />
                  </label>

                  <label className="block text-xs font-bold text-zinc-700">
                    材料 / 正文
                    <textarea
                      value={question.contextBox || ''}
                      onChange={e => updateQuestion(question.number, { contextBox: e.target.value })}
                      rows={5}
                      className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 text-sm bg-white focus:border-zinc-900 outline-none"
                      placeholder="请输入题目材料内容"
                    />
                  </label>

                  <label className="block text-xs font-bold text-zinc-700">
                    参考答案（可选）
                    <textarea
                      value={question.modelAnswer || ''}
                      onChange={e => updateQuestion(question.number, { modelAnswer: e.target.value })}
                      rows={4}
                      className="mt-1 w-full rounded-lg border-2 border-zinc-300 px-3 py-2 text-sm bg-white focus:border-zinc-900 outline-none"
                      placeholder="可填写参考答案"
                    />
                  </label>

                  <div className="rounded-lg border border-zinc-300 bg-white p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                      <ImageIcon className="w-4 h-4" />
                      图片
                    </div>
                    <input
                      value={question.image || ''}
                      onChange={e => updateQuestion(question.number, { image: e.target.value })}
                      onPaste={e => {
                        void handleImagePaste(question.number, e);
                      }}
                      className="w-full rounded-lg border-2 border-zinc-300 px-3 py-2 text-sm font-medium focus:border-zinc-900 outline-none"
                      placeholder="粘贴图片 URL，或直接 Ctrl/Cmd+V 粘贴截图"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative inline-flex">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleQuestionImageUpload(question.number, file);
                            } else {
                              setQuestionMessage(question.number, `Q${question.number} 未选择文件`);
                              setStatus(`Q${question.number} 未选择文件`);
                            }
                            e.target.value = '';
                          }}
                        />
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                          {uploadingImageQuestion === question.number || uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          上传第{question.number}题图片
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void handlePasteFromClipboardButton(question.number);
                        }}
                        disabled={uploadingImageQuestion === question.number || uploading}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-700 transition disabled:opacity-60"
                      >
                        {uploadingImageQuestion === question.number || uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ClipboardPaste className="w-4 h-4" />
                        )}
                        读取剪贴板图片
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      先复制截图，然后点击“读取剪贴板图片”，或在上方输入框按 Ctrl/Cmd+V。
                    </p>
                    {questionStatus[question.number] ? (
                      <p className="text-xs font-bold text-zinc-700">{questionStatus[question.number]}</p>
                    ) : null}

                    {question.image ? (
                      <img
                        src={question.image}
                        alt={`Q${question.number} preview`}
                        className="max-h-64 w-full object-contain rounded-lg border border-zinc-300 bg-white"
                      />
                    ) : imageRequired ? (
                      <div className="text-xs text-rose-600 font-bold">
                        第{question.number}题为图片必填，当前未设置
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          提交写作试卷
        </button>
      </div>

      {status && (
        <div className="px-4 py-3 rounded-xl border-2 border-zinc-900 bg-emerald-50 text-sm text-zinc-800 whitespace-pre-wrap flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
          <span>{status}</span>
        </div>
      )}
    </div>
  );
};

export default TopikWritingImporter;
