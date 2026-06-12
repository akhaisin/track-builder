import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import useParentWindowSync from './useParentWindowSync';

const TRUSTED = ['https://mefly.dev'];

function Probe({ origins = TRUSTED }: { origins?: string[] }) {
  useParentWindowSync(origins);
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <div data-testid="path">{location.pathname}</div>
      <button onClick={() => void navigate('/tracks/track-001?mode=json')}>go</button>
    </div>
  );
}

function renderProbe(origins?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Probe origins={origins} />
    </MemoryRouter>,
  );
}

function fakeEmbedding() {
  const postMessage = vi.fn();
  Object.defineProperty(window, 'parent', {
    value: { postMessage },
    configurable: true,
  });
  return postMessage;
}

function sendNavigateMessage(hash: string, origin = 'https://mefly.dev') {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'NAVIGATE_TO_HASH', hash },
        origin,
      }),
    );
  });
}

afterEach(() => {
  // Restore window.parent === window (jsdom default, i.e. not embedded).
  Object.defineProperty(window, 'parent', { value: window, configurable: true });
});

describe('useParentWindowSync', () => {
  it('posts HASH_CHANGED to the parent on every route change', async () => {
    const postMessage = fakeEmbedding();
    const user = userEvent.setup();
    renderProbe();
    postMessage.mockClear();

    await user.click(screen.getByRole('button', { name: 'go' }));
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'HASH_CHANGED', hash: '#/tracks/track-001?mode=json' },
      'https://mefly.dev',
    );
  });

  it('navigates on NAVIGATE_TO_HASH from a trusted origin', () => {
    fakeEmbedding();
    renderProbe();
    sendNavigateMessage('#/tracks/RG5/rg5-06');
    expect(screen.getByTestId('path')).toHaveTextContent('/tracks/RG5/rg5-06');
  });

  it('accepts hashes without the leading #', () => {
    fakeEmbedding();
    renderProbe();
    sendNavigateMessage('/tracks/track-002');
    expect(screen.getByTestId('path')).toHaveTextContent('/tracks/track-002');
  });

  it('ignores messages from untrusted origins', () => {
    fakeEmbedding();
    renderProbe();
    sendNavigateMessage('#/tracks/evil', 'https://attacker.example');
    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('does not echo HASH_CHANGED for parent-initiated navigation', () => {
    const postMessage = fakeEmbedding();
    renderProbe();
    postMessage.mockClear();
    sendNavigateMessage('#/tracks/track-001');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('does nothing when not embedded', async () => {
    // window.parent === window here.
    const postMessage = vi.spyOn(window, 'postMessage');
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole('button', { name: 'go' }));
    expect(postMessage).not.toHaveBeenCalled();
    postMessage.mockRestore();
  });
});
