import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioRecorder } from '../../src/hooks/useAudioRecorder';

class MockMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    Object.defineProperty(globalThis, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: MockMediaRecorder,
    });

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  it('revokes the previous blob URL before replacing it on re-record', async () => {
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.audioUrl).toBe('blob:first');

    await act(async () => {
      await result.current.startRecording();
    });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');
    expect(result.current.audioUrl).toBeNull();

    act(() => {
      result.current.stopRecording();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(result.current.audioUrl).toBe('blob:second');
  });
});
