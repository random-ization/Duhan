import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import {
  FileText,
  Headphones,
  Save,
  Trash2,
  Loader2,
  ArrowLeft,
  Upload,
  CheckSquare,
  ImageIcon,
  FileUp,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useFileUpload } from '../../hooks/useFileUpload';
import { TOPIK } from '../../utils/convexRefs';
import {
  TopikQuestion,
  TopikExam,
  TOPIK_READING_STRUCTURE,
  TOPIK_LISTENING_STRUCTURE,
  getQuestionConfig,
} from './TopikConstants';
import { QuestionRenderer } from './TopikQuestionRenderer';

export const TopikManager: React.FC = () => {
  // ========================================
  // Convex Queries (Reactive)
  // ========================================
  // ========================================
  // Convex Queries (Reactive)
  // ========================================
  const { results, status, loadMore } = usePaginatedQuery(
    TOPIK.getExams as any,
    {},
    { initialNumItems: 20 }
  );

  const exams: TopikExam[] = (results || []).map(e => ({
    ...e,
    questions: [], // Questions loaded separately
    type: e.type as 'READING' | 'LISTENING', // Cast from string to union
  }));

  const loading = status === 'LoadingFirstPage';

  // ========================================
  // Convex Mutations
  // ========================================
  const saveExamMutation = useMutation(TOPIK.saveExam);
  const deleteExamMutation = useMutation(TOPIK.deleteExam);

  // ========================================
  // Local UI State
  // ========================================
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<TopikExam | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Upload Hook
  const { uploadFile } = useFileUpload();

  // Bulk Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Query for questions when exam is selected
  const convexQuestions = useQuery(
    TOPIK.getExamQuestions,
    selectedExamId ? { examId: selectedExamId } : 'skip'
  );

  // Track if we've loaded questions for current exam
  const loadedExamIdRef = useRef<string | null>(null);

  // Update selectedExam when questions load - only on initial load
  useEffect(() => {
    if (!selectedExamId) {
      loadedExamIdRef.current = null;
      return;
    }

    // Skip if we already loaded this exam
    if (loadedExamIdRef.current === selectedExamId) {
      return;
    }

    const examMeta = exams.find(e => e.id === selectedExamId);
    if (!examMeta) return;

    if (convexQuestions === undefined) {
      setLoadingQuestions(true);
    } else {
      setLoadingQuestions(false);
      // Deep clone to make it mutable
      const questions =
        convexQuestions.length > 0 ? structuredClone(convexQuestions) : createEmptyQuestions();
      setSelectedExam({
        ...examMeta,
        questions,
      });
      loadedExamIdRef.current = selectedExamId;
    }
  }, [selectedExamId, convexQuestions, exams]);

  const createEmptyQuestions = (examType: 'READING' | 'LISTENING' = 'READING'): TopikQuestion[] => {
    const questions: TopikQuestion[] = [];
    for (let i = 1; i <= 50; i++) {
      const config = getQuestionConfig(i, examType);
      questions.push({
        id: i,
        number: i,
        passage: '',
        question: config?.question || '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        image: '',
        score: config?.score || 2,
        instruction: config?.instruction || '',
        // Initialize optional fields to match strict DTO if necessary, or let them be undefined
        layout: config?.uiType as any, // Cast uiType to layout if compatible, or map it. TopikQuestionDto layout is string.
      });
    }
    return questions;
  };

  const handleFileUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    uploadKey?: string
  ) => {
    const key = uploadKey || `upload-${Date.now()}`;
    setUploadingItems(prev => new Set(prev).add(key));
    try {
      const { url } = await uploadFile(file);
      onSuccess(url);
    } catch (e) {
      console.error(e);
      alert('Upload failed. Please try again.');
    } finally {
      setUploadingItems(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const createNewExam = (type: 'READING' | 'LISTENING') => {
    const questions = createEmptyQuestions(type).map(q => ({
      ...q,
      optionImages: type === 'LISTENING' ? ['', '', '', ''] : undefined,
    }));

    const newExam: TopikExam = {
      id: `exam-${Date.now()}`,
      type,
      title: `TOPIK II ${type === 'READING' ? 'Reading' : 'Listening'} - New`,
      description: '',
      round: 35,
      timeLimit: type === 'READING' ? 70 : 60,
      isPaid: false,
      questions,
      audioUrl: '',
    };

    // Set locally for editing (will be saved to Convex on save)
    setSelectedExam(newExam);
    setSelectedExamId(newExam.id);
    setActiveQuestionId(1);
  };

  const updateQuestionState = (questionId: number, field: keyof TopikQuestion, value: any) => {
    setSelectedExam(prev => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q => (q.id === questionId ? { ...q, [field]: value } : q)),
      };
    });
  };

  const updateOptionState = (questionId: number, optionIdx: number, value: string) => {
    setSelectedExam(prev => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q => {
          if (q.id === questionId) {
            const newOpts = [...q.options];
            newOpts[optionIdx] = value;
            return { ...q, options: newOpts };
          }
          return q;
        }),
      };
    });
  };

  const updateOptionImageState = (questionId: number, optionIdx: number, url: string) => {
    setSelectedExam(prev => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q => {
          if (q.id === questionId) {
            const newImages = [...(q.optionImages || ['', '', '', ''])];
            newImages[optionIdx] = url;
            return { ...q, optionImages: newImages };
          }
          return q;
        }),
      };
    });
  };

  const updateExamField = <K extends keyof TopikExam>(field: K, value: TopikExam[K]) => {
    if (selectedExam) {
      setSelectedExam({ ...selectedExam, [field]: value });
    }
  };

  // Individual image processor for bulk upload
  const processBulkImage = async (file: File, questionsRef: TopikQuestion[]) => {
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    console.log(`Processing file: ${file.name} -> parsed name: ${fileName}`);

    // Parse filename: Q1_Option1, Q1_1, 1_1, Q1O1, etc.
    const patterns = [
      /^Q?(\d+)[_-]?O?p?t?i?o?n?(\d+)$/i, // Q1_Option1, Q1Option1, Q1_1, 1_1
      /^(\d+)[_-](\d+)$/, // 1_1, 1-1
    ];

    let questionNum: number | null = null;
    let optionNum: number | null = null;

    for (const pattern of patterns) {
      const match = pattern.exec(fileName);
      if (match) {
        questionNum = Number.parseInt(match[1]);
        optionNum = Number.parseInt(match[2]);
        console.log(`Matched pattern: Q${questionNum}, Option${optionNum}`);
        break;
      }
    }

    if (questionNum === null || optionNum === null || optionNum < 1 || optionNum > 4) {
      return { success: false, error: `${file.name}: 无法识别格式` };
    }

    // Find the question (using stored reference to avoid closure issues)
    const question = questionsRef.find(q => q.number === questionNum);
    if (!question) {
      return { success: false, error: `${file.name}: 找不到第 ${questionNum} 题` };
    }

    // Show loading on this specific option
    const uploadKey = `opt-${question.id}-${optionNum - 1}`;
    setUploadingItems(prev => new Set(prev).add(uploadKey));

    try {
      const { url } = await uploadFile(file);
      // Update state immediately after each successful upload using helper
      updateOptionImageState(question.id, optionNum - 1, url);
      return { success: true };
    } catch {
      return { success: false, error: `${file.name}: 上传失败` };
    } finally {
      // Remove loading state for this option
      setUploadingItems(prev => {
        const next = new Set(prev);
        next.delete(uploadKey);
        return next;
      });
    }
  };

  // Bulk upload option images - parses filenames like Q1_Option1.png, Q1_1.png, 1_1.png
  const handleBulkImageUpload = async (files: FileList) => {
    if (!selectedExam || !selectedExam.questions) {
      console.log('No exam selected or no questions');
      alert('请先选择一套试卷');
      return;
    }

    console.log(`Starting bulk upload of ${files.length} files`);

    // Store questions reference at start (for finding question by number)
    const questionsRef = selectedExam.questions;
    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };
    const totalFiles = files.length;

    for (const file of Array.from(files)) {
      const result = await processBulkImage(file, questionsRef);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        if (result.error) results.errors.push(result.error);
      }
    }

    // Show final result
    let message = `✅ 批量上传完成：成功 ${results.success}/${totalFiles} 张`;
    if (results.failed > 0) {
      message += `\n\n❌ 失败 ${results.failed} 张：\n` + results.errors.slice(0, 5).join('\n');
      if (results.errors.length > 5) {
        message += `\n... 还有 ${results.errors.length - 5} 个错误`;
      }
    }
    alert(message);
  };

  const handleSave = async () => {
    if (!selectedExam) return;
    setSaving(true);
    try {
      await saveExamMutation({
        id: selectedExam.id,
        title: selectedExam.title,
        round: selectedExam.round,
        type: selectedExam.type,
        paperType: selectedExam.paperType,
        timeLimit: selectedExam.timeLimit,
        audioUrl: selectedExam.audioUrl,
        description: selectedExam.description,
        isPaid: selectedExam.isPaid,
        questions: selectedExam.questions.map(q => ({
          id: q.id,
          number: q.number,
          passage: q.passage,
          question: q.question,
          contextBox: q.contextBox,
          options: q.options,
          correctAnswer: q.correctAnswer,
          image: q.image,
          optionImages: q.optionImages,
          explanation: q.explanation,
          score: q.score,
          instruction: q.instruction,
          layout: q.layout,
          groupCount: q.groupCount,
        })),
      });
      // Convex queries will auto-refresh
      alert('保存成功！');
    } catch (e) {
      console.error('Save failed', e);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExam || !confirm(`删除考试 "${selectedExam.title}"？`)) return;
    try {
      await deleteExamMutation({ examId: selectedExam.id });
      // Convex queries will auto-refresh
      setSelectedExam(null);
      setSelectedExamId(null);
    } catch (e) {
      console.error('Delete failed', e);
      alert('删除失败');
    }
  };

  const handleImportQuestions = () => {
    if (!selectedExam || !importText.trim()) return;

    try {
      let importedQuestions: TopikQuestion[];
      const trimmed = importText.trim();
      if (trimmed.startsWith('[')) {
        importedQuestions = JSON.parse(trimmed);
      } else if (trimmed.startsWith('{')) {
        importedQuestions = [JSON.parse(trimmed)];
      } else {
        throw new Error('请输入有效的 JSON 格式（数组或对象）');
      }

      if (!Array.isArray(importedQuestions)) {
        throw new TypeError('导入数据必须是题目数组');
      }

      const validatedQuestions = importedQuestions.map((q, idx) => {
        if (!q.id || typeof q.id !== 'number') {
          throw new Error(`第 ${idx + 1} 题缺少有效的 id 字段`);
        }
        if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`第 ${q.id} 题的 options 必须是包含4个选项的数组`);
        }
        return {
          id: q.id,
          number: q.number || q.id,
          passage: q.passage || '',
          question: q.question || '',
          contextBox: q.contextBox || '',
          options: q.options,
          correctAnswer: q.correctAnswer ?? 0,
          score: q.score || 2,
          instruction: q.instruction || '',
          image: q.image || '',
          layout: q.layout || undefined,
          groupCount: q.groupCount || undefined,
        } as TopikQuestion;
      });

      const existingQuestions = selectedExam.questions || [];
      const mergedQuestions = [...existingQuestions];
      validatedQuestions.forEach(newQ => {
        const existingIdx = mergedQuestions.findIndex(q => q.id === newQ.id);
        if (existingIdx >= 0) {
          mergedQuestions[existingIdx] = newQ;
        } else {
          mergedQuestions.push(newQ);
        }
      });
      mergedQuestions.sort((a, b) => a.id - b.id);

      setSelectedExam({ ...selectedExam, questions: mergedQuestions });
      setShowImportModal(false);
      setImportText('');
      setImportError('');
      alert(`成功导入 ${validatedQuestions.length} 道题目！请检查后点击"保存"。`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '解析失败，请检查 JSON 格式';
      setImportError(message);
    }
  };

  // Excel/CSV Partial Import
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedExam) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        alert('表格为空或格式错误');
        return;
      }

      // Merge logic (Partial Update)
      const existingQuestions = [...(selectedExam.questions || [])];
      let updatedCount = 0;

      // Define loose type for Excel/JSON optimization
      type ExcelRow = {
        id?: string;
        ID?: string;
        Id?: string;
        number?: string;
        Number?: string;
        题号?: string;
        [key: string]: unknown;
      };

      const excelData = jsonData as ExcelRow[];

      console.log('Excel Import: Processing', excelData.length, 'rows');

      const processExcelRow = (row: ExcelRow) => {
        const qId = row.id || row.ID || row.Id || row.number || row.Number || row['题号'];
        if (!qId) return null;

        const idNum = Number.parseInt(String(qId));
        const existingIdx = existingQuestions.findIndex(q => q.id === idNum);

        if (existingIdx < 0) return null;

        const existing = existingQuestions[existingIdx];
        const updated = { ...existing };
        let changed = false;

        const updateIfPresent = (
          field: 'question' | 'passage' | 'instruction' | 'contextBox' | 'explanation',
          value: unknown
        ) => {
          if (value !== undefined) {
            updated[field] = String(value);
            changed = true;
          }
        };

        updateIfPresent('question', row.question ?? row['问题']);
        updateIfPresent('passage', row.passage ?? row['文章']);
        updateIfPresent('instruction', row.instruction ?? row['指令']);
        updateIfPresent('contextBox', row.contextBox ?? row['보기']);
        updateIfPresent('explanation', row.explanation ?? row['解释'] ?? row['解析']);

        const opts = [
          row.option1 ?? row['选项1'],
          row.option2 ?? row['选项2'],
          row.option3 ?? row['选项3'],
          row.option4 ?? row['选项4'],
        ];

        if (opts.some(o => o !== undefined)) {
          const newOpts = [...updated.options];
          opts.forEach((o, i) => {
            if (o !== undefined) newOpts[i] = String(o);
          });
          updated.options = newOpts;
          changed = true;
        }

        const ans = row.correctAnswer ?? row['答案'];
        if (ans !== undefined) {
          const ca = Number.parseInt(String(ans));
          if (!Number.isNaN(ca)) {
            updated.correctAnswer = ca - 1;
            changed = true;
          }
        }

        const score = row.score ?? row['分数'];
        if (score !== undefined) {
          updated.score = Number.parseInt(String(score));
          changed = true;
        }

        return changed ? { idx: existingIdx, updated } : null;
      };

      excelData.forEach(row => {
        const result = processExcelRow(row);
        if (result) {
          existingQuestions[result.idx] = result.updated;
          updatedCount++;
        }
      });

      setSelectedExam({ ...selectedExam, questions: existingQuestions });
      alert(
        `✅ 成功更新 ${updatedCount} 道题目数据！\n（只更新了表格中存在的字段，原有图片/音频未受影响）`
      );

      // Reset input
      e.target.value = '';
    } catch (error) {
      console.error(error);
      alert('解析表格失败，请确保格式正确');
    }
  };

  const currentExam = selectedExam;
  const STRUCTURE =
    currentExam?.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;
  const getQ = (id: number) => currentExam?.questions?.find(q => q.id === id);

  // --- Render Visual Editor ---
  const renderVisualEditor = () => {
    if (loadingQuestions) {
      return (
        <div className="flex h-full items-center justify-center text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin mb-2" /> Loading Exam Content...
        </div>
      );
    }
    if (!currentExam || !currentExam.questions) {
      return (
        <div className="flex h-full items-center justify-center text-zinc-400">
          Content not available
        </div>
      );
    }

    return (
      <div className="flex h-full bg-zinc-100">
        {/* Left Sidebar: Navigation */}
        <div className="w-16 bg-white border-r-2 border-zinc-200 overflow-y-auto flex flex-col items-center py-4 gap-2">
          {STRUCTURE.map(section => (
            <button
              key={`${section.range[0]}-${section.range[1]}`}
              onClick={() => {
                setActiveQuestionId(section.range[0]);
                document
                  .getElementById(`q-anchor-${section.range[0]}`)
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                activeQuestionId >= section.range[0] && activeQuestionId <= section.range[1]
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
              }`}
              title={section.instruction}
              aria-label={`Go to section ${section.range[0]}-${section.range[1]}`}
            >
              {section.range[0]}
            </button>
          ))}
        </div>

        {/* Main Canvas: The Exam Paper */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="bg-white w-full max-w-[900px] min-h-[1200px] shadow-[6px_6px_0px_0px_#18181B] border-2 border-zinc-900 p-12 relative">
            {/* Header */}
            <div className="border-b-4 border-black pb-6 mb-8 text-center relative">
              {currentExam.type === 'LISTENING' && (
                <div className="absolute top-0 right-0">
                  <label className="flex items-center px-4 py-2 bg-purple-100 border-2 border-zinc-900 rounded-lg text-zinc-900 font-bold text-sm cursor-pointer hover:bg-purple-200 transition-colors shadow-[2px_2px_0px_0px_#18181B]">
                    {uploadingItems.has('audio') ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {currentExam.audioUrl ? 'Change Audio' : 'Upload Audio'}
                    <input
                      type="file"
                      hidden
                      accept="audio/*"
                      onChange={e =>
                        e.target.files?.[0] &&
                        handleFileUpload(
                          e.target.files[0],
                          url => updateExamField('audioUrl', url),
                          'audio'
                        )
                      }
                    />
                  </label>
                  {currentExam.audioUrl && (
                    <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center justify-end">
                      <CheckSquare className="w-3 h-3 mr-1" /> Ready
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center items-center gap-3 mb-4">
                <h1 className="text-4xl font-extrabold tracking-widest font-serif text-zinc-900">
                  TOPIK Ⅱ
                </h1>
                <select
                  value={currentExam.paperType || 'B'}
                  onChange={e => updateExamField('paperType', e.target.value)}
                  className="appearance-none bg-black text-white text-2xl font-serif font-bold rounded-full w-10 h-10 text-center cursor-pointer"
                  style={{ textAlignLast: 'center' }}
                  aria-label="Paper type"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>

              <div className="flex justify-center items-center text-xl font-bold text-zinc-700 font-serif gap-1">
                <span>제</span>
                <input
                  type="number"
                  className="w-16 text-center bg-white border-b-2 border-zinc-300 focus:border-zinc-900 outline-none px-1"
                  value={currentExam.round}
                  onChange={e => updateExamField('round', Number.parseInt(e.target.value) || 0)}
                  aria-label="Exam round number"
                />
                <span>회 한국어능력시험</span>
              </div>

              <input
                className="mt-4 text-center text-zinc-400 font-medium bg-white border-b-2 border-transparent hover:border-zinc-200 focus:border-zinc-900 outline-none w-1/2 transition-colors mx-auto block"
                value={currentExam.title}
                onChange={e => updateExamField('title', e.target.value)}
                placeholder="Internal Exam Title"
                aria-label="Internal Exam Title"
              />
            </div>

            {/* Sections Loop */}
            {STRUCTURE.map(section => {
              const [start, end] = section.range;
              const isGrouped = section.grouped;
              const questionsInRange: TopikQuestion[] = [];
              for (let i = start; i <= end; i++) {
                const q = getQ(i);
                if (q) questionsInRange.push(q);
              }
              if (questionsInRange.length === 0) return null;

              return (
                <div
                  key={`${section.range[0]}-${section.range[1]}`}
                  className="mb-12 relative"
                  id={`q-anchor-${start}`}
                >
                  {/* Instruction Bar - 可编辑 (听力) / 静态显示 (阅读) */}
                                  <div className="bg-zinc-100 border-l-4 border-zinc-800 p-2 mb-6 font-bold text-zinc-800 text-[17px] font-serif">
                                    {currentExam?.type === 'LISTENING' ? (
                                      <input
                                        className="w-full bg-transparent outline-none font-bold text-zinc-800 text-[17px] font-serif"
                                        value={questionsInRange[0].instruction || section.instruction}
                                        onChange={e =>
                                          updateQuestionState(questionsInRange[0].id, 'instruction', e.target.value)
                                        }
                                        placeholder={section.instruction}
                                        aria-label="Section instruction"
                                      />
                                    ) : (
                                      <span>{section.instruction}</span>
                                    )}
                                  </div>

                                  {/* Shared Passage */}
                                  {isGrouped && (
                                    <div className="mb-6 p-4 border-2 border-dashed border-zinc-300 rounded-xl hover:border-zinc-500 transition-colors bg-zinc-50/50">
                                      <textarea
                                        className="w-full bg-transparent border-none focus:ring-0 text-[17px] leading-8 font-serif resize-none h-48 outline-none"
                                        placeholder="Enter shared passage here..."
                                        aria-label="Enter shared passage"
                                        value={questionsInRange[0].passage || ''}
                                        onChange={e =>
                                          updateQuestionState(questionsInRange[0].id, 'passage', e.target.value)
                                        }
                                      />
                                    </div>
                                  )}

                  {/* Questions */}
                  <div className={isGrouped ? 'pl-2' : ''}>
                    {questionsInRange.map(q => {
                      // Get config for this specific question
                      const qConfig = getQuestionConfig(q.id, currentExam?.type || 'READING');
                      const isGroupStart = qConfig?.groupStart === q.id;

                      return (
                        <QuestionRenderer
                          key={q.id}
                          q={q}
                          examType={currentExam?.type || 'READING'}
                          section={section}
                          isGroupStart={isGroupStart}
                          isGrouped={isGrouped || false}
                          uploadingItems={uploadingItems}
                          updateQuestion={updateQuestionState}
                          updateOption={updateOptionState}
                          updateOptionImage={updateOptionImageState}
                          handleFileUpload={handleFileUpload}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderExamList = () => {
    if (loading) {
      return (
        <div className="text-center text-zinc-400 py-10">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      );
    }

    if (exams.length === 0) {
      return <div className="text-center text-zinc-400 py-10 text-sm">暂无考试</div>;
    }

    return exams.map(exam => (
      <button
        key={exam.id}
        onClick={() => setSelectedExamId(exam.id)}
        className={`w-full text-left p-4 rounded-xl cursor-pointer mb-2 transition-all border-2 ${
          selectedExam?.id === exam.id
            ? 'bg-lime-100 border-zinc-900 shadow-[2px_2px_0px_0px_#18181B]'
            : 'border-zinc-200 hover:border-zinc-400'
        }`}
        aria-label={`Select exam: ${exam.title}`}
      >
        <div className="font-bold text-zinc-800 text-sm truncate">{exam.title}</div>
        <div className="text-xs text-zinc-500 flex justify-between mt-1">
          <span>Round {exam.round}</span>
          <span
            className={
              exam.type === 'READING' ? 'text-blue-500 font-bold' : 'text-purple-500 font-bold'
            }
          >
            {exam.type}
          </span>
        </div>
      </button>
    ));
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* List Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_#18181B] overflow-hidden">
        <div className="p-4 border-b-2 border-zinc-200">
          <button
            onClick={() => createNewExam('READING')}
            className="w-full mb-2 px-4 py-3 bg-blue-100 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 font-bold shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
          >
            <FileText className="w-4 h-4" /> 新建阅读考试
          </button>
          <button
            onClick={() => createNewExam('LISTENING')}
            className="w-full px-4 py-3 bg-purple-100 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2 font-bold shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
          >
            <Headphones className="w-4 h-4" /> 新建听力考试
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {renderExamList()}
          {status === 'CanLoadMore' && (
            <button
              onClick={() => loadMore(10)}
              className="w-full py-2 text-sm text-zinc-500 hover:bg-zinc-50 rounded-lg mt-2 font-bold"
            >
              Load More
            </button>
          )}
          {status === 'LoadingMore' && (
            <div className="text-center py-2 text-sm text-zinc-400">Loading more...</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_#18181B] overflow-hidden flex flex-col">
        {selectedExam ? (
          <>
            {/* Top Bar */}
            <div className="bg-zinc-50 border-b-2 border-zinc-200 px-6 py-3 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <button
                  onClick={() => {
                    setSelectedExam(null);
                    setSelectedExamId(null);
                  }}
                  className="hover:text-zinc-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-zinc-300">/</span>
                <span className="font-bold text-zinc-700">{selectedExam.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 bg-emerald-100 border-2 border-emerald-300 text-emerald-700 rounded-lg hover:border-emerald-500 transition-colors font-bold flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_#064e3b] active:translate-y-0.5 active:shadow-none">
                  <FileText className="w-4 h-4" />
                  Excel/CSV 更新
                  <input
                    type="file"
                    hidden
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelImport}
                  />
                </label>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-zinc-100 border-2 border-zinc-300 text-zinc-700 rounded-lg hover:border-zinc-900 transition-colors font-bold flex items-center gap-2"
                >
                  <FileUp className="w-4 h-4" />
                  批量导入
                </button>
                {selectedExam.type === 'LISTENING' && (
                  <label className="px-4 py-2 bg-violet-100 border-2 border-violet-300 text-violet-700 rounded-lg hover:border-violet-500 transition-colors font-bold flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    批量上传图片
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={e => e.target.files && handleBulkImageUpload(e.target.files)}
                    />
                  </label>
                )}
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-100 border-2 border-red-300 text-red-700 rounded-lg hover:border-red-500 transition-colors font-bold flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-lime-400 transition-colors font-bold shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  保存
                </button>
              </div>
            </div>
            {/* Editor */}
            <div className="flex-1 overflow-hidden">{renderVisualEditor()}</div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="font-bold">选择考试进行编辑</p>
            <p className="text-sm mt-1">或点击左侧按钮创建新考试</p>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B] w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b-2 border-zinc-200">
              <h2 className="text-xl font-black text-zinc-800">批量导入题目</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError('');
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-4">
                <div className="text-sm text-zinc-600 mb-2">
                  <strong>JSON 格式说明：</strong>粘贴包含题目的 JSON 数组
                </div>
                <pre className="text-xs bg-zinc-50 p-3 rounded-lg border-2 border-zinc-200 overflow-x-auto text-zinc-600 mb-4">
                  {`[
  {
    "id": 32,
    "passage": "正文内容...",
    "question": "题目问题...",
    "contextBox": "보기内容（可选）",
    "options": ["选项1", "选项2", "选项3", "选项4"],
    "correctAnswer": 0,
    "instruction": "指示语（可选）"
  },
  ...
]`}
                </pre>
              </div>
              <textarea
                value={importText}
                onChange={e => {
                  setImportText(e.target.value);
                  setImportError('');
                }}
                placeholder="在此粘贴 JSON 数据..."
                aria-label="在此粘贴 JSON 数据"
                className="w-full h-64 p-4 border-2 border-zinc-300 rounded-xl resize-none focus:ring-0 focus:border-zinc-900 outline-none font-mono text-sm"
              />
              {importError && (
                <div className="mt-3 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                  ❌ {importError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t-2 border-zinc-200">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError('');
                }}
                className="px-6 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg font-bold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImportQuestions}
                disabled={!importText.trim()}
                className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-lime-400 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
              >
                <FileUp className="w-4 h-4" />
                导入并预览
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopikManager;
