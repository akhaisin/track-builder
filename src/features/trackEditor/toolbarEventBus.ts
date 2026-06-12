/** Mode-specific event dispatched from the toolbar down to the scene. (WS_013) */
export interface ToolbarEvent {
  type: string;
}

export interface ToolbarEventBus {
  emit: (event: ToolbarEvent) => void;
  subscribe: (listener: (event: ToolbarEvent) => void) => () => void;
}

/**
 * Tiny event channel between `TrackEditorToolbar` and the active mode view.
 * A bus (rather than an event prop) lets mode views react in subscription
 * callbacks instead of effects-on-props.
 */
export function createToolbarEventBus(): ToolbarEventBus {
  const listeners = new Set<(event: ToolbarEvent) => void>();
  return {
    emit: (event) => {
      for (const listener of [...listeners]) listener(event);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
