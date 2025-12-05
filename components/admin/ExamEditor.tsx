import React, { useState } from 'react';
import { TopikExam, TopikQuestion, TopikType, Language } from '../../types';
import { TOPIK_READING_STRUCTURE, TOPIK_LISTENING_STRUCTURE } from './types';
import { Plus, Save, Trash2, FileText, Headphones, Loader2, ChevronRight } from 'lucide-react';

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
      questionNumber: 'Question',
      passage: 'Passage',
      questionText: 'Question Text',
      option: 'Option',
      correctAnswer: 'Correct Answer',
      image: 'Image URL',
      explanation: 'Explanation',
      save: 'Save Exam',
      delete: 'Delete Exam',
      selectExam: 'Select an exam to edit',
      noExams: 'No exams created yet',
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
      questionNumber: '问题',
      passage: '文章',
      questionText: '问题文本',
      option: '选项',
      correctAnswer: '正确答案',
      image: '图片URL',
      explanation: '解释',
      save: '保存考试',
      delete: '删除考试',
      selectExam: '选择要编辑的考试',
      noExams: '还没有创建考试',
    },
    vi: {
      examEditor: 'Trình chỉnh sửa kỳ thi TOPIK',
      createNew: 'Tạo kỳ thi mới',
      reading: 'Đọc',
      listening: 'Nghe',
      title: 'Tiêu đề',
      description: 'Mô tả',
      timeLimit: 'Giới hạn thời gian (phút)',
      paidContent: 'Nội dung trả phí',
      questionNumber: 'Câu hỏi',
      passage: 'Đoạn văn',
      questionText: 'Văn bản câu hỏi',
      option: 'Tùy chọn',
      correctAnswer: 'Đáp án đúng',
      image: 'URL hình ảnh',
      explanation: 'Giải thích',
      save: 'Lưu kỳ thi',
      delete: 'Xóa kỳ thi',
      selectExam: 'Chọn một kỳ thi để chỉnh sửa',
      noExams: 'Chưa tạo kỳ thi nào',
    },
    mn: {
      examEditor: 'TOPIK шалгалт засварлагч',
      createNew: 'Шинэ шалгалт үүсгэх',
      reading: 'Унших',
      listening: 'Сонсох',
      title: 'Гарчиг',
      description: 'Тайлбар',
      timeLimit: 'Цагийн хязгаар (минут)',
      paidContent: 'Төлбөртэй контент',
      questionNumber: 'Асуулт',
      passage: 'Хэсэг',
      questionText: 'Асуултын текст',
      option: 'Сонголт',
      correctAnswer: 'Зөв хариулт',
      image: 'Зургийн URL',
      explanation: 'Тайлбар',
      save: 'Шалгалт хадгалах',
      delete: 'Шалгалт устгах',
      selectExam: 'Засах шалгалт сонгох',
      noExams: 'Шалгалт үүсгээгүй байна',
    },
  };

  const t = labels[language];

  const createNewExam = (type: TopikType) => {
    const structure = type === 'READING' ? TOPIK_READING_STRUCTURE : TOPIK_LISTENING_STRUCTURE;
    const questions: TopikQuestion[] = [];

    for (let i = 1; i <= 50; i++) {
      questions.push({
        number: i,
        passage: '',
        question: `Question ${i}`,
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 0,
        image: '',
        explanation: '',
        optionImages: type === 'LISTENING' ? ['', '', '', ''] : undefined,
      });
    }

    const newExam: TopikExam = {
      id: `exam-${Date.now()}`,
      type,
      title: `TOPIK II ${type === 'READING' ? t.reading : t.listening} - New`,
      description: '',
      timeLimit: type === 'READING' ? 70 : 60,
      isPaid: false,
      questions,
    };

    onAddTopikExam(newExam);
    setSelectedExam(newExam);
    setEditingQuestion(1);
  };

  const updateExamMetadata = (field: keyof TopikExam, value: any) => {
    if (selectedExam) {
      const updated = { ...selectedExam, [field]: value };
      setSelectedExam(updated);
    }
  };

  const updateQuestion = (field: keyof TopikQuestion, value: any) => {
    if (selectedExam) {
      const updated = { ...selectedExam };
      const qIndex = updated.questions.findIndex(q => q.number === editingQuestion);
      if (qIndex !== -1) {
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
      await new Promise(resolve => setTimeout(resolve, 500));
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{t.examEditor}</h2>

      <div className="flex gap-6">
        {/* Exam List Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="mb-4">
            <button
              onClick={() => createNewExam('READING')}
              className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {t.createNew} ({t.reading})
            </button>
            <button
              onClick={() => createNewExam('LISTENING')}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Headphones className="w-4 h-4" />
              {t.createNew} ({t.listening})
            </button>
          </div>

          <div className="bg-white rounded-lg shadow divide-y">
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
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedExam?.id === exam.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
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
                      <div className="text-xs text-gray-500">
                        {exam.timeLimit} min | {exam.isPaid ? '💎' : '🆓'}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1">
          {!selectedExam ? (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              {t.selectExam}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Exam Metadata */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Exam Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.title}
                    </label>
                    <input
                      type="text"
                      value={selectedExam.title}
                      onChange={e => updateExamMetadata('title', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.description}
                    </label>
                    <textarea
                      value={selectedExam.description}
                      onChange={e => updateExamMetadata('description', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.timeLimit}
                    </label>
                    <input
                      type="number"
                      value={selectedExam.timeLimit}
                      onChange={e => updateExamMetadata('timeLimit', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.paidContent}
                    </label>
                    <select
                      value={selectedExam.isPaid ? 'paid' : 'free'}
                      onChange={e => updateExamMetadata('isPaid', e.target.value === 'paid')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Question Navigator */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">{t.questionNumber}:</span>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {selectedExam.questions.map(q => (
                      <button
                        key={q.number}
                        onClick={() => setEditingQuestion(q.number)}
                        className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                          editingQuestion === q.number
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {q.number}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question Editor */}
              {currentQuestion && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {t.questionNumber} {currentQuestion.number}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.passage}
                      </label>
                      <textarea
                        value={currentQuestion.passage}
                        onChange={e => updateQuestion('passage', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.questionText}
                      </label>
                      <input
                        type="text"
                        value={currentQuestion.question}
                        onChange={e => updateQuestion('question', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    {currentQuestion.options.map((opt, idx) => (
                      <div key={idx}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.option} {idx + 1}
                        </label>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => updateOption(idx, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.correctAnswer}
                      </label>
                      <select
                        value={currentQuestion.correctAnswer}
                        onChange={e => updateQuestion('correctAnswer', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        {currentQuestion.options.map((_, idx) => (
                          <option key={idx} value={idx}>
                            {t.option} {idx + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.image}
                      </label>
                      <input
                        type="text"
                        value={currentQuestion.image}
                        onChange={e => updateQuestion('image', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.explanation}
                      </label>
                      <textarea
                        value={currentQuestion.explanation}
                        onChange={e => updateQuestion('explanation', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={saveExam}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {t.save}
                    </>
                  )}
                </button>
                <button
                  onClick={deleteExam}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  {t.delete}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamEditor;
