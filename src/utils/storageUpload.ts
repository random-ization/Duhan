export interface StorageUploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
  folder?: string;
}

export interface StorageUploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  headers: Record<string, string>;
}

export type StorageGetUploadUrl = (args: StorageUploadRequest) => Promise<StorageUploadUrlResult>;

export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;

export type AvatarValidationError = 'missing' | 'invalid_type' | 'too_large';

export function resetFileInputSelection(input: HTMLInputElement | null | undefined): void {
  if (!input) return;
  input.value = '';
}

export function validateAvatarFile(file?: File | null): AvatarValidationError | null {
  if (!file) return 'missing';
  if (!file.type.startsWith('image/')) return 'invalid_type';
  if (file.size > MAX_AVATAR_FILE_SIZE) return 'too_large';
  return null;
}

export async function uploadFileToStorage(args: {
  file: File;
  folder?: string;
  getUploadUrl: StorageGetUploadUrl;
}): Promise<{ url: string; key: string }> {
  const { file, folder = 'uploads', getUploadUrl } = args;

  if (!file) {
    throw new Error('No file provided');
  }
  if (file.size === 0) {
    throw new Error('File is empty');
  }

  const { uploadUrl, publicUrl, key, headers } = await getUploadUrl({
    filename: file.name,
    contentType: file.type,
    fileSize: file.size,
    folder,
  });

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed: ${response.status} ${detail || response.statusText}`.trim());
  }

  return { url: publicUrl, key };
}

export async function uploadAvatarImage(args: {
  file: File;
  getUploadUrl: StorageGetUploadUrl;
  saveAvatar: (url: string) => Promise<void>;
}): Promise<string> {
  const { url } = await uploadFileToStorage({
    file: args.file,
    folder: 'avatars',
    getUploadUrl: args.getUploadUrl,
  });

  await args.saveAvatar(url);
  return url;
}
