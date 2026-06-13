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
 * Travel direction through a gate, as a signed lattice axis. A gate's plane
 * fixes the axis, so only the two directions parallel to its normal are
 * meaningful for a given gate. (VIZ_021)
 */
export type Direction = 'up' | 'down' | 'left' | 'right' | 'forward' | 'backward';

/** Unit vector for each direction. Data is y-up; z+ is "backward". (VIZ_021) */
export const DIRECTION_VECTORS: Record<Direction, Point3> = {
  right: [1, 0, 0],
  left: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
  backward: [0, 0, 1],
  forward: [0, 0, -1],
};

const DIRECTIONS = Object.keys(DIRECTION_VECTORS) as Direction[];

export function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && (DIRECTIONS as string[]).includes(value);
}

/** The direction whose unit vector equals `v`, or null if `v` is not a signed axis. */
export function directionFromVector(v: Point3): Direction | null {
  return (
    DIRECTIONS.find((d) => {
      const u = DIRECTION_VECTORS[d];
      return u[0] === v[0] && u[1] === v[1] && u[2] === v[2];
    }) ?? null
  );
}

/**
 * A path step: one or more coplanar, edge-connected gates flown as a unit.
 * `entry` is the travel direction through the step's gate, chosen when the
 * step's first gate is placed; absent means unspecified. An `aux` step is an
 * exit guide tied to the previous main step: it still shapes the flight path
 * but is hidden in view mode and sub-numbered (e.g. 1-1). (VIZ_014, VIZ_021, VIZ_022)
 */
export interface PathStep {
  gates: TrackSegment[];
  entry?: Direction;
  aux?: boolean;
}

/**
 * A track is defined by structural `edges` and a racing `path` — a sequence
 * of gate-transition steps, each with its gates and optional entry direction.
 * (CAT_016, CAT_019, VIZ_021)
 */
export interface Track {
  name?: string;
  description?: string;
  caption?: TrackCaption;
  show_path_labels?: boolean;
  edges: TrackSegment[];
  path: PathStep[];
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

function isPathStep(value: unknown): value is PathStep {
  if (typeof value !== 'object' || value === null) return false;
  const step = value as Record<string, unknown>;
  if (!Array.isArray(step.gates) || !step.gates.every(isSegment)) return false;
  if (step.entry !== undefined && !isDirection(step.entry)) return false;
  if (step.aux !== undefined && typeof step.aux !== 'boolean') return false;
  return true;
}

/** Structural validation used when reading persisted or fetched track data. (CAT_025) */
export function isTrack(value: unknown): value is Track {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  if (!Array.isArray(t.edges) || !t.edges.every(isSegment)) return false;
  if (!Array.isArray(t.path) || !t.path.every(isPathStep)) return false;
  return true;
}
