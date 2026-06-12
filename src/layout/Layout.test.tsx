import { render, screen } from '@testing-library/react';
import Layout from './Layout';

describe('Layout', () => {
  it('renders catalog, center, and debug slots with panel captions', () => {
    render(
      <Layout catalog={<div>catalog-slot</div>} debug={<div>debug-slot</div>}>
        <div>center-slot</div>
      </Layout>,
    );
    expect(screen.getByText('catalog-slot')).toBeInTheDocument();
    expect(screen.getByText('center-slot')).toBeInTheDocument();
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    // import.meta.env.DEV is true under vitest, so the debug panel renders.
    expect(screen.getByText('debug-slot')).toBeInTheDocument();
    expect(screen.getByText('Debug')).toBeInTheDocument();
  });

  it('omits the debug panel when no debug content is given', () => {
    render(
      <Layout catalog={<div>catalog-slot</div>}>
        <div>center-slot</div>
      </Layout>,
    );
    expect(screen.queryByText('Debug')).not.toBeInTheDocument();
  });
});
