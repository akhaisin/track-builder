/** A point on the 3D lattice grid: integer [x, y, z]. (CAT_017) */
export type Point3 = [number, number, number];

/** A structural line segment between two lattice points. (CAT_018) */
export type TrackSegment = [Point3, Point3];

/** Optional caption overlay rendered in the 3D scene. (CAT_021) */
export interface TrackCaption {
  enabled: boolean;
  text_1: string | null;
  text_2: string | null;
  location: TrackSegment;
  orientation_angle?: number;
}

/**
 * A track is defined by structural `edges` and a racing `path` — a sequence
 * of gate transitions, each transition being a list of segments. (CAT_016, CAT_019)
 */
export interface Track {
  name?: string;
  description?: string;
  caption?: TrackCaption;
  show_path_labels?: boolean;
  edges: TrackSegment[];
  path: TrackSegment[][];
}

/** A track paired with its catalog ID (path under `/tracks/` without `.json`). (CAT_029) */
export interface LoadedTrack {
  id: string;
  track: Track;
}

/** Failure to load a remote track. */
export interface TrackLoadError {
  id: string;
  message: string;
}

/** Versioned localStorage key for locally created tracks. (CAT_024) */
export const LOCAL_TRACKS_STORAGE_KEY = 'fpv-track-builder.local-tracks.v1';

/** URL of the plain-text remote catalog index, one JSON path per line. (CAT_023) */
export const TRACKS_INDEX_URL = `${import.meta.env.BASE_URL}tracks/tracks.txt`;

/** Resolve a track ID to its remote JSON URL. (CAT_023, CAT_029) */
export function trackJsonUrl(id: string): string {
  return `${import.meta.env.BASE_URL}tracks/${id}.json`;
}

function isPoint3(value: unknown): value is Point3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function isSegment(value: unknown): value is TrackSegment {
  return (
    Array.isArray(value) && value.length === 2 && value.every(isPoint3)
  );
}

/** Structural validation used when reading persisted or fetched track data. (CAT_025) */
export function isTrack(value: unknown): value is Track {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  if (!Array.isArray(t.edges) || !t.edges.every(isSegment)) return false;
  if (
    !Array.isArray(t.path) ||
    !t.path.every((step) => Array.isArray(step) && step.every(isSegment))
  ) {
    return false;
  }
  return true;
}
