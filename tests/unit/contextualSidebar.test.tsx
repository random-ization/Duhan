import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { LayoutProvider, useContextualSidebarState } from '../../src/contexts/LayoutContext';
import { useContextualSidebar } from '../../src/hooks/useContextualSidebar';

const DebugSidebarState = () => {
  const contextualSidebar = useContextualSidebarState();
  return <div data-testid="context-id">{contextualSidebar?.id ?? 'none'}</div>;
};

const ContextRoute = () => {
  useContextualSidebar({
    id: 'context-route',
    title: 'Context',
    content: <div>context-content</div>,
    enabled: true,
  });
  return (
    <div>
      <DebugSidebarState />
      <RouteActions />
    </div>
  );
};

const PlainRoute = () => (
  <div>
    <DebugSidebarState />
    <RouteActions />
  </div>
);

const ActiveContext = () => {
  useContextualSidebar({
    id: 'shared-context',
    title: 'Active',
    content: <div>active</div>,
    enabled: true,
  });
  return null;
};

const DisabledContextSameId = () => {
  useContextualSidebar({
    id: 'shared-context',
    title: 'Disabled',
    content: <div>disabled</div>,
    enabled: false,
  });
  return null;
};

const OverlapRoute = () => (
  <div>
    <ActiveContext />
    <DisabledContextSameId />
    <DebugSidebarState />
  </div>
);

const ContextOwnerA = () => {
  useContextualSidebar({
    id: 'owner-shared-context',
    title: 'Owner A',
    content: <div>owner-a</div>,
    enabled: true,
  });
  return null;
};

const ContextOwnerB = () => {
  useContextualSidebar({
    id: 'owner-shared-context',
    title: 'Owner B',
    content: <div>owner-b</div>,
    enabled: true,
  });
  return null;
};

const OwnerSwitchRoute = () => {
  const [showA, setShowA] = useState(true);
  return (
    <div>
      {showA ? <ContextOwnerA /> : null}
      <ContextOwnerB />
      <button type="button" onClick={() => setShowA(false)}>
        hide-a
      </button>
      <DebugSidebarState />
    </div>
  );
};

const RouteActions = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/plain')}>
      go-plain
    </button>
  );
};

describe('contextual sidebar lifecycle', () => {
  it('registers and clears contextual sidebar on route changes', () => {
    render(
      <LayoutProvider>
        <MemoryRouter initialEntries={['/context']}>
          <Routes>
            <Route path="/context" element={<ContextRoute />} />
            <Route path="/plain" element={<PlainRoute />} />
          </Routes>
        </MemoryRouter>
      </LayoutProvider>
    );

    expect(screen.getByTestId('context-id').textContent).toBe('context-route');

    fireEvent.click(screen.getByRole('button', { name: 'go-plain' }));
    expect(screen.getByTestId('context-id').textContent).toBe('none');
  });

  it('does not let disabled instance clear active contextual sidebar with the same id', () => {
    render(
      <LayoutProvider>
        <MemoryRouter initialEntries={['/overlap']}>
          <Routes>
            <Route path="/overlap" element={<OverlapRoute />} />
          </Routes>
        </MemoryRouter>
      </LayoutProvider>
    );

    expect(screen.getByTestId('context-id').textContent).toBe('shared-context');
  });

  it('does not let stale owner cleanup clear a newer owner with the same id', () => {
    render(
      <LayoutProvider>
        <MemoryRouter initialEntries={['/owners']}>
          <Routes>
            <Route path="/owners" element={<OwnerSwitchRoute />} />
          </Routes>
        </MemoryRouter>
      </LayoutProvider>
    );

    expect(screen.getByTestId('context-id').textContent).toBe('owner-shared-context');
    fireEvent.click(screen.getByRole('button', { name: 'hide-a' }));
    expect(screen.getByTestId('context-id').textContent).toBe('owner-shared-context');
  });
});
