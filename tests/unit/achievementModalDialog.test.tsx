import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Doc } from '../../convex/_generated/dataModel';
import { AchievementModalDialog } from '../../src/components/gamification/AchievementModalDialog';

type PendingBadge = Doc<'user_badges'>;
type BlobCallbackFn = (blob: Blob | null) => void;
type SharePayload = {
  files?: File[];
  text?: string;
  title?: string;
  url?: string;
};
type Viewer = {
  readonly name: string;
  readonly image: string | null;
  readonly avatar?: string | null;
};

const viewer: Viewer = {
  name: 'Ryan',
  image: null,
};

const acknowledgeBadgeMock = vi.fn<(args: { badgeId: PendingBadge['_id'] }) => Promise<void>>();
const html2canvasMock =
  vi.fn<(element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>>();
const notifyErrorMock = vi.fn<(message: string) => void>();
const loggerErrorMock = vi.fn<(error: Error | string, context?: unknown) => void>();

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => viewer),
  useMutation: vi.fn(() => acknowledgeBadgeMock),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      ...props
    }: React.ComponentProps<'div'> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileHover?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('html2canvas', () => ({
  default: html2canvasMock,
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: (message: string) => notifyErrorMock(message),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    error: (error: Error | string, context?: unknown) => loggerErrorMock(error, context),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function createBadge(overrides: Partial<PendingBadge> = {}): PendingBadge {
  return {
    _id: 'badge_1',
    _creationTime: 0,
    userId: 'user_1',
    category: 'STREAK',
    tier: 'GOLD',
    milestoneValue: 7,
    unlockedAt: 1,
    isNew: true,
    ...overrides,
  } as unknown as PendingBadge;
}

function createCanvasMock(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'toBlob', {
    configurable: true,
    value: (callback: BlobCallbackFn) => callback(new Blob(['image'], { type: 'image/png' })),
  });
  Object.defineProperty(canvas, 'toDataURL', {
    configurable: true,
    value: () => 'data:image/png;base64,aW1hZ2U=',
  });
  return canvas;
}

describe('AchievementModalDialog', () => {
  beforeEach(() => {
    acknowledgeBadgeMock.mockReset();
    html2canvasMock.mockReset();
    notifyErrorMock.mockReset();
    loggerErrorMock.mockReset();

    acknowledgeBadgeMock.mockResolvedValue(undefined);
    html2canvasMock.mockResolvedValue(createCanvasMock());

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: undefined,
    });
  });

  it('closes immediately even if badge acknowledgement fails', async () => {
    acknowledgeBadgeMock.mockRejectedValueOnce(new Error('offline'));

    render(<AchievementModalDialog badge={createBadge()} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(acknowledgeBadgeMock).toHaveBeenCalledWith({ badgeId: createBadge()._id });
    });

    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('uses the native share sheet with a generated report image when available', async () => {
    const shareMock = vi.fn<(data?: SharePayload) => Promise<void>>(async () => undefined);
    const canShareMock = vi.fn<(data?: SharePayload) => boolean>(() => true);

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: shareMock,
    });
    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: canShareMock,
    });

    render(<AchievementModalDialog badge={createBadge()} />);

    fireEvent.click(screen.getByRole('button', { name: /share report image/i }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1);
    });

    const shareData = shareMock.mock.calls[0]?.[0] as SharePayload | undefined;
    const sharedFile = shareData?.files?.[0];

    expect(canShareMock).toHaveBeenCalledTimes(1);
    expect(sharedFile).toBeInstanceOf(File);
    expect(sharedFile?.type).toBe('image/png');

    await waitFor(() => {
      expect(acknowledgeBadgeMock).toHaveBeenCalledWith({ badgeId: createBadge()._id });
    });
  });

  it('still allows closing the modal if report export is stuck', async () => {
    html2canvasMock.mockReturnValueOnce(new Promise<HTMLCanvasElement>(() => {}));

    render(<AchievementModalDialog badge={createBadge({ category: 'TYPING' })} />);

    fireEvent.click(screen.getByRole('button', { name: /save report image/i }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(acknowledgeBadgeMock).toHaveBeenCalledWith({
        badgeId: createBadge({ category: 'TYPING' })._id,
      });
    });
  });
});
