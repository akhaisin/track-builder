import { parseMode } from './workspaceMode';

describe('parseMode', () => {
  it('returns valid modes as-is', () => {
    expect(parseMode('view')).toBe('view');
    expect(parseMode('gates')).toBe('gates');
    expect(parseMode('path')).toBe('path');
    expect(parseMode('json')).toBe('json');
  });

  it('defaults to view for absent or unknown values', () => {
    expect(parseMode(null)).toBe('view');
    expect(parseMode('')).toBe('view');
    expect(parseMode('3d')).toBe('view');
  });
});
