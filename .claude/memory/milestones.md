---
name: milestones
description: Implementation milestones M1–M13 and agent changelog — reference for planning and tracking build progress
metadata:
  type: project
---

**How to apply:** Check current milestone status before starting any implementation work. Mark milestones complete in the Agent Changelog section when finished.

## Milestone Status

| Milestone | Description | Status |
|---|---|---|
| M1 | Project Foundation | ✅ |
| M2 | Dependencies & Test Infrastructure | ✅ |
| M3 | CSS Design System | ✅ |
| M4 | Track Data Model | 🔲 |
| M5 | Track Stores & Catalog | 🔲 |
| M6 | Workspace Layout & Routing | 🔲 |
| M7 | TrackEditor & Modes | 🔲 |
| M8 | Iframe Embedding | 🔲 |
| M9 | Debug Tools | 🔲 |
| M10 | 3D Track Visualization | 🔲 |
| M11 | Gates Editor | 🔲 |
| M12 | Path Editor | 🔲 |
| M13 | Export & Sharing | 🔲 |

## Milestone Specs

### M1 — Project Foundation ✅
*No functional requirements — infrastructure only.*
- Vite + React + TypeScript project setup.
- ESLint configured, pnpm configured.
- mefly-nav integration (host sync + nav receiver widget).
- HashRouter wrapping app (required for mefly-nav).
- GitHub Pages deploy workflow.
- Under-construction placeholder page.

### M2 — Dependencies & Test Infrastructure ✅
*No functional requirements — infrastructure only.*
- Install: `zustand`, `three`, `react-resizable-panels`, `json-edit-react`.
- Install dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@types/three`.
- Add `test` and `test:run` scripts to `package.json`.
- Configure vitest in `vite.config.ts` (jsdom environment, globals).
- Add `"vitest/globals"` and `"DOM.Iterable"` to `tsconfig.app.json`.

### M3 — CSS Design System ✅
*No functional requirements — infrastructure only.*
- Replace `src/index.css` with CSS reset + `--tb-*` design token custom properties.
- All subsequent component CSS modules use `var(--tb-*)` tokens exclusively (no hardcoded colors).

### M4 — Track Data Model 🔲
*Reqs: CAT_016–CAT_022, CAT_023–CAT_029*
- `Point3`, `TrackSegment`, `Track`, `LoadedTrack`, `TrackLoadError` types in `src/types/tracks.ts` (CAT_016–CAT_022).
- `TrackMetadata`, `TrackLoadStatus` types in `src/types/metadata.ts`.
- Remote tracks: index file at `/tracks/tracks.txt`, individual JSON files at `/tracks/{id}.json`; IDs are subdirectory-relative paths (CAT_023, CAT_028, CAT_029).
- Local tracks: stored in `localStorage` under versioned key `fpv-track-builder.local-tracks.v1` (CAT_024).

### M5 — Track Stores & Catalog 🔲
*Reqs: CAT_001–CAT_015, CAT_025–CAT_027, CAT_030–CAT_034*
- `src/store/tracks.store.ts` — unified track CRUD + localStorage sync (CAT_031).
- `src/store/useTracksStore.ts` — hooks: `useTracksStore`, `useTrack(id)`.
- `src/store/metadata.store.ts` — per-track metadata, readonly flag, load status; handles remote catalog index fetch and lazy loading (CAT_025–CAT_027, CAT_032–CAT_034).
- `src/store/useMetadataStore.ts` — hooks: `useMetadataStore`, `useTrackMetadata(id)`.
- `TracksCatalog.tsx` — "My Tracks" + "Catalog Tracks" sections with loading/error states; catalog tree for remote tracks; create, delete, clone actions (CAT_001–CAT_015, CAT_030).

### M6 — Workspace Layout & Routing 🔲
*Reqs: WS_001–WS_014, ETC_010*
- 3-panel resizable layout: catalog (left, collapsible) / `TrackEditor` (center) / debug (right, dev-only) (WS_001–WS_003).
- `SidePanel.tsx` — shared collapsible panel component for catalog and debug (WS_004–WS_010).
- `layout.store.ts` — Zustand store for panel collapse state.
- `Layout.tsx` orchestrates panels via `react-resizable-panels`.
- `TrackEditor.tsx` + `TrackEditorToolbar.tsx` + `TrackEditorScene.tsx` scaffolded (WS_011–WS_014).
- Hash-based routing: `/#/tracks/{id}?mode=...`; `TracksBuilderPage.tsx` orchestrates track loading (ETC_010).

