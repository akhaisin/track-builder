import { layoutStore } from './layout.store';

beforeEach(() => {
  layoutStore.setState({ collapsed: {} });
});

describe('layout store', () => {
  it('tracks collapse state per panel', () => {
    layoutStore.getState().setCollapsed('catalog', true);
    layoutStore.getState().setCollapsed('debug', false);
    expect(layoutStore.getState().collapsed).toEqual({ catalog: true, debug: false });
  });

  it('overwrites previous state for the same panel', () => {
    layoutStore.getState().setCollapsed('catalog', true);
    layoutStore.getState().setCollapsed('catalog', false);
    expect(layoutStore.getState().collapsed.catalog).toBe(false);
  });
});
