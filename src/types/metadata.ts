/** Remote track load lifecycle. (CAT_032) */
export type TrackLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Per-track metadata kept separately from track data. The `readonly` flag is
 * the sole source of truth for whether a track is remote. (CAT_032–CAT_034)
 */
export interface TrackMetadata {
  readonly: boolean;
  loadStatus: TrackLoadStatus;
  loadError?: string;
}
