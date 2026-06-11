---
name: refactor-boundaries
description: Refactor boundaries — which concerns belong in which file/directory
metadata:
  type: project
---

| Concern | Location |
|---|---|
| Catalog loading and list rendering | `features/catalog/` |
| Track data (CRUD, localStorage) | `src/store/tracks.store.ts` |
| Track metadata (readonly, load status, remote fetch) | `src/store/metadata.store.ts` |
| Mode-specific workspace UI | `features/{mode}/` |
| Panel composition and slots | `layout/Layout.tsx` |
| Route and page orchestration | `pages/TracksBuilderPage.tsx` |
| Global workspace UI state | `layout/layout.store.ts` |
