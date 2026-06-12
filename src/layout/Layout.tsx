import { Group, Panel, Separator } from 'react-resizable-panels';
import type { ReactNode } from 'react';
import SidePanel from './SidePanel';
import styles from './Layout.module.css';

export interface Props {
  /** Left collapsible panel content. (WS_001–WS_002) */
  catalog: ReactNode;
  /** Right collapsible panel content; only rendered in dev builds. (WS_001) */
  debug?: ReactNode;
  /** Center editor content. */
  children: ReactNode;
}

export default function Layout({ catalog, debug, children }: Props) {
  return (
    <Group orientation="horizontal" className={styles.group}>
      <SidePanel position="left" caption="Catalog" panelId="catalog">
        {catalog}
      </SidePanel>
      <Separator className={styles.separator} />
      <Panel id="editor" className={styles.center}>
        {children}
      </Panel>
      {import.meta.env.DEV && debug != null && (
        <>
          <Separator className={styles.separator} />
          <SidePanel position="right" caption="Debug" panelId="debug" defaultSize="25%">
            {debug}
          </SidePanel>
        </>
      )}
    </Group>
  );
}
