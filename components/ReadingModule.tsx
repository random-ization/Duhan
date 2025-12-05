import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateReadingPassage } from '../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../types';
import { X, ChevronRight, MessageSquare, Trash2 } from 'lucide-react';
import { getLabels } from '../utils/i18n';

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

  // Annotation & Selection State
  const [currentSelectionRange, setCurrentSelectionRange] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Translation Hover State
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

  // Ref for the content text container
  const contentRef = useRef<HTMLDivElement>(null);

  const labels = getLabels(language);

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-READING`
    : '';

  // Filter Annotations: Only show those with valid offsets
  const currentAnnotations = annotations
    .filter(
      a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined
    )
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

  // 1. Sidebar Logic: Only show annotations that actually have a note text
  const sidebarAnnotations = currentAnnotations.filter(a => a.note && a.note.trim().length > 0);

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

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAnnotationMenu &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        // Don't close if clicking inside the menu itself
        if (!target.closest('.annotation-menu')) {
          setShowAnnotationMenu(false);
          setCurrentSelectionRange(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAnnotationMenu]);

  // Handle Freeform Text Selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    if (!contentRef.current || !contentRef.current.contains(selection.anchorNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    const end = start + range.toString().length;
    const text = range.toString();

    if (text.trim().length === 0) return;

    setCurrentSelectionRange({ start, end, text });

    setMenuPosition({
      top: rect.top + window.scrollY - 10,
      left: rect.left + rect.width / 2 + window.scrollX,
    });

    const exactMatch = currentAnnotations.find(
      a => Math.abs((a.startOffset || 0) - start) < 2 && Math.abs((a.endOffset || 0) - end) < 2
    );

    if (exactMatch && exactMatch.note) {
      setNoteInput(exactMatch.note);
    } else {
      setNoteInput('');
    }

    setShowAnnotationMenu(true);
  };

  const saveHighlight = (color: Annotation['color']) => {
    if (!currentSelectionRange) return;

    const exactMatch = currentAnnotations.find(
      a =>
        Math.abs((a.startOffset || 0) - currentSelectionRange.start) < 2 &&
        Math.abs((a.endOffset || 0) - currentSelectionRange.end) < 2
    );

    const newAnnotation: Annotation = {
      id: exactMatch?.id || Date.now().toString(),
      contextKey,
      startOffset: currentSelectionRange.start,
      endOffset: currentSelectionRange.end,
      text: currentSelectionRange.text,
      color: color,
      note: exactMatch?.note || '',
      timestamp: Date.now(),
    };
    onSaveAnnotation(newAnnotation);
    setShowAnnotationMenu(false);
    setCurrentSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  };

  const saveNote = () => {
    if (!currentSelectionRange) return;
    const exactMatch = currentAnnotations.find(
      a =>
        Math.abs((a.startOffset || 0) - currentSelectionRange.start) < 2 &&
        Math.abs((a.endOffset || 0) - currentSelectionRange.end) < 2
    );

    const newAnnotation: Annotation = {
      id: exactMatch?.id || Date.now().toString(),
      contextKey,
      startOffset: currentSelectionRange.start,
      endOffset: currentSelectionRange.end,
      text: currentSelectionRange.text,
      color: exactMatch?.color || null,
      note: noteInput,
      timestamp: Date.now(),
    };
    onSaveAnnotation(newAnnotation);
    setShowAnnotationMenu(false);
    setCurrentSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  };

  const deleteAnnotation = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, color: null, note: '' });
    }
  };

  // 3. Sentence parsing logic for Hover Sync
  const koreanSentenceRanges = useMemo(() => {
    if (!passage?.koreanText) return [];
    const ranges: { start: number; end: number }[] = [];
    // Regex to find sentences ending with . ! ? followed by whitespace or end of string
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

    // Character map for Annotations
    const charMap: { annotation?: Annotation }[] = new Array(fullText.length).fill({});
    currentAnnotations.forEach(ann => {
      if (ann.startOffset === undefined || ann.endOffset === undefined) return;
      for (let i = ann.startOffset; i < ann.endOffset; i++) {
        if (i < fullText.length) {
          charMap[i] = { annotation: ann };
        }
      }
    });

    // Character range for Hovered Sentence
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

      // Continue while annotation status AND hover status remain the same
      while (j < fullText.length) {
        const nextAnn = charMap[j].annotation;
        const nextHover = j >= hoverStart && j < hoverEnd;

        if (nextAnn !== currentAnn || nextHover !== isHovered) break;
        j++;
      }

      const segmentText = fullText.slice(i, j);

      let className = 'relative rounded px-0 py-0.5 box-decoration-clone transition-all ';

      // Apply User Highlight
      if (currentAnn) {
        const colorClass = currentAnn.color ? `highlight-${currentAnn.color}` : 'bg-slate-200';
        className += `${colorClass} cursor-pointer hover:brightness-95 `;
      }

      // Apply Hover Sync Effect (Strong underline)
      if (isHovered) {
        // Add a distinct style to show this is being referenced by the translation
        className += 'border-b-2 border-indigo-500 bg-indigo-50/30 ';
      }

      if (currentAnn) {
        result.push(
          <span key={i} id={`annotation-${currentAnn.id}`} className={className}>
            {segmentText}
            {currentAnn.note && (
              <span className="absolute -top-1.5 -right-1 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
            )}
          </span>
        );
      } else {
        // Just hover effect or plain text
        if (isHovered) {
          result.push(
            <span key={i} className={className}>
              {segmentText}
            </span>
          );
        } else {
          result.push(<span key={i}>{segmentText}</span>);
        }
      }
      i = j;
    }
    return result;
  };

  // Table of Contents View
  if (!activeUnit) {
    const availableUnits = Object.keys(levelContexts)
      .map(Number)
      .sort((a, b) => a - b);
    const unitsWithReading = availableUnits.filter(u => !!levelContexts[u]?.readingText);

    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {labels.toc} - {labels.reading}
        </h2>
        {unitsWithReading.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
            {labels.noReadings}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unitsWithReading.map(u => {
              const content = levelContexts[u];
              return (
                <button
                  key={u}
                  onClick={() => setActiveUnit(u)}
                  className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex justify-between items-center group"
                >
                  <div>
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                      {labels.unit} {u}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {content.readingTitle || `Reading Passage ${u}`}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {content.readingText.substring(0, 100)}...
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
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
        <p className="text-slate-500">{labels.loadingReading}</p>
      </div>
    );
  }

  if (!passage) return <div>{labels.errorLoading}</div>;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col max-w-7xl mx-auto w-full">
      {/* Navigation Header */}
      <div className="mb-4 flex items-center">
        <button
          onClick={() => setActiveUnit(null)}
          className="text-sm text-slate-500 hover:text-indigo-600 font-medium flex items-center"
        >
          ← {labels.backToList}
        </button>
        <div className="mx-4 h-4 w-px bg-slate-300"></div>
        <span className="text-sm font-bold text-slate-700">
          {labels.unit} {activeUnit}: {passage.title}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6">
        {/* Main Text Area - Scrollable */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-8 relative">
            <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">{passage.title}</h2>

            {/* Korean Text - Action: MouseUp for selection */}
            <div
              ref={contentRef}
              className="prose prose-xl max-w-none mb-8 leading-loose font-serif text-slate-800 select-text"
              onMouseUp={handleTextSelection}
            >
              {renderHighlightedText(passage.koreanText)}
            </div>

            {/* Annotation Menu Popover */}
            {showAnnotationMenu && menuPosition && (
              <div
                className="annotation-menu fixed z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-4 w-72 animate-in zoom-in-95 duration-200"
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                  transform: 'translate(-50%, -100%)', // Center horizontally, place above
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-700 text-sm">{labels.annotate}</h4>
                  <button
                    onClick={() => setShowAnnotationMenu(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => saveHighlight('yellow')}
                    className="w-6 h-6 rounded-full bg-[#fef08a] border border-slate-200 hover:scale-110 transition-transform"
                  ></button>
                  <button
                    onClick={() => saveHighlight('green')}
                    className="w-6 h-6 rounded-full bg-[#bbf7d0] border border-slate-200 hover:scale-110 transition-transform"
                  ></button>
                  <button
                    onClick={() => saveHighlight('blue')}
                    className="w-6 h-6 rounded-full bg-[#bfdbfe] border border-slate-200 hover:scale-110 transition-transform"
                  ></button>
                  <button
                    onClick={() => saveHighlight('pink')}
                    className="w-6 h-6 rounded-full bg-[#fbcfe8] border border-slate-200 hover:scale-110 transition-transform"
                  ></button>
                  <button
                    onClick={() => saveHighlight(null)}
                    className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-2">
                  <textarea
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    rows={3}
                    placeholder={labels.addNote}
                  />
                </div>
                <button
                  onClick={saveNote}
                  className="w-full py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
                >
                  {labels.saveNote}
                </button>
                <div className="absolute left-1/2 -bottom-2 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45 -translate-x-1/2"></div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-6">
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="text-indigo-600 font-medium hover:underline mb-2"
              >
                {showTranslation ? labels.hideTrans : labels.showTrans}
              </button>
              {showTranslation && (
                <div className="text-slate-600 mt-2 bg-slate-50 p-6 rounded-xl text-lg leading-relaxed">
                  {/* 3. Render translation with hover handlers */}
                  {translationSentences.map((sentence, idx) => (
                    <span
                      key={idx}
                      className="mr-1 hover:bg-indigo-100 rounded cursor-default transition-colors"
                      onMouseEnter={() => setHoveredSentenceIndex(idx)}
                      onMouseLeave={() => setHoveredSentenceIndex(null)}
                    >
                      {sentence}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Notes Panel - 1. Only render if sidebarAnnotations > 0 */}
        {sidebarAnnotations.length > 0 && (
          <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-indigo-500" />
                My Notes
              </h3>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {sidebarAnnotations.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sidebarAnnotations.map(ann => (
                <div
                  key={ann.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-sm group"
                  onClick={() => {
                    // Scroll to annotation logic
                    const el = document.getElementById(`annotation-${ann.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    {/* Color Indicator */}
                    <div
                      className={`w-3 h-3 rounded-full mt-1 bg-${ann.color || 'slate'}-300 border border-slate-100`}
                    ></div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                      }}
                      className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm font-medium text-slate-800 mb-2 line-clamp-2 border-l-2 border-slate-100 pl-2">
                    "{ann.text}"
                  </div>
                  {ann.note && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">{ann.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingModule;
