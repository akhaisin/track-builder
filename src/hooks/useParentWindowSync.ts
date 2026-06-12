import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Sent to the parent window on every route change. (ETC_013) */
export interface HashChangedMessage {
  type: 'HASH_CHANGED';
  hash: string;
}

/** Received from the parent window to navigate the embedded app. (ETC_012) */
export interface NavigateToHashMessage {
  type: 'NAVIGATE_TO_HASH';
  hash: string;
}

function isNavigateMessage(data: unknown): data is NavigateToHashMessage {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Record<string, unknown>;
  return message.type === 'NAVIGATE_TO_HASH' && typeof message.hash === 'string';
}

/**
 * Syncs route changes with the parent window when the app runs in an iframe.
 * Outbound `HASH_CHANGED` messages are posted to each trusted origin (the
 * browser silently drops the ones that don't match the actual parent);
 * inbound messages are accepted from trusted origins only. (ETC_011)
 *
 * `trustedOrigins` must be referentially stable (a module constant).
 */
export default function useParentWindowSync(trustedOrigins: string[]): void {
  const location = useLocation();
  const navigate = useNavigate();
  // Set when the parent told us to navigate, so the resulting route change
  // is not echoed straight back as HASH_CHANGED.
  const lastReceivedHash = useRef<string | null>(null);

  const embedded = window.parent !== window;

  useEffect(() => {
    if (!embedded) return;
    const hash = `#${location.pathname}${location.search}`;
    if (lastReceivedHash.current === hash) {
      lastReceivedHash.current = null;
      return;
    }
    const message: HashChangedMessage = { type: 'HASH_CHANGED', hash };
    for (const origin of trustedOrigins) {
      window.parent.postMessage(message, origin);
    }
  }, [embedded, location.pathname, location.search, trustedOrigins]);

  useEffect(() => {
    if (!embedded) return;
    function onMessage(event: MessageEvent) {
      if (!trustedOrigins.includes(event.origin)) return;
      if (!isNavigateMessage(event.data)) return;
      const target = event.data.hash.startsWith('#')
        ? event.data.hash.slice(1)
        : event.data.hash;
      lastReceivedHash.current = `#${target}`;
      void navigate(target);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [embedded, navigate, trustedOrigins]);
}
