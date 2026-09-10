import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTTS } from '../../src/hooks/useTTS';
const speakAction = vi.hoisted(() => vi.fn());
vi.mock('convex/react', () => ({ useAction: () => speakAction }));

class MockAudio {
  static instances: MockAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  play = vi.fn(async () => {});
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  currentTime = 0;
  constructor(public src: string) { MockAudio.instances.push(this); }
}

describe('TTS cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', MockAudio);
    localStorage.clear();
    MockAudio.instances = [];
    speakAction.mockReset().mockResolvedValue({ success: true, url: 'https://example.test/audio.mp3' });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('settles speak when stopped and does not retry cancelled playback', async () => {
    const { result } = renderHook(() => useTTS());
    let spoken!: Promise<boolean>;
    act(() => { spoken = result.current.speak('stop test'); });
    await act(async () => vi.advanceTimersByTimeAsync(20));
    expect(MockAudio.instances).toHaveLength(1);
    act(() => result.current.stop());
    await expect(spoken).resolves.toBe(false);
    expect(speakAction).toHaveBeenCalledTimes(1);
    expect(MockAudio.instances[0].pause).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('settles the old speak when another word is played', async () => {
    const { result } = renderHook(() => useTTS());
    let first!: Promise<boolean>;
    act(() => { first = result.current.speak('first word'); });
    await act(async () => vi.advanceTimersByTimeAsync(20));
    let second!: Promise<boolean>;
    act(() => { second = result.current.speak('second word'); });
    await act(async () => vi.advanceTimersByTimeAsync(20));
    await expect(first).resolves.toBe(false);
    expect(MockAudio.instances).toHaveLength(2);
    await act(async () => MockAudio.instances[1].onended?.());
    await expect(second).resolves.toBe(true);
  });

  it('settles playback when the consuming page unmounts', async () => {
    const { result, unmount } = renderHook(() => useTTS());
    let spoken!: Promise<boolean>;
    act(() => { spoken = result.current.speak('leaving page'); });
    await act(async () => vi.advanceTimersByTimeAsync(20));
    unmount();
    await expect(spoken).resolves.toBe(false);
    expect(speakAction).toHaveBeenCalledTimes(1);
  });
});
