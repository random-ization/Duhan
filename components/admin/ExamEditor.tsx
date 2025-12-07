import React, { useState } from 'react';
import { TopikExam, TopikQuestion, TopikType, Language } from '../../types';
import { TOPIK_READING_STRUCTURE, TOPIK_LISTENING_STRUCTURE } from './types';
import {
  Save,
  Trash2,
  FileText,
  Headphones,
  Loader2,
  Lock,
  Unlock,
  Upload, // ✅ 引入上传图标
} from 'lucide-react';
import { api } from '../../services/api'; // ✅ 引入API

interface ExamEditorProps {
  topikExams: TopikExam[];
  language: Language;
  onUpdateTopikExam: (exam: TopikExam) => void;
  onAddTopikExam: (exam: TopikExam) => void;
  onDeleteTopikExam: (id: string) => void;
}

const ExamEditor: React.FC<ExamEditorProps> = ({
  topikExams,
  language,
  onUpdateTopikExam,
  onAddTopikExam,
  onDeleteTopikExam,
}) => {
  const [selectedExam, setSelectedExam] = useState<TopikExam | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false); // ✅ 上传状态

  const labels = {
    en: {
      examEditor: 'TOPIK Exam Editor',
      createNew: 'Create New Exam',
      reading: 'Reading',
      listening: 'Listening',
      title: 'Title',
      description: 'Description',
      timeLimit: 'Time Limit (minutes)',
      paidContent: 'Paid Content',
      freeContent: 'Free',
      questionNumber: 'Question',
      passage: 'Passage',
      questionText: 'Question Text',
      option: 'Option',
      correctAnswer: 'Correct Answer',
      image: 'Image',
      explanation: 'Explanation',
      save: 'Save Exam',
      delete: 'Delete Exam',
      selectExam: 'Select an exam to edit',
      noExams: 'No exams created yet',
      round: 'Round',
    },
    zh: {
      examEditor: 'TOPIK 考试编辑器',
      createNew: '创建新考试',
      reading: '阅读',
      listening: '听力',
      title: '标题',
      description: '描述',
      timeLimit: '时间限制（分钟）',
      paidContent: '付费内容',
      freeContent: '免费',
      questionNumber: '问题',
      passage: '文章',
      questionText: '问题文本',
      option: '选项',
      correctAnswer: '正确答案',
      image: '图片',
      explanation: '解释',
      save: '保存考试',
      delete: '删除考试',
      selectExam: '选择要编辑的考试',
      noExams: '还没有创建考试',
      round: '届数',
    },
    // ... 其他语言保持默认
  };

  // 简单的语言回退逻辑
  const t = labels[language as keyof typeof labels] || labels['en'];

  // ✅ 优化策略：文件上传到存储空间
  const handleFileUpload = async (
    file: File,
    target: 'exam' | 'question',
    field: string,
    questionIndex?: number
  ) => {
    if (!selectedExam) return;
    setUploading(true);

    try {
      const res = await api.uploadMedia(file);
      const url = res.url;

      if (target === 'exam') {
        updateExamMetadata(field as keyof TopikExam, url);
      } else if (target === 'question' && typeof questionIndex === 'number') {
        const updatedQuestions = [...selectedExam.questions];
        const qIdx = updatedQuestions.findIndex(q => q.number === questionIndex);
        if (qIdx !== -1) {
          // @ts-ignore - 动态赋值
          updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], [field]: url };
          setSelectedExam({ ...selectedExam, questions: updatedQuestions });
        }
      }
    } catch (e) {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const createNewExam = (type: TopikType) => {
    // 生成50个默认问题
    const questions: TopikQuestion[] = [];
    for (let i = 1; i <= 50; i++) {
      questions.push({
        id: i, // 确保有 ID
        number: i,
        passage: '',
        question: `Question ${i}`,
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 0,
        image: '',
        explanation: '',
        score: 2, // 默认分数
        optionImages: type === 'LISTENING' ? ['', '', '', ''] : undefined,
      });
    }

    const newExam: TopikExam = {
      id: `exam-${Date.now()}`,
      type,
      title: `TOPIK II ${type === 'READING' ? 'Reading' : 'Listening'} - New`,
      description: '',
      round: 0, // ✅ 关键修复：初始化 Round，避免后端校验失败
      timeLimit: type === 'READING' ? 70 : 60,
      isPaid: false,
      questions,
      audioUrl: '', // 初始化音频字段
    };

    onAddTopikExam(newExam);
    setSelectedExam(newExam);
    setEditingQuestion(1);
  };

  const updateExamMetadata = (field: keyof TopikExam, value: any) => {
    if (selectedExam) {
      setSelectedExam({ ...selectedExam, [field]: value });
    }
  };

  const updateQuestion = (field: keyof TopikQuestion, value: any) => {
    if (selectedExam) {
      const updated = { ...selectedExam };
      const qIndex = updated.questions.findIndex(q => q.number === editingQuestion);
      if (qIndex !== -1) {
        // @ts-ignore
        updated.questions[qIndex] = { ...updated.questions[qIndex], [field]: value };
        setSelectedExam(updated);
      }
    }
  };

  const updateOption = (optionIndex: number, value: string) => {
    if (selectedExam) {
      const updated = { ...selectedExam };
      const qIndex = updated.questions.findIndex(q => q.number === editingQuestion);
      if (qIndex !== -1) {
        const newOptions = [...updated.questions[qIndex].options];
        newOptions[optionIndex] = value;
        updated.questions[qIndex] = { ...updated.questions[qIndex], options: newOptions };
        setSelectedExam(updated);
      }
    }
  };

  const saveExam = async () => {
    if (selectedExam) {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟一点延迟提升体验
      onUpdateTopikExam(selectedExam);
      setSaving(false);
    }
  };

  const deleteExam = () => {
    if (selectedExam && window.confirm(`Delete ${selectedExam.title}?`)) {
      onDeleteTopikExam(selectedExam.id);
      setSelectedExam(null);
    }
  };

  const currentQuestion = selectedExam?.questions.find(q => q.number === editingQuestion);

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{t.examEditor}</h2>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Left Sidebar: Exam List */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-white rounded-lg shadow h-full">
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={() => createNewExam('READING')}
              className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              {t.createNew} ({t.reading})
            </button>
            <button
              onClick={() => createNewExam('LISTENING')}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Headphones className="w-4 h-4" />
              {t.createNew} ({t.listening})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {topikExams.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">{t.noExams}</div>
            ) : (
              topikExams.map(exam => (
                <button
                  key={exam.id}
                  onClick={() => {
                    setSelectedExam(exam);
                    setEditingQuestion(1);
                  }}
                  className={`w-full p-3 text-left rounded-md transition-colors ${
                    selectedExam?.id === exam.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {exam.type === 'READING' ? (
                      <FileText className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Headphones className="w-4 h-4 text-purple-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{exam.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <span>{exam.round ? `${t.round} ${exam.round}` : 'No Round'}</span>
                        <span className="text-gray-300">|</span>
                        <span>{exam.timeLimit} min</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-lg shadow">
          {!selectedExam ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              {t.selectExam}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-lg text-gray-800">Editing: {selectedExam.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${selectedExam.type === 'READING' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {selectedExam.type}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveExam}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t.save}
                  </button>
                  <button
                    onClick={deleteExam}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.delete}
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* 1. Exam Metadata Section */}
                <section className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Exam Metadata</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Round & Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.round || 'Round'}</label>
                      <input
                        type="number"
                        value={selectedExam.round}
                        onChange={e => updateExamMetadata('round', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.title}</label>
                      <input
                        type="text"
                        value={selectedExam.title}
                        onChange={e => updateExamMetadata('title', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                      <textarea
                        value={selectedExam.description}
                        onChange={e => updateExamMetadata('description', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={2}
                      />
                    </div>

                    {/* Audio Upload (Listening Only) - 优化点 */}
                    {selectedExam.type === 'LISTENING' && (
                      <div className="col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <label className="block text-sm font-medium text-purple-900 mb-2">Exam Full Audio</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={selectedExam.audioUrl || ''}
                            readOnly
                            placeholder="Audio URL will appear here..."
                            className="flex-1 border border-purple-200 rounded-lg px-3 py-2 bg-white text-gray-600 text-sm"
                          />
                          <label className={`flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            <span>Upload MP3</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="audio/*"
                              disabled={uploading}
                              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'exam', 'audioUrl')}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 2. Questions Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-end border-b pb-2">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Questions</h4>
                    <span className="text-xs text-gray-500">Total: {selectedExam.questions.length}</span>
                  </div>

                  {/* Question Navigator */}
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                    {selectedExam.questions.map(q => (
                      <button
                        key={q.number}
                        onClick={() => setEditingQuestion(q.number)}
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium transition-all ${
                          editingQuestion === q.number
                            ? 'bg-blue-600 text-white shadow-md scale-110'
                            : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {q.number}
                      </button>
                    ))}
                  </div>

                  {/* Current Question Editor */}
                  {currentQuestion && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <h5 className="text-lg font-bold text-gray-800">Editing Question #{currentQuestion.number}</h5>
                      </div>

                      <div className="space-y-4">
                        {/* Image Upload - 优化点 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t.image} (Optional)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={currentQuestion.image || ''}
                              readOnly
                              placeholder="Image URL..."
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-500 text-sm"
                            />
                            <label className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                              Upload
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                disabled={uploading}
                                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'question', 'image', currentQuestion.number)}
                              />
                            </label>
                          </div>
                          {currentQuestion.image && (
                            <img src={currentQuestion.image} alt="Preview" className="mt-2 h-32 object-contain border rounded-lg bg-white" />
                          )}
                        </div>

                        {/* Passage */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t.passage}</label>
                          <textarea
                            value={currentQuestion.passage || ''}
                            onChange={e => updateQuestion('passage', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-serif"
                            rows={3}
                            placeholder="Reading passage context..."
                          />
                        </div>

                        {/* Question Text */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t.questionText}</label>
                          <input
                            type="text"
                            value={currentQuestion.question}
                            onChange={e => updateQuestion('question', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          />
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentQuestion.options.map((opt, idx) => (
                            <div key={idx}>
                              <label className="block text-xs font-bold text-gray-500 mb-1">{t.option} {idx + 1}</label>
                              <div className="flex items-center">
                                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">{String.fromCharCode(65+idx)}</span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e => updateOption(idx, e.target.value)}
                                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 outline-none ${currentQuestion.correctAnswer === idx ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'border-gray-300 focus:ring-blue-500'}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Correct Answer Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t.correctAnswer}</label>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map(idx => (
                              <button
                                key={idx}
                                onClick={() => updateQuestion('correctAnswer', idx)}
                                className={`px-4 py-2 rounded-lg font-bold border transition-all ${
                                  currentQuestion.correctAnswer === idx
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {t.option} {idx + 1}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t.explanation}</label>
                          <textarea
                            value={currentQuestion.explanation || ''}
                            onChange={e => updateQuestion('explanation', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                            rows={2}
                            placeholder="Explain why this answer is correct..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamEditor;
