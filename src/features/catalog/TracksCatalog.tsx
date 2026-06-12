import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMetadataStore } from '../../store/useMetadataStore';
import { useTracksStore } from '../../store/useTracksStore';
import { metadataStore } from '../../store/metadata.store';
import { cloneTrack, createLocalTrack, deleteLocalTrack } from '../../store/trackActions';
import styles from './TracksCatalog.module.css';

interface CatalogDir {
  name: string;
  path: string;
  dirs: CatalogDir[];
  trackIds: string[];
}

/** Group remote track IDs into a tree mirroring their directory paths. (CAT_030) */
function buildTree(ids: string[]): CatalogDir {
  const root: CatalogDir = { name: '', path: '', dirs: [], trackIds: [] };
  for (const id of ids) {
    const parts = id.split('/');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let next = node.dirs.find((dir) => dir.name === part);
      if (!next) {
        next = {
          name: part,
          path: node.path ? `${node.path}/${part}` : part,
          dirs: [],
          trackIds: [],
        };
        node.dirs.push(next);
      }
      node = next;
    }
    node.trackIds.push(id);
  }
  return root;
}

export default function TracksCatalog() {
  const navigate = useNavigate();
  const location = useLocation();
  const byId = useMetadataStore((state) => state.byId);
  const indexStatus = useMetadataStore((state) => state.indexStatus);
  const indexError = useMetadataStore((state) => state.indexError);
  const tracks = useTracksStore((state) => state.tracks);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedId = location.pathname.startsWith('/tracks/')
    ? location.pathname.slice('/tracks/'.length)
    : null;

  useEffect(() => {
    void metadataStore.getState().fetchCatalogIndex();
  }, []);

  const localIds = useMemo(
    () => Object.keys(byId).filter((id) => !byId[id].readonly).sort(),
    [byId],
  );
  const remoteTree = useMemo(
    () => buildTree(Object.keys(byId).filter((id) => byId[id].readonly)),
    [byId],
  );

  function select(id: string) {
    navigate(`/tracks/${id}${location.search}`);
  }

  async function runAndNavigate(action: () => Promise<string>) {
    setBusy(true);
    setActionError(null);
    try {
      const id = await action();
      navigate(`/tracks/${id}${location.search}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm(`Delete track "${id}"?`)) return;
    deleteLocalTrack(id);
    if (selectedId === id) navigate('/');
  }

  function renderEntry(id: string, local: boolean) {
    const name = tracks[id]?.name ?? id.split('/').pop() ?? id;
    const selected = selectedId === id;
    return (
      <li key={id}>
        <div
          className={`${styles.entry} ${selected ? styles.entrySelected : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => select(id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') select(id);
          }}
        >
          <span className={styles.entryName}>{name}</span>
          <span className={styles.entryId}>{id}</span>
          <span className={styles.entryActions}>
            <button
              className={styles.iconBtn}
              aria-label={`Clone ${id}`}
              title="Clone"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                void runAndNavigate(() => cloneTrack(id));
              }}
            >
              ⧉
            </button>
            {local && (
              <button
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                aria-label={`Delete ${id}`}
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(id);
                }}
              >
                ✕
              </button>
            )}
          </span>
        </div>
      </li>
    );
  }

  function renderDir(dir: CatalogDir) {
    return (
      <li key={dir.path}>
        <details open className={styles.group}>
          <summary className={styles.groupName}>{dir.name}</summary>
          <ul className={styles.list}>
            {dir.dirs.map(renderDir)}
            {dir.trackIds.map((id) => renderEntry(id, false))}
          </ul>
        </details>
      </li>
    );
  }

  return (
    <div className={styles.catalog}>
      <section>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>My Tracks</h3>
          <button
            className={styles.iconBtn}
            aria-label="New track"
            title="New track"
            disabled={busy}
            onClick={() => void runAndNavigate(createLocalTrack)}
          >
            +
          </button>
        </header>
        {localIds.length === 0 && <p className={styles.hint}>No local tracks yet.</p>}
        <ul className={styles.list}>{localIds.map((id) => renderEntry(id, true))}</ul>
        {actionError && <p className={styles.error}>{actionError}</p>}
      </section>

      <section>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Catalog Tracks</h3>
        </header>
        {indexStatus === 'loading' && <p className={styles.hint}>Loading catalog…</p>}
        {indexStatus === 'error' && (
          <p className={styles.error}>Failed to load catalog: {indexError}</p>
        )}
        <ul className={styles.list}>
          {remoteTree.dirs.map(renderDir)}
          {remoteTree.trackIds.map((id) => renderEntry(id, false))}
        </ul>
      </section>
    </div>
  );
}
