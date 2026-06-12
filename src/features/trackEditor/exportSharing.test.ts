import { embedCode, exportTrackAsJson, shareableUrl } from './exportSharing';
import type { Track } from '../../types/tracks';

describe('shareableUrl', () => {
  it('builds a hash URL for the track on the current origin', () => {
    expect(shareableUrl('RG5/rg5-06')).toBe('http://localhost/#/tracks/RG5/rg5-06');
  });

  it('preserves the search (mode) when given', () => {
    expect(shareableUrl('track-001', '?mode=json')).toBe(
      'http://localhost/#/tracks/track-001?mode=json',
    );
  });
});

describe('embedCode', () => {
  it('wraps the shareable URL in an iframe snippet', () => {
    const code = embedCode('track-001');
    expect(code).toContain('<iframe');
    expect(code).toContain('http://localhost/#/tracks/track-001');
  });
});

describe('exportTrackAsJson', () => {
  it('downloads the track as a JSON file named after the id', () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const track: Track = { name: 'rg5-06', edges: [], path: [] };
    exportTrackAsJson('RG5/rg5-06', track);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0];
    expect(blob.type).toBe('application/json');
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('rg5-06.json');
    expect(anchor.href).toContain('blob:mock');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
