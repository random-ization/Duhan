import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateReadingPassage } from '../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../types';
import { X, ChevronRight, MessageSquare, Trash2, Check } from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { useAnnotation } from '../hooks/useAnnotation';
import AnnotationMenu from './AnnotationMenu';

interface ReadingModuleProps {
  course: CourseSelection;
  instituteName: string;
  onSaveWord: (word: string, meaning: string) => void;
  onSaveAnnotation: (annotation: Annotation) => void;
  savedWordKeys: string[];
  annotations: Annotation[];
  language: Language;
  levelContexts: Record<number, TextbookContent>;
}

const ReadingModule: React.FC<ReadingModuleProps> = ({
  course,
  instituteName,
  onSaveWord,
  onSaveAnnotation,
  savedWordKeys,
  annotations,
  language,
  levelContexts,
}) => {
  const [activeUnit, setActiveUnit] = useState<number | null>(null);
  const [passage, setPassage] = useState<ReadingContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // Translation Hover State
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

  const labels = getLabels(language);

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-READING`
    : '';

  // Sidebar Edit State
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editNoteInput, setEditNoteInput] = useState('');
  // Active state for highlighting (User Request: Underline default, Highlight on active)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const {
    contentRef,
    handleTextSelection,
    saveAnnotation,
    deleteAnnotation,
    cancelAnnotation,
    showAnnotationMenu,
    menuPosition,
    selectedColor,
    setSelectedColor,
    currentSelectionRange
  } = useAnnotation(contextKey, annotations, onSaveAnnotation);

  // Filter Annotations: Only show those with valid offsets
  const currentAnnotations = annotations
    .filter(
      a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined
    )
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

  // Sidebar Logic
  const sidebarAnnotations = currentAnnotations;

  // Load reading when active unit changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!activeUnit) return;

      setLoading(true);
      setPassage(null);
      const content = levelContexts[activeUnit];

      try {
        const data = await generateReadingPassage(
          instituteName,
          course.level,
          activeUnit,
          language,
          content
        );
        setPassage(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [activeUnit, instituteName, course.level, language, levelContexts]);


  const handleDeleteAnnotation = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, color: null, note: '' }); // Treat as delete
    }
  };

  const handleUpdateNote = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, note: editNoteInput });
    }
    setEditingAnnotationId(null);
  };

  // Sentence parsing logic for Hover Sync
  const koreanSentenceRanges = useMemo(() => {
    if (!passage?.koreanText) return [];
    const ranges: { start: number; end: number }[] = [];
    const regex = /[^.!?\n]+[.!?\n]*/g;
    let match;
    while ((match = regex.exec(passage.koreanText)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
    return ranges;
  }, [passage]);

  const translationSentences = useMemo(() => {
    if (!passage?.englishTranslation) return [];
    return passage.englishTranslation.match(/[^.!?\n]+[.!?\n]*/g) || [passage.englishTranslation];
  }, [passage]);

  // Render text with highlights AND hover sync
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

    let hoverStart = -1;
    let hoverEnd = -1;
    if (hoveredSentenceIndex !== null && koreanSentenceRanges[hoveredSentenceIndex]) {
      hoverStart = koreanSentenceRanges[hoveredSentenceIndex].start;
      hoverEnd = koreanSentenceRanges[hoveredSentenceIndex].end;
    }

    const result = [];
    let i = 0;
    while (i < fullText.length) {
      const currentAnn = charMap[i].annotation;
      const isHovered = i >= hoverStart && i < hoverEnd;

      let j = i + 1;

      while (j < fullText.length) {
        const nextAnn = charMap[j].annotation;
        const nextHover = j >= hoverStart && j < hoverEnd;

        if (nextAnn !== currentAnn || nextHover !== isHovered) break;
        j++;
      }

      const segmentText = fullText.slice(i, j);
      let className = 'relative rounded px-0 py-0.5 box-decoration-clone transition-all ';

      if (currentAnn) {
        // STYLE LOGIC UPDATE:
        // Default: Border Bottom Only
        // Active (Clicked/Edited): Background Highlight
        const isActive = activeAnnotationId === currentAnn.id || editingAnnotationId === currentAnn.id;

        // Define colors map specifically for this
        const colorMap: { [key: string]: { border: string, bg: string } } = {
          'yellow': { border: 'border-yellow-400', bg: 'bg-yellow-200/50' },
          'green': { border: 'border-green-400', bg: 'bg-green-200/50' },
          'blue': { border: 'border-blue-400', bg: 'bg-blue-200/50' },
          'pink': { border: 'border-pink-400', bg: 'bg-pink-200/50' },
        };
        const colors = colorMap[currentAnn.color || 'yellow'] || colorMap['yellow'];

        className += `${colors.border} border-b-2 cursor-pointer `;
        if (isActive) {
          className += `${colors.bg} `;
        } else {
          className += `hover:bg-opacity-50 hover:${colors.bg.split('/')[0]} `; // Subtle hover hint
        }
      }

      if (isHovered && !currentAnn) { // Only show sentence hover if not an annotation (or mix them?)
        // If annotation is present, maybe we don't underline sentence to avoid conflict?
        // Or we just add separate style.
        // Let's keep sentence hover subtle.
        className += 'bg-indigo-50/30 ';
      }

      if (currentAnn) {
        result.push(
          <span
            key={i}
            id={`annotation-${currentAnn.id}`}
            className={className}
            onClick={(e) => {
              e.stopPropagation();
              setActiveAnnotationId(currentAnn.id);
              // Also scroll sidebar
              const el = document.getElementById(`sidebar-card-${currentAnn.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            {segmentText}
            {currentAnn.note && (
              <span className="absolute -top-1.5 -right-1 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
            )}
          </span>
        );
      } else {
        if (isHovered) {
          result.push(<span key={i} className={className}>{segmentText}</span>);
        } else {
          result.push(<span key={i}>{segmentText}</span>);
        }
      }
      i = j;
    }
    return result;
  };

  // ... (TOC and Loading) ... //

  // Keeping the return same until Sidebar
  if (!activeUnit) {
    // (Keep TOC)
    const availableUnits = Object.keys(levelContexts)
      .map(Number)
      .sort((a, b) => a - b);
    const unitsWithReading = availableUnits.filter(u => !!levelContexts[u]?.readingText);

    return (
      <div className="max-w-4xl mx-auto">
        {/* TOC Items */}
        {/* Reuse existing rendering logic via "unchanged" assumption or just overwrite if small */}
        {/* Since I am replacing the top half, I should just handle the TOC return correctly */}
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {labels.toc} - {labels.reading}
        </h2>
        {unitsWithReading.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
            {labels.noReading}
          </div>
        ) : (
          <div className="space-y-4">
            {unitsWithReading.map(u => {
              const c = levelContexts[u];
              const title = c.readingText
                ? c.readingText.substring(0, 50) + '...'
                : `Unit ${u}`;
              return (
                <button
                  key={u}
                  onClick={() => setActiveUnit(u)}
                  className="w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex justify-between items-center group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <span className="font-serif font-bold text-lg">가</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {labels.unit} {u}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 font-serif">
                        {title}
                      </h3>
                      {course.level <= 2 && (
                        <div className="flex gap-2 mt-2">
                          <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Beginner
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-500" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Reading View
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500">{labels.loading}</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col max-w-6xl mx-auto w-full relative">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setActiveUnit(null)}
            className="text-sm text-slate-500 hover:text-indigo-600 font-medium flex items-center"
          >
            ← {labels.backToList}
          </button>
          <div className="mx-4 h-4 w-px bg-slate-300"></div>
          <span className="text-sm font-bold text-slate-700">
            {labels.unit} {activeUnit}
          </span>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0">
          <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
            <h3 className="font-bold text-slate-800">Reading Passage</h3>
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${showTranslation
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              {showTranslation ? labels.hideTrans : labels.showTrans}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative">
            <div className="flex gap-8 h-full">
              {/* Korean Text - Always Visible */}
              <div
                ref={contentRef}
                className={`transition-all duration-300 ${showTranslation ? 'w-1/2' : 'w-full max-w-3xl mx-auto'}`}
                onMouseUp={handleTextSelection}
              >
                <div className="text-lg leading-loose text-slate-800 font-serif whitespace-pre-line select-text">
                  {passage && renderHighlightedText(passage.koreanText)}
                </div>
              </div>

              {/* Translation - Conditionally Visible */}
              {showTranslation && (
                <div className="w-1/2 border-l border-slate-100 pl-8 overflow-y-auto">
                  {translationSentences.map((sentence, idx) => {
                    const isHovered = hoveredSentenceIndex === idx;
                    return (
                      <p
                        key={idx}
                        className={`mb-4 text-slate-600 leading-relaxed transition-colors duration-200 cursor-pointer p-2 rounded ${isHovered ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50'
                          }`}
                        onMouseEnter={() => setHoveredSentenceIndex(idx)}
                        onMouseLeave={() => setHoveredSentenceIndex(null)}
                      >
                        {sentence}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Annotations & Vocabulary */}
        <div className="w-80 flex flex-col gap-4 min-h-0">
          {/* Annotations List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                {labels.annotate}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sidebarAnnotations.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  No notes yet
                </div>
              ) : (
                sidebarAnnotations.map(ann => {
                  const isEditing = editingAnnotationId === ann.id;
                  const isActive = activeAnnotationId === ann.id;

                  if (isEditing) {
                    return (
                      <div
                        key={ann.id}
                        id={`sidebar-card-${ann.id}`}
                        className="bg-white p-3 rounded-lg border-2 border-indigo-500 shadow-md scroll-mt-20"
                      >
                        <div className="text-xs font-bold mb-2 text-slate-500">
                          Editing note for "{ann.text.substring(0, 15)}..."
                        </div>
                        <textarea
                          value={editNoteInput}
                          onChange={(e) => setEditNoteInput(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-200 outline-none mb-2"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingAnnotationId(null)}
                            className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateNote(ann.id)}
                            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ann.id}
                      id={`sidebar-card-${ann.id}`}
                      className={`group p-3 rounded-lg border transition-all cursor-pointer relative scroll-mt-20
                        ${isActive
                          ? 'bg-indigo-50 border-indigo-300 shadow-md'
                          : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:shadow-sm'
                        }`}
                      onClick={() => {
                        // Activate highlight
                        setActiveAnnotationId(ann.id);
                        // Enter edit mode
                        setEditingAnnotationId(ann.id);
                        setEditNoteInput(ann.note || '');

                        // Scroll to text?
                        const el = document.getElementById(`annotation-${ann.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      <div className={`text-xs font-bold mb-1 px-1.5 py-0.5 rounded w-fit bg-${ann.color === 'yellow' ? 'yellow-100 text-yellow-800' : ann.color === 'green' ? 'green-100 text-green-800' : ann.color === 'blue' ? 'blue-100 text-blue-800' : 'pink-100 text-pink-800'}`}>
                        {ann.text.substring(0, 20)}...
                      </div>
                      {ann.note ? (
                        <p className="text-sm text-slate-700">{ann.note}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Click to add note...</p>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(ann.id);
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AnnotationMenu
        visible={showAnnotationMenu}
        position={menuPosition}
        selectionText={currentSelectionRange?.text}
        onAddNote={() => {
          // Quick save and enter edit mode
          const id = saveAnnotation(undefined, undefined, true); // Use current/default color, empty note, and close menu
          if (id) {
            setEditingAnnotationId(id);
            setEditNoteInput('');
            // Use setTimeout to allow render to happen before scrolling
            setTimeout(() => {
              const el = document.getElementById(`sidebar-card-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onSaveWord={(text) => {
          onSaveWord(text, '');
          cancelAnnotation();
        }}
        onClose={cancelAnnotation}
        onDelete={deleteAnnotation}
        labels={labels}
      />
    </div>
  );
};

export default ReadingModule;
