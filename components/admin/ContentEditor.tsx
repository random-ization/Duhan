import React, { useState, useMemo, useCallback } from 'react';
import {
  Institute,
  Language,
  TextbookContextMap,
  TextbookContent,
  LevelConfig,
  ReadingArticleV2,
  ListeningTrackV2,
  VocabularyItemV2,
  GrammarPointV2,
  TextbookContentV2,
  TranslationLanguage,
} from '../../types';
import { getLabels } from '../../utils/i18n';
import { api } from '../../services/api';
import {
  Plus,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Upload,
  Play,
  Pause,
  Pencil,
  Rocket,
  FileText,
  Headphones,
  BookA,
  Languages,
  Music,
  GripVertical,
} from 'lucide-react';

// ============================================================
// TYPES & HELPERS
// ============================================================

interface ContentEditorProps {
  institutes: Institute[];
  textbookContexts: TextbookContextMap;
  language: Language;
  onSaveContext: (key: string, content: TextbookContent) => void;
  onAddInstitute: (name: string, levels?: LevelConfig[], options?: { coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string }) => void | Promise<void>;
  onUpdateInstitute?: (id: string, updates: { name?: string; coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string }) => Promise<void>;
  onDeleteInstitute?: (id: string) => void | Promise<void>;
}

type ViewMode = 'library' | 'workbench';
type ContentTab = 'reading' | 'listening' | 'vocab' | 'grammar';
type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const TRANSLATION_LANGS: { key: TranslationLanguage; label: string; flag: string }[] = [
  { key: 'cn', label: '中文', flag: '🇨🇳' },
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { key: 'mn', label: 'Монгол', flag: '🇲🇳' },
];

