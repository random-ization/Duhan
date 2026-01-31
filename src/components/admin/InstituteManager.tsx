import React, { useState } from 'react';
import { usePaginatedQuery, useMutation, useQuery } from 'convex/react';
import { Plus, Loader2, BookOpen } from 'lucide-react';
import { PublishersManager } from './PublishersManager';
import type { PaginationOptions, PaginationResult } from 'convex/server';
import { NoArgs, mRef, qRef } from '../../utils/convexRefs';
import { InstituteListItem } from './InstituteListItem';
import { InstituteEditForm } from './InstituteEditForm';

interface Institute {
  id: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
  coverUrl?: string; // Kept for interface compatibility but not used in form
  themeColor?: string;
  publisher?: string;
  displayLevel?: string;
  volume?: string;
  totalUnits?: number;
}

export const InstituteManager: React.FC = () => {
  // React Query / Convex Pagination
  type InstituteRow = Partial<Institute> & { _id?: string };
  const { results, status, loadMore } = usePaginatedQuery(
    qRef<{ paginationOpts: PaginationOptions }, PaginationResult<InstituteRow>>(
      'admin:getInstitutes'
    ),
    {},
    { initialNumItems: 20 }
  );
  const availablePublishers = useQuery(
    qRef<NoArgs, { _id: string; name: string; imageUrl?: string }[]>('publishers:getAll')
  );

  // Derived state from pagination results
  const institutes = (results || []).map(i => ({
    ...i,
    id: i.id || i._id || '', // fallback for types
  })) as Institute[];

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'institutes' | 'publishers'>('institutes');

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Form fields
  const [formData, setFormData] = useState<Partial<Institute>>({
    name: '',
    nameZh: '',
    nameEn: '',
    nameVi: '',
    nameMn: '',
    publisher: '',
    displayLevel: '',
    volume: '',
    themeColor: '#6366f1',
    totalUnits: 0,
  });

  const createInstituteMutation = useMutation(
    mRef<
      {
        id: string;
        name: string;
        nameZh?: string;
        nameEn?: string;
        nameVi?: string;
        nameMn?: string;
        levels: Array<{ level: number; units: number }>;
        publisher: string;
        displayLevel: string;
        volume: string;
        themeColor: string;
        totalUnits: number;
        coverUrl: string;
      },
      unknown
    >('admin:createInstitute')
  );
  const updateInstituteMutation = useMutation(
    mRef<
      {
        legacyId: string;
        updates: Partial<
          Pick<
            Institute,
            | 'name'
            | 'nameZh'
            | 'nameEn'
            | 'nameVi'
            | 'nameMn'
            | 'publisher'
            | 'displayLevel'
            | 'volume'
            | 'themeColor'
            | 'totalUnits'
            | 'coverUrl'
          >
        >;
      },
      unknown
    >('admin:updateInstitute')
  );
  const deleteInstituteMutation = useMutation(
    mRef<{ legacyId: string }, unknown>('admin:deleteInstitute')
  );

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      alert('请输入教材名称');
      return;
    }
    setSaving(true);
    try {
      // Generate a slug-based ID from name
      const generatedId =
        formData.name
          .trim()
          .toLowerCase()
          .replaceAll(/[^\w\s가-힣]/g, '')
          .replaceAll(/\s+/g, '-')
          .replaceAll(/-+/g, '-') +
        '-' +
        Date.now().toString(36);

      await createInstituteMutation({
        id: generatedId,
        name: formData.name.trim(),
        nameZh: formData.nameZh?.trim() || '',
        nameEn: formData.nameEn?.trim() || '',
        nameVi: formData.nameVi?.trim() || '',
        nameMn: formData.nameMn?.trim() || '',
        levels: [{ level: 1, units: formData.totalUnits || 10 }],
        publisher: formData.publisher?.trim() || '',
        displayLevel: formData.displayLevel?.trim() || '',
        volume: formData.volume?.trim() || '',
        themeColor: formData.themeColor || '#6366f1',
        totalUnits: formData.totalUnits || 0,
        coverUrl: '', // No longer using coverUrl in create
      });
      setShowNewForm(false);
      resetForm();
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
          nameZh: formData.nameZh?.trim() || '',
          nameEn: formData.nameEn?.trim() || '',
          nameVi: formData.nameVi?.trim() || '',
          nameMn: formData.nameMn?.trim() || '',
          publisher: formData.publisher?.trim(),
          displayLevel: formData.displayLevel?.trim(),
          volume: formData.volume?.trim(),
          themeColor: formData.themeColor,
          totalUnits: formData.totalUnits,
          coverUrl: '', // No longer updating coverUrl
        },
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
      nameZh: inst.nameZh || '',
      nameEn: inst.nameEn || '',
      nameVi: inst.nameVi || '',
      nameMn: inst.nameMn || '',
      publisher: inst.publisher || '',
      displayLevel: inst.displayLevel || '',
      volume: inst.volume || '',
      themeColor: inst.themeColor || '#6366f1',
      totalUnits: inst.totalUnits || 0,
    });
    setShowNewForm(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameZh: '',
      nameEn: '',
      nameVi: '',
      nameMn: '',
      publisher: '',
      displayLevel: '',
      volume: '',
      themeColor: '#6366f1',
      totalUnits: 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowNewForm(false);
    resetForm();
  };

  if (status === 'LoadingFirstPage' || !results) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b-2 border-zinc-200">
        <button
          onClick={() => setActiveTab('institutes')}
          className={`px-4 py-2 font-bold -mb-[2px] border-b-2 transition-colors ${activeTab === 'institutes' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          教材管理
        </button>
        <button
          onClick={() => setActiveTab('publishers')}
          className={`px-4 py-2 font-bold -mb-[2px] border-b-2 transition-colors ${activeTab === 'publishers' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          出版社管理
        </button>
      </div>

      {activeTab === 'publishers' ? (
        <PublishersManager />
      ) : (
        <div className="flex h-[calc(100vh-200px)] gap-6">
          {/* Left: Institute List */}
          <div className="w-1/2 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-lg">教材列表</h2>
              <span className="text-sm text-zinc-500">{institutes.length} 个教材</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {(() => {
                if (institutes.length === 0 && status === 'LoadingMore') {
                  return (
                    <div className="text-center py-10">
                      <Loader2 className="animate-spin mx-auto" />
                    </div>
                  );
                }
                if (institutes.length === 0) {
                  return (
                    <div className="text-center text-zinc-400 py-10">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">暂无教材</p>
                    </div>
                  );
                }
                return (
                  <>
                    {institutes.map(inst => (
                      <InstituteListItem
                        key={inst.id}
                        inst={inst}
                        isEditing={editingId === inst.id}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                      />
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
                );
              })()}
            </div>

            <button
              onClick={() => {
                setShowNewForm(true);
                setEditingId(null);
                resetForm();
              }}
              className="mt-4 w-full py-3 bg-zinc-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800"
            >
              <Plus size={16} /> 新建教材
            </button>
          </div>

          {/* Right: Edit Form */}
          <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
            <InstituteEditForm
              editingId={editingId}
              showNewForm={showNewForm}
              formData={formData}
              setFormData={setFormData}
              availablePublishers={availablePublishers}
              saving={saving}
              onCancel={cancelEdit}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InstituteManager;
