import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
// import { generateReadingPassage } from '../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../types';
import {
  Play, Pause, Volume2, ChevronRight, Music,
  ArrowLeft, Languages,
  SkipBack, SkipForward, Headphones
} from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { useAnnotation } from '../hooks/useAnnotation';
import AnnotationMenu from './AnnotationMenu';
import { getHighlightClasses } from '../utils/highlightUtils';
import AnnotationSidebar from './annotation/AnnotationSidebar';
import { ListeningModuleSkeleton } from './common';

// Stub for deleted service
const generateReadingPassage = async (
  institute: string,
  level: number,
  unit: number,
  lang: Language,
  content: TextbookContent
): Promise<ReadingContent | null> => {
  console.warn("AI Generation unavailable: geminiService deleted");
  // Return basic content if available
  return {
    koreanText: content.readingText || content.listeningScript || '',
    englishTranslation: content.readingTranslation || content.listeningTranslation || '',
    title: content.readingTitle || content.listeningTitle || `Unit ${unit}`,
    keyVocabulary: [] // Added missing property
  };
};

interface ListeningModuleProps {
  course: CourseSelection;
  instituteName: string;
  onSaveAnnotation: (annotation: Annotation) => void;
  annotations: Annotation[];
  language: Language;
  levelContexts: Record<number, TextbookContent>;
}

