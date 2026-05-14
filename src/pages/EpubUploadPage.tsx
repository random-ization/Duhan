import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Layout } from 'lucide-react';
import { EpubUpload } from '../components/reading/EpubUpload';
import { useTranslation } from 'react-i18next';

export default function EpubUploadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-k-bg py-12 px-6">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-3 text-[14px] font-black text-k-sub hover:text-k-ink transition-colors"
          >
            <div className="w-10 h-10 rounded-full border border-k-line flex items-center justify-center group-hover:bg-k-ink group-hover:text-k-bg transition-all">
              <ChevronLeft size={20} />
            </div>
            <span>{t('common.back', { defaultValue: '返回' })}</span>
          </button>

          <div className="flex items-center gap-2 text-k-sub/40 uppercase tracking-widest text-[11px] font-black">
            <Layout size={14} />
            <span>Epub Shelf / Upload</span>
          </div>
        </header>

        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="px-2">
            <h1 className="font-k-serif text-[40px] font-medium text-k-ink leading-tight mb-4">
              {t('epub.upload.title', { defaultValue: '导入您的私人书库' })}
            </h1>
            <p className="text-[16px] text-k-sub font-medium leading-relaxed max-w-[600px]">
              {t('epub.upload.description', {
                defaultValue:
                  '上传 EPUB 格式的电子书，我们将为您自动解析章节，并提供沉浸式的阅读体验。所有书籍仅存放在您的私人书库中。',
              })}
            </p>
          </div>

          <div className="p-1 rounded-[40px] bg-gradient-to-br from-k-line/20 to-transparent">
            <EpubUpload
              onSuccess={() => navigate('/reading')}
              onError={err => console.error(err)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
            {[
              {
                icon: '📖',
                title: t('epub.upload.features.parsing.title', { defaultValue: '章节智能解析' }),
                desc: t('epub.upload.features.parsing.desc', {
                  defaultValue: '上传后系统将自动识别书籍目录与结构',
                }),
              },
              {
                icon: '🎨',
                title: t('epub.upload.features.reader.title', { defaultValue: '个性化阅读器' }),
                desc: t('epub.upload.features.reader.desc', {
                  defaultValue: '支持多种配色方案、字号与排版调节',
                }),
              },
              {
                icon: '☁️',
                title: t('epub.upload.features.sync.title', { defaultValue: '多端进度同步' }),
                desc: t('epub.upload.features.sync.desc', {
                  defaultValue: '在手机与电脑间无缝切换阅读进度',
                }),
              },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="text-[24px] mb-2">{item.icon}</div>
                <h3 className="text-[14px] font-black text-k-ink">{item.title}</h3>
                <p className="text-[12px] font-medium text-k-sub leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
