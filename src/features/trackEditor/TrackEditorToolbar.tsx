import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspaceMode, WORKSPACE_MODES } from './workspaceMode';
import { embedCode, exportTrackAsJson, shareableUrl } from './exportSharing';
import { useTrack } from '../../store/useTracksStore';
import type { WorkspaceMode } from './workspaceMode';
import type { ToolbarEvent } from './toolbarEventBus';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId?: string;
  onEvent: (event: ToolbarEvent) => void;
}

const MODE_LABELS: Record<WorkspaceMode, string> = {
  view: 'View',
  gates: 'Gates',
  path: 'Path',
  json: 'JSON',
};

type GatesTool = 'select' | 'add';
type CopiedKind = 'url' | 'embed';

export default function TrackEditorToolbar({ trackId, onEvent }: Props) {
  const [mode, setMode] = useWorkspaceMode();
  const [gatesTool, setGatesTool] = useState<GatesTool>('select');
  const [copied, setCopied] = useState<CopiedKind | null>(null);
  const copiedTimerRef = useRef(0);
  const location = useLocation();
  const track = useTrack(trackId);

  function emit(type: string) {
    onEvent({ type });
  }

  function copyToClipboard(text: string, kind: CopiedKind) {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(kind);
      window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(null), 1500);
    });
  }

  function selectGatesTool(tool: GatesTool) {
    setGatesTool(tool);
    emit(`gates:tool:${tool}`);
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.modeSwitcher} role="group" aria-label="Workspace mode">
        {WORKSPACE_MODES.map((value) => (
          <button
            key={value}
            className={`${styles.modeBtn} ${mode === value ? styles.modeBtnActive : ''}`}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </div>

      {mode === 'gates' && trackId && (
        <div className={styles.toolGroup} role="group" aria-label="Gates tools">
          <button
            className={`${styles.modeBtn} ${gatesTool === 'select' ? styles.modeBtnActive : ''}`}
            aria-pressed={gatesTool === 'select'}
            onClick={() => selectGatesTool('select')}
          >
            Select
          </button>
          <button
            className={`${styles.modeBtn} ${gatesTool === 'add' ? styles.modeBtnActive : ''}`}
            aria-pressed={gatesTool === 'add'}
            onClick={() => selectGatesTool('add')}
          >
            Add edge
          </button>
          <button className={styles.modeBtn} onClick={() => emit('gates:delete-selected')}>
            Delete
          </button>
        </div>
      )}

      {mode === 'path' && trackId && (
        <div className={styles.toolGroup} role="group" aria-label="Path tools">
          <button className={styles.modeBtn} onClick={() => emit('path:new-step')}>
            New step
          </button>
          <button className={styles.modeBtn} onClick={() => emit('path:delete-step')}>
            Delete step
          </button>
        </div>
      )}

      <span className={styles.toolbarTitle}>{trackId ?? 'No track selected'}</span>

      {trackId && track && (
        <div className={styles.toolGroup} role="group" aria-label="Export and sharing">
          <button
            className={styles.modeBtn}
            onClick={() => exportTrackAsJson(trackId, track)}
          >
            Export
          </button>
          <button
            className={styles.modeBtn}
            onClick={() => copyToClipboard(shareableUrl(trackId, location.search), 'url')}
          >
            {copied === 'url' ? 'Copied ✓' : 'Copy link'}
          </button>
          <button
            className={styles.modeBtn}
            onClick={() => copyToClipboard(embedCode(trackId, location.search), 'embed')}
          >
            {copied === 'embed' ? 'Copied ✓' : 'Copy embed'}
          </button>
        </div>
      )}
    </div>
  );
}