const ListeningModule: React.FC<ListeningModuleProps> = ({
  course,
  instituteName,
  onSaveAnnotation,
  annotations,
  language,
  levelContexts,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeUnit = searchParams.get('unit') ? parseInt(searchParams.get('unit')!, 10) : null;

  const setActiveUnit = (unit: number | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (unit) {
        newParams.set('unit', unit.toString());
      } else {
        newParams.delete('unit');
      }
      return newParams;
    });
  };

  const [passage, setPassage] = useState<ReadingContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const manualAudioRef = useRef<HTMLAudioElement | null>(null);

  const labels = getLabels(language);
  const content = activeUnit ? levelContexts[activeUnit] : undefined;

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-LISTENING`
    : '';

  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  // editNoteInput removed, managed by sidebar
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [newlyCreatedAnnotationId, setNewlyCreatedAnnotationId] = useState<string | null>(null);

  const {
    contentRef,
    handleTextSelection: originalHandleTextSelection,
    saveAnnotation,
    deleteAnnotation,
    cancelAnnotation,
    showAnnotationMenu,
    menuPosition,
    selectedColor,
    setSelectedColor,
    currentSelectionRange
  } = useAnnotation(contextKey, annotations, onSaveAnnotation);

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setActiveAnnotationId(null);
      setEditingAnnotationId(null);
    }
    originalHandleTextSelection(e);
  };

  const currentAnnotations = useMemo(() =>
    annotations
      .filter(a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined && a.color)
      .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0)),
    [annotations, contextKey]
  );

  const sidebarAnnotations = useMemo(() =>
    currentAnnotations.filter(a =>
      (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
    ),
    [currentAnnotations, editingAnnotationId]
  );

  useEffect(() => {
    const fetchContent = async () => {
      if (!activeUnit || !content) return;

      setLoading(true);
      setPassage(null);

      try {
        const effectiveContent = {
          ...content,
          readingText: content.listeningScript || content.readingText || '',
          readingTranslation: content.listeningTranslation || content.readingTranslation || '',
          readingTitle: content.listeningTitle || '',
        };

        const data = await generateReadingPassage(
          instituteName,
          course.level,
          activeUnit,
          language,
          effectiveContent
        );
        setPassage(data);
      } catch (error) {
        console.error('Content generation failed', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [activeUnit, instituteName, course.level, language, content]);

  const togglePlayback = () => {
    if (manualAudioRef.current) {
      if (isPlaying) {
        manualAudioRef.current.pause();
        setIsPlaying(false);
      } else {
        manualAudioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const skipTime = (seconds: number) => {
    if (manualAudioRef.current) {
      manualAudioRef.current.currentTime += seconds;
    }
  };

  const changeSpeed = (rate: number) => {
    if (manualAudioRef.current) manualAudioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const handleDeleteAnnotation = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, color: null, note: '' });
    }
  };

  const handleUpdateNote = (id: string, text: string) => {
    // If input is empty, treat as Cancel
    if (!text.trim()) {
      if (id === newlyCreatedAnnotationId) {
        handleDeleteAnnotation(id); // Clean up new empty annotation
      }
      setEditingAnnotationId(null);
      setActiveAnnotationId(null);
      setNewlyCreatedAnnotationId(null);
      return;
    }

    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, note: text });
    }
    setEditingAnnotationId(null);
    setActiveAnnotationId(null);
    setNewlyCreatedAnnotationId(null);
  };

  const isNote = (ann: Annotation) => !!(ann.note && ann.note.trim());

  const renderHighlightedText = (fullText: string) => {
    if (!fullText) return null;

    const charMap: { annotation?: Annotation }[] = new Array(fullText.length).fill({});
    currentAnnotations.forEach(ann => {
      if (ann.startOffset === undefined || ann.endOffset === undefined) return;
      for (let i = ann.startOffset; i < ann.endOffset; i++) {
        if (i < fullText.length) {
          charMap[i] = { annotation: ann };
        }
      }
    });

    const result = [];
    let i = 0;
    while (i < fullText.length) {
      const currentAnn = charMap[i].annotation;
      let j = i + 1;

      while (j < fullText.length) {
        const nextAnn = charMap[j].annotation;
        if (nextAnn !== currentAnn) break;
        j++;
      }

      const segmentText = fullText.slice(i, j);
      let className = 'relative rounded px-0 py-0.5 box-decoration-clone transition-all ';

      if (currentAnn) {
        const isActive = activeAnnotationId === currentAnn.id || editingAnnotationId === currentAnn.id || hoveredAnnotationId === currentAnn.id;
        const hasNote = isNote(currentAnn);

        // specific width/height token or just use text length
        className = getHighlightClasses(currentAnn, !!isActive, !!hasNote);
      }

      if (currentAnn) {
        result.push(
          <span
            key={i}
            id={`annotation-${currentAnn.id}`}
            className={className}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveAnnotationId(currentAnn.id);

              // If it's a pure highlight (no note), start editing so it appears in sidebar
              if (!isNote(currentAnn)) {
                setEditingAnnotationId(currentAnn.id);
              }

              setTimeout(() => {
                const el = document.getElementById(`sidebar-card-${currentAnn.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 0);
            }}
          >
            {segmentText}
            {/* Red dot removed here */}
          </span>
        );
      } else {
        result.push(<span key={i}>{segmentText}</span>);
      }
      i = j;
    }
    return result;
  };

  // --- 1. TOC View ---
  if (!activeUnit) {
    const availableUnits = Object.keys(levelContexts)
      .map(Number)
      .sort((a, b) => a - b);
    const unitsWithAudio = availableUnits.filter(u => {
      const c = levelContexts[u];
      return !!c?.listeningScript || !!c?.listeningAudioUrl;
    });

    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
            <Headphones className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{labels.listening}</h2>
            <p className="text-slate-500">{labels.toc}</p>
          </div>
        </div>

        {unitsWithAudio.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Headphones className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium">{labels.noListening}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {unitsWithAudio.map(u => {
              const c = levelContexts[u];
              const title = c.listeningTitle || (c.listeningScript
                ? c.listeningScript.substring(0, 60) + (c.listeningScript.length > 60 ? '...' : '')
                : `Track ${u}`);
              return (
                <button
                  key={u}
                  onClick={() => setActiveUnit(u)}
                  className="group relative w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all text-left flex justify-between items-center overflow-hidden"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-mono font-bold text-lg group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-violet-700 transition-colors font-serif">
                        {title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          Unit {u}
                        </span>
                        {c.listeningAudioUrl && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                            <Music className="w-3 h-3" /> {labels.originalAudio}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- 2. Loading View ---
  if (loading) {
    return <ListeningModuleSkeleton />;
  }

  // --- 3. Listening Player View ---
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col w-full max-w-[1800px] mx-auto relative bg-slate-50">

      {/* Top Navigation */}
      <div className="flex items-center justify-between py-4 px-6 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveUnit(null)} className="flex items-center gap-2 text-slate-500 hover:text-violet-600 font-bold transition-colors px-3 py-1.5 hover:bg-slate-50 rounded-lg">
            <ArrowLeft className="w-4 h-4" /> {labels.backToList}
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.unit} {activeUnit}</span>
            <h1 className="text-lg font-bold text-slate-800 truncate max-w-md">{passage?.title || labels.listeningExercise}</h1>
          </div>
        </div>

        <button onClick={() => setShowTranslation(!showTranslation)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showTranslation ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Languages className="w-4 h-4" /> {showTranslation ? labels.hideTrans : labels.showTrans}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Audio Player Bar */}
          <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex items-center justify-center gap-6">
            <audio ref={manualAudioRef} src={content?.listeningAudioUrl || ''} onEnded={() => setIsPlaying(false)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} />

            <button onClick={() => skipTime(-5)} className="p-2 text-slate-400 hover:text-violet-600 rounded-full hover:bg-violet-50 transition-colors" title="-5s">
              <SkipBack className="w-6 h-6" />
            </button>

            <button onClick={togglePlayback} className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${isPlaying ? 'bg-violet-600 text-white shadow-violet-200' : 'bg-white text-violet-600 border-2 border-violet-100'}`}>
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>

            <button onClick={() => skipTime(5)} className="p-2 text-slate-400 hover:text-violet-600 rounded-full hover:bg-violet-50 transition-colors" title="+5s">
              <SkipForward className="w-6 h-6" />
            </button>

            <div className="relative ml-4">
              <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <span className="w-10 text-center">{playbackRate}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 py-1 flex flex-col min-w-[80px] z-50">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                    <button key={rate} onClick={() => changeSpeed(rate)} className={`px-4 py-2 text-sm text-center hover:bg-violet-50 transition-colors ${playbackRate === rate ? 'text-violet-600 font-bold bg-violet-50' : 'text-slate-600'}`}>{rate}x</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Script Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className={`flex gap-10 transition-all duration-500 ${showTranslation ? 'max-w-full' : 'max-w-4xl mx-auto'}`}>
              <div ref={contentRef} className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12" onMouseUp={handleTextSelection}>
                <div className="text-lg leading-loose text-slate-800 font-serif whitespace-pre-line select-text">
                  {passage && renderHighlightedText(passage.koreanText)}
                </div>
              </div>

              {showTranslation && passage?.englishTranslation && (
                <div className="flex-1 min-w-0 bg-slate-50 rounded-2xl border border-slate-200/60 p-8 md:p-12 overflow-y-auto">
                  <div className="sticky top-0 bg-slate-50 pb-4 border-b border-slate-200 mb-6 z-10 flex items-center gap-2 text-slate-400 font-bold text-sm uppercase tracking-widest">
                    <Languages className="w-4 h-4" /> Translation
                  </div>
                  <div className="text-base leading-loose text-slate-600 whitespace-pre-line">
                    {passage.englishTranslation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnnotationSidebar
          sidebarAnnotations={sidebarAnnotations}
          activeAnnotationId={activeAnnotationId}
          editingAnnotationId={editingAnnotationId}
          hoveredAnnotationId={hoveredAnnotationId}
          labels={{
            annotate: labels.annotate,
            cancel: labels.cancel,
            save: labels.save,
            clickToAddNote: labels.clickToAddNote
          }}
          onActivate={setActiveAnnotationId}
          onHover={setHoveredAnnotationId}
          onEdit={(id: string) => {
            setEditingAnnotationId(id);
            setActiveAnnotationId(id);
            setTimeout(() => {
              const el = document.getElementById(`annotation-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
          }}
          onCancelEdit={(id: string) => {
            if (id === newlyCreatedAnnotationId) {
              handleDeleteAnnotation(id);
            }
            setEditingAnnotationId(null);
            setNewlyCreatedAnnotationId(null);
          }}
          onSave={handleUpdateNote}
          onDelete={(id: string) => handleDeleteAnnotation(id)}
        />

      </div>

      <AnnotationMenu
        visible={showAnnotationMenu}
        position={menuPosition}
        selectionText={currentSelectionRange?.text}
        onAddNote={() => {
          const id = saveAnnotation(undefined, undefined, true);
          if (id) {
            const existed = annotations.some(a => a.id === id);
            if (!existed) {
              setNewlyCreatedAnnotationId(id);
            }
            setEditingAnnotationId(id);
            setTimeout(() => {
              const el = document.getElementById(`sidebar-card-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }}
        onHighlight={(color) => saveAnnotation(color, undefined, true)}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onClose={cancelAnnotation}
        onDelete={deleteAnnotation}
        labels={labels}
      />
    </div>
  );
};

export default ListeningModule;