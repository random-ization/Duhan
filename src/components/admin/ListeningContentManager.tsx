import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { Headphones, Save, Loader2, Plus, Trash2, Music, Upload, X } from 'lucide-react';

interface Institute {
    id: string;
    name: string;
    displayLevel?: string;
    volume?: string;
}

interface UnitListItem {
    id?: string;
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
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [units, setUnits] = useState<UnitListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // 编辑状态
    const [editingUnit, setEditingUnit] = useState<UnitListeningData | null>(null);
    const [transcriptText, setTranscriptText] = useState(''); // Raw JSON text for editing

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 初始化：加载教材列表
    useEffect(() => {
        loadInstitutes();
    }, []);

    // 当选择教材改变时，加载该教材的单元
    useEffect(() => {
        if (selectedCourseId) {
            loadCourseUnits(selectedCourseId);
        } else {
            setUnits([]);
        }
    }, [selectedCourseId]);

    const loadInstitutes = async () => {
        try {
            const data = await api.getInstitutes();
            setInstitutes(data);
            if (data.length > 0) setSelectedCourseId(data[0].id);
        } catch (e) {
            console.error('Failed to load institutes', e);
        }
    };

    const loadCourseUnits = async (courseId: string) => {
        setLoading(true);
        try {
            const response = await api.getListeningUnitsForCourse(courseId);
            if (response.success && response.data) {
                const formattedUnits = response.data.map((u: any) => ({
                    id: u.id,
                    unitIndex: u.unitIndex,
                    title: u.title,
                    hasAudio: !!u.hasAudio,
                }));
                setUnits(formattedUnits);
            }
        } catch (e) {
            console.error('Failed to load listening units', e);
        } finally {
            setLoading(false);
        }
    };

