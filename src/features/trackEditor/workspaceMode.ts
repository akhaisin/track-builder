import { useSearchParams } from 'react-router-dom';

/** Workspace modes selected via the `?mode=` query parameter. (VIZ_006) */
export const WORKSPACE_MODES = ['view', 'gates', 'path', 'json'] as const;
export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

/** Unknown or absent values fall back to the default `view` mode. (VIZ_007) */
export function parseMode(value: string | null): WorkspaceMode {
  return (WORKSPACE_MODES as readonly string[]).includes(value ?? '')
    ? (value as WorkspaceMode)
    : 'view';
}

/** Read/write the active mode from the URL without reloading. (VIZ_008) */
export function useWorkspaceMode(): [WorkspaceMode, (mode: WorkspaceMode) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = parseMode(searchParams.get('mode'));

  function setMode(next: WorkspaceMode) {
    const params = new URLSearchParams(searchParams);
    params.set('mode', next);
    setSearchParams(params);
  }

  return [mode, setMode];
}
