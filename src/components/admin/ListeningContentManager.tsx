import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api as convexApi } from '../../../convex/_generated/api';
import { useFileUpload } from '../../hooks/useFileUpload';
import { Headphones, Save, Loader2, Plus, Music, Upload, X } from 'lucide-react';

interface Institute {
    _id: string;
    id?: string;
    name: string;
    displayLevel?: string;
    volume?: string;
}

interface UnitListItem {
    id: string;
    unitIndex: number;
    title: string;
    hasAudio: boolean;
}

interface UnitListeningData {
    id?: string;
    unitIndex: number;
    title: string;
    audioUrl: string;
    transcriptData: any;
}

export const ListeningContentManager: React.FC = () => {
    // Convex hooks
    // @ts-ignore
    const institutes = useQuery(convexApi.institutes.getAll) || [];
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    const courseUnits = useQuery(convexApi.units.getByCourse, selectedCourseId ? { courseId: selectedCourseId } : "skip");

    const saveUnitMutation = useMutation(convexApi.units.save);

    // Derived unit list
    const units = useMemo(() => {
        if (!courseUnits) return [];
        return courseUnits.map((u: any) => ({
            id: u._id,
            unitIndex: u.unitIndex,
            title: u.title,
            hasAudio: !!u.audioUrl
        })).sort((a: any, b: any) => a.unitIndex - b.unitIndex);
    }, [courseUnits]);

    const [loading, setLoading] = useState(false);
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
    const unitDetailQuery = useQuery(convexApi.units.getDetails,
        selectedCourseId && viewingUnitIndex ? { courseId: selectedCourseId, unitIndex: viewingUnitIndex } : "skip"
    );

    // Effect: Update selectedCourseId
    useEffect(() => {
        if (institutes.length > 0 && !selectedCourseId) {
            const first = institutes[0] as any;
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
                    transcriptData: unit.transcriptData || null
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
        const nextIndex = units.length > 0 ? Math.max(...units.map((u: any) => u.unitIndex)) + 1 : 1;
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
            } catch (e) {
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">选择教材</label>
                    <select
                        className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                        value={selectedCourseId}
                        onChange={(e) => { setSelectedCourseId(e.target.value); setViewingUnitIndex(null); setEditingUnit(null); }}
                    >
                        {institutes.map((i: any) => (
                            <option key={i._id} value={i.id || i.postgresId || i._id}>
                                {i.name} {i.displayLevel || ''} {i.volume || ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {!courseUnits ? (
                        <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : units.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10">暂无单元</div>
                    ) : (
                        units.map((unit: any) => (
                            <div
                                key={unit.unitIndex}
                                onClick={() => handleSelectUnit(unit)}
                                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${editingUnit?.unitIndex === unit.unitIndex
                                    ? 'border-zinc-900 bg-lime-100 shadow-[2px_2px_0px_0px_#18181B]'
                                    : 'border-transparent hover:bg-zinc-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Headphones className="w-4 h-4 text-lime-600" />
                                    <span className="font-black text-sm">第 {unit.unitIndex} 课</span>
                                    {unit.hasAudio && <span className="text-xs text-green-500">🎵</span>}
                                </div>
                                <div className="text-xs text-zinc-700 truncate">{unit.title || '(未命名)'}</div>
                            </div>
                        ))
                    )}
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
                    <div className="space-y-6 max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <Headphones className="w-8 h-8 text-lime-600" />
                            <h2 className="text-xl font-black">第 {editingUnit.unitIndex} 课 · 听力内容</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">标题 *</label>
                            <input
                                type="text"
                                className="w-full p-3 border-2 border-zinc-900 rounded-lg font-bold"
                                value={editingUnit.title}
                                onChange={e => setEditingUnit({ ...editingUnit, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Music size={16} /> 音频文件</label>
                            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                            {editingUnit.audioUrl ? (
                                <div className="space-y-3">
                                    <div className="p-4 bg-lime-50 border-2 border-lime-200 rounded-lg">
                                        <audio controls src={editingUnit.audioUrl} className="w-full" />
                                    </div>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2 border-2 border-zinc-300 rounded-lg font-bold text-sm hover:bg-zinc-100">
                                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />} 替换音频
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full p-6 border-2 border-dashed border-zinc-400 rounded-lg hover:bg-zinc-50">
                                    {uploading ? "上传中..." : "点击上传音频"}
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">时间戳文稿 (JSON)</label>
                            <textarea
                                className="w-full h-64 p-4 border-2 border-zinc-900 rounded-lg font-mono text-xs"
                                value={transcriptText}
                                onChange={e => setTranscriptText(e.target.value)}
                                placeholder="[{ start, end, text }...]"
                            />
                        </div>
                        {/* Preview omitted for brevity but can be added back */}
                        <div className="pt-4 flex justify-end gap-3">
                            <button onClick={() => setEditingUnit(null)} className="px-6 py-2 border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-100">取消</button>
                            <button onClick={handleSave} disabled={saving || !editingUnit.title} className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center gap-2 hover:bg-lime-400 shadow-[2px_2px_0px_0px_#18181B]">
                                {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} 保存
                            </button>
                        </div>
                    </div>
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
