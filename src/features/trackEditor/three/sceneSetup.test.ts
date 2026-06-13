import { clearCameraPoses, getCameraPose, saveCameraPose } from './sceneSetup';

// createSceneContext itself needs WebGL and is exercised manually in the
// browser; the pose cache that preserves camera orientation across workspace
// mode switches is testable on its own.
describe('camera pose cache', () => {
  beforeEach(() => clearCameraPoses());

  it('round-trips a pose per key', () => {
    saveCameraPose('track-001', { position: [1, 2, 3], target: [0, 1, 0] });
    expect(getCameraPose('track-001')).toEqual({
      position: [1, 2, 3],
      target: [0, 1, 0],
    });
    expect(getCameraPose('track-002')).toBeUndefined();
  });

  it('overwrites the pose on subsequent saves', () => {
    saveCameraPose('track-001', { position: [1, 2, 3], target: [0, 0, 0] });
    saveCameraPose('track-001', { position: [4, 5, 6], target: [1, 1, 1] });
    expect(getCameraPose('track-001')?.position).toEqual([4, 5, 6]);
  });
});
