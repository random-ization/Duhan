import React, { useState, useEffect, useRef } from 'react';
import { usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { api as legacyApi } from '../../../services/api';
import {
    BookOpen, Plus, Loader2, Trash2, Edit2, Save, X,
    Image as ImageIcon, Palette, Upload
} from 'lucide-react';

interface Institute {
    id: string;
    name: string;
    coverUrl?: string;
    themeColor?: string;
    publisher?: string;
    displayLevel?: string;
    volume?: string;
    totalUnits?: number;
}

export const InstituteManager: React.FC = () => {
    // React Query / Convex Pagination
    const { results, status, loadMore } = usePaginatedQuery(
        api.admin.getInstitutes as any,
        {},
        { initialNumItems: 20 }
    );

    // Derived state from pagination results
    const institutes = (results || []).map(i => ({
        ...i,
        id: i.id || (i as any)._id // fallback for types
    })) as Institute[];

    const [loading, setLoading] = useState(false); // Only for mutation actions now
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Edit mode
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showNewForm, setShowNewForm] = useState(false);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [formData, setFormData] = useState<Partial<Institute>>({
        name: '',
        publisher: '',
        displayLevel: '',
        volume: '',
        coverUrl: '',
        themeColor: '#6366f1',
        totalUnits: 0
    });

    // No need for useEffect -> loadInstitutes anymore since we use reactive usePaginatedQuery

    const createInstituteMutation = useMutation(api.admin.createInstitute);
    const updateInstituteMutation = useMutation(api.admin.updateInstitute);
    const deleteInstituteMutation = useMutation(api.admin.deleteInstitute);

    const handleCreate = async () => {
        if (!formData.name?.trim()) {
            alert('请输入教材名称');
            return;
        }
        setSaving(true);
        try {
            // Generate a slug-based ID from name
            const generatedId = formData.name.trim()
                .toLowerCase()
                .replace(/[^\w\s가-힣]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                + '-' + Date.now().toString(36);

            await createInstituteMutation({
                id: generatedId,
                name: formData.name.trim(),
                levels: [{ level: 1, units: formData.totalUnits || 10 }] as any, // Cast to fix type if needed or update schema type
                publisher: formData.publisher?.trim() || '',
                displayLevel: formData.displayLevel?.trim() || '',
                volume: formData.volume?.trim() || '',
                coverUrl: formData.coverUrl?.trim() || '',
                themeColor: formData.themeColor || '#6366f1',
                totalUnits: formData.totalUnits || 0
            });
            setShowNewForm(false);
            resetForm();
            // Data updates automatically
        } catch (e) {
            console.error('Create failed', e);
            alert('创建失败');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingId || !formData.name?.trim()) return;
        setSaving(true);
        try {
            await updateInstituteMutation({
                legacyId: editingId,
                updates: {
                    name: formData.name.trim(),
                    publisher: formData.publisher?.trim(),
                    displayLevel: formData.displayLevel?.trim(),
                    volume: formData.volume?.trim(),
                    coverUrl: formData.coverUrl?.trim(),
                    themeColor: formData.themeColor,
                    totalUnits: formData.totalUnits
                }
            });
            setEditingId(null);
            resetForm();
        } catch (e) {
            console.error('Update failed', e);
            alert('更新失败');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`确定要删除教材 "${name}" 吗？此操作不可恢复。`)) return;
        try {
            await deleteInstituteMutation({ legacyId: id });
        } catch (e) {
            console.error('Delete failed', e);
            alert('删除失败');
        }
    };

    const startEdit = (inst: Institute) => {
        setEditingId(inst.id);
        setFormData({
            name: inst.name,
            publisher: inst.publisher || '',
            displayLevel: inst.displayLevel || '',
            volume: inst.volume || '',
            coverUrl: inst.coverUrl || '',
            themeColor: inst.themeColor || '#6366f1',
            totalUnits: inst.totalUnits || 0
        });
        setShowNewForm(false);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            publisher: '',
            displayLevel: '',
            volume: '',
            coverUrl: '',
            themeColor: '#6366f1',
            totalUnits: 0
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过 5MB');
            return;
        }

        setUploading(true);
        try {
            // Use legacy shim for upload (or migrate to separate storage action)
            const result = await legacyApi.uploadFile(file);
            if (result.url) {
                setFormData({ ...formData, coverUrl: result.url });
            }
        } catch (err) {
            console.error('Upload failed', err);
            alert('上传失败');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    // ... helper for upload ...

    // Re-implement upload using fetch directly or legacy shim if imported
    // To match original code's behavior:
    // We need to import { api as legacyApi } from '../../../services/api';

    // ...

    const cancelEdit = () => {
        setEditingId(null);
        setShowNewForm(false);
        resetForm();
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Left: Institute List */}
            <div className="w-1/2 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-black text-lg">教材列表</h2>
                    <span className="text-sm text-zinc-500">{institutes.length} 个教材</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {status === 'LoadingFirstPage' ? (
                        <div className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : institutes.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10">
                            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">暂无教材</p>
                        </div>
                    ) : (
                        <>
                            {institutes.map(inst => (
                                <div
                                    key={inst.id}
                                    className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all cursor-pointer ${editingId === inst.id
                                        ? 'border-zinc-900 bg-lime-50 shadow-[2px_2px_0px_0px_#18181B]'
                                        : 'border-zinc-200 hover:border-zinc-400'
                                        }`}
                                    onClick={() => startEdit(inst)}
                                >
                                    {/* Color indicator */}
                                    <div
                                        className="w-3 h-12 rounded-full shrink-0"
                                        style={{ backgroundColor: inst.themeColor || '#6366f1' }}
                                    />

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-zinc-900 truncate">
                                            {inst.name}
                                            {inst.displayLevel && <span className="text-zinc-500 font-normal ml-1">{inst.displayLevel}</span>}
                                            {inst.volume && <span className="text-zinc-500 font-normal ml-1">{inst.volume}</span>}
                                        </div>
                                        <div className="text-xs text-zinc-500 truncate">
                                            {inst.publisher || '未设置出版社'}
                                            {inst.totalUnits ? ` · ${inst.totalUnits}课` : ''}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(inst.id, inst.name); }}
                                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            {status === 'CanLoadMore' && (
                                <button
                                    onClick={() => loadMore(20)}
                                    className="w-full py-2 text-sm text-zinc-500 hover:bg-zinc-50 rounded-lg mt-2 font-bold"
                                >
                                    加载更多
                                </button>
                            )}
                            {status === 'LoadingMore' && (
                                <div className="text-center py-2 text-sm text-zinc-400">Loading more...</div>
                            )}
                        </>
                    )}
                </div>

                <button
                    onClick={() => { setShowNewForm(true); setEditingId(null); resetForm(); }}
                    className="mt-4 w-full py-3 bg-zinc-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800"
                >
                    <Plus size={16} /> 新建教材
                </button>
            </div>

            {/* Right: Edit Form */}
            <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
                {(editingId || showNewForm) ? (
                    <div className="max-w-xl mx-auto space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black">
                                {showNewForm ? '新建教材' : '编辑教材'}
                            </h2>
                            <button onClick={cancelEdit} className="p-2 hover:bg-zinc-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold mb-1">教材名称 *</label>
                            <input
                                type="text"
                                placeholder="如：首尔大学韩国语"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 border-2 border-zinc-900 rounded-lg font-bold focus:shadow-[2px_2px_0px_0px_#18181B] outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1">级别</label>
                                <input
                                    type="text"
                                    placeholder="如：1级、初级"
                                    value={formData.displayLevel || ''}
                                    onChange={(e) => setFormData({ ...formData, displayLevel: e.target.value })}
                                    className="w-full p-2 border-2 border-zinc-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">册号</label>
                                <input
                                    type="text"
                                    placeholder="如：上册、下册"
                                    value={formData.volume || ''}
                                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                                    className="w-full p-2 border-2 border-zinc-300 rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold mb-1">出版社</label>
                            <input
                                type="text"
                                placeholder="如：Seoul National University"
                                value={formData.publisher || ''}
                                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                className="w-full p-2 border-2 border-zinc-300 rounded-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 flex items-center gap-1">
                                    <Palette size={12} /> 主题颜色
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={formData.themeColor || '#6366f1'}
                                        onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                                        className="w-12 h-10 border-2 border-zinc-300 rounded-lg cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.themeColor || '#6366f1'}
                                        onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                                        className="flex-1 p-2 border-2 border-zinc-300 rounded-lg font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">总课数</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={formData.totalUnits || 0}
                                    onChange={(e) => setFormData({ ...formData, totalUnits: parseInt(e.target.value) || 0 })}
                                    className="w-full p-2 border-2 border-zinc-300 rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold mb-2 flex items-center gap-1">
                                <ImageIcon size={12} /> 封面图
                            </label>

                            {/* Hidden file input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*"
                                className="hidden"
                            />

                            <div className="flex gap-3 items-start">
                                {/* Upload button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="px-4 py-2 border-2 border-zinc-300 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-50 disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    {uploading ? '上传中...' : '上传图片'}
                                </button>

                                {/* Preview */}
                                {formData.coverUrl && (
                                    <div className="relative">
                                        <img
                                            src={formData.coverUrl}
                                            alt="Preview"
                                            className="h-20 w-20 rounded-lg border-2 border-zinc-200 object-cover"
                                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, coverUrl: '' })}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">支持 JPG、PNG，最大 5MB</p>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={cancelEdit}
                                className="flex-1 py-3 border-2 border-zinc-300 rounded-lg font-bold hover:bg-zinc-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={showNewForm ? handleCreate : handleUpdate}
                                disabled={saving || !formData.name?.trim()}
                                className="flex-1 py-3 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-lime-400 disabled:opacity-50 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {showNewForm ? '创建' : '保存'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">选择教材进行编辑</p>
                        <p className="text-sm mt-1">或点击"新建教材"创建新教材</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstituteManager;
