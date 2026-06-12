import { isTrack, trackJsonUrl } from './tracks';
import ladder3 from '../../public/tracks/elements/ladder3.json';

describe('isTrack', () => {
  it('accepts a real catalog track', () => {
    expect(isTrack(ladder3)).toBe(true);
  });

  it('accepts a minimal track with empty edges and path', () => {
    expect(isTrack({ edges: [], path: [] })).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isTrack(null)).toBe(false);
    expect(isTrack(undefined)).toBe(false);
    expect(isTrack('track')).toBe(false);
    expect(isTrack([])).toBe(false);
  });

  it('rejects missing or malformed edges', () => {
    expect(isTrack({ path: [] })).toBe(false);
    expect(isTrack({ edges: [[[0, 0], [1, 1, 1]]], path: [] })).toBe(false);
    expect(isTrack({ edges: [[[0, 0, 'a'], [1, 1, 1]]], path: [] })).toBe(false);
  });

  it('rejects malformed path steps', () => {
    expect(isTrack({ edges: [], path: [[[0, 0, 0]]] })).toBe(false);
    expect(isTrack({ edges: [], path: [42] })).toBe(false);
  });
});

describe('trackJsonUrl', () => {
  it('maps subdirectory IDs to JSON paths under the app base URL', () => {
    expect(trackJsonUrl('RG5/rg5-06')).toBe(
      `${import.meta.env.BASE_URL}tracks/RG5/rg5-06.json`,
    );
  });
});
