import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Global workspace UI state. Panel collapse state is session-only and resets
 * on page reload — deliberately not persisted. (WS_003)
 */
export interface LayoutState {
  collapsed: Record<string, boolean>;
  setCollapsed: (panelId: string, collapsed: boolean) => void;
}

export const layoutStore = createStore<LayoutState>()((set) => ({
  collapsed: {},

  setCollapsed: (panelId, collapsed) =>
    set((state) => ({ collapsed: { ...state.collapsed, [panelId]: collapsed } })),
}));

export function useLayoutStore<T>(selector: (state: LayoutState) => T): T {
  return useStore(layoutStore, selector);
}
