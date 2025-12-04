
import React, { useState, useEffect, useRef } from 'react';
import { TopikExam, Language, TopikQuestion, ExamAttempt, Annotation } from '../types';
import { Clock, CheckCircle, FileText, Trophy, History, RotateCcw, Eye, ArrowLeft, Calendar, Check, X, MessageSquare, Trash2, Play, Pause, FastForward, MoreHorizontal } from 'lucide-react';
import { getLabels } from '../utils/i18n';

interface TopikModuleProps {
    exams: TopikExam[];
    language: Language;
    history: ExamAttempt[];
    onSaveHistory: (attempt: ExamAttempt) => void;
    annotations: Annotation[];
    onSaveAnnotation: (annotation: Annotation) => void;
    canAccessContent?: (content: any) => boolean;
    onShowUpgradePrompt?: () => void;
}

const TopikModule: React.FC<TopikModuleProps> = ({ exams, language, history, onSaveHistory, annotations, onSaveAnnotation, canAccessContent, onShowUpgradePrompt }) => {
    const [view, setView] = useState<'LIST' | 'HISTORY_LIST' | 'COVER' | 'EXAM' | 'RESULT' | 'REVIEW'>('LIST');
    const [currentExam, setCurrentExam] = useState<TopikExam | null>(null);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    
    // For Review Mode
    const [currentReviewAttempt, setCurrentReviewAttempt] = useState<ExamAttempt | null>(null);

    // Annotation State
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string; contextKey: string } | null>(null);
    const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [noteInput, setNoteInput] = useState('');

    const labels = getLabels(language);
    const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Filter exams by type for List View
    const readingExams = exams.filter(e => e.type === 'READING');
    const listeningExams = exams.filter(e => e.type === 'LISTENING');

    const examContextPrefix = currentExam ? `TOPIK-${currentExam.id}` : '';
    
    // Sidebar logic: Show annotations for current exam that have notes
    const sidebarAnnotations = annotations
        .filter(a => a.contextKey.startsWith(examContextPrefix) && a.note && a.note.trim().length > 0);

    // Timer Logic
    useEffect(() => {
        let interval: number;
        if (timerActive && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && timerActive) {
            submitExam();
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    // Close annotation menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showAnnotationMenu) {
                const target = event.target as HTMLElement;
                if (!target.closest('.annotation-menu')) {
                    setShowAnnotationMenu(false);
                    setSelectionRange(null);
                    window.getSelection()?.removeAllRanges();
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAnnotationMenu]);

    const selectExam = (exam: TopikExam) => {
        // Check if user can access this exam
        if (canAccessContent && !canAccessContent(exam)) {
            onShowUpgradePrompt?.();
            return;
        }
        
        setCurrentExam(exam);
        setUserAnswers({});
        setTimeLeft(exam.timeLimit * 60);
        setView('COVER');
    };

    const startExam = () => {
        setTimerActive(true);
        setView('EXAM');
    };

    const submitExam = () => {
        setTimerActive(false);
        if (!currentExam) return;

        // Calculate Score
        let score = 0;
        let totalScore = 0;
        currentExam.questions.forEach(q => {
            totalScore += q.score;
            if (userAnswers[q.id] === q.correctAnswer) {
                score += q.score;
            }
        });

        // Save Attempt
        const attempt: ExamAttempt = {
            id: Date.now().toString(),
            examId: currentExam.id,
            examTitle: currentExam.title,
            score: score,
            maxScore: totalScore,
            timestamp: Date.now(),
            userAnswers: { ...userAnswers }
        };
        onSaveHistory(attempt);
        setCurrentReviewAttempt(attempt);
        setView('RESULT');
    };

    const handleAnswer = (questionId: number, optionIdx: number) => {
        // Prevent changing answers in Review Mode
        if (view === 'REVIEW') return;
        setUserAnswers(prev => ({ ...prev, [questionId]: optionIdx }));
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const scrollToQuestion = (id: number) => {
        const el = questionRefs.current[id];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const getCircleNumber = (num: number) => {
        const map = ['①', '②', '③', '④'];
        return map[num] || `${num + 1}`;
    };

    const viewHistoryList = (examId: string) => {
        // Find attempts for this exam
        setCurrentExam(exams.find(e => e.id === examId) || null);
        setView('HISTORY_LIST');
    };

    const openReview = (attempt: ExamAttempt) => {
        setCurrentReviewAttempt(attempt);
        setCurrentExam(exams.find(e => e.id === attempt.examId) || null);
        setUserAnswers(attempt.userAnswers); // Load saved answers for display
        setView('REVIEW');
    };

    // --- Annotation Handlers (unchanged) ---
    const handleTextSelection = (contextKey: string) => {
        if (view !== 'REVIEW') return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        const text = range.toString();
        const rect = range.getBoundingClientRect();
        
        let container = selection.anchorNode?.parentElement;
        while (container && !container.getAttribute('data-context-key')) {
            container = container.parentElement;
        }

        if (container && container.getAttribute('data-context-key') === contextKey) {
             const preCaretRange = range.cloneRange();
             preCaretRange.selectNodeContents(container);
             preCaretRange.setEnd(range.startContainer, range.startOffset);
             const start = preCaretRange.toString().length;
             const end = start + text.length;

             if (text.trim().length > 0) {
                 setSelectionRange({ start, end, text, contextKey });
                 setMenuPosition({
                     top: rect.top + window.scrollY - 10,
                     left: rect.left + (rect.width / 2) + window.scrollX
                 });
                 setNoteInput(''); // Reset note input
                 setShowAnnotationMenu(true);
             }
        }
    };

    const saveHighlight = (color: Annotation['color']) => {
        if (!selectionRange) return;
        const newAnnotation: Annotation = {
            id: Date.now().toString(),
            contextKey: selectionRange.contextKey,
            startOffset: selectionRange.start,
            endOffset: selectionRange.end,
            text: selectionRange.text,
            color: color,
            note: '',
            timestamp: Date.now()
        };
        onSaveAnnotation(newAnnotation);
        setShowAnnotationMenu(false);
        window.getSelection()?.removeAllRanges();
    };

    const saveNote = () => {
        if (!selectionRange) return;
        const newAnnotation: Annotation = {
            id: Date.now().toString(),
            contextKey: selectionRange.contextKey,
            startOffset: selectionRange.start,
            endOffset: selectionRange.end,
            text: selectionRange.text,
            color: 'yellow',
            note: noteInput,
            timestamp: Date.now()
        };
        onSaveAnnotation(newAnnotation);
        setShowAnnotationMenu(false);
        window.getSelection()?.removeAllRanges();
    };

    const deleteAnnotation = (id: string) => {
        const ann = annotations.find(a => a.id === id);
        if(ann) {
            onSaveAnnotation({ ...ann, color: null, note: '' });
        }
    };

    // --- Render Annotated Text (unchanged) ---
    const renderAnnotatedText = (text: string | undefined, subContextKey: string) => {
        if (!text) return null;
        const fullContextKey = `${examContextPrefix}-${subContextKey}`;
        const keyAnns = annotations.filter(a => 
            a.contextKey === fullContextKey && a.startOffset !== undefined && a.endOffset !== undefined && (a.color || a.note)
        ).sort((a,b) => (a.startOffset||0) - (b.startOffset||0));

        const cleanSegments: {char: string, bold: boolean, underline: boolean, annotation?: Annotation}[] = [];
        let i = 0;
        let isBold = false;
        let isUnderline = false;
        let cleanIndex = 0; 

        while (i < text.length) {
            if (text.substr(i, 3) === '<b>') { isBold = true; i+=3; continue; }
            if (text.substr(i, 4) === '</b>') { isBold = false; i+=4; continue; }
            if (text.substr(i, 3) === '<u>') { isUnderline = true; i+=3; continue; }
            if (text.substr(i, 4) === '</u>') { isUnderline = false; i+=4; continue; }
            
            const char = text[i];
            const ann = keyAnns.find(a => cleanIndex >= (a.startOffset||0) && cleanIndex < (a.endOffset||0));
            cleanSegments.push({ char, bold: isBold, underline: isUnderline, annotation: ann });
            i++;
            cleanIndex++;
        }

        const nodes = [];
        let currentSegIndex = 0;
        while (currentSegIndex < cleanSegments.length) {
            const startNode = cleanSegments[currentSegIndex];
            let endNodeIndex = currentSegIndex + 1;
            while (endNodeIndex < cleanSegments.length) {
                const nextNode = cleanSegments[endNodeIndex];
                if (nextNode.bold !== startNode.bold || 
                    nextNode.underline !== startNode.underline || 
                    nextNode.annotation !== startNode.annotation) {
                    break;
                }
                endNodeIndex++;
            }
            const segmentText = cleanSegments.slice(currentSegIndex, endNodeIndex).map(s => s.char).join('');
            const ann = startNode.annotation;
            let className = "";
            if (startNode.bold) className += "font-bold ";
            if (startNode.underline) className += "border-b-2 border-slate-900 pb-0.5 inline-block leading-normal ";
            if (ann) {
                className += `bg-${ann.color || 'yellow'}-200 cursor-pointer relative `;
            }
            nodes.push(
                <span key={currentSegIndex} className={className} id={ann ? `ann-${ann.id}` : undefined} onClick={(e) => { if (ann && view === 'REVIEW') { e.stopPropagation(); } }}>
                    {segmentText}
                    {ann && ann.note && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                </span>
            );
            currentSegIndex = endNodeIndex;
        }

        return (
            <div data-context-key={fullContextKey} onMouseUp={() => handleTextSelection(fullContextKey)} className="inline-block">
                {nodes}
            </div>
        );
    };

    // --- Floating Audio Player Component (unchanged) ---
    const FloatingAudioPlayer = ({ src }: { src: string }) => {
        const audioRef = useRef<HTMLAudioElement>(null);
        const [isPlaying, setIsPlaying] = useState(false);
        const [playbackRate, setPlaybackRate] = useState(1.0);
        const [currentTime, setCurrentTime] = useState(0);
        const [duration, setDuration] = useState(0);
        const [showSpeedMenu, setShowSpeedMenu] = useState(false);

        useEffect(() => {
            const audio = audioRef.current;
            if (!audio) return;

            const updateTime = () => setCurrentTime(audio.currentTime);
            const updateDuration = () => setDuration(audio.duration);
            const onEnded = () => setIsPlaying(false);

            audio.addEventListener('timeupdate', updateTime);
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('ended', onEnded);

            return () => {
                audio.removeEventListener('timeupdate', updateTime);
                audio.removeEventListener('loadedmetadata', updateDuration);
                audio.removeEventListener('ended', onEnded);
            };
        }, []);

        useEffect(() => {
            if (audioRef.current) {
                audioRef.current.playbackRate = playbackRate;
            }
        }, [playbackRate]);

        const togglePlay = () => {
            if (audioRef.current) {
                if (isPlaying) audioRef.current.pause();
                else audioRef.current.play();
                setIsPlaying(!isPlaying);
            }
        };

        const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
            const time = parseFloat(e.target.value);
            if (audioRef.current) {
                audioRef.current.currentTime = time;
                setCurrentTime(time);
            }
        };

        const formatTime = (time: number) => {
            if (isNaN(time)) return "00:00";
            const m = Math.floor(time / 60);
            const s = Math.floor(time % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        };

        return (
            <div className="fixed bottom-6 right-6 z-50 bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 w-80 animate-in slide-in-from-bottom-6 duration-300">
                <audio ref={audioRef} src={src} className="hidden" />
                
                {/* Title */}
                <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                        Audio Player
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors"
                        >
                            {playbackRate}x
                        </button>
                        {showSpeedMenu && (
                            <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col min-w-[60px]">
                                {[0.8, 1.0, 1.2, 1.5].map(rate => (
                                    <button 
                                        key={rate}
                                        onClick={() => { setPlaybackRate(rate); setShowSpeedMenu(false); }}
                                        className={`px-3 py-2 text-xs font-bold hover:bg-indigo-50 text-left ${playbackRate === rate ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                    <input 
                        type="range" 
                        min="0" 
                        max={duration || 0} 
                        value={currentTime} 
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-6">
                    <button 
                        onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10; }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={togglePlay}
                        className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 transition-transform active:scale-95"
                    >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                    <button 
                        onClick={() => { if(audioRef.current) audioRef.current.currentTime += 10; }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        <FastForward className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };

    // --- RENDERERS FOR SPECIAL LAYOUTS ---
    const renderPassageContent = (q: TopikQuestion) => {
        if (q.imageUrl) {
            return (
                <div className="mb-6 mx-auto max-w-[95%] flex justify-start">
                    <img 
                        src={q.imageUrl} 
                        alt={`Question ${q.id} content`} 
                        className="max-h-[400px] object-contain border border-slate-200 shadow-sm"
                    />
                </div>
            );
        }

        if (!q.passage) return null;

        const passageKey = `Q${q.id}-PASSAGE`;
        const boxKey = `Q${q.id}-BOX`;

        switch (q.layout) {
            case 'NEWS_HEADLINE':
                 return (
                     <div className="mb-6 border border-slate-800 p-5 bg-white shadow-[3px_3px_0px_#000]">
                         <h3 className="font-serif font-bold text-lg text-slate-900 tracking-tight">
                             {renderAnnotatedText(q.passage, passageKey)}
                         </h3>
                     </div>
                 );

            case 'INSERT_BOX':
                 return (
                     <div className="mb-6 relative">
                         <div className="mb-4 text-lg leading-loose text-justify text-slate-800 whitespace-pre-wrap">
                             {renderAnnotatedText(q.passage, passageKey)}
                         </div>
                         <div className="border border-slate-800 p-5 bg-white relative mt-8 mx-2 shadow-sm">
                             <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-sm font-bold text-slate-800 border border-slate-200">
                                 &lt;보 기&gt;
                             </span>
                             <div className="text-[17px] leading-8 text-slate-800 whitespace-pre-wrap text-justify">
                                 {renderAnnotatedText(q.contextBox, boxKey)}
                             </div>
                         </div>
                     </div>
                 );

            default: 
                return (
                    <div className="mb-6 border border-slate-400 p-6 bg-white relative shadow-sm rounded-sm">
                        <div className="text-[17px] leading-8 text-slate-800 whitespace-pre-wrap text-justify font-serif">
                            {renderAnnotatedText(q.passage, passageKey)}
                        </div>
                         {q.contextBox && (
                             <div className="border-t border-slate-200 mt-4 pt-4">
                                 <div className="text-center text-xs font-bold mb-2">&lt;보 기&gt;</div>
                                 <div className="text-[16px] leading-7 text-slate-700 whitespace-pre-wrap">
                                     {renderAnnotatedText(q.contextBox, boxKey)}
                                 </div>
                             </div>
                         )}
                    </div>
                );
        }
    };

    const renderQuestionBlock = (q: TopikQuestion, showPassage: boolean, isGroupedChild: boolean = false) => {
        const isReview = view === 'REVIEW';
        const activeAnswers = isReview && currentReviewAttempt ? currentReviewAttempt.userAnswers : userAnswers;
        const userAnswer = activeAnswers[q.id];
        const questionKey = `Q${q.id}-PROMPT`;

        // Check if question has image options
        const hasImageOptions = q.optionImages && q.optionImages.some(img => img.length > 0);

        return (
            <div key={q.id} ref={el => { questionRefs.current[q.id] = el; }} className={`flex gap-4 ${isGroupedChild ? 'mb-8' : 'mb-12'}`}>
                <div className="text-lg font-sans text-slate-900 min-w-[28px] pt-0.5">
                    {q.id}.
                </div>
                <div className="flex-1 w-full min-w-0">
                    {showPassage && renderPassageContent(q)}
                    {q.question && (
                        <div className="mb-4 text-[18px] font-bold text-slate-900 leading-relaxed break-keep tracking-tight">
                            {renderAnnotatedText(q.question, questionKey)}
                        </div>
                    )}
                    
                    {hasImageOptions ? (
                        <div className="grid grid-cols-2 gap-4">
                            {q.optionImages!.map((img, optIdx) => {
                                let borderClass = "border-slate-200 hover:border-indigo-300";
                                let bgClass = "bg-white";
                                let opacityClass = "";

                                if (isReview) {
                                    if (optIdx === q.correctAnswer) borderClass = "border-green-500 ring-2 ring-green-100";
                                    else if (userAnswer === optIdx && userAnswer !== q.correctAnswer) borderClass = "border-red-500 ring-2 ring-red-100";
                                    else opacityClass = "opacity-50";
                                } else {
                                    if (userAnswer === optIdx) borderClass = "border-indigo-600 ring-2 ring-indigo-100";
                                }

                                return (
                                    <button 
                                        key={optIdx} 
                                        onClick={() => handleAnswer(q.id, optIdx)}
                                        disabled={isReview}
                                        className={`relative aspect-[4/3] rounded-xl border-2 overflow-hidden transition-all ${borderClass} ${bgClass} ${opacityClass}`}
                                    >
                                        <div className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${userAnswer === optIdx || (isReview && optIdx === q.correctAnswer) ? 'bg-indigo-600 text-white' : 'bg-slate-100/90 text-slate-600 shadow-sm'}`}>
                                            {getCircleNumber(optIdx)}
                                        </div>
                                        {img ? (
                                            <img src={img} className="w-full h-full object-contain" alt={`Option ${optIdx + 1}`} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">No Image</div>
                                        )}
                                        {isReview && optIdx === q.correctAnswer && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
                                                <Check className="w-12 h-12 text-green-600 drop-shadow-md" />
                                            </div>
                                        )}
                                        {isReview && userAnswer === optIdx && userAnswer !== q.correctAnswer && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
                                                <X className="w-12 h-12 text-red-600 drop-shadow-md" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`grid ${q.options.some(o => o.length > 25) ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-x-8 gap-y-2`}>
                            {q.options.map((opt, optIdx) => {
                                let optionClass = "hover:bg-slate-100 border-transparent bg-transparent";
                                if (isReview) {
                                    if (optIdx === q.correctAnswer) optionClass = "bg-green-100 border-green-500 text-green-900 font-bold";
                                    else if (userAnswer === optIdx && userAnswer !== q.correctAnswer) optionClass = "bg-red-100 border-red-500 text-red-900 font-bold";
                                    else optionClass = "opacity-50";
                                } else {
                                    if (userAnswer === optIdx) optionClass = "bg-indigo-50/50"; 
                                }
                                return (
                                    <label key={optIdx} className={`flex items-start cursor-pointer p-2 rounded -ml-2 transition-colors border ${optionClass}`}>
                                        <input type="radio" name={`q-${q.id}`} className="hidden" checked={userAnswer === optIdx} onChange={() => handleAnswer(q.id, optIdx)} disabled={isReview} />
                                        <span className={`text-lg mr-2 font-sans ${userAnswer === optIdx ? 'text-black font-bold' : 'text-slate-500'}`}>{getCircleNumber(optIdx)}</span>
                                        <span className={`text-[17px] leading-relaxed mt-0.5 ${userAnswer === optIdx && !isReview ? 'text-indigo-900 font-bold underline decoration-indigo-300 underline-offset-4' : 'text-slate-800'}`}>{opt}</span>
                                        {isReview && optIdx === q.correctAnswer && <Check className="w-5 h-5 text-green-600 ml-auto" />}
                                        {isReview && userAnswer === optIdx && userAnswer !== q.correctAnswer && <X className="w-5 h-5 text-red-600 ml-auto" />}
                                    </label>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderExamContent = () => {
        // ... (renderExamContent unchanged)
        if (!currentExam) return null;
        const nodes: React.ReactNode[] = [];
        let i = 0;
        while (i < currentExam.questions.length) {
            const q = currentExam.questions[i];
            if (q.instruction) {
                nodes.push(
                    <div key={`inst-${q.id}`} className="mb-6 font-bold text-slate-800 text-[17px] bg-slate-100/50 p-2 rounded border-l-4 border-slate-800">
                        {q.instruction}
                    </div>
                );
            }
            const groupCount = q.groupCount && q.groupCount > 1 ? q.groupCount : 1;
            if (groupCount > 1) {
                const subQuestions = currentExam.questions.slice(i, i + groupCount);
                nodes.push(
                    <div key={`group-${q.id}`} className="mb-12 break-inside-avoid">
                        {renderPassageContent(q)}
                        <div className="pl-0 mt-6">
                            {subQuestions.map(subQ => renderQuestionBlock(subQ, false, true))}
                        </div>
                    </div>
                );
                i += groupCount;
            } else {
                nodes.push(renderQuestionBlock(q, true, false));
                i++;
            }
        }
        return nodes;
    };

    const renderReviewHeader = () => {
        // ... (renderReviewHeader unchanged)
        if (!currentExam || !currentReviewAttempt) return null;
        const correctQs: number[] = [];
        const wrongQs: number[] = [];
        currentExam.questions.forEach(q => {
            if (currentReviewAttempt.userAnswers[q.id] === q.correctAnswer) correctQs.push(q.id);
            else wrongQs.push(q.id);
        });
        return (
            <div className="bg-white border-b border-slate-200 shadow-sm p-4 z-20 shrink-0">
                <div className="max-w-[850px] mx-auto flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('HISTORY_LIST')} className="flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600">
                            <ArrowLeft className="w-4 h-4 mr-1" /> {labels.backToExams}
                        </button>
                        <h3 className="font-bold text-slate-800">{labels.examReview}</h3>
                        <div className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">
                            {labels.score}: <span className="text-indigo-600 font-bold">{currentReviewAttempt.score}</span> / {currentReviewAttempt.maxScore}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {wrongQs.length > 0 && (
                            <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded border border-red-100">
                                <span className="font-bold text-red-600">{labels.wrong}</span>
                                {wrongQs.map(id => (
                                    <button key={id} onClick={() => scrollToQuestion(id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors font-medium">{id}</button>
                                ))}
                            </div>
                        )}
                        {correctQs.length > 0 && (
                            <div className="flex items-center gap-2 bg-green-50 px-2 py-1 rounded border border-green-100">
                                <span className="font-bold text-green-600">{labels.correct}:</span>
                                {correctQs.map(id => (
                                    <button key={id} onClick={() => scrollToQuestion(id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-green-200 text-green-600 hover:bg-green-600 hover:text-white transition-colors font-medium">{id}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ... (rest of main render unchanged)
    
    // --- MAIN RENDER ---
    if (view === 'LIST') {
        // ... (Unchanged LIST View code from original file)
        return (
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{labels.topikExam}</h2>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Reading Exams */}
                    <div>
                        <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                            Reading
                        </h3>
                        <div className="space-y-4">
                            {readingExams.map(exam => {
                                const attempts = history.filter(h => h.examId === exam.id);
                                const hasAttempts = attempts.length > 0;
                                const bestScore = hasAttempts ? Math.max(...attempts.map(a => a.score)) : 0;

                                return (
                                    <div key={exam.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{exam.title}</h4>
                                                <p className="text-sm text-slate-500">{exam.questions.length} {labels.questions} • {exam.timeLimit} min</p>
                                            </div>
                                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded">{labels.round} {exam.round}</span>
                                        </div>
                                        
                                        {hasAttempts && (
                                            <div className="mb-4 mt-2 flex items-center text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                                                <Trophy className="w-4 h-4 mr-1.5" /> 
                                                {labels.bestScore} {bestScore} pts
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-4">
                                            {hasAttempts ? (
                                                <>
                                                    <button onClick={() => selectExam(exam)} className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors flex items-center justify-center">
                                                        <RotateCcw className="w-4 h-4 mr-2" />
                                                        {labels.retake}
                                                    </button>
                                                    <button onClick={() => viewHistoryList(exam.id)} className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors flex items-center justify-center">
                                                        <History className="w-4 h-4 mr-2" />
                                                        {labels.history}
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => selectExam(exam)} className="w-full py-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 font-medium rounded-lg transition-colors">
                                                    {labels.startExam}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Listening Exams */}
                    <div>
                        <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                            Listening
                        </h3>
                        <div className="space-y-4">
                            {listeningExams.map(exam => {
                                const attempts = history.filter(h => h.examId === exam.id);
                                const hasAttempts = attempts.length > 0;
                                const bestScore = hasAttempts ? Math.max(...attempts.map(a => a.score)) : 0;

                                return (
                                    <div key={exam.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{exam.title}</h4>
                                                <p className="text-sm text-slate-500">{exam.questions.length} {labels.questions} • {exam.timeLimit} min</p>
                                            </div>
                                            <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded">{labels.round} {exam.round}</span>
                                        </div>
                                        
                                        {hasAttempts && (
                                            <div className="mb-4 mt-2 flex items-center text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                                                <Trophy className="w-4 h-4 mr-1.5" /> 
                                                {labels.bestScore} {bestScore} pts
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-4">
                                            {hasAttempts ? (
                                                <>
                                                    <button onClick={() => selectExam(exam)} className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors flex items-center justify-center">
                                                        <RotateCcw className="w-4 h-4 mr-2" />
                                                        {labels.retake}
                                                    </button>
                                                    <button onClick={() => viewHistoryList(exam.id)} className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors flex items-center justify-center">
                                                        <History className="w-4 h-4 mr-2" />
                                                        {labels.history}
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => selectExam(exam)} className="w-full py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 font-medium rounded-lg transition-colors">
                                                    {labels.startExam}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'HISTORY_LIST' && currentExam) {
        // ... (HISTORY_LIST view unchanged)
        const attempts = history.filter(h => h.examId === currentExam.id).sort((a, b) => b.timestamp - a.timestamp);
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <button onClick={() => setView('LIST')} className="flex items-center text-slate-500 hover:text-indigo-600 mb-4 font-bold">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {labels.backToExams}
                </button>
                <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{currentExam.title}</h2>
                    <p className="text-slate-500 mb-6">{labels.attemptHistory}</p>
                    <div className="space-y-3">
                        {attempts.map((attempt, idx) => (
                            <button key={attempt.id} onClick={() => openReview(attempt)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white p-2 rounded-full border border-slate-200 text-slate-400 font-mono text-sm font-bold">#{attempts.length - idx}</div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-slate-800 flex items-center"><Calendar className="w-3 h-3 mr-1.5 text-slate-400" />{new Date(attempt.timestamp).toLocaleDateString()} {new Date(attempt.timestamp).toLocaleTimeString()}</div>
                                        <div className="text-xs text-slate-500 mt-1">{labels.completed}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-indigo-600">{attempt.score} <span className="text-slate-400 text-xs font-normal">/ {attempt.maxScore}</span></div>
                                        <div className="text-xs text-slate-400">{labels.score}</div>
                                    </div>
                                    <Eye className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'COVER' && currentExam) {
        // ... (COVER view unchanged)
        return (
            <div className="min-h-screen bg-slate-200 py-8 flex justify-center items-start">
                <div className="bg-white w-full max-w-[800px] shadow-2xl min-h-[1000px] p-12 border border-slate-300 relative">
                    <div className="border-2 border-black p-8 h-full flex flex-col justify-between">
                        <div className="text-center space-y-2 mb-12">
                            <h1 className="text-3xl font-serif font-bold tracking-widest">유 의 사 항</h1>
                            <h2 className="text-xl font-serif font-bold">{labels.information}</h2>
                        </div>
                        <div className="space-y-8 font-serif leading-relaxed text-lg text-slate-900">
                             <div><p className="mb-1">1. 시험 시작 지시가 있을 때까지 문제를 풀지 마십시오.</p><p className="text-sm text-slate-600 font-sans">{labels.topikInstructions[1]}</p></div>
                             <div><p className="mb-1">2. 수험번호와 이름을 정확하게 적어 주십시오.</p><p className="text-sm text-slate-600 font-sans">{labels.topikInstructions[2]}</p></div>
                             <div><p className="mb-1">3. 답안지를 구기거나 훼손하지 마십시오.</p><p className="text-sm text-slate-600 font-sans">{labels.topikInstructions[3]}</p></div>
                             <div><p className="mb-1">4. 답안지의 이름, 수험번호 및 정답의 기입은 배부된 펜을 사용하여 주십시오.</p><p className="text-sm text-slate-600 font-sans">{labels.topikInstructions[4]}</p></div>
                        </div>
                        <div className="mt-20 flex justify-center">
                            <button onClick={startExam} className="px-12 py-4 bg-black text-white text-xl font-bold hover:bg-slate-800 transition-colors shadow-lg">{labels.startExam}</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- EXAM / REVIEW VIEW ---
    if ((view === 'EXAM' || view === 'REVIEW') && currentExam) {
        return (
            <div className="flex flex-col h-screen bg-slate-200 overflow-hidden relative">
                {/* Floating Audio Player - only for Listening Exams in EXAM mode */}
                {view === 'EXAM' && currentExam.type === 'LISTENING' && currentExam.audioUrl && (
                    <FloatingAudioPlayer src={currentExam.audioUrl} />
                )}

                {/* Top Bar - EXAM MODE */}
                {view === 'EXAM' && (
                    <div className="bg-slate-900 text-white h-14 flex justify-between items-center px-6 shadow-md z-20 shrink-0">
                        <div className="flex items-center space-x-4"><span className="font-bold text-lg">{currentExam.title}</span></div>
                        <div className={`flex items-center text-xl font-mono font-bold ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                            <Clock className="w-5 h-5 mr-2" />{formatTime(timeLeft)}
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={submitExam} className="px-4 py-1.5 bg-white text-slate-900 rounded font-bold hover:bg-slate-100 text-sm">{labels.submitExam}</button>
                        </div>
                    </div>
                )}

                {/* Review Header - REVIEW MODE */}
                {view === 'REVIEW' && renderReviewHeader()}

                <div className="flex flex-1 overflow-hidden relative flex-row">
                    {/* PAPER CONTAINER */}
                    <div className={`flex-1 overflow-y-auto p-4 lg:p-8 flex justify-center bg-slate-200 ${view === 'EXAM' ? 'select-none' : 'select-text'}`}>
                        {/* THE PAPER */}
                        <div className="bg-white w-full max-w-[850px] shadow-xl h-max min-h-[1200px] pb-20 border border-slate-300 relative text-black">
                            {/* Exam Header */}
                            <div className="pt-12 px-12 pb-6 text-center border-b-2 border-black mb-8">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-1">
                                        <div className="bg-slate-800 text-white rounded-full p-1"><Trophy className="w-3 h-3"/></div><span className="font-bold">TOPIK</span>
                                    </div>
                                    <span className="text-sm text-slate-500">제{currentExam.round}회 한국어능력시험</span>
                                </div>
                                <div className="border-2 border-black rounded-full inline-block px-12 py-2 mb-6">
                                    <h1 className="text-3xl font-extrabold tracking-widest font-sans">TOPIK Ⅱ <span className="bg-black text-white rounded-full px-2 ml-2 text-2xl">B</span></h1>
                                </div>
                                <div className="flex justify-center">
                                    <div className="flex border border-slate-400 bg-slate-100">
                                        <div className="px-6 py-2 border-r border-slate-400 font-bold bg-slate-200 text-lg">
                                            {currentExam.type === 'READING' ? '2교시' : '1교시'}
                                        </div>
                                        <div className="px-12 py-2 font-bold text-lg bg-slate-100">{currentExam.type === 'READING' ? '읽 기' : '듣 기'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* QUESTIONS AREA */}
                            <div className="px-8 lg:px-16 font-serif">
                                {renderExamContent()}
                            </div>
                            
                            {/* Annotation Menu (unchanged) */}
                            {showAnnotationMenu && menuPosition && view === 'REVIEW' && (
                                <div 
                                    className="annotation-menu fixed z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-4 w-72 animate-in zoom-in-95 duration-200 text-left"
                                    style={{ 
                                        top: `${menuPosition.top}px`, 
                                        left: `${menuPosition.left}px`,
                                        transform: 'translate(-50%, -100%)' 
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-slate-700 text-sm">{labels.annotate}</h4>
                                        <button onClick={() => setShowAnnotationMenu(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                                    </div>
                                    <div className="flex space-x-2 mb-4">
                                        {['yellow', 'green', 'blue', 'pink'].map(color => (
                                            <button 
                                                key={color} 
                                                onClick={() => saveHighlight(color as any)} 
                                                className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color === 'yellow' ? '#fef08a' : color === 'green' ? '#bbf7d0' : color === 'blue' ? '#bfdbfe' : '#fbcfe8' }}
                                            />
                                        ))}
                                    </div>
                                    <div className="mb-2">
                                        <textarea 
                                            value={noteInput} 
                                            onChange={(e) => setNoteInput(e.target.value)}
                                            className="w-full text-sm p-2 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800"
                                            rows={3}
                                            placeholder={labels.addNote}
                                        />
                                    </div>
                                    <button onClick={saveNote} className="w-full py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">{labels.saveNote}</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* REVIEW SIDEBAR */}
                    {view === 'REVIEW' && sidebarAnnotations.length > 0 && (
                        <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-30 overflow-hidden shadow-xl shrink-0">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 flex items-center">
                                    <MessageSquare className="w-4 h-4 mr-2 text-indigo-500" />
                                    {labels.attemptHistory} Notes
                                </h3>
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{sidebarAnnotations.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {sidebarAnnotations.map((ann) => (
                                    <div 
                                        key={ann.id} 
                                        className="p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-sm group"
                                        onClick={() => {
                                            const el = document.getElementById(`ann-${ann.id}`);
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="w-3 h-3 rounded-full mt-1 border border-slate-100" style={{ backgroundColor: ann.color === 'yellow' ? '#fef08a' : ann.color === 'green' ? '#bbf7d0' : ann.color === 'blue' ? '#bfdbfe' : '#fbcfe8' }} />
                                            <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <div className="text-sm font-medium text-slate-800 mb-2 line-clamp-2 border-l-2 border-slate-100 pl-2">"{ann.text}"</div>
                                        {ann.note && <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">{ann.note}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'RESULT' && currentExam && currentReviewAttempt) {
        // ... (RESULT view unchanged)
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                        <Trophy className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{labels.examCompleted}</h2>
                    <p className="text-slate-500 mb-8">{currentExam.title}</p>
                    
                    <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
                        <div className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">{labels.yourScore}</div>
                        <div className="text-5xl font-extrabold text-indigo-600">
                            {currentReviewAttempt.score} <span className="text-2xl text-slate-400 font-medium">/ {currentReviewAttempt.maxScore}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button onClick={() => setView('REVIEW')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center"><Eye className="w-5 h-5 mr-2" /> {labels.inspectExam}</button>
                        <button onClick={() => setView('LIST')} className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors">{labels.backToExamList}</button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default TopikModule;
