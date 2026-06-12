import type { Track } from '../../types/tracks';

/** Shareable URL for a track, preserving the current `?mode=` search. (ETC_015) */
export function shareableUrl(trackId: string, search = ''): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/tracks/${trackId}${search}`;
}

/** Iframe embed snippet; the embedded app syncs routes via postMessage. (ETC_015) */
export function embedCode(trackId: string, search = ''): string {
  return `<iframe src="${shareableUrl(trackId, search)}" width="800" height="600" style="border:0"></iframe>`;
}

/** Download the track as a pretty-printed JSON file. (ETC_014) */
export function exportTrackAsJson(trackId: string, track: Track): void {
  const blob = new Blob([JSON.stringify(track, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${trackId.split('/').pop() ?? 'track'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
