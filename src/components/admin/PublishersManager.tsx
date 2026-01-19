import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Loader2, Upload, ImageIcon, X } from 'lucide-react';
import { NoArgs, qRef, mRef } from '../../utils/convexRefs';

export const PublishersManager: React.FC = () => {
  const publishers = useQuery(
    qRef<NoArgs, { _id: string; name: string; imageUrl?: string }[]>('publishers:getAll')
  );
  const institutes = useQuery(
    qRef<NoArgs, { _id: string; id?: string; postgresId?: string; publisher?: string }[]>(
      'institutes:getAll'
    )
  );
  const savePublisher = useMutation(
    mRef<{ name: string; imageUrl?: string }, unknown>('publishers:save')
  );
  const generateUploadUrl = useMutation(mRef<NoArgs, string>('publishers:generateUploadUrl'));

  const [editingPub, setEditingPub] = useState<{
    id?: string;
    name: string;
    imageUrl?: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergedPublishers = useMemo(() => {
    const pubMap = new Map<string, { id?: string; name: string; imageUrl?: string }>();

    // 1. Add existing publishers from DB
    publishers?.forEach(p => {
      pubMap.set(p.name, { id: p._id, name: p.name, imageUrl: p.imageUrl });
    });

    // 2. Add found publishers from Institutes
    institutes?.forEach(inst => {
      if (inst.publisher && !pubMap.has(inst.publisher)) {
        pubMap.set(inst.publisher, { name: inst.publisher });
      }
    });

    return Array.from(pubMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [publishers, institutes]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPub) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setUploading(true);
    try {
      // Local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Convex
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) throw new Error('Upload failed');
      const { storageId } = await result.json();

      setEditingPub({ ...editingPub, imageUrl: storageId });
    } catch (err) {
      console.error('Upload failed', err);
      alert('上传失败');
      setPreviewUrl(null); // Clear preview on failure
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!editingPub?.name.trim()) return;
    setSaving(true);
    try {
      await savePublisher({
        name: editingPub.name,
        imageUrl: editingPub.imageUrl,
      });
      setEditingPub(null);
      setPreviewUrl(null);
    } catch (e) {
      console.error(e);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!publishers || !institutes)
    return (
      <div className="p-10 text-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );

  return (
    <div className="flex gap-6 h-[calc(100vh-150px)]">
      {/* List */}
      <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-black text-lg">出版社列表</h2>
          <button
            onClick={() => {
              setEditingPub({ name: '' });
              setPreviewUrl(null);
            }}
            className="text-xs bg-zinc-900 text-white px-2 py-1 rounded font-bold hover:bg-zinc-800"
          >
            + 新增
          </button>
        </div>
        <div className="space-y-2">
          {mergedPublishers.map(pub => (
            <div
              key={pub.name}
              onClick={() => {
                setEditingPub({ id: pub.id, name: pub.name, imageUrl: pub.imageUrl });
                setPreviewUrl(null);
              }}
              className={`p-3 border-2 rounded-lg cursor-pointer flex items-center gap-3 ${editingPub?.name === pub.name ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}`}
            >
              {pub.imageUrl ? (
                <img
                  src={pub.imageUrl}
                  alt={pub.name}
                  className="w-10 h-10 object-cover rounded border border-zinc-200"
                />
              ) : (
                <div className="w-10 h-10 bg-zinc-100 rounded flex items-center justify-center font-bold text-zinc-400">
                  {pub.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="font-bold">{pub.name}</div>
                {!pub.id && <div className="text-[10px] text-amber-500 font-bold">未配置</div>}
              </div>
            </div>
          ))}
          {mergedPublishers.length === 0 && (
            <div className="text-center text-zinc-400 py-10 text-sm">暂无出版社</div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
        {editingPub ? (
          <div className="max-w-md mx-auto space-y-6">
            <h2 className="text-xl font-black">{editingPub.id ? '编辑出版社' : '新增出版社'}</h2>

            <div>
              <label className="block text-xs font-bold mb-1">
                出版社名称 (必须与教材中的一致)
              </label>
              <input
                value={editingPub.name}
                onChange={e => setEditingPub({ ...editingPub, name: e.target.value })}
                disabled={!!editingPub.id} // Name is ID usually, disabling edit for simplicity or allow but be careful
                className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                placeholder="如：延世大学"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-2">图片 (显示在抽屉头部)</label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center gap-4">
                {previewUrl || (editingPub.imageUrl && editingPub.imageUrl.startsWith('http')) ? (
                  <div className="relative group">
                    <img
                      src={previewUrl || editingPub.imageUrl}
                      className="w-24 h-24 object-contain border-2 border-zinc-200 rounded-lg bg-zinc-50"
                    />
                    <button
                      onClick={() => {
                        setEditingPub({ ...editingPub, imageUrl: undefined });
                        setPreviewUrl(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-zinc-300 rounded-lg flex items-center justify-center text-zinc-300">
                    <ImageIcon />
                  </div>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 border-2 border-zinc-300 rounded-lg font-bold hover:bg-zinc-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  上传图片
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditingPub(null)}
                className="flex-1 py-2 border-2 border-zinc-200 rounded-lg font-bold hover:bg-zinc-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingPub.name}
                className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 font-bold">
            选择或创建出版社以编辑图片
          </div>
        )}
      </div>
    </div>
  );
};
