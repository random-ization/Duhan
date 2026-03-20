import { useEffect, useId } from 'react';
import { ContextualSidebarState, useLayoutActions } from '../contexts/LayoutContext';

type UseContextualSidebarParams = ContextualSidebarState & {
  enabled?: boolean;
};

export function useContextualSidebar({
  id,
  title,
  subtitle,
  content,
  enabled = true,
}: UseContextualSidebarParams) {
  const { setContextualSidebar, clearContextualSidebar } = useLayoutActions();
  const ownerId = `contextual-sidebar-${useId()}`;

  useEffect(() => {
    const stableOwnerId = ownerId;
    if (!enabled) {
      // Do not actively clear here: during animated route transitions there can be
      // overlapping mounted pages, and a disabled (exiting) page could clear the
      // contextual sidebar that a newly mounted page just registered.
      return;
    }

    setContextualSidebar(
      {
        id,
        title,
        subtitle,
        content,
      },
      stableOwnerId
    );

    return () => {
      clearContextualSidebar(id, stableOwnerId);
    };
  }, [
    id,
    title,
    subtitle,
    content,
    enabled,
    ownerId,
    setContextualSidebar,
    clearContextualSidebar,
  ]);
}