const parseLevels = (levels: LevelConfig[] | number[]): LevelConfig[] => {
  if (!levels || levels.length === 0) return [];
  if (typeof levels[0] === 'number') {
    return (levels as number[]).map(l => ({ level: l, units: 10 }));
  }
  return levels as LevelConfig[];
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================
// MAIN COMPONENT
// ============================================================

const ContentEditor: React.FC<ContentEditorProps> = ({
  institutes,
  textbookContexts,
  language,
  onSaveContext,
  onAddInstitute,
  onUpdateInstitute,
  onDeleteInstitute,
}) => {
  const labels = getLabels(language);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<ContentTab>('reading');

  // Quick Add Modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddInstituteId, setQuickAddInstituteId] = useState<string>('');
  const [quickAddLevel, setQuickAddLevel] = useState<number>(1);
  const [quickAddUnit, setQuickAddUnit] = useState<number>(1);
  const [quickAddType, setQuickAddType] = useState<'reading' | 'listening'>('reading');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddKorean, setQuickAddKorean] = useState('');
  const [quickAddTranslation, setQuickAddTranslation] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // Add Textbook Modal
  const [showAddTextbook, setShowAddTextbook] = useState(false);
  const [newTextbookName, setNewTextbookName] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newThemeColor, setNewThemeColor] = useState('#3B82F6');
  const [newPublisher, setNewPublisher] = useState('');
  const [newDisplayLevel, setNewDisplayLevel] = useState('');
  const [newVolume, setNewVolume] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);

  // Edit Institute Modal
  const [showEditInstitute, setShowEditInstitute] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState<Institute | null>(null);
  const [editInstituteName, setEditInstituteName] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editThemeColor, setEditThemeColor] = useState('#3B82F6');
  const [editPublisher, setEditPublisher] = useState('');
  const [editDisplayLevel, setEditDisplayLevel] = useState('');
  const [editVolume, setEditVolume] = useState('');
  const [editCoverUploading, setEditCoverUploading] = useState(false);

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Content state (V2)
  const [readings, setReadings] = useState<ReadingArticleV2[]>([]);
  const [listenings, setListenings] = useState<ListeningTrackV2[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItemV2[]>([]);
  const [grammar, setGrammar] = useState<GrammarPointV2[]>([]);

  // Selected item for editing
  const [selectedReadingId, setSelectedReadingId] = useState<string | null>(null);
  const [selectedListeningId, setSelectedListeningId] = useState<string | null>(null);

  // Translation tab
  const [activeLang, setActiveLang] = useState<TranslationLanguage>('cn');

  // Get current content key
  const contentKey = useMemo(() => {
    if (!selectedInstitute) return '';
    return `${selectedInstitute.id}-${selectedLevel}-${selectedUnit}`;
  }, [selectedInstitute, selectedLevel, selectedUnit]);

  // Get available units for selected level
  const availableUnits = useMemo(() => {
    if (!selectedInstitute) return [];
    const levels = parseLevels(selectedInstitute.levels);
    const levelConfig = levels.find(l => l.level === selectedLevel);
    if (!levelConfig) return [];
    return Array.from({ length: levelConfig.units }, (_, i) => i + 1);
  }, [selectedInstitute, selectedLevel]);

  // Enter workbench for an institute
  const enterWorkbench = useCallback((institute: Institute) => {
    setSelectedInstitute(institute);
    const levels = parseLevels(institute.levels);
    if (levels.length > 0) {
      setSelectedLevel(levels[0].level);
      setSelectedUnit(1);
    }
    setViewMode('workbench');
    // Load content for this unit
    loadUnitContent(institute.id, levels[0]?.level || 1, 1);
  }, []);

  // Load unit content
  const loadUnitContent = useCallback((instituteId: string, level: number, unit: number) => {
    const key = `${instituteId}-${level}-${unit}`;
    const content = textbookContexts[key];

    // Reset to empty arrays
    setReadings([]);
    setListenings([]);
    setVocabulary([]);
    setGrammar([]);
    setSelectedReadingId(null);
    setSelectedListeningId(null);

    if (content) {
      // Try to parse as V2 or convert from V1
      if ((content as any).version === 2) {
        const v2 = content as unknown as TextbookContentV2;
        setReadings(v2.readings || []);
        setListenings(v2.listenings || []);
        setVocabulary(v2.vocabulary || []);
        setGrammar(v2.grammar || []);
      } else {
        // Convert V1 to V2 format
        const v1 = content as TextbookContent;
        if (v1.readingText) {
          setReadings([{
            id: generateId(),
            title: v1.readingTitle || '문장 1',
            contentKr: v1.readingText,
            translations: { cn: v1.readingTranslation || '' },
            createdAt: Date.now(),
          }]);
        }
        if (v1.listeningScript) {
          setListenings([{
            id: generateId(),
            title: v1.listeningTitle || '듣기 1',
            audioUrl: v1.listeningAudioUrl,
            scriptKr: v1.listeningScript,
            translations: { cn: v1.listeningTranslation || '' },
            createdAt: Date.now(),
          }]);
        }
        // Parse vocabulary from V1 format
        if (v1.vocabularyList) {
          const vocabItems = parseVocabularyBulk(v1.vocabularyList);
          setVocabulary(vocabItems);
        }
      }
    }
  }, [textbookContexts]);

  // Parse vocabulary bulk input
  const parseVocabularyBulk = (input: string): VocabularyItemV2[] => {
    const lines = input.trim().split('\n').filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split(/[\t|]/).map(p => p.trim());
      return {
        id: generateId(),
        korean: parts[0] || '',
        pos: parts[1] || '',
        translations: { cn: parts[2] || '' },
        example: parts[3] || '',
      };
    });
  };

  // Handle unit change
  const handleUnitChange = (unit: number) => {
    setSelectedUnit(unit);
    if (selectedInstitute) {
      loadUnitContent(selectedInstitute.id, selectedLevel, unit);
    }
  };

  // Handle level change
  const handleLevelChange = (level: number) => {
    setSelectedLevel(level);
    setSelectedUnit(1);
    if (selectedInstitute) {
      loadUnitContent(selectedInstitute.id, level, 1);
    }
  };

  // Save current content
  const handleSave = async () => {
    if (!selectedInstitute || !contentKey) return;

    setSaveStatus('saving');
    try {
      const v2Content: TextbookContentV2 = {
        version: 2,
        readings,
        listenings,
        vocabulary,
        grammar,
      };

      // Convert to legacy format for backward compatibility with save API
      const legacyContent: TextbookContent = {
        generalContext: '',
        vocabularyList: vocabulary.map(v => `${v.korean}\t${v.pos || ''}\t${v.translations.cn || ''}`).join('\n'),
        readingText: readings[0]?.contentKr || '',
        readingTranslation: readings[0]?.translations.cn || '',
        readingTitle: readings[0]?.title || '',
        listeningScript: listenings[0]?.scriptKr || '',
        listeningTranslation: listenings[0]?.translations.cn || '',
        listeningTitle: listenings[0]?.title || '',
        listeningAudioUrl: listenings[0]?.audioUrl || null,
      };

      // Store V2 data in a separate field (backend can handle this)
      (legacyContent as any).v2Data = v2Content;

      onSaveContext(contentKey, legacyContent);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Cover upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      const response = await api.uploadFile(formData);
      setNewCoverUrl(response.url);
    } catch (error) {
      console.error('Cover upload failed:', error);
      alert(`封面上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setCoverUploading(false);
    }
  };

  // Add new textbook
  const handleAddTextbook = async () => {
    if (!newTextbookName.trim()) return;
    try {
      await onAddInstitute(newTextbookName, [{ level: 1, units: 10 }], {
        coverUrl: newCoverUrl,
        themeColor: newThemeColor,
        publisher: newPublisher,
        displayLevel: newDisplayLevel,
        volume: newVolume,
      });
      setShowAddTextbook(false);
      setNewTextbookName('');
      setNewCoverUrl('');
      setNewThemeColor('#3B82F6');
      setNewPublisher('');
      setNewDisplayLevel('');
      setNewVolume('');
    } catch (error) {
      console.error('Add textbook failed:', error);
    }
  };

  // ============================================================
  // READING TAB HANDLERS
  // ============================================================

  const addReading = () => {
    const newArticle: ReadingArticleV2 = {
      id: generateId(),
      title: `문장 ${readings.length + 1}`,
      contentKr: '',
      translations: {},
      createdAt: Date.now(),
    };
    setReadings([...readings, newArticle]);
    setSelectedReadingId(newArticle.id);
  };

  const updateReading = (id: string, updates: Partial<ReadingArticleV2>) => {
    setReadings(readings.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteReading = (id: string) => {
    setReadings(readings.filter(r => r.id !== id));
    if (selectedReadingId === id) {
      setSelectedReadingId(readings.length > 1 ? readings[0].id : null);
    }
  };

  // ============================================================
  // LISTENING TAB HANDLERS
  // ============================================================

  const addListening = () => {
    const newTrack: ListeningTrackV2 = {
      id: generateId(),
      title: `듣기 ${listenings.length + 1}`,
      audioUrl: null,
      scriptKr: '',
      translations: {},
      createdAt: Date.now(),
    };
    setListenings([...listenings, newTrack]);
    setSelectedListeningId(newTrack.id);
  };

  const updateListening = (id: string, updates: Partial<ListeningTrackV2>) => {
    setListenings(listenings.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteListening = (id: string) => {
    setListenings(listenings.filter(l => l.id !== id));
    if (selectedListeningId === id) {
      setSelectedListeningId(listenings.length > 1 ? listenings[0].id : null);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, trackId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.uploadFile(formData);
      updateListening(trackId, { audioUrl: response.url, audioFileName: file.name });
    } catch (error) {
      console.error('Audio upload failed:', error);
      alert(`音频上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // ============================================================
  // VOCABULARY TAB HANDLERS
  // ============================================================

  const [vocabBulkInput, setVocabBulkInput] = useState('');
  const [vocabPreview, setVocabPreview] = useState<VocabularyItemV2[]>([]);
  const [showVocabPreview, setShowVocabPreview] = useState(false);

  const handleVocabBulkParse = () => {
    const parsed = parseVocabularyBulk(vocabBulkInput);
    setVocabPreview(parsed);
    setShowVocabPreview(true);
  };

  const handleVocabBulkConfirm = () => {
    setVocabulary([...vocabulary, ...vocabPreview]);
    setVocabBulkInput('');
    setVocabPreview([]);
    setShowVocabPreview(false);
  };

  // ============================================================
  // GRAMMAR TAB HANDLERS
  // ============================================================

  const [grammarBulkInput, setGrammarBulkInput] = useState('');

  const parseGrammarBulk = (input: string): GrammarPointV2[] => {
    const lines = input.trim().split('\n').filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split(/[\t|]/).map(p => p.trim());
      return {
        id: generateId(),
        pattern: parts[0] || '',
        meaning: parts[1] || '',
        conjugation: parts[2] || '',
        explanation: parts[3] || '',
      };
    });
  };

  const handleGrammarBulkImport = () => {
    const parsed = parseGrammarBulk(grammarBulkInput);
    setGrammar([...grammar, ...parsed]);
    setGrammarBulkInput('');
  };

  // ============================================================
  // RENDER: LIBRARY VIEW
  // ============================================================

  const renderLibraryView = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <h1 className="text-2xl font-bold text-gray-900">📚 教材管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Rocket className="w-5 h-5" />
            快速添加内容
          </button>
          <button
            onClick={() => setShowAddTextbook(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增教材
          </button>
        </div>
      </div>

      {/* Institute Cards */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {institutes.map(institute => (
            <div
              key={institute.id}
              onClick={() => enterWorkbench(institute)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-gray-100 to-gray-200">
                {institute.coverUrl ? (
                  <img
                    src={institute.coverUrl}
                    alt={institute.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: institute.themeColor || '#3B82F6' }}
                  >
                    <BookOpen className="w-16 h-16 text-white/80" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg truncate">{institute.name}</h3>
                  {(institute.displayLevel || institute.volume) && (
                    <p className="text-white/90 text-sm">
                      {institute.displayLevel}{institute.displayLevel && institute.volume ? ' · ' : ''}{institute.volume}
                    </p>
                  )}
                  {institute.publisher && (
                    <p className="text-white/60 text-xs truncate">{institute.publisher}</p>
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingInstitute(institute);
                      setEditInstituteName(institute.name);
                      setEditCoverUrl(institute.coverUrl || '');
                      setEditThemeColor(institute.themeColor || '#3B82F6');
                      setEditPublisher(institute.publisher || '');
                      setEditDisplayLevel(institute.displayLevel || '');
                      setEditVolume(institute.volume || '');
                      setShowEditInstitute(true);
                    }}
                    className="p-2 bg-white/90 rounded-full shadow hover:bg-white"
                  >
                    <Pencil className="w-4 h-4 text-gray-700" />
                  </button>
                  {onDeleteInstitute && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除 "${institute.name}" 吗？`)) {
                          await onDeleteInstitute(institute.id);
                        }
                      }}
                      className="p-2 bg-white/90 rounded-full shadow hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDER: WORKBENCH VIEW
  // ============================================================

  const selectedReading = readings.find(r => r.id === selectedReadingId);
  const selectedListening = listenings.find(l => l.id === selectedListeningId);

  const renderWorkbenchView = () => (
    <div className="h-full flex">
      {/* Unit Sidebar */}
      <div className="w-64 bg-gray-50 border-r flex flex-col">
        {/* Back Button & Institute Info */}
        <div className="p-4 border-b bg-white">
          <button
            onClick={() => setViewMode('library')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            返回教材库
          </button>
          <h2 className="font-bold text-lg text-gray-900 truncate">{selectedInstitute?.name}</h2>

          {/* Level Selector */}
          <div className="mt-3">
            <select
              value={selectedLevel}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
            >
              {selectedInstitute && parseLevels(selectedInstitute.levels).map(l => (
                <option key={l.level} value={l.level}>Level {l.level}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Unit List */}
        <div className="flex-1 overflow-auto p-2">
          {availableUnits.map(unit => (
            <button
              key={unit}
              onClick={() => handleUnitChange(unit)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${selectedUnit === unit
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-100 text-gray-700'
                }`}
            >
              <span className="font-medium">Unit {unit}</span>
            </button>
          ))}
        </div>

        {/* Save Button */}
        <div className="p-4 border-t bg-white">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${saveStatus === 'success'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            {saveStatus === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
            {saveStatus === 'success' && <CheckCircle className="w-5 h-5" />}
            {saveStatus === 'error' && <AlertCircle className="w-5 h-5" />}
            {saveStatus === 'idle' && <Save className="w-5 h-5" />}
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'success' ? '已保存' : saveStatus === 'error' ? '保存失败' : '保存'}
          </button>
        </div>
      </div>

      {/* Main Workbench */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b bg-white">
          {[
            { id: 'reading' as ContentTab, label: '阅读', icon: FileText },
            { id: 'listening' as ContentTab, label: '听力', icon: Headphones },
            { id: 'vocab' as ContentTab, label: '单词', icon: BookA },
            { id: 'grammar' as ContentTab, label: '语法', icon: Languages },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'reading' && renderReadingTab()}
          {activeTab === 'listening' && renderListeningTab()}
          {activeTab === 'vocab' && renderVocabTab()}
          {activeTab === 'grammar' && renderGrammarTab()}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDER: READING TAB (Master-Detail)
  // ============================================================

  const renderReadingTab = () => (
    <div className="h-full flex">
      {/* Left: Article List (20%) */}
      <div className="w-1/5 min-w-[200px] border-r bg-gray-50 flex flex-col">
        <div className="p-3 border-b bg-white flex items-center justify-between">
          <span className="font-medium text-gray-700">文章列表</span>
          <button
            onClick={addReading}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-blue-600" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {readings.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              点击 + 添加文章
            </div>
          ) : (
            readings.map((article, idx) => (
              <div
                key={article.id}
                onClick={() => setSelectedReadingId(article.id)}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${selectedReadingId === article.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{article.title || `文章 ${idx + 1}`}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteReading(article.id);
                    }}
                    className={`p-1 rounded transition-colors ${selectedReadingId === article.id
                      ? 'hover:bg-blue-700'
                      : 'hover:bg-gray-200'
                      }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Editor (80%) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedReading ? (
          <>
            {/* Title */}
            <div className="p-4 border-b bg-white">
              <input
                type="text"
                value={selectedReading.title}
                onChange={(e) => updateReading(selectedReading.id, { title: e.target.value })}
                placeholder="文章标题"
                className="w-full text-xl font-bold border-none outline-none placeholder-gray-400"
              />
            </div>

            {/* Korean Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex">
                {/* Korean Original */}
                <div className="flex-1 flex flex-col border-r">
                  <div className="px-4 py-2 bg-gray-50 border-b font-medium text-gray-700 flex items-center gap-2">
                    🇰🇷 韩语原文
                  </div>
                  <textarea
                    value={selectedReading.contentKr}
                    onChange={(e) => updateReading(selectedReading.id, { contentKr: e.target.value })}
                    placeholder="请输入韩语原文..."
                    className="flex-1 p-4 resize-none outline-none text-lg leading-relaxed overflow-auto"
                  />
                </div>

                {/* Translation (with tabs) */}
                <div className="flex-1 flex flex-col">
                  {/* Language Tabs */}
                  <div className="flex bg-gray-50 border-b">
                    {TRANSLATION_LANGS.map(lang => (
                      <button
                        key={lang.key}
                        onClick={() => setActiveLang(lang.key)}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${activeLang === lang.key
                          ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {lang.flag} {lang.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={selectedReading.translations[activeLang] || ''}
                    onChange={(e) => updateReading(selectedReading.id, {
                      translations: { ...selectedReading.translations, [activeLang]: e.target.value }
                    })}
                    placeholder={`请输入${TRANSLATION_LANGS.find(l => l.key === activeLang)?.label}翻译...`}
                    className="flex-1 p-4 resize-none outline-none text-lg leading-relaxed overflow-auto"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>选择或新建一篇文章开始编辑</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================
  // RENDER: LISTENING TAB (Master-Detail)
  // ============================================================

  const renderListeningTab = () => (
    <div className="h-full flex">
      {/* Left: Track List (20%) */}
      <div className="w-1/5 min-w-[200px] border-r bg-gray-50 flex flex-col">
        <div className="p-3 border-b bg-white flex items-center justify-between">
          <span className="font-medium text-gray-700">音频列表</span>
          <button
            onClick={addListening}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-blue-600" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {listenings.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              点击 + 添加音频
            </div>
          ) : (
            listenings.map((track, idx) => (
              <div
                key={track.id}
                onClick={() => setSelectedListeningId(track.id)}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${selectedListeningId === track.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    <span className="font-medium truncate">{track.title || `音频 ${idx + 1}`}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteListening(track.id);
                    }}
                    className={`p-1 rounded transition-colors ${selectedListeningId === track.id ? 'hover:bg-blue-700' : 'hover:bg-gray-200'
                      }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {track.audioUrl && (
                  <div className="mt-1 text-xs opacity-70 truncate">
                    ✓ {track.audioFileName || '已上传音频'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Editor (80%) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedListening ? (
          <>
            {/* Title & Audio Upload */}
            <div className="p-4 border-b bg-white space-y-3">
              <input
                type="text"
                value={selectedListening.title}
                onChange={(e) => updateListening(selectedListening.id, { title: e.target.value })}
                placeholder="音频标题"
                className="w-full text-xl font-bold border-none outline-none placeholder-gray-400"
              />

              {/* Audio Upload Zone */}
              <div className="flex items-center gap-4 p-4 border-2 border-dashed rounded-lg bg-gray-50">
                {selectedListening.audioUrl ? (
                  <div className="flex items-center gap-4 flex-1">
                    <audio controls src={selectedListening.audioUrl} className="flex-1" />
                    <button
                      onClick={() => updateListening(selectedListening.id, { audioUrl: null, audioFileName: undefined })}
                      className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer py-4">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-gray-500">点击或拖拽上传音频文件</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleAudioUpload(e, selectedListening.id)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Script & Translation */}
            <div className="flex-1 flex overflow-hidden">
              {/* Korean Script */}
              <div className="flex-1 flex flex-col border-r">
                <div className="px-4 py-2 bg-gray-50 border-b font-medium text-gray-700 flex items-center gap-2">
                  🇰🇷 听力原文
                </div>
                <textarea
                  value={selectedListening.scriptKr}
                  onChange={(e) => updateListening(selectedListening.id, { scriptKr: e.target.value })}
                  placeholder="请输入听力原文..."
                  className="flex-1 p-4 resize-none outline-none text-lg leading-relaxed overflow-auto"
                />
              </div>

              {/* Translation (with tabs) */}
              <div className="flex-1 flex flex-col">
                <div className="flex bg-gray-50 border-b">
                  {TRANSLATION_LANGS.map(lang => (
                    <button
                      key={lang.key}
                      onClick={() => setActiveLang(lang.key)}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${activeLang === lang.key
                        ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      {lang.flag} {lang.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={selectedListening.translations[activeLang] || ''}
                  onChange={(e) => updateListening(selectedListening.id, {
                    translations: { ...selectedListening.translations, [activeLang]: e.target.value }
                  })}
                  placeholder={`请输入${TRANSLATION_LANGS.find(l => l.key === activeLang)?.label}翻译...`}
                  className="flex-1 p-4 resize-none outline-none text-lg leading-relaxed overflow-auto"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Headphones className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>选择或新建一个音频开始编辑</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================
  // RENDER: VOCAB TAB (Bulk Import)
  // ============================================================

  const renderVocabTab = () => (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Bulk Import */}
        <div className="w-1/2 flex flex-col border-r">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <span className="font-medium text-gray-700">📥 批量导入</span>
            <span className="text-xs text-gray-500">格式: 单词 | 词性 | 释义 | 例句</span>
          </div>
          <textarea
            value={vocabBulkInput}
            onChange={(e) => setVocabBulkInput(e.target.value)}
            placeholder={`하다\t动词\t做\t공부를 하다
먹다\t动词\t吃\t밥을 먹다
학교\t名词\t学校\t학교에 가다`}
            className="flex-1 p-4 resize-none outline-none font-mono text-sm overflow-auto"
          />
          <div className="p-4 border-t bg-white flex gap-3">
            <button
              onClick={handleVocabBulkParse}
              disabled={!vocabBulkInput.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-5 h-5" />
              预览解析
            </button>
          </div>
        </div>

        {/* Right: Preview / Current List */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <span className="font-medium text-gray-700">
              {showVocabPreview ? '📋 解析预览' : `📚 当前单词 (${vocabulary.length})`}
            </span>
            {showVocabPreview && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowVocabPreview(false); setVocabPreview([]); }}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  取消
                </button>
                <button
                  onClick={handleVocabBulkConfirm}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  确认添加
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {(showVocabPreview ? vocabPreview : vocabulary).length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                {showVocabPreview ? '解析结果将显示在这里' : '暂无单词，请批量导入'}
              </div>
            ) : (
              <div className="space-y-2">
                {(showVocabPreview ? vocabPreview : vocabulary).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-4 p-3 bg-white border rounded-lg">
                    <span className="font-bold text-lg text-blue-600">{item.korean}</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{item.pos}</span>
                    <span className="flex-1 text-gray-700">{item.translations.cn}</span>
                    {item.example && <span className="text-gray-400 text-sm">{item.example}</span>}
                    {!showVocabPreview && (
                      <button
                        onClick={() => setVocabulary(vocabulary.filter(v => v.id !== item.id))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDER: GRAMMAR TAB (Card Stream)
  // ============================================================

  const renderGrammarTab = () => (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Bulk Import Section */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <textarea
              value={grammarBulkInput}
              onChange={(e) => setGrammarBulkInput(e.target.value)}
              placeholder="语法点 | 含义 | 接续 | 详细解释 (每行一个)"
              rows={3}
              className="w-full p-3 border rounded-lg resize-none text-sm"
            />
          </div>
          <button
            onClick={handleGrammarBulkImport}
            disabled={!grammarBulkInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grammar Cards */}
      <div className="flex-1 overflow-auto p-4">
        {grammar.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            暂无语法点，请批量导入
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grammar.map((g, idx) => (
              <div key={g.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-blue-600">{g.pattern}</h3>
                  <button
                    onClick={() => setGrammar(grammar.filter(item => item.id !== g.id))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <p className="text-gray-600 mb-1">{g.meaning}</p>
                {g.conjugation && (
                  <p className="text-sm text-gray-500 mb-2">접속: {g.conjugation}</p>
                )}
                {g.explanation && (
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{g.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Quick Add handlers
  const quickAddInstitute = institutes.find(i => i.id === quickAddInstituteId);
  const quickAddLevels = quickAddInstitute ? parseLevels(quickAddInstitute.levels) : [];
  const quickAddUnits = useMemo(() => {
    const levelConfig = quickAddLevels.find(l => l.level === quickAddLevel);
    return levelConfig ? Array.from({ length: levelConfig.units }, (_, i) => i + 1) : [];
  }, [quickAddLevels, quickAddLevel]);

  const handleQuickAddSave = async () => {
    if (!quickAddInstituteId || !quickAddTitle.trim()) return;
    setQuickAddSaving(true);
    try {
      const key = `${quickAddInstituteId}-${quickAddLevel}-${quickAddUnit}`;
      const existingContent = textbookContexts[key] || {
        generalContext: '',
        vocabularyList: '',
        readingText: '',
        readingTranslation: '',
        readingTitle: '',
        listeningScript: '',
        listeningTranslation: '',
        listeningTitle: '',
        listeningAudioUrl: null,
      };

      const updatedContent = { ...existingContent };
      if (quickAddType === 'reading') {
        updatedContent.readingTitle = quickAddTitle;
        updatedContent.readingText = quickAddKorean;
        updatedContent.readingTranslation = quickAddTranslation;
      } else {
        updatedContent.listeningTitle = quickAddTitle;
        updatedContent.listeningScript = quickAddKorean;
        updatedContent.listeningTranslation = quickAddTranslation;
      }

      onSaveContext(key, updatedContent);

      // Reset form
      setQuickAddTitle('');
      setQuickAddKorean('');
      setQuickAddTranslation('');
      alert('保存成功！');
    } catch (error) {
      console.error('Quick add save error:', error);
      alert('保存失败');
    } finally {
      setQuickAddSaving(false);
    }
  };

  // ============================================================
  // RENDER: QUICK ADD MODAL
  // ============================================================

  const renderQuickAddModal = () => {
    if (!showQuickAdd) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <Rocket className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold">快速添加内容</h2>
            </div>
            <button
              onClick={() => setShowQuickAdd(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Selector */}
          <div className="px-6 py-4 border-b bg-gray-50 flex flex-wrap gap-4">
            <select
              value={quickAddInstituteId}
              onChange={(e) => {
                setQuickAddInstituteId(e.target.value);
                setQuickAddLevel(1);
                setQuickAddUnit(1);
              }}
              className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">选择教材...</option>
              {institutes.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <select
              value={quickAddLevel}
              onChange={(e) => {
                setQuickAddLevel(Number(e.target.value));
                setQuickAddUnit(1);
              }}
              className="w-28 px-4 py-2 border rounded-lg bg-white"
              disabled={!quickAddInstituteId}
            >
              {quickAddLevels.map(l => (
                <option key={l.level} value={l.level}>Level {l.level}</option>
              ))}
            </select>
            <select
              value={quickAddUnit}
              onChange={(e) => setQuickAddUnit(Number(e.target.value))}
              className="w-28 px-4 py-2 border rounded-lg bg-white"
              disabled={!quickAddInstituteId}
            >
              {quickAddUnits.map(u => (
                <option key={u} value={u}>Unit {u}</option>
              ))}
            </select>
            <div className="flex rounded-lg overflow-hidden border">
              <button
                onClick={() => setQuickAddType('reading')}
                className={`px-4 py-2 flex items-center gap-2 ${quickAddType === 'reading' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <FileText className="w-4 h-4" /> 阅读
              </button>
              <button
                onClick={() => setQuickAddType('listening')}
                className={`px-4 py-2 flex items-center gap-2 ${quickAddType === 'listening' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <Headphones className="w-4 h-4" /> 听力
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {!quickAddInstituteId ? (
              <div className="text-center text-gray-400 py-12">
                <Rocket className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>选择教材和单元后开始添加内容</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                  <input
                    type="text"
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    placeholder={quickAddType === 'reading' ? '阅读标题' : '听力标题'}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                {/* Korean Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🇰🇷 韩语原文</label>
                  <textarea
                    value={quickAddKorean}
                    onChange={(e) => setQuickAddKorean(e.target.value)}
                    placeholder="请输入韩语原文..."
                    rows={6}
                    className="w-full px-4 py-3 border rounded-lg resize-none"
                  />
                </div>

                {/* Translation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🇨🇳 中文译文</label>
                  <textarea
                    value={quickAddTranslation}
                    onChange={(e) => setQuickAddTranslation(e.target.value)}
                    placeholder="请输入中文翻译..."
                    rows={6}
                    className="w-full px-4 py-3 border rounded-lg resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => setShowQuickAdd(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleQuickAddSave}
              disabled={!quickAddInstituteId || !quickAddTitle.trim() || quickAddSaving}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {quickAddSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: ADD TEXTBOOK MODAL
  // ============================================================

  const renderAddTextbookModal = () => {
    if (!showAddTextbook) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-bold">新增教材</h2>
            <button onClick={() => setShowAddTextbook(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">教材名称 *</label>
              <input
                type="text"
                value={newTextbookName}
                onChange={(e) => setNewTextbookName(e.target.value)}
                placeholder="例如: 延世韩国语"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出版社</label>
              <input
                type="text"
                value={newPublisher}
                onChange={(e) => setNewPublisher(e.target.value)}
                placeholder="例如: 延世大学出版社"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
                <input
                  type="text"
                  value={newDisplayLevel}
                  onChange={(e) => setNewDisplayLevel(e.target.value)}
                  placeholder="例如: 一级, 1급"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上下册</label>
                <select
                  value={newVolume}
                  onChange={(e) => setNewVolume(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white"
                >
                  <option value="">请选择...</option>
                  <option value="上册">上册</option>
                  <option value="下册">下册</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">封面图片</label>
              <div className="flex items-center gap-4">
                {newCoverUrl ? (
                  <div className="relative w-24 h-32 rounded-lg overflow-hidden border">
                    <img src={newCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setNewCoverUrl('')}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50">
                    {coverUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                      disabled={coverUploading}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">主题颜色</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="w-10 h-10 border rounded cursor-pointer"
                />
                <span className="text-sm text-gray-500">{newThemeColor}</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => setShowAddTextbook(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleAddTextbook}
              disabled={!newTextbookName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              创建教材
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: EDIT INSTITUTE MODAL
  // ============================================================

  const handleEditCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setEditCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      const response = await api.uploadFile(formData);
      setEditCoverUrl(response.url);
    } catch (error) {
      console.error('Cover upload failed:', error);
      alert(`封面上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setEditCoverUploading(false);
    }
  };

  const handleSaveInstituteEdit = async () => {
    if (!editingInstitute || !editInstituteName.trim() || !onUpdateInstitute) return;
    try {
      await onUpdateInstitute(editingInstitute.id, {
        name: editInstituteName,
        coverUrl: editCoverUrl || undefined,
        themeColor: editThemeColor,
        publisher: editPublisher || undefined,
        displayLevel: editDisplayLevel || undefined,
        volume: editVolume || undefined,
      });
      setShowEditInstitute(false);
      setEditingInstitute(null);
    } catch (error) {
      console.error('Save institute failed:', error);
      alert('保存失败');
    }
  };

  const renderEditInstituteModal = () => {
    if (!showEditInstitute || !editingInstitute) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-bold">编辑教材</h2>
            <button onClick={() => setShowEditInstitute(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">教材名称 *</label>
              <input
                type="text"
                value={editInstituteName}
                onChange={(e) => setEditInstituteName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出版社</label>
              <input
                type="text"
                value={editPublisher}
                onChange={(e) => setEditPublisher(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
                <input
                  type="text"
                  value={editDisplayLevel}
                  onChange={(e) => setEditDisplayLevel(e.target.value)}
                  placeholder="例如: 一级, 1급"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上下册</label>
                <select
                  value={editVolume}
                  onChange={(e) => setEditVolume(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white"
                >
                  <option value="">请选择...</option>
                  <option value="上册">上册</option>
                  <option value="下册">下册</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">封面图片</label>
              <div className="flex items-center gap-4">
                {editCoverUrl ? (
                  <div className="relative w-24 h-32 rounded-lg overflow-hidden border">
                    <img src={editCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setEditCoverUrl('')}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50">
                    {editCoverUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditCoverUpload}
                      disabled={editCoverUploading}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">主题颜色</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editThemeColor}
                  onChange={(e) => setEditThemeColor(e.target.value)}
                  className="w-10 h-10 border rounded cursor-pointer"
                />
                <span className="text-sm text-gray-500">{editThemeColor}</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => setShowEditInstitute(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSaveInstituteEdit}
              disabled={!editInstituteName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              保存修改
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {viewMode === 'library' ? renderLibraryView() : renderWorkbenchView()}
      {renderQuickAddModal()}
      {renderAddTextbookModal()}
      {renderEditInstituteModal()}
    </div>
  );
};

export default ContentEditor;
