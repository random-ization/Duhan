import React, { useCallback, useMemo, useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Book, FileText, Loader2, Upload, X } from 'lucide-react';
import { READING_LIBRARY, STORAGE } from '../../utils/convexRefs';
import { uploadFileToStorage } from '../../utils/storageUpload';
import type { EpubUploadFormData } from '../../types/readingLibrary';
import { logError, logInfo, logWarn } from '../../utils/logger';

interface EpubUploadProps {
  onSuccess?: (bookId: string, slug: string) => void;
  onError?: (error: string) => void;
}

const MAX_EPUB_FILE_SIZE = 100 * 1024 * 1024;

function validateEpubFile(
  file: File,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null {
  const lowerName = file.name.toLowerCase();
  const mimeType = (file.type || 'application/epub+zip').toLowerCase();

  if (!lowerName.endsWith('.epub')) {
    return t('readingDiscovery.upload.errors.invalidExtension', {
      defaultValue: 'Please select an EPUB file (.epub).',
    });
  }
  if (file.type && mimeType !== 'application/epub+zip' && mimeType !== 'application/octet-stream') {
    return t('readingDiscovery.upload.errors.unsupportedType', {
      defaultValue: 'Only EPUB files are supported.',
    });
  }
  if (file.size <= 0) {
    return t('readingDiscovery.upload.errors.emptyFile', {
      defaultValue: 'The selected file is empty.',
    });
  }
  if (file.size > MAX_EPUB_FILE_SIZE) {
    return t('readingDiscovery.upload.errors.fileTooLarge', {
      defaultValue: 'EPUB files must be smaller than 100MB.',
    });
  }
  return null;
}

function guessTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.epub$/i, '')
    .replaceAll(/[_-]+/g, ' ')
    .trim();
}

