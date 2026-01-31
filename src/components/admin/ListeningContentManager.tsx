import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { Headphones, Loader2, Plus } from 'lucide-react';
import { NoArgs, qRef, mRef } from '../../utils/convexRefs';
import { ListeningUnitListItem, UnitListItem } from './ListeningUnitListItem';
import { ListeningUnitEditor, UnitListeningData } from './ListeningUnitEditor';

interface Institute {
  _id: string;
  id?: string;
  postgresId?: string;
  name: string;
  displayLevel?: string;
  volume?: string;
}

export const ListeningContentManager: React.FC = () => {
  // Convex hooks
  const institutesData = useQuery(qRef<NoArgs, Institute[]>('institutes:getAll'));
  const institutes = useMemo(() => institutesData || [], [institutesData]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const courseUnits = useQuery(
    qRef<
      { courseId: string },
      { _id: string; unitIndex: number; title: string; audioUrl?: string }[]
    >('units:getByCourse'),
    selectedCourseId ? { courseId: selectedCourseId } : 'skip'
  );

  const saveUnitMutation = useMutation(
    mRef<
      {
        courseId: string;
        unitIndex: number;
        articleIndex: number;
        title: string;
        audioUrl: string;
        transcriptData: unknown;
        readingText: string;
      },
      string
    >('units:save')
  );

  // Derived unit list
  const units = useMemo(() => {
    if (!courseUnits) return [];
    return courseUnits
      .map(u => ({
        id: u._id,
        unitIndex: u.unitIndex,
        title: u.title,
        hasAudio: !!u.audioUrl,
      }))
      .sort((a, b) => a.unitIndex - b.unitIndex);
  }, [courseUnits]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload Hook
  const { uploadFile } = useFileUpload();

  // Editing state
  const [editingUnit, setEditingUnit] = useState<UnitListeningData | null>(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [viewingUnitIndex, setViewingUnitIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail query
  const unitDetailQuery = useQuery(
    qRef<
      { courseId: string; unitIndex: number },
      {
        unit?: {
          _id: string;
          unitIndex: number;
          title: string;
          audioUrl?: string;
          transcriptData?: unknown;
        };
      } | null
    >('units:getDetails'),
    selectedCourseId && viewingUnitIndex
      ? { courseId: selectedCourseId, unitIndex: viewingUnitIndex }
      : 'skip'
  );

  // Effect: Update selectedCourseId
  useEffect(() => {
    if (institutes.length > 0 && !selectedCourseId) {
      const first = institutes[0];
      setSelectedCourseId(first.id || first.postgresId || first._id);
    }
  }, [institutes, selectedCourseId]);

  // Effect: Load Detail into Editor
  useEffect(() => {
    if (unitDetailQuery && viewingUnitIndex !== null) {
      const unit = unitDetailQuery.unit;
      if (unit) {
        setEditingUnit({
          id: unit._id,
          unitIndex: unit.unitIndex,
          title: unit.title,
          audioUrl: unit.audioUrl || '',
          transcriptData: unit.transcriptData || null,
        });
        setTranscriptText(unit.transcriptData ? JSON.stringify(unit.transcriptData, null, 2) : '');
      } else {
        // If not found in DB but we are "creating", we should have setEditingUnit manually in createNewUnit.
      }
    }
  }, [unitDetailQuery, viewingUnitIndex]);

  const handleSelectUnit = (unit: UnitListItem) => {
    setViewingUnitIndex(unit.unitIndex);
  };

  const createNewUnit = () => {
    const nextIndex = units.length > 0 ? Math.max(...units.map(u => u.unitIndex)) + 1 : 1;
    setViewingUnitIndex(null);
    setEditingUnit({
      unitIndex: nextIndex,
      title: '',
      audioUrl: '',
      transcriptData: null,
    });
    setTranscriptText('');
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUnit) return;

    if (!file.type.startsWith('audio/')) {
      alert('请选择音频文件');
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      setEditingUnit({ ...editingUnit, audioUrl: url });
    } catch (err) {
      console.error('Upload failed', err);
      alert('上传失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!editingUnit || !selectedCourseId) return;

    let parsedTranscript = null;
    if (transcriptText.trim()) {
      try {
        parsedTranscript = JSON.parse(transcriptText);
      } catch {
        alert('JSON 格式错误');
        return;
      }
    }

    setSaving(true);
    try {
      await saveUnitMutation({
        courseId: selectedCourseId,
        unitIndex: editingUnit.unitIndex,
        articleIndex: 1,
        title: editingUnit.title,
        audioUrl: editingUnit.audioUrl,
        transcriptData: parsedTranscript,
        readingText: '', // Mandatory field fallback
      });
      alert('保存成功！');
      if (!editingUnit.id) {
        setViewingUnitIndex(editingUnit.unitIndex);
      }
    } catch (e) {
      console.error(e);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
        <div className="mb-4">
          <label htmlFor="course-select" className="block text-sm font-bold mb-2">
            选择教材
          </label>
          <select
            id="course-select"
            className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
            value={selectedCourseId}
            onChange={e => {
              setSelectedCourseId(e.target.value);
              setViewingUnitIndex(null);
              setEditingUnit(null);
            }}
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
            if (units.length === 0) {
              return <div className="text-center text-zinc-400 py-10">暂无单元</div>;
            }
            return units.map(unit => (
              <ListeningUnitListItem
                key={unit.unitIndex}
                unit={unit}
                isActive={editingUnit?.unitIndex === unit.unitIndex}
                onSelect={handleSelectUnit}
              />
            ));
          })()}
        </div>
        <button
          onClick={createNewUnit}
          className="mt-4 w-full py-3 bg-zinc-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800"
        >
          <Plus size={16} /> 新建听力单元
        </button>
      </div>

      <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
        {editingUnit ? (
          <ListeningUnitEditor
            editingUnit={editingUnit}
            setEditingUnit={setEditingUnit}
            transcriptText={transcriptText}
            setTranscriptText={setTranscriptText}
            fileInputRef={fileInputRef}
            uploading={uploading}
            saving={saving}
            onAudioUpload={handleAudioUpload}
            onCancel={() => setEditingUnit(null)}
            onSave={handleSave}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <Headphones size={48} className="mb-4 opacity-20" />
            <p>请选择或新建听力单元</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListeningContentManager;
