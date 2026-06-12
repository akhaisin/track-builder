import { Panel, usePanelRef } from 'react-resizable-panels';
import { useEffect, useRef, useState } from 'react';
import { layoutStore } from './layout.store';
import styles from './SidePanel.module.css';

export type PanelPosition = 'left' | 'right';

export interface Props {
  position: PanelPosition;
  caption?: string;
  children?: React.ReactNode;
  defaultSize?: string;
  minSize?: string;
  collapsedSize?: number;
  defaultCollapsed?: boolean;
  /** When set, the panel mirrors its collapse state into the layout store. */
  panelId?: string;
}

const DEFAULT_COLLAPSED_SIZE = 32;

const EXPAND_ARROW:   Record<PanelPosition, string> = { left: '›', right: '‹' };
const COLLAPSE_ARROW: Record<PanelPosition, string> = { left: '‹', right: '›' };

export default function SidePanel({
  position,
  caption,
  children,
  defaultSize = '20%',
  minSize = '10%',
  collapsedSize = DEFAULT_COLLAPSED_SIZE,
  defaultCollapsed = false,
  panelId,
}: Props) {
  const panelRef = usePanelRef();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  // expand() restores the size recorded by collapse(); when the panel starts
  // collapsed there is no recorded size, so the first expand targets defaultSize.
  const hasExpandedRef = useRef(!defaultCollapsed);

  useEffect(() => {
    if (panelId) layoutStore.getState().setCollapsed(panelId, collapsed);
  }, [panelId, collapsed]);

  function toggle() {
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      if (hasExpandedRef.current) panel.expand();
      else panel.resize(defaultSize);
    } else {
      panel.collapse();
    }
  }

  function handleResize() {
    const isCollapsed = panelRef.current?.isCollapsed() ?? false;
    if (!isCollapsed) hasExpandedRef.current = true;
    setCollapsed(isCollapsed);
  }

  const arrow = collapsed ? EXPAND_ARROW[position] : COLLAPSE_ARROW[position];

  return (
    <Panel
      panelRef={panelRef}
      defaultSize={defaultCollapsed ? collapsedSize : defaultSize}
      minSize={minSize}
      collapsible
      collapsedSize={collapsedSize}
      onResize={handleResize}
      className={`${styles.panel} ${styles[`panel--${position}`]}`}
      style={{ overflow: 'hidden' }}
    >
      {collapsed ? (
        /* ── Collapsed vertical bar ── */
        <div className={styles.collapsedBar} onClick={toggle} title="Expand">
          <button className={styles.toggleBtn} tabIndex={-1} aria-hidden>
            {arrow}
          </button>
          {caption && (
            <span className={`${styles.captionVertical} ${styles[`captionVertical--${position}`]}`}>
              {caption}
            </span>
          )}
        </div>
      ) : (
        /* ── Expanded ── */
        <>
          <div className={styles.titleBar} onClick={toggle} title="Collapse">
            <button className={styles.toggleBtn} tabIndex={-1} aria-hidden>
              {arrow}
            </button>
            {caption && <span className={styles.captionText}>{caption}</span>}
          </div>
          <div className={styles.body}>{children}</div>
        </>
      )}
    </Panel>
  );
}
