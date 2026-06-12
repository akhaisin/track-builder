/* eslint-disable react-refresh/only-export-components, @typescript-eslint/no-unused-vars */
// TODO(mefly-nav): temporary stub. The pinned git dependency ships empty
// because upstream packs `files: ["dist"]` without a prepare script building
// dist. Once upstream is fixed and repinned, delete this file and restore the
// imports from 'mefly-nav' (+ 'mefly-nav/style.css') in App.tsx.
import type { CSSProperties, ReactNode } from 'react';

export function useHostSync(_trustedOrigins: string[]): void {}

export interface MeflyNavReceiverProps {
  trustedOrigins: string[];
  activationMode?: 'hover' | 'click';
  style?: CSSProperties;
  children?: ReactNode;
}

export function MeflyNavReceiver(_props: MeflyNavReceiverProps) {
  return null;
}
