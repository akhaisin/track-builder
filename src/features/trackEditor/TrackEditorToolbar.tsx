import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspaceMode, WORKSPACE_MODES } from './workspaceMode';
import { embedCode, exportTrackAsJson, shareableUrl } from './exportSharing';
import { useTrack } from '../../store/useTracksStore';
import type { WorkspaceMode } from './workspaceMode';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId?: string;
}

const MODE_LABELS: Record<WorkspaceMode, string> = {
  view: 'View',
  gates: 'Gates',
  path: 'Path',
  json: 'JSON',
};

type CopiedKind = 'url' | 'embed';

export default function TrackEditorToolbar({ trackId }: Props) {
  const [mode, setMode] = useWorkspaceMode();
  const [copied, setCopied] = useState<CopiedKind | null>(null);
  const copiedTimerRef = useRef(0);
  const location = useLocation();
  const track = useTrack(trackId);

  function copyToClipboard(text: string, kind: CopiedKind) {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(kind);
      window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(null), 1500);
    });
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
