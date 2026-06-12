import type { Track } from '../types/tracks';
import { tracksStore, writeLocalTracks } from './tracks.store';
import { metadataStore } from './metadata.store';

/** New local tracks are seeded by cloning this catalog track. (CAT_008) */
export const SEED_TRACK_ID = 'elements/ladder3';

function localTracks(): Record<string, Track> {
  const meta = metadataStore.getState().byId;
  const { tracks } = tracksStore.getState();
  return Object.fromEntries(
    Object.entries(tracks).filter(([id]) => meta[id] && !meta[id].readonly),
  );
}

function persistLocalTracks(): void {
  writeLocalTracks(localTracks());
}

/** Next auto-generated local track name: `track-001`, `track-002`, … (CAT_009) */
export function nextTrackName(): string {
  let max = 0;
  for (const [id, meta] of Object.entries(metadataStore.getState().byId)) {
    if (meta.readonly) continue;
    const match = /^track-(\d+)$/.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `track-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Clone any track (local or remote) into a new local track with an
 * auto-generated name; returns the new track ID. (CAT_013–CAT_014)
 */
export async function cloneTrack(sourceId: string): Promise<string> {
  const source = await metadataStore.getState().ensureTrackLoaded(sourceId);
  const id = nextTrackName();
  const track = structuredClone(source);
  track.name = id;
  metadataStore.getState().registerLocal(id);
  tracksStore.getState().setTrack(id, track);
  persistLocalTracks();
  return id;
}

/** Creating a new track is equivalent to cloning the seed track. (CAT_008) */
export function createLocalTrack(): Promise<string> {
  return cloneTrack(SEED_TRACK_ID);
}

export function deleteLocalTrack(id: string): void {
  tracksStore.getState().removeTrack(id);
  metadataStore.getState().unregister(id);
  persistLocalTracks();
}

/** Apply an edit to a track; local tracks are persisted immediately. */
export function updateTrack(id: string, track: Track): void {
  tracksStore.getState().setTrack(id, track);
  persistLocalTracks();
}
