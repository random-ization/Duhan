import React from 'react';
import { BookOpen, Loader2, Save, X, Palette } from 'lucide-react';

interface Institute {
  id: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
  coverUrl?: string;
  themeColor?: string;
  publisher?: string;
  displayLevel?: string;
  volume?: string;
  totalUnits?: number;
}

interface InstituteEditFormProps {
  editingId: string | null;
  showNewForm: boolean;
  formData: Partial<Institute>;
  setFormData: (data: Partial<Institute>) => void;
  availablePublishers?: { _id: string; name: string; imageUrl?: string }[];
  saving: boolean;
  onCancel: () => void;
  onCreate: () => void;
  onUpdate: () => void;
}

const DEFAULT_THEME_COLOR = '#6366f1';

const normalizeFormData = (formData: Partial<Institute>) => ({
  name: formData.name ?? '',
  nameZh: formData.nameZh ?? '',
  nameEn: formData.nameEn ?? '',
  nameVi: formData.nameVi ?? '',
  nameMn: formData.nameMn ?? '',
  displayLevel: formData.displayLevel ?? '',
  volume: formData.volume ?? '',
  publisher: formData.publisher ?? '',
  themeColor: formData.themeColor ?? DEFAULT_THEME_COLOR,
  totalUnits: formData.totalUnits ?? 0,
});