export const EpubUpload: React.FC<EpubUploadProps> = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<EpubUploadFormData>({
    title: '',
    author: '',
    description: '',
    language: 'en',
    tags: [],
    file: null,
  });
  const [showForm, setShowForm] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const getUploadUrl = useAction(STORAGE.getUploadUrl);
  const createUploadDraft = useMutation(READING_LIBRARY.createUploadDraft);

  const selectedFileName = useMemo(() => formData.file?.name || null, [formData.file]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const error = validateEpubFile(file, t);
      if (error) {
        logWarn('Invalid EPUB selected', { fileName: file.name, reason: error });
        setLocalError(error);
        onError?.(error);
        return;
      }

      setLocalError(null);
      setFormData(prev => ({
        ...prev,
        file,
        title: prev.title || guessTitleFromFilename(file.name),
      }));
    },
    [onError, t]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!formData.file) {
        const message = t('readingDiscovery.upload.errors.fileRequired', {
          defaultValue: 'Please select an EPUB file.',
        });
        setLocalError(message);
        onError?.(message);
        return;
      }
      if (!formData.title.trim() || !formData.author.trim()) {
        const message = t('readingDiscovery.upload.errors.titleAuthorRequired', {
          defaultValue: 'Title and author are required.',
        });
        setLocalError(message);
        onError?.(message);
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);
      setLocalError(null);

      try {
        const { key } = await uploadFileToStorage({
          file: formData.file,
          folder: 'ebooks',
          getUploadUrl: async args => {
            setUploadProgress(30);
            return getUploadUrl({
              ...args,
              contentType: args.contentType || 'application/epub+zip',
            });
          },
        });

        setUploadProgress(75);
        const result = await createUploadDraft({
          title: formData.title.trim(),
          author: formData.author.trim(),
          description: formData.description.trim() || undefined,
          language: formData.language,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          epubObjectKey: key,
        });

        setUploadProgress(100);
        logInfo('EPUB draft created', { bookId: result.bookId, slug: result.slug });
        onSuccess?.(result.bookId, result.slug);
        setFormData({
          title: '',
          author: '',
          description: '',
          language: 'en',
          tags: [],
          file: null,
        });
        setTagInput('');
        setShowForm(false);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t('readingDiscovery.upload.errors.uploadFailed', {
                defaultValue: 'Failed to upload EPUB.',
              });
        logError('EPUB upload failed', error);
        setLocalError(message);
        onError?.(message);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [createUploadDraft, formData, getUploadUrl, onError, onSuccess, t]
  );

  const addTag = useCallback(() => {
    const nextTag = tagInput.trim();
    if (!nextTag || formData.tags.includes(nextTag)) return;
    setFormData(prev => ({ ...prev, tags: [...prev.tags, nextTag] }));
    setTagInput('');
  }, [formData.tags, tagInput]);

  const removeTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  }, []);

  if (!showForm) {
    return (
      <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Book className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">
                {t('readingDiscovery.upload.title', { defaultValue: 'Upload EPUB' })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('readingDiscovery.upload.subtitle', {
                  defaultValue:
                    "Upload an EPUB and we'll parse chapters, build the reader, and queue it for review.",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('readingDiscovery.upload.action', { defaultValue: 'Upload' })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-foreground">
            {t('readingDiscovery.upload.title', { defaultValue: 'Upload EPUB' })}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('readingDiscovery.upload.supportedFormat', {
              defaultValue:
                'Supported format: EPUB. The file will be parsed after upload and saved as a draft.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">
            {t('readingDiscovery.upload.fileLabel', { defaultValue: 'EPUB File' })}
          </label>
          <label
            htmlFor="epub-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition hover:border-primary/40 hover:bg-primary/5"
          >
            {isUploading ? (
              <>
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  {t('readingDiscovery.upload.uploading', {
                    defaultValue: 'Uploading {{progress}}%',
                    progress: uploadProgress,
                  })}
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-3 h-8 w-8 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  {selectedFileName ||
                    t('readingDiscovery.upload.chooseFile', {
                      defaultValue: 'Choose an EPUB file',
                    })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('readingDiscovery.upload.maxSize', { defaultValue: 'Up to 100MB' })}
                </p>
              </>
            )}
          </label>
          <input
            id="epub-file"
            type="file"
            accept=".epub,application/epub+zip"
            className="hidden"
            disabled={isUploading}
            onChange={handleFileSelect}
          />
        </div>

        {localError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{localError}</span>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              {t('readingDiscovery.upload.titleLabel', { defaultValue: 'Title' })}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={event => setFormData(prev => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              disabled={isUploading}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              {t('readingDiscovery.upload.authorLabel', { defaultValue: 'Author' })}
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={event => setFormData(prev => ({ ...prev, author: event.target.value }))}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              disabled={isUploading}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">
            {t('readingDiscovery.upload.descriptionLabel', { defaultValue: 'Description' })}
          </label>
          <textarea
            value={formData.description}
            onChange={event => setFormData(prev => ({ ...prev, description: event.target.value }))}
            rows={3}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            disabled={isUploading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[220px,1fr]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              {t('readingDiscovery.upload.languageLabel', { defaultValue: 'Language' })}
            </label>
            <select
              value={formData.language}
              onChange={event => setFormData(prev => ({ ...prev, language: event.target.value }))}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              disabled={isUploading}
            >
              <option value="en">
                {t('readingDiscovery.upload.languages.en', { defaultValue: 'English' })}
              </option>
              <option value="ko">
                {t('readingDiscovery.upload.languages.ko', { defaultValue: 'Korean' })}
              </option>
              <option value="zh">
                {t('readingDiscovery.upload.languages.zh', { defaultValue: 'Chinese' })}
              </option>
              <option value="vi">
                {t('readingDiscovery.upload.languages.vi', { defaultValue: 'Vietnamese' })}
              </option>
              <option value="mn">
                {t('readingDiscovery.upload.languages.mn', { defaultValue: 'Mongolian' })}
              </option>
              <option value="ja">
                {t('readingDiscovery.upload.languages.ja', { defaultValue: 'Japanese' })}
              </option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              {t('readingDiscovery.upload.tagsLabel', { defaultValue: 'Tags' })}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={event => setTagInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                disabled={isUploading}
                placeholder={t('readingDiscovery.upload.tagsPlaceholder', {
                  defaultValue: 'Add tags',
                })}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || isUploading}
                className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('common.add', { defaultValue: 'Add' })}
              </button>
            </div>
            {formData.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2"
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={
              isUploading || !formData.file || !formData.title.trim() || !formData.author.trim()
            }
            className="inline-flex items-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {t('readingDiscovery.upload.submit', { defaultValue: 'Upload Book' })}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            disabled={isUploading}
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
        </div>
      </form>
    </div>
  );
};
