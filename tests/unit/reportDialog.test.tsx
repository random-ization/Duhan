import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportDialog } from '../../src/components/qa/ReportDialog';

const reportContentMock = vi.fn(async () => ({ ok: true }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/utils/convexRefs', () => ({
  QA_REPORTS: {
    reportContent: 'reports:reportContent',
  },
}));

vi.mock('convex/react', () => ({
  useMutation: () => reportContentMock,
}));

describe('ReportDialog', () => {
  beforeEach(() => {
    reportContentMock.mockClear();
  });

  it('submits the selected reason and optional details', async () => {
    const onOpenChange = vi.fn();

    render(
      <ReportDialog
        open
        onOpenChange={onOpenChange}
        target="answer"
        targetId="answer_1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /spam or ads/i }));
    fireEvent.change(screen.getByPlaceholderText(/additional context/i), {
      target: { value: 'Repeated scam links' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(reportContentMock).toHaveBeenCalledWith({
        target: 'answer',
        targetId: 'answer_1',
        reason: 'spam',
        details: 'Repeated scam links',
      });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