### M7 — TrackEditor & Modes 🔲
*Reqs: VIZ_006–VIZ_009*
- `TrackEditorToolbar.tsx` — 4-button mode switcher (`view`, `gates`, `path`, `json`); updates `?mode=` on click (VIZ_006–VIZ_008).
- Default mode is `view` when absent from URL (VIZ_007).
- `TrackEditorScene.tsx` renders the active mode shell; `json` mode renders read-only JSON tree of selected track (VIZ_009).

### M8 — Iframe Embedding 🔲
*Reqs: ETC_011–ETC_013*
- `useParentWindowSync.ts` — syncs route changes to/from parent window via `postMessage` (ETC_011–ETC_013).

### M9 — Debug Tools 🔲
*Reqs: ETC_001–ETC_009*
- `DebugTools.tsx` — dev-only right panel; only rendered when `import.meta.env.DEV` (ETC_001).
- Four `<JsonEditor>` sections (from `json-edit-react`), each collapsed by default: `tracksStore` (read-only), `metadataStore` (read-only), `trackStore` (editable), `layoutStore` (read-only) (ETC_002–ETC_009).

### M10 — 3D Track Visualization 🔲
*Reqs: VIZ_001–VIZ_005*
- Render track `edges` as line segments on a 3D lattice grid using Three.js (VIZ_001).
- Render racing `path` as a highlighted route through gates (VIZ_002).
- `show_path_labels` support: labeled annotations on path segments (VIZ_003).
- Interactive camera: orbit, zoom, pan (VIZ_004).
- Dark canvas background (VIZ_005).

### M11 — Gates Editor 🔲
*Reqs: VIZ_010–VIZ_013*
- Interactive 3D editing of gate edges: add, move, delete (VIZ_010–VIZ_012).
- Persist changes back to the track store immediately (VIZ_013).

### M12 — Path Editor 🔲
*Reqs: VIZ_014–VIZ_017*
- Define gate sequence, reorder, add/remove path steps (VIZ_014–VIZ_016).
- Persist changes back to the track store immediately (VIZ_017).

### M13 — Export & Sharing 🔲
*Reqs: ETC_014–ETC_015*
- Export current track as a JSON file (ETC_014).
- Copy shareable URL or embed code (ETC_015).

---

## Agent Changelog

### M1 — Project Bootstrap ✅
- Scaffolded React + TypeScript + Vite project.
- Added mefly-nav integration with HashRouter and trusted origin sync.
- Added under-construction placeholder page.
- Configured GitHub Pages deploy workflow with `base: '/track-builder/'`.

### M2 — Dependencies & Test Infrastructure ✅
- Installed: `zustand`, `three`, `react-resizable-panels`, `json-edit-react`.
- Installed dev: `vitest`, `jsdom`, `@testing-library/*`, `@types/three`.
- Added `test` and `test:run` scripts to `package.json`.
- Configured vitest in `vite.config.ts` (jsdom environment, globals).
- Added `vitest/globals` and `DOM.Iterable` to `tsconfig.app.json`.

### M3 — CSS Design System ✅
- Replaced `src/index.css` with CSS reset + full `--tb-*` design token system.
- Warm beige/amber palette matching the crsf-tester sibling project conventions.
- All future component CSS modules must use `var(--tb-*)` tokens.
