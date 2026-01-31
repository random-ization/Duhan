import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import {
  BookOpen,
  Plus,
  Loader2,
} from 'lucide-react';
import { NoArgs, aRef, mRef, qRef } from '../../utils/convexRefs';
import { UnitListItem } from './UnitListItem';
import { ReadingEditor, UnitContent } from './ReadingEditor';

interface Institute {
  _id: string; // Convex ID
  postgresId?: string; // Legacy ID
  id?: string; // Compatibility
  name: string;
  displayLevel?: string;
  volume?: string;
}

export const ReadingContentManager: React.FC = () => {
  // ========================================
  // Data Fetching (Convex)
  // ========================================
  const institutesData = useQuery(qRef<NoArgs, Institute[]>('institutes:getAll'));
  const institutes = useMemo(() => institutesData || [], [institutesData]);

  // In Convex, IDs are consistent. We'll use the first institute as default.
  // We need to manage selectedCourseId state.
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Audio upload
  const [audioUploading, setAudioUploading] = useState(false);
  const getUploadUrl = useAction(
    aRef<
      { filename: string; contentType: string; folder: string },
      { uploadUrl: string; publicUrl: string }
    >('storage:getUploadUrl')
  );

  // Update selectedCourseId when institutes load
  useEffect(() => {
    if (!selectedCourseId && institutes.length > 0) {
      // Prefer using postgresId for now to match courseIds like 'snu_1a' if they exist,
      // otherwise use some ID. The API expects string courseId.
      // In the DB, 'courseId' is likely 'snu_1a'.
      // Check if institutes have an 'id' field (legacy) or 'postgresId'.
      const first = institutes[0];
      setSelectedCourseId(first.id || first.postgresId || first._id);
    }
  }, [institutes, selectedCourseId]);

  // Fetch units for selected course
  const courseUnits = useQuery(
    qRef<{ courseId: string }, UnitContent[]>('units:getByCourse'),
    selectedCourseId ? { courseId: selectedCourseId } : 'skip'
  );

  // Process units for list view (deduplicate by unitIndex)
  const uniqueUnits = React.useMemo(() => {
    if (!courseUnits) return [];
    const map = new Map();
    courseUnits.forEach(u => {
      if (!map.has(u.unitIndex)) {
        map.set(u.unitIndex, {
          id: u._id,
          unitIndex: u.unitIndex,
          articleIndex: 1,
          title: u.title,
          readingText: '',
          translation: '',
          audioUrl: '',
          hasAnalysis: !!u.analysisData,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.unitIndex - b.unitIndex);
  }, [courseUnits]);

  // ========================================
  // Mutations & Actions
  // ========================================
  const saveUnitMutation = useMutation(
    mRef<
      {
        courseId: string;
        unitIndex: number;
        articleIndex: number;
        title: string;
        readingText: string;
        translation: string;
        translationEn: string;
        translationVi: string;
        translationMn: string;
        audioUrl: string;
        analysisData: unknown;
      },
      string
    >('units:save')
  );
  const analyzeTextAction = useAction(
    aRef<{ text: string }, { tokenCount: number; tokens: unknown }>('ai:analyzeText')
  );

  // ========================================
  // Local UI State
  // ========================================

  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitContent | null>(null);
  const [availableArticles, setAvailableArticles] = useState<UnitContent[]>([]);

  // ========================================
  // Handlers
  // ========================================

  const loadUnitDetail = async (_courseId: string, unitIndex: number, articleIndex: number = 1) => {
    // Since we don't have a direct "get specific article" query suitable for *editing* (we have getDetails which is aggregated),
    // we can filter from 'courseUnits' if it contained all data, but 'courseUnits' result might be large.
    // Actually, getByCourse returns everything. So we can just find it in 'courseUnits'.
    if (!courseUnits) return;

    const articles = (courseUnits as unknown as UnitContent[]).filter(
      u => u.unitIndex === unitIndex
    );
    setAvailableArticles(articles);

    const target = articles.find(a => a.articleIndex === articleIndex) || articles[0];

    if (target) {
      setEditingUnit({
        id: target._id,
        unitIndex: target.unitIndex,
        articleIndex: target.articleIndex || 1,
        title: target.title,
        readingText: target.readingText || '',
        translation: target.translation || '',
        translationEn: target.translationEn || '',
        translationVi: target.translationVi || '',
        translationMn: target.translationMn || '',
        audioUrl: target.audioUrl || '',
        analysisData: target.analysisData,
        hasAnalysis: !!target.analysisData,
        transcriptData: target.transcriptData,
      });
    } else {
      // New/Empty
      setEditingUnit({
        unitIndex: unitIndex,
        articleIndex: articleIndex,
        title: '',
        readingText: '',
        translation: '',
        translationEn: '',
        translationVi: '',
        translationMn: '',
        audioUrl: '',
      });
    }
  };

  const handleSelectUnit = (unit: UnitContent) => {
    loadUnitDetail(selectedCourseId, unit.unitIndex);
  };

  const handleSave = async () => {
    if (!editingUnit || !selectedCourseId) return;
    setSaving(true);
    try {
      // 1. Analyze Text (if changed or missing)
      let analysisData = editingUnit.analysisData;

      // Only re-analyze if we don't have data OR user explicitly requested (handled by handleReanalyze)
      // But here we want "Save and Analyze" behavior.
      // Let's optimisticly analyze if missing.
      if (!analysisData && editingUnit.readingText) {
        const result = (await analyzeTextAction({ text: editingUnit.readingText })) as
          | { tokens: unknown; tokenCount: number }
          | null
          | undefined;
        if (result) {
          analysisData = result.tokens;
        }
      }

      // 2. Save to Convex
      const id = await saveUnitMutation({
        courseId: selectedCourseId,
        unitIndex: editingUnit.unitIndex,
        articleIndex: editingUnit.articleIndex,
        title: editingUnit.title,
        readingText: editingUnit.readingText,
        translation: editingUnit.translation,
        translationEn: editingUnit.translationEn,
        translationVi: editingUnit.translationVi,
        translationMn: editingUnit.translationMn,
        audioUrl: editingUnit.audioUrl,
        analysisData: analysisData,
      });

      alert('保存成功！');
      // Refresh logic is handled by reactive Convex queries!
      // Just update local editing state with new ID if it was new
      if (!editingUnit.id) {
        setEditingUnit(prev => (prev ? { ...prev, id } : null));
      }
    } catch (e) {
      console.error(e);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReanalyze = async () => {
    if (!editingUnit?.readingText) return;
    setAnalyzing(true);
    try {
      const result = (await analyzeTextAction({ text: editingUnit.readingText })) as
        | { tokens: unknown; tokenCount: number }
        | null
        | undefined;
      if (result) {
        alert(`AI 分析完成！生成 ${result.tokenCount} 个词形映射。请点击保存以应用。`);
        setEditingUnit(prev =>
          prev
            ? {
                ...prev,
                analysisData: result.tokens,
                hasAnalysis: true,
              }
            : null
        );
      } else {
        alert('分析失败');
      }
    } catch (e) {
      console.error(e);
      alert('分析出错');
    } finally {
      setAnalyzing(false);
    }
  };

  const createNewUnit = () => {
    if (!courseUnits) return;
    const nextIndex =
      courseUnits.length > 0 ? Math.max(...courseUnits.map(u => u.unitIndex)) + 1 : 1;

    setEditingUnit({
      unitIndex: nextIndex,
      articleIndex: 1,
      title: '',
      readingText: '',
      translation: '',
      translationEn: '',
      translationVi: '',
      translationMn: '',
      audioUrl: '',
    });
    setAvailableArticles([]);
  };

  const addNewArticle = () => {
    if (!editingUnit) return;
    const nextArticleIndex =
      availableArticles.length > 0
        ? Math.max(...availableArticles.map(a => a.articleIndex || 1)) + 1
        : 1;

    setEditingUnit({
      unitIndex: editingUnit.unitIndex,
      articleIndex: nextArticleIndex,
      title: '',
      readingText: '',
      translation: '',
      translationEn: '',
      translationVi: '',
      translationMn: '',
      audioUrl: '',
    });
  };

  const switchArticle = (index: number) => {
    loadUnitDetail(selectedCourseId, editingUnit!.unitIndex, index);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUnit) return;

    setAudioUploading(true);
    try {
      const { uploadUrl, publicUrl } = (await getUploadUrl({
        filename: file.name,
        contentType: file.type || 'audio/mpeg',
        folder: `reading-audio/${selectedCourseId}`,
      })) as { uploadUrl: string; publicUrl: string };

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
          'x-amz-acl': 'public-read',
        },
      });

      if (!uploadRes.ok) throw new Error('上传失败');

      setEditingUnit({ ...editingUnit, audioUrl: publicUrl });
    } catch (err) {
      console.error('Audio upload error:', err);
      alert('音频上传失败');
    } finally {
      setAudioUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Left: Unit List */}
      <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
        <div className="mb-4">
          <label htmlFor="course-select" className="block text-sm font-bold mb-2">
            选择教材
          </label>
          <select
            id="course-select"
            className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
            aria-label="选择教材"
          >
            {institutes.map(i => (
              <option key={i._id} value={i.id || i.postgresId || i._id}>
                {i.name} {i.displayLevel || ''} {i.volume || ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {(() => {
            if (!courseUnits) {
              return (
                <div className="text-center py-4">
                  <Loader2 className="animate-spin mx-auto" />
                </div>
              );
            }
            if (uniqueUnits.length === 0) {
              return <div className="text-center text-zinc-400 py-10">暂无单元</div>;
            }
            return uniqueUnits.map(unit => (
              <UnitListItem
                key={unit.unitIndex}
                unit={unit}
                isActive={editingUnit?.unitIndex === unit.unitIndex}
                onSelect={() => handleSelectUnit(unit)}
              />
            ));
          })()}
        </div>

        <button
          type="button"
          onClick={createNewUnit}
          className="mt-4 w-full py-3 bg-zinc-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800"
        >
          <Plus size={16} /> 新建单元
        </button>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
        {editingUnit ? (
          <ReadingEditor
            editingUnit={editingUnit}
            setEditingUnit={setEditingUnit}
            availableArticles={availableArticles}
            onSwitchArticle={switchArticle}
            onAddNewArticle={addNewArticle}
            onReanalyze={handleReanalyze}
            onSave={handleSave}
            saving={saving}
            analyzing={analyzing}
            audioUploading={audioUploading}
            onAudioUpload={handleAudioUpload}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <BookOpen size={48} className="mb-4 opacity-20" />
            <p>请选择或新建阅读单元</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingContentManager;
