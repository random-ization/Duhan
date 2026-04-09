import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_AVATAR_FILE_SIZE,
  resetFileInputSelection,
  uploadAvatarImage,
  uploadFileToStorage,
  validateAvatarFile,
} from '../../src/utils/storageUpload';

describe('validateAvatarFile', () => {
  it('rejects non-image files', () => {
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
    expect(validateAvatarFile(file)).toBe('invalid_type');
  });

  it('rejects oversized image files', () => {
    const file = new File([new Uint8Array(MAX_AVATAR_FILE_SIZE + 1)], 'avatar.png', {
      type: 'image/png',
    });
    expect(validateAvatarFile(file)).toBe('too_large');
  });

  it('accepts valid avatar files', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    expect(validateAvatarFile(file)).toBeNull();
  });

  it('clears the file input value so the same file can be selected again', () => {
    const input = { value: 'C:\\\\fakepath\\\\avatar.png' } as HTMLInputElement;

    resetFileInputSelection(input);

    expect(input.value).toBe('');
  });
});

describe('storage uploads', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads files with backend-provided headers', async () => {
    const file = new File(['video'], 'lesson.mp4', { type: 'video/mp4' });
    const getUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: 'https://upload.example.com',
      publicUrl: 'https://cdn.example.com/lesson.mp4',
      key: 'uploads/lesson.mp4',
      headers: { 'Content-Type': 'video/mp4' },
    });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 200 }));

    const result = await uploadFileToStorage({
      file,
      getUploadUrl,
    });

    expect(getUploadUrl).toHaveBeenCalledWith({
      filename: 'lesson.mp4',
      contentType: 'video/mp4',
      fileSize: file.size,
      folder: 'uploads',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://upload.example.com', {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: file,
    });
    expect(result).toEqual({
      url: 'https://cdn.example.com/lesson.mp4',
      key: 'uploads/lesson.mp4',
    });
  });

  it('does not persist avatar URLs when the upload fails', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const getUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: 'https://upload.example.com',
      publicUrl: 'https://cdn.example.com/avatar.png',
      key: 'avatars/avatar.png',
      headers: { 'Content-Type': 'image/png' },
    });
    const saveAvatar = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('denied', { status: 403 }));

    await expect(
      uploadAvatarImage({
        file,
        getUploadUrl,
        saveAvatar,
      })
    ).rejects.toThrow('Upload failed: 403 denied');

    expect(saveAvatar).not.toHaveBeenCalled();
  });
});