export const InstituteEditForm: React.FC<InstituteEditFormProps> = ({
  editingId,
  showNewForm,
  formData,
  setFormData,
  availablePublishers,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}) => {
  const normalizedForm = normalizeFormData(formData);
  const updateForm = (updates: Partial<Institute>) => setFormData({ ...formData, ...updates });
  const canSubmit = normalizedForm.name.trim().length > 0;
  const submitAction = showNewForm ? onCreate : onUpdate;
  const submitLabel = showNewForm ? '创建教材' : '保存教材';

  if (!editingId && !showNewForm) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-400">
        <BookOpen size={48} className="mb-4 opacity-20" />
        <p className="font-bold">选择教材进行编辑</p>
        <p className="text-sm mt-1">或点击&quot;新建教材&quot;创建新教材</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black">{showNewForm ? '新建教材' : '编辑教材'}</h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-zinc-100 rounded-lg"
          aria-label="关闭编辑表单"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div>
        <label htmlFor="inst-name" className="block text-xs font-bold mb-1">
          教材名称(韩语) *
        </label>
        <input
          id="inst-name"
          type="text"
          placeholder="如：首尔大学韩国语"
          value={normalizedForm.name}
          onChange={e => updateForm({ name: e.target.value })}
          className="w-full p-3 border-2 border-zinc-900 rounded-lg font-bold focus:shadow-[2px_2px_0px_0px_#18181B] outline-none"
          aria-label="教材名称(韩语)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="inst-name-zh" className="block text-xs font-bold mb-1">
            教材名称(中文)
          </label>
          <input
            id="inst-name-zh"
            type="text"
            placeholder="如：首尔大学韩国语"
            value={normalizedForm.nameZh}
            onChange={e => updateForm({ nameZh: e.target.value })}
            className="w-full p-2 border-2 border-zinc-300 rounded-lg"
            aria-label="教材名称(中文)"
          />
        </div>
        <div>
          <label htmlFor="inst-name-en" className="block text-xs font-bold mb-1">
            教材名称(English)
          </label>
          <input
            id="inst-name-en"
            type="text"
            placeholder="e.g. Seoul National University Korean"
            value={normalizedForm.nameEn}
            onChange={e => updateForm({ nameEn: e.target.value })}
            className="w-full p-2 border-2 border-zinc-300 rounded-lg"
            aria-label="教材名称(英语)"
          />
        </div>
        <div>
          <label htmlFor="inst-name-vi" className="block text-xs font-bold mb-1">
            教材名称(Tiếng Việt)
          </label>
          <input
            id="inst-name-vi"
            type="text"
            placeholder="Ví dụ: Tiếng Hàn Đại học Quốc gia Seoul"
            value={normalizedForm.nameVi}
            onChange={e => updateForm({ nameVi: e.target.value })}
            className="w-full p-2 border-2 border-zinc-300 rounded-lg"
            aria-label="教材名称(越南语)"
          />
        </div>
        <div>
          <label htmlFor="inst-name-mn" className="block text-xs font-bold mb-1">
            教材名称(Монгол)
          </label>
          <input
            id="inst-name-mn"
            type="text"
            placeholder="Жишээ: Сөүл Үндэсний Их Сургуулийн Солонгос хэл"
            value={normalizedForm.nameMn}
            onChange={e => updateForm({ nameMn: e.target.value })}
            className="w-full p-2 border-2 border-zinc-300 rounded-lg"
            aria-label="教材名称(蒙古语)"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="inst-level" className="block text-xs font-bold mb-1">
            级别
          </label>

          <select
            id="inst-level"
            value={normalizedForm.displayLevel}
            onChange={e => updateForm({ displayLevel: e.target.value })}
            className="w-full p-2 border-2 border-zinc-300 rounded-lg bg-white"
            aria-label="选择级别"
          >
            <option value="">选择级别...</option>
            {[1, 2, 3, 4, 5, 6].map(num => (
              <option key={num} value={num.toString()}>
                {num}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inst-volume" className="block text-xs font-bold mb-1">
            册号
          </label>
          <input
            id="inst-volume"
            type="text"
            placeholder="如：上册、下册"
            value={normalizedForm.volume}
            onChange={e => updateForm({ volume: e.target.value })}
            className="w-full p-2 border-2 border-zinc-300 rounded-lg"
            aria-label="册号"
          />
        </div>
      </div>

      <div>
        <label htmlFor="inst-publisher" className="block text-xs font-bold mb-1">
          出版社
        </label>
        <select
          id="inst-publisher"
          value={normalizedForm.publisher}
          onChange={e => updateForm({ publisher: e.target.value })}
          className="w-full p-2 border-2 border-zinc-300 rounded-lg bg-white"
          aria-label="选择出版社"
        >
          <option value="">选择出版社...</option>
          {availablePublishers?.map(pub => (
            <option key={pub._id} value={pub.name}>
              {pub.name}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-400 mt-1">
          如需新增出版社，请前往&quot;出版社管理&quot;标签页。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="inst-theme-color"
            className="block text-xs font-bold mb-1 flex items-center gap-1"
          >
            <Palette size={12} /> 主题颜色
          </label>
          <div className="flex gap-2">
            <input
              id="inst-theme-color"
              type="color"
              value={normalizedForm.themeColor}
              onChange={e => updateForm({ themeColor: e.target.value })}
              className="w-12 h-10 border-2 border-zinc-300 rounded-lg cursor-pointer"
              aria-label="主题颜色选择器"
            />
            <input
              type="text"
              value={normalizedForm.themeColor}
              onChange={e => updateForm({ themeColor: e.target.value })}
              className="flex-1 p-2 border-2 border-zinc-300 rounded-lg font-mono text-sm"
              aria-label="主题颜色十六进制值"
            />
          </div>
        </div>
        <div>
          <label htmlFor="inst-total-units" className="block text-xs font-bold mb-1">
            总课数
          </label>
          <input
            id="inst-total-units"
            type="number"
            min={0}
            value={normalizedForm.totalUnits}
            onChange={e =>
              updateForm({
                totalUnits: Number.parseInt(e.target.value, 10) || 0,
              })
            }
            className="w-full p-2 border-2 border-zinc-300 rounded-lg"
            aria-label="总课数"
          />
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border-2 border-zinc-300 rounded-lg font-bold hover:bg-zinc-50"
          aria-label="取消编辑"
        >
          取消
        </button>
        <button
          onClick={submitAction}
          disabled={saving || !canSubmit}
          className="flex-1 py-3 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-lime-400 disabled:opacity-50 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
          aria-label={submitLabel}
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
};
