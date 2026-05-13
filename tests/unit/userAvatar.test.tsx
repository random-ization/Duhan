import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from '../../src/components/common/UserAvatar';

describe('UserAvatar', () => {
  it('uses image when avatar is missing', () => {
    render(
      <UserAvatar
        user={{
          name: 'Minji',
          avatar: null,
          image: 'https://example.com/profile.png',
        }}
        className="h-10 w-10"
      />
    );

    const image = screen.getByRole('img', { name: 'Minji' });
    expect(image).toHaveAttribute('src', 'https://example.com/profile.png');
  });

  it('falls back to the user initial when the image fails to load', () => {
    render(
      <UserAvatar
        user={{
          name: 'Minji',
          avatar: 'https://example.com/broken.png',
        }}
        className="h-10 w-10"
      />
    );

    const image = screen.getByRole('img', { name: 'Minji' });
    fireEvent.error(image);

    expect(screen.getByText('M')).toBeInTheDocument();
  });
});
