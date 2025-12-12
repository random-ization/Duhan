import React, { useState, useEffect } from 'react';
import { TopikExam, TopikQuestion, TopikType, Language } from '../../types';
import {
    Save, Trash2, FileText, Headphones, Loader2, Lock, Unlock, Upload,
    ArrowLeft, CheckSquare, ImageIcon, Edit2, Plus
} from 'lucide-react';
import { api } from '../../services/api'; // ✅ 引入 API 服务

// --- 结构定义 (来自您的 AdminPanel.tsx) ---
interface ExamSectionStructure {
    range: number[];
    instruction: string;
    type?: string;
    grouped?: boolean;
    style?: string;
    hasBox?: boolean;
}

const TOPIK_READING_STRUCTURE: ExamSectionStructure[] = [
    { range: [1, 2], instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [3, 4], instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)" },
    { range: [5, 8], instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", type: "IMAGE_OPTIONAL" },
    // ✅ 修复：9-10 是图表题（可上传图片），11-12 是文字阅读题
    { range: [9, 10], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", type: "IMAGE_OPTIONAL" },
    { range: [11, 12], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)" },
    { range: [13, 15], instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)" },
    { range: [16, 18], instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [19, 20], instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [21, 22], instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [23, 24], instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [25, 27], instruction: "※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)", style: "HEADLINE" },
    { range: [28, 31], instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [32, 34], instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)" },
    { range: [35, 38], instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [39, 41], instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", hasBox: true },
    { range: [42, 43], instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [44, 45], instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [46, 47], instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [48, 50], instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
];

const TOPIK_LISTENING_STRUCTURE: ExamSectionStructure[] = [
    { range: [1, 3], instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)", type: "IMAGE_CHOICE" },
    { range: [4, 8], instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)" },
    { range: [9, 12], instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)" },
    { range: [13, 16], instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)" },
    { range: [17, 20], instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)" },
    { range: [21, 22], instruction: "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [23, 24], instruction: "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [25, 26], instruction: "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [27, 28], instruction: "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [29, 30], instruction: "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [31, 32], instruction: "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [33, 34], instruction: "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [35, 36], instruction: "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [37, 38], instruction: "※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [39, 40], instruction: "※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [41, 42], instruction: "※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [43, 44], instruction: "※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [45, 46], instruction: "※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [47, 48], instruction: "※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [49, 50], instruction: "※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
];

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
    const [activeQuestionId, setActiveQuestionId] = useState<number>(1);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Labels 简化版，按需扩展
    const labels = {
        en: { save: 'Save Exam', delete: 'Delete Exam', createNew: 'Create New' },
        zh: { save: '保存考试', delete: '删除考试', createNew: '创建新考试' },
    };
    const t = labels[language as keyof typeof labels] || labels.en;

    // ✅ 核心优化：通用上传函数，对接 S3/Spaces
    const handleFileUpload = async (
        file: File,
        onSuccess: (url: string) => void
    ) => {
        setUploading(true);
        try {
            const res = await api.uploadMedia(file);
            onSuccess(res.url);
        } catch (e) {
            console.error(e);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // --- Handlers ---
    const createNewExam = (type: TopikType) => {
        const questions: TopikQuestion[] = [];
        for (let i = 1; i <= 50; i++) {
            questions.push({
                id: i,
                number: i,
                passage: '',
                question: `Question ${i}`,
                options: ['', '', '', ''],
                correctAnswer: 0,
                image: '', // ✅ 统一使用 image 字段
                explanation: '',
                score: 2,
                optionImages: type === 'LISTENING' ? ['', '', '', ''] : undefined,
            });
        }

        const newExam: TopikExam = {
            id: `exam-${Date.now()}`,
            type,
            title: `TOPIK II ${type === 'READING' ? 'Reading' : 'Listening'} - New`,
            description: '',
            round: 35, // ✅ 初始化 Round
            timeLimit: type === 'READING' ? 70 : 60,
            isPaid: false,
            questions,
            audioUrl: '',
        };

        onAddTopikExam(newExam);
        setSelectedExam(newExam);
        setActiveQuestionId(1);
    };

    const updateExamField = (field: keyof TopikExam, value: any) => {
        if (selectedExam) {
            setSelectedExam({ ...selectedExam, [field]: value });
        }
    };

    const updateQuestion = (id: number, field: keyof TopikQuestion, value: any) => {
        if (!selectedExam) return;
        const updatedQuestions = selectedExam.questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        );
        setSelectedExam({ ...selectedExam, questions: updatedQuestions });
    };

    const updateOption = (qId: number, optIdx: number, value: string) => {
        if (!selectedExam) return;
        const q = selectedExam.questions.find(q => q.id === qId);
        if (!q) return;
        const newOptions = [...q.options];
        newOptions[optIdx] = value;
        updateQuestion(qId, 'options', newOptions);
    };

    const updateOptionImage = (qId: number, optIdx: number, url: string) => {
        if (!selectedExam) return;
        const q = selectedExam.questions.find(q => q.id === qId);
        if (!q) return;
        const newImages = [...(q.optionImages || ['', '', '', ''])];
        newImages[optIdx] = url;
        updateQuestion(qId, 'optionImages', newImages);
    };

    const handleSave = async () => {
        if (!selectedExam) return;
        setSaving(true);
        await onUpdateTopikExam(selectedExam);
        setSaving(false);
    };

    const deleteExam = () => {
        if (selectedExam && window.confirm(`Delete ${selectedExam.title}?`)) {
            onDeleteTopikExam(selectedExam.id);
            setSelectedExam(null);
        }
    };

    const currentExam = selectedExam;
    const STRUCTURE = currentExam?.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;
    const getQ = (id: number) => currentExam?.questions.find(q => q.id === id);

    // --- Render Visual Editor (您最喜欢的 UI 部分) ---
    const renderVisualEditor = () => {
        if (!currentExam) return null;

        return (
            <div className="flex h-full bg-slate-100">
                {/* Left Sidebar: Navigation */}
                <div className="w-16 bg-white border-r border-slate-200 overflow-y-auto flex flex-col items-center py-4 gap-2 no-scrollbar">
                    {STRUCTURE.map((section, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setActiveQuestionId(section.range[0]);
                                document.getElementById(`q-anchor-${section.range[0]}`)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${activeQuestionId >= section.range[0] && activeQuestionId <= section.range[1]
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            title={section.instruction}
                        >
                            {section.range[0]}
                        </button>
                    ))}
                </div>

                {/* Main Canvas: The Exam Paper */}
                <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                    <div className="bg-white w-full max-w-[900px] min-h-[1200px] shadow-xl p-12 border border-slate-300 relative">

                        {/* Header - Editable */}
                        <div className="border-b-2 border-black pb-6 mb-8 text-center relative">
                            {/* Audio Upload */}
                            {currentExam.type === 'LISTENING' && (
                                <div className="absolute top-0 right-0">
                                    <label className="flex items-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 font-bold text-sm cursor-pointer hover:bg-indigo-100 transition-colors">
                                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        {currentExam.audioUrl ? "Change Audio" : "Upload Audio"}
                                        <input
                                            type="file" hidden accept="audio/*"
                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], (url) => updateExamField('audioUrl', url))}
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
                                <h1 className="text-4xl font-extrabold tracking-widest font-serif text-slate-900">TOPIK Ⅱ</h1>
                                <select
                                    value={currentExam.paperType || 'B'}
                                    onChange={(e) => updateExamField('paperType', e.target.value)}
                                    className="appearance-none bg-black text-white text-2xl font-serif font-bold rounded-full w-10 h-10 text-center cursor-pointer"
                                    style={{ textAlignLast: 'center' }}
                                >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                </select>
                            </div>

                            <div className="flex justify-center items-center text-xl font-bold text-slate-700 font-serif gap-1">
                                <span>제</span>
                                <input
                                    type="number"
                                    className="w-16 text-center bg-white border-b-2 border-slate-300 focus:border-indigo-600 outline-none px-1"
                                    value={currentExam.round}
                                    onChange={(e) => updateExamField('round', parseInt(e.target.value) || 0)}
                                />
                                <span>회 한국어능력시험</span>
                            </div>

                            <input
                                className="mt-4 text-center text-slate-400 font-medium bg-white border-b border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none w-1/2 transition-colors mx-auto block"
                                value={currentExam.title}
                                onChange={(e) => updateExamField('title', e.target.value)}
                                placeholder="Internal Exam Title"
                            />
                        </div>

                        {/* Sections Loop */}
                        {STRUCTURE.map((section, sIdx) => {
                            const [start, end] = section.range;
                            const isGrouped = section.grouped;
                            const questionsInRange = [];
                            for (let i = start; i <= end; i++) {
                                const q = getQ(i);
                                if (q) questionsInRange.push(q);
                            }

                            if (questionsInRange.length === 0) return null;

                            return (
                                <div key={sIdx} className="mb-12 relative group/section" id={`q-anchor-${start}`}>
                                    <div className="bg-slate-50 border-l-4 border-slate-800 p-2 mb-6 font-bold text-slate-800 text-[17px] font-serif select-none">
                                        {section.instruction}
                                    </div>

                                    {/* SHARED PASSAGE EDITOR */}
                                    {isGrouped && (
                                        <div className="mb-6 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 transition-colors bg-slate-50/50">
                                            <textarea
                                                className="w-full bg-transparent border-none focus:ring-0 text-[17px] leading-8 font-serif resize-none h-48 outline-none"
                                                placeholder="Enter shared passage here..."
                                                value={questionsInRange[0].passage || ''}
                                                onChange={(e) => {
                                                    // Update passage for all questions in group (or just the leader)
                                                    updateQuestion(questionsInRange[0].id, 'passage', e.target.value);
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Questions */}
                                    <div className={isGrouped ? "pl-2" : ""}>
                                        {questionsInRange.map((q) => (
                                            <div key={q.id} className="mb-8 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                                                <div className="flex gap-4">
                                                    <span className="text-xl font-bold font-serif pt-1">{q.id}.</span>

                                                    <div className="flex-1 space-y-4">
                                                        {/* Single Question Passage/Image */}
                                                        {!isGrouped && (
                                                            <div className="mb-2">
                                                                {/* Image Upload - ✅ 优化：支持直接上传 */}
                                                                {(section.type === 'IMAGE_OPTIONAL' || q.image) && (
                                                                    <div className="mb-2">
                                                                        {q.image ? (
                                                                            <div className="relative inline-block group/img">
                                                                                <img src={q.image} className="max-h-40 border border-slate-200" alt="Q" />
                                                                                <button onClick={() => updateQuestion(q.id, 'image', '')} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/img:opacity-100"><Trash2 className="w-3 h-3" /></button>
                                                                            </div>
                                                                        ) : (
                                                                            <label className="cursor-pointer inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200">
                                                                                <ImageIcon className="w-3 h-3 mr-1" /> Add Image
                                                                                <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                                    e.target.files?.[0] && handleFileUpload(e.target.files[0], (url) => updateQuestion(q.id, 'image', url));
                                                                                }} />
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Box / 보기 Editor */}
                                                                {section.hasBox && (
                                                                    <div className="border border-slate-800 p-4 mb-4 relative">
                                                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-slate-200">&lt;보 기&gt;</span>
                                                                        <textarea
                                                                            className="w-full bg-white p-2 text-[15px] resize-none outline-none border-b border-dashed border-slate-300 focus:border-indigo-500 h-24"
                                                                            placeholder="Box content..."
                                                                            value={q.passage || ''}
                                                                            onChange={(e) => updateQuestion(q.id, 'passage', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Simple Passage */}
                                                                {!section.type && !section.hasBox && (
                                                                    <textarea
                                                                        className={`w-full bg-white border-none focus:ring-0 text-[17px] leading-8 font-serif resize-none outline-none ${section.style === 'HEADLINE' ? 'font-bold border-2 border-slate-800 p-4 shadow-[3px_3px_0px_#000]' : 'h-24'}`}
                                                                        placeholder={section.style === 'HEADLINE' ? "Enter Headline..." : "Enter Passage..."}
                                                                        value={q.passage || ''}
                                                                        onChange={(e) => updateQuestion(q.id, 'passage', e.target.value)}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Prompt */}
                                                        <input
                                                            className="w-full font-bold text-[18px] bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none"
                                                            placeholder="Enter question prompt..."
                                                            value={q.question}
                                                            onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                        />

                                                        {/* Options */}
                                                        {section.type === 'IMAGE_CHOICE' ? (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {[0, 1, 2, 3].map((optIdx) => {
                                                                    const img = q.optionImages?.[optIdx];
                                                                    return (
                                                                        <div key={optIdx} className="flex flex-col items-center gap-2">
                                                                            <button
                                                                                onClick={() => updateQuestion(q.id, 'correctAnswer', optIdx)}
                                                                                className={`w-full aspect-[4/3] border-2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group/optImg ${q.correctAnswer === optIdx ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}
                                                                            >
                                                                                {img ? (
                                                                                    <>
                                                                                        <img src={img} className="w-full h-full object-contain" alt={`Opt ${optIdx}`} />
                                                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/optImg:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                                            <div className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); updateOptionImage(q.id, optIdx, '') }}>
                                                                                                <Trash2 className="w-4 h-4" />
                                                                                            </div>
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <label className="cursor-pointer flex flex-col items-center text-slate-400 hover:text-indigo-500 p-4 w-full h-full justify-center">
                                                                                        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-8 h-8 mb-2" />}
                                                                                        <span className="text-xs font-bold">Upload Option {optIdx + 1}</span>
                                                                                        <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                                            e.target.files?.[0] && handleFileUpload(e.target.files[0], (url) => updateOptionImage(q.id, optIdx, url));
                                                                                        }} />
                                                                                    </label>
                                                                                )}
                                                                                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${q.correctAnswer === optIdx ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                                                    {optIdx + 1}
                                                                                </div>
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className={`grid ${q.options.some(o => o.length > 25) ? 'grid-cols-1' : 'grid-cols-2'} gap-x-8 gap-y-2`}>
                                                                {q.options.map((opt, oIdx) => (
                                                                    <div key={oIdx} className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => updateQuestion(q.id, 'correctAnswer', oIdx)}
                                                                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-sans transition-colors ${q.correctAnswer === oIdx ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-400 hover:border-indigo-400'}`}
                                                                        >
                                                                            {oIdx + 1}
                                                                        </button>
                                                                        <input
                                                                            className="flex-1 bg-white border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none text-[16px] py-1"
                                                                            value={opt}
                                                                            onChange={(e) => updateOption(q.id, oIdx, e.target.value)}
                                                                            placeholder={`Option ${oIdx + 1}`}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-50 gap-6">
            {/* List Sidebar */}
            <div className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-slate-200 h-full">
                <div className="p-4 border-b border-gray-100">
                    <button onClick={() => createNewExam('READING')} className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                        <FileText className="w-4 h-4" /> {t.createNew} (Reading)
                    </button>
                    <button onClick={() => createNewExam('LISTENING')} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                        <Headphones className="w-4 h-4" /> {t.createNew} (Listening)
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {topikExams.length === 0 && <div className="text-center text-gray-400 mt-10 text-sm">No exams</div>}
                    {topikExams.map(exam => (
                        <div
                            key={exam.id}
                            onClick={() => setSelectedExam(exam)}
                            className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors group relative ${selectedExam?.id === exam.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'}`}
                        >
                            <div className="font-bold text-slate-800 text-sm truncate">{exam.title}</div>
                            <div className="text-xs text-slate-500 flex justify-between mt-1">
                                <span>Round {exam.round}</span>
                                <span className={exam.type === 'READING' ? 'text-blue-500' : 'text-purple-500'}>{exam.type}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteTopikExam(exam.id); }}
                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 h-full overflow-hidden flex flex-col">
                {selectedExam ? (
                    <>
                        {/* Top Bar */}
                        <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <button onClick={() => setSelectedExam(null)} className="hover:text-indigo-600"><ArrowLeft className="w-4 h-4" /></button>
                                <span className="text-slate-300">/</span>
                                <span>{selectedExam.title}</span>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold shadow-sm flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {t.save}
                            </button>
                        </div>
                        {/* Editor */}
                        <div className="flex-1 overflow-hidden">
                            {renderVisualEditor()}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        Select an exam to edit
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamEditor;
