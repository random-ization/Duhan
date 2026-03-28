import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string; count?: number; level?: string }) =>
        options?.defaultValue ?? (options?.count !== undefined ? String(options.count) : key),
    }),
  };
});

import { PictureBookShelf } from '../../src/components/reading/PictureBookShelf';

describe('PictureBookShelf', () => {
  it('falls back to the placeholder cover when coverImageUrl is blank', () => {
    const onOpen = vi.fn();

    render(
      <PictureBookShelf
        books={[
          {
            slug: 'storybook',
            title: 'Storybook',
            levelLabel: '1단계',
            pageCount: 8,
            coverImageUrl: '   ',
          },
        ]}
        loading={false}
        onOpen={onOpen}
      />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /storybook/i }));
    expect(onOpen).toHaveBeenCalledWith('storybook');
  });
});