    const loadUnitDetail = async (courseId: string, unitIndex: number) => {
        try {
            const response = await api.getListeningUnit(courseId, unitIndex);
            if (response.success && response.data) {
                const unit = response.data;
                setEditingUnit({
                    id: unit.id,
                    unitIndex: unit.unitIndex,
                    title: unit.title,
                    audioUrl: unit.audioUrl || '',
                    transcriptData: unit.transcriptData || null,
                });
                setTranscriptText(unit.transcriptData ? JSON.stringify(unit.transcriptData, null, 2) : '');
            }
        } catch (e) {
            console.error('Failed to load listening unit detail', e);
        }
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingUnit) return;

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            alert('请选择音频文件 (mp3, wav, m4a 等)');
            return;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('文件过大，请选择小于 50MB 的音频文件');
            return;
        }

        setUploading(true);
        try {
            const result = await api.uploadMedia(file);
            if (result.url) {
                setEditingUnit({ ...editingUnit, audioUrl: result.url });
                alert('音频上传成功！');
            }
        } catch (err) {
            console.error('Audio upload failed:', err);
            alert('音频上传失败，请重试');
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSave = async () => {
        if (!editingUnit || !selectedCourseId) return;

        // Parse JSON
        let parsedTranscript = null;
        if (transcriptText.trim()) {
            try {
                parsedTranscript = JSON.parse(transcriptText);
            } catch (e) {
                alert('JSON 格式错误，请检查后重试');
                return;
            }
        }

        if (!editingUnit.title.trim()) {
            alert('请输入标题');
            return;
        }

        setSaving(true);
        try {
            const response = await api.saveListeningUnit({
                courseId: selectedCourseId,
                unitIndex: editingUnit.unitIndex,
                title: editingUnit.title,
                audioUrl: editingUnit.audioUrl,
                transcriptData: parsedTranscript,
            });

            if (response.success) {
                alert('听力内容保存成功！');
                setEditingUnit(null);
                setTranscriptText('');
                loadCourseUnits(selectedCourseId);
            } else {
                alert('保存失败，请重试');
            }
        } catch (e) {
            console.error(e);
            alert('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    const handleSelectUnit = (unit: UnitListItem) => {
        loadUnitDetail(selectedCourseId, unit.unitIndex);
    };

    const createNewUnit = () => {
        const nextIndex = units.length > 0 ? Math.max(...units.map(u => u.unitIndex)) + 1 : 1;
        setEditingUnit({
            unitIndex: nextIndex,
            title: '',
            audioUrl: '',
            transcriptData: null,
        });
        setTranscriptText('');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* 左侧：列表栏 */}
            <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">选择教材</label>
                    <select
                        className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        {institutes.map(i => (
                            <option key={i.id} value={i.id}>
                                {i.name}
                                {i.displayLevel ? ` ${i.displayLevel}` : ''}
                                {i.volume ? ` ${i.volume}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : units.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10">
                            暂无听力单元<br />
                            <span className="text-xs">点击下方按钮创建</span>
                        </div>
                    ) : (
                        units.map(unit => (
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

            {/* 右侧：编辑器 */}
            <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
                {editingUnit ? (
                    <div className="space-y-6 max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <Headphones className="w-8 h-8 text-lime-600" />
                            <div>
                                <h2 className="text-xl font-black">第 {editingUnit.unitIndex} 课 · 听力内容</h2>
                            </div>
                        </div>

                        {/* 标题 */}
                        <div>
                            <label className="block text-sm font-bold mb-2">标题 *</label>
                            <input
                                type="text"
                                className="w-full p-3 border-2 border-zinc-900 rounded-lg font-bold"
                                value={editingUnit.title}
                                onChange={e => setEditingUnit({ ...editingUnit, title: e.target.value })}
                                placeholder="例如：机场对话"
                            />
                        </div>

                        {/* 音频上传 */}
                        <div>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                                <Music size={16} /> 音频文件
                            </label>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleAudioUpload}
                                className="hidden"
                            />

                            {editingUnit.audioUrl ? (
                                <div className="space-y-3">
                                    {/* Audio player */}
                                    <div className="p-4 bg-lime-50 border-2 border-lime-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-lime-700 flex items-center gap-2">
                                                ✓ 已上传音频
                                            </span>
                                            <button
                                                onClick={() => setEditingUnit({ ...editingUnit, audioUrl: '' })}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="删除音频"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <audio controls src={editingUnit.audioUrl} className="w-full" />
                                    </div>

                                    {/* Replace button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="px-4 py-2 border-2 border-zinc-300 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-100 disabled:opacity-50"
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        替换音频
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full p-6 border-2 border-dashed border-zinc-400 rounded-lg hover:border-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
                                >
                                    <div className="flex flex-col items-center text-zinc-500">
                                        {uploading ? (
                                            <>
                                                <Loader2 size={32} className="animate-spin mb-2" />
                                                <span className="font-bold">上传中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={32} className="mb-2" />
                                                <span className="font-bold">点击上传音频文件</span>
                                                <span className="text-xs mt-1">支持 MP3, WAV, M4A 等格式，最大 50MB</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* 时间戳文稿 */}
                        <div>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                                🎤 时间戳文稿 (卡拉OK模式)
                            </label>
                            <textarea
                                className="w-full h-64 p-4 border-2 border-zinc-900 rounded-lg resize-none font-mono text-xs leading-relaxed"
                                value={transcriptText}
                                onChange={e => setTranscriptText(e.target.value)}
                                placeholder={`[
  { "start": 0, "end": 2.5, "text": "안녕하세요", "translation": "你好" },
  { "start": 2.5, "end": 5.0, "text": "저는 학생입니다", "translation": "我是学生" }
]`}
                            />
                            <div className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-600">
                                <p className="font-bold mb-1">JSON 格式说明：</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><code className="bg-zinc-200 px-1 rounded">start</code>: 开始时间（秒）</li>
                                    <li><code className="bg-zinc-200 px-1 rounded">end</code>: 结束时间（秒）</li>
                                    <li><code className="bg-zinc-200 px-1 rounded">text</code>: 韩语文本</li>
                                    <li><code className="bg-zinc-200 px-1 rounded">translation</code>: 中文翻译（可选）</li>
                                </ul>
                            </div>
                        </div>

                        {/* 预览 */}
                        {transcriptText && (() => {
                            try {
                                const segments = JSON.parse(transcriptText);
                                if (Array.isArray(segments) && segments.length > 0) {
                                    return (
                                        <div>
                                            <label className="block text-sm font-bold mb-2">📋 预览</label>
                                            <div className="border-2 border-zinc-200 rounded-lg max-h-48 overflow-y-auto">
                                                {segments.map((seg: any, i: number) => (
                                                    <div key={i} className="p-2 border-b border-zinc-100 last:border-b-0 flex items-start gap-3">
                                                        <span className="text-xs font-mono text-zinc-400 w-20 shrink-0">
                                                            {formatTime(seg.start)} - {formatTime(seg.end)}
                                                        </span>
                                                        <div>
                                                            <div className="font-bold">{seg.text}</div>
                                                            {seg.translation && (
                                                                <div className="text-xs text-zinc-500">{seg.translation}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                            } catch {
                                return (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                        ⚠️ JSON 格式错误，请检查语法
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* 操作按钮 */}
                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setEditingUnit(null);
                                    setTranscriptText('');
                                }}
                                className="px-6 py-2 border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-100"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !editingUnit.title}
                                className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center gap-2 hover:bg-lime-400 disabled:opacity-50 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                保存听力内容
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <Headphones size={48} className="mb-4 opacity-20" />
                        <p>请在左侧选择或新建听力单元</p>
                        <p className="text-xs mt-2">添加音频链接和时间戳文稿</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListeningContentManager;
