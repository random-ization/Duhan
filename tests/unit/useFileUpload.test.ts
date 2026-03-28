import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileUpload } from '../../src/hooks/useFileUpload';

const useActionMock = vi.fn();
const uploadFileToStorageMock = vi.fn();

vi.mock('convex/react', () => ({
  useAction: (ref: unknown) => useActionMock(ref),
}));

vi.mock('../../src/utils/storageUpload', () => ({
  uploadFileToStorage: (args: unknown) => uploadFileToStorageMock(args),
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActionMock.mockReturnValue(vi.fn());
  });

  it('keeps uploading true until all concurrent uploads finish', async () => {
    const first = deferred<{ url: string; key: string }>();
    const second = deferred<{ url: string; key: string }>();
    uploadFileToStorageMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useFileUpload());
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });

    let uploadPromiseA!: Promise<{ url: string }>;
    let uploadPromiseB!: Promise<{ url: string }>;

    await act(async () => {
      uploadPromiseA = result.current.uploadFile(fileA, 'avatars');
      uploadPromiseB = result.current.uploadFile(fileB, 'avatars');
    });

    expect(result.current.uploading).toBe(true);

    await act(async () => {
      first.resolve({ url: 'https://cdn.example.com/a.png', key: 'avatars/a.png' });
      await Promise.resolve();
    });

    expect(result.current.uploading).toBe(true);

    await act(async () => {
      second.resolve({ url: 'https://cdn.example.com/b.png', key: 'avatars/b.png' });
      await Promise.all([uploadPromiseA, uploadPromiseB]);
    });

    expect(result.current.uploading).toBe(false);
  });

  it('resets uploading after a failed upload', async () => {
    uploadFileToStorageMock.mockRejectedValueOnce(new Error('Upload failed'));

    const { result } = renderHook(() => useFileUpload());

    await expect(
      act(async () => {
        await result.current.uploadFile(new File(['a'], 'a.png', { type: 'image/png' }));
      })
    ).rejects.toThrow('Upload failed');

    expect(result.current.uploading).toBe(false);
  });
});
