import React, { useState, useEffect, useRef } from 'react';
import { generateReadingPassage } from '../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../types';
import { Play, Pause, RotateCcw, Volume2, Highlighter, X, ChevronRight, Music } from 'lucide-react';
import { getLabels } from '../utils/i18n';

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
  const [activeUnit, setActiveUnit] = useState<number | null>(null);
  const [passage, setPassage] = useState<ReadingContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScript, setShowScript] = useState(false);

  // Annotation State
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-LISTENING`
    : '';
  const currentAnnotations = annotations.filter(a => a.contextKey === contextKey);

  // Refs
  const manualAudioRef = useRef<HTMLAudioElement | null>(null);

  const labels = getLabels(language);
  const content = activeUnit ? levelContexts[activeUnit] : undefined;
  const isManualAudio = !!content?.listeningAudioUrl;

  // Fetch Text Content when active unit changes
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

  // Audio Controls
  const togglePlayback = () => {
    if (isManualAudio) {
      if (manualAudioRef.current) {
        if (isPlaying) {
          manualAudioRef.current.pause();
          setIsPlaying(false);
        } else {
          manualAudioRef.current.play();
          setIsPlaying(true);
        }
      }
    }
  };

  const restartAudio = () => {
    if (isManualAudio && manualAudioRef.current) {
      manualAudioRef.current.currentTime = 0;
      manualAudioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Table of Contents View
  if (!activeUnit) {
    const availableUnits = Object.keys(levelContexts)
      .map(Number)
      .sort((a, b) => a - b);
    // Filter units that have listening script or audio
    const unitsWithAudio = availableUnits.filter(u => {
      const c = levelContexts[u];
      return !!c?.listeningScript || !!c?.listeningAudioUrl;
    });

    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {labels.toc} - {labels.listening}
        </h2>
        {unitsWithAudio.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
            {labels.noListening}
          </div>
        ) : (
          <div className="space-y-4">
            {unitsWithAudio.map(u => {
              const c = levelContexts[u];
              const title = c.listeningScript
                ? c.listeningScript.substring(0, 50) + '...'
                : `Track ${u}`;
              return (
                <button
                  key={u}
                  onClick={() => setActiveUnit(u)}
                  className="w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex justify-between items-center group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Volume2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {labels.unit} {u}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                      {c.listeningAudioUrl && (
                        <span className="inline-flex items-center text-xs text-emerald-600 mt-1 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Music className="w-3 h-3 mr-1" /> {labels.originalAudio}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-slate-50 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500">{labels.preparingListening}</p>
      </div>
    );
  }

  // Helper for transcript sentence parsing
  const getTranscriptSentences = () => {
    const text = content?.listeningScript || passage?.koreanText || '';
    return text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  };
  const sentences = getTranscriptSentences();

  const handleSentenceClick = (idx: number) => {
    setSelectedSentenceIndex(idx);
    setShowAnnotationMenu(true);
    const existing = currentAnnotations.find(a => a.sentenceIndex === idx);
    if (existing && existing.note) setNoteInput(existing.note);
    else setNoteInput('');
  };

  const saveHighlight = (color: Annotation['color']) => {
    if (selectedSentenceIndex === null) return;

    const existing = currentAnnotations.find(a => a.sentenceIndex === selectedSentenceIndex);
    const newAnnotation: Annotation = {
      id: existing?.id || Date.now().toString(),
      contextKey,
      sentenceIndex: selectedSentenceIndex,
      text: sentences[selectedSentenceIndex],
      color: color,
      note: existing?.note || '',
      timestamp: Date.now(),
    };
    onSaveAnnotation(newAnnotation);
    setShowAnnotationMenu(false);
  };

  const saveNote = () => {
    if (selectedSentenceIndex === null) return;
    const existing = currentAnnotations.find(a => a.sentenceIndex === selectedSentenceIndex);
    const newAnnotation: Annotation = {
      id: existing?.id || Date.now().toString(),
      contextKey,
      sentenceIndex: selectedSentenceIndex,
      text: sentences[selectedSentenceIndex],
      color: existing?.color || null,
      note: noteInput,
      timestamp: Date.now(),
    };
    onSaveAnnotation(newAnnotation);
    setShowAnnotationMenu(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center">
        <button
          onClick={() => {
            setActiveUnit(null);
            if (isPlaying && manualAudioRef.current) manualAudioRef.current.pause();
          }}
          className="text-sm text-slate-500 hover:text-indigo-600 font-medium flex items-center"
        >
          ← {labels.backToList}
        </button>
        <div className="mx-4 h-4 w-px bg-slate-300"></div>
        <span className="text-sm font-bold text-slate-700">
          {labels.unit} {activeUnit}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 relative">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Volume2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {passage?.title || labels.listeningExercise}
          </h2>
          <p className="text-slate-500">{labels.listenCarefully}</p>

          {isManualAudio && (
            <audio
              ref={manualAudioRef}
              src={content!.listeningAudioUrl!}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
        </div>

        <div className="flex justify-center items-center space-x-6 mb-10">
          <button
            onClick={restartAudio}
            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            disabled={!isManualAudio}
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          {isPlaying ? (
            <button
              onClick={togglePlayback}
              className="w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 transition-all transform hover:scale-105"
            >
              <Pause className="w-8 h-8 fill-current" />
            </button>
          ) : (
            <button
              onClick={togglePlayback}
              disabled={!isManualAudio}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 ${
                !isManualAudio
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}

          <div className="w-12"></div>
        </div>

        {!isManualAudio && (
          <p className="text-center text-sm text-slate-400 mb-6 italic">{labels.noListening}</p>
        )}

        <div className="border-t border-slate-100 pt-6">
          <button
            onClick={() => setShowScript(!showScript)}
            className="w-full py-2 text-center text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors"
          >
            {showScript ? labels.hideScript : labels.viewScript}
          </button>

          {showScript && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl animate-in slide-in-from-top-4 relative">
              <div className="text-lg leading-relaxed text-slate-800 mb-4 whitespace-pre-line">
                {sentences.map((sentence, idx) => {
                  const annotation = currentAnnotations.find(a => a.sentenceIndex === idx);
                  const highlightClass = annotation?.color ? `highlight-${annotation.color}` : '';
                  const hasNote = !!annotation?.note;

                  return (
                    <span
                      key={idx}
                      onClick={() => handleSentenceClick(idx)}
                      className={`cursor-pointer hover:bg-slate-100 rounded px-1 transition-colors relative ${highlightClass}`}
                    >
                      {sentence}{' '}
                      {hasNote && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full"></span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Annotation Menu Popover (Same as Reading) */}
      {showAnnotationMenu && selectedSentenceIndex !== null && (
        <div className="absolute top-20 right-10 z-20 bg-white shadow-xl border border-slate-200 rounded-xl p-4 w-72 animate-in zoom-in-95 duration-200">
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
            {labels.save}
          </button>
        </div>
      )}
    </div>
  );
};

export default ListeningModule;
