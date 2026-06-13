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
| M4 | Track Data Model | ✅ |
| M5 | Track Stores & Catalog | ✅ |
| M6 | Workspace Layout & Routing | ✅ |
| M7 | TrackEditor & Modes | ✅ |
| M8 | Iframe Embedding | ✅ |
| M9 | Debug Tools | ✅ |
| M10 | 3D Track Visualization | ✅ |
| M11 | Gates Editor | ✅ |
| M12 | Path Editor | ✅ |
| M13 | Export & Sharing | ✅ |

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

### M4 — Track Data Model ✅
- Added `src/types/tracks.ts`: `Point3`, `TrackSegment`, `TrackCaption`, `Track`, `LoadedTrack`, `TrackLoadError`; constants `LOCAL_TRACKS_STORAGE_KEY`, `TRACKS_INDEX_URL`; helpers `trackJsonUrl()` and `isTrack()` structural validator (CAT_016–CAT_025, CAT_029).
- Added `src/types/metadata.ts`: `TrackLoadStatus`, `TrackMetadata` (CAT_032–CAT_034).
- Added co-located tests `src/types/tracks.test.ts` (validator + URL mapping).
- Verified `.git/hooks/pre-commit` already regenerates `public/tracks/tracks.txt` (CAT_028).
- ⚠️ Stubbed `mefly-nav` with `src/stubs/mefly-nav.tsx` (App.tsx imports the stub): the pinned git dependency installs empty because upstream packs `files: ["dist"]` with no committed `dist/` and no `prepare` script. Build/CI were broken on clean installs. **Follow-up: fix upstream in `~/projects/mefly.dev`, repin, delete the stub.**
- Fixed pre-existing ESLint errors in `SidePanel.tsx` (unused expression, unused param).

### M5 — Track Stores & Catalog ✅
- Added `tracks.store.ts` (vanilla zustand): uniform `tracks` map, `setTrack`/`removeTrack`, `readLocalTracks()` with CAT_025 validation fallback, `writeLocalTracks()` (CAT_024, CAT_031).
- Added `metadata.store.ts`: `byId` metadata map, catalog index fetch (`fetchCatalogIndex`), lazy `ensureTrackLoaded` with in-memory caching + in-flight dedupe held in state as `inflight` map (CAT_026–CAT_027, CAT_032–CAT_034).
- Added `trackActions.ts` orchestrator: `createLocalTrack` (clones seed `elements/ladder3`), `cloneTrack`, `deleteLocalTrack`, `updateTrack`, `nextTrackName` (`track-NNN`); persists by filtering tracks store through metadata readonly flags (CAT_008–CAT_009, CAT_014). Dependency chain is one-way: tracks.store ← metadata.store ← trackActions (no cycles).
- Added hooks `useTracksStore.ts` (`useTracksStore`, `useTrack`) and `useMetadataStore.ts` (`useMetadataStore`, `useTrackMetadata`).
- Added `features/catalog/TracksCatalog.tsx` + CSS module: My Tracks / Catalog Tracks sections, loading & error states, directory tree via `<details>` groups, create/clone/delete (confirm dialog), navigation on select/create/clone, navigate home when deleting the open track (CAT_001–CAT_015, CAT_030).
- Fetch URLs are `import.meta.env.BASE_URL`-prefixed (app deploys under `/track-builder/`).
- Added `src/test/setup.ts` (wired via `setupFiles`): jest-dom matchers + in-memory `localStorage` polyfill — Node 25's experimental `localStorage` global shadows jsdom's and is inert, breaking any storage-touching test.
- Tests: stores, actions, and catalog component (32 total).

### M6 — Workspace Layout & Routing ✅
- Added `layout/layout.store.ts`: session-only `collapsed` map + `useLayoutStore` hook (WS_003).
- Added `layout/Layout.tsx` + CSS module: horizontal `Group` (react-resizable-panels v4 API: `Group`/`Panel`/`Separator`) composing catalog SidePanel (left) / center panel / debug SidePanel (right, `import.meta.env.DEV` only) (WS_001).
- `SidePanel` gained optional `panelId` prop mirroring collapse state into the layout store.
- Scaffolded `features/trackEditor/`: `TrackEditor.tsx` (owns toolbar→scene `ToolbarEvent` flow via seq-numbered events), `TrackEditorToolbar.tsx` (placeholder; mode switcher lands in M7), `TrackEditorScene.tsx` (placeholder / loading / error / track states via `useTrack` + `useTrackMetadata`) (WS_011–WS_014).
- Added `pages/TracksBuilderPage.tsx`: reads track ID from `/tracks/*` splat (IDs contain slashes), triggers `ensureTrackLoaded`, composes Layout slots (ETC_010).
- `App.tsx`: replaced under-construction placeholder with routes `/` and `/tracks/*`; deleted the unused SVG asset.
- Test setup gained a `ResizeObserver` stub (react-resizable-panels v4 requires it; jsdom has none).
- Tests: layout store, Layout slots, TrackEditor states, page routing/lazy-load (43 total).

### M7 — TrackEditor & Modes ✅
- Added `workspaceMode.ts`: `WORKSPACE_MODES`/`WorkspaceMode`, `parseMode` (defaults `view`, VIZ_007), `useWorkspaceMode` hook over `useSearchParams` (VIZ_008).
- `TrackEditorToolbar.tsx`: 4-button mode switcher (View/Gates/Path/JSON) with `aria-pressed` active state; sets `?mode=` without reload (VIZ_006).
- `TrackEditorScene.tsx`: `MODE_VIEWS` map renders the active mode shell; `json` mode renders `<JsonEditor viewOnly>` (json-edit-react) with the track id as root name (VIZ_009). `view`/`gates`/`path` are placeholders until M10–M12.
- Tests: mode parsing, default/active states, URL updates on click, JSON tree rendering (49 total).

### M8 — Iframe Embedding ✅
- Added `hooks/useParentWindowSync.ts`: when embedded (`window.parent !== window`), posts `{ type: 'HASH_CHANGED', hash }` to each trusted origin on every route change (ETC_013) and navigates on `{ type: 'NAVIGATE_TO_HASH', hash }` from trusted origins only (ETC_012). Parent-initiated navigations are not echoed back (loop guard via `lastReceivedHash` ref). Hashes accepted with or without leading `#`.
- Wired into `AppShell` alongside the (stubbed) mefly-nav `useHostSync`, sharing `TRUSTED_ORIGINS`.
- Tests: outbound post, inbound navigate, untrusted-origin rejection, echo suppression, non-embedded no-op (55 total).

### M9 — Debug Tools ✅
- Added `features/debugTools/DebugTools.tsx`: returns `null` unless `import.meta.env.DEV` (ETC_001); "Debug Tools" heading + selected track id or "none" (ETC_004); four stacked `<JsonEditor collapse={0}>` sections (ETC_005): read-only `tracksStore`, read-only `metadataStore`, editable `trackStore` (writes back via `trackActions.updateTrack`, persisting local tracks — ETC_003/ETC_008), read-only `layoutStore` last (ETC_006, ETC_009).
- Added `serializeMetadataState.ts` (separate module for react-refresh lint): inflight promise map → `hasInflight` boolean + `inflightIds` array (ETC_007).
- Page passes `<DebugTools trackId>` into the Layout debug slot.
- Tests: heading/none/track id, four editors in order, metadata serialization (60 total).

### M10 — 3D Track Visualization ✅
- Added `three/sceneBuilders.ts` (pure, unit-testable): `computeBounds`, `flattenSegments`, `pathSegments`, `pathLabelAnchors` (centroid per step, numbered 1..n), `buildEdgesObject` (amber `--tb-color-canvas-line`), `buildPathObject` (success green, distinct — VIZ_002), `buildGrid` (1-unit lattice `GridHelper`, translucent, centred on track — VIZ_001), `buildLabelSprites` (canvas-texture sprites — VIZ_003), `disposeObject`, `cssColor` token reader.
- Added `TrackViewer.tsx`: WebGLRenderer + PerspectiveCamera + OrbitControls (orbit/zoom/pan — VIZ_004), dark `--tb-color-canvas-bg` background (VIZ_005), rAF loop with damping, ResizeObserver sizing, full disposal on unmount. Camera frames the track on mount; in-place edits rebuild only the track group (camera preserved). Remounts per track via `key={trackId}`.
- WebGL availability probed in lazy `useState` init (react-hooks v7 forbids sync setState-in-effect); jsdom/headless shows a "3D view unavailable" fallback — this keeps component tests viable.
- Coordinate mapping: track data is y-up, mapping 1:1 onto Three.js axes; ground grid in the xz plane.
- `TrackEditorScene` loads the viewer via `React.lazy`/`Suspense` (Three.js split into its own ~540 kB chunk; `chunkSizeWarningLimit: 600`).
- Tests: bounds, buffers, label anchors, edge/path color distinction, grid placement, viewer fallback wiring (69 total).

### M11 — Gates Editor ✅
- Extracted `three/sceneSetup.ts` (`createSceneContext`, `isWebglAvailable`): shared renderer/camera/controls/resize/rAF shell; `TrackViewer` refactored onto it.
- Added `gatesLogic.ts` (pure): `addEdge` (rejects zero-length/duplicates), `deleteEdge`, `moveEdgeEndpoint` (rejects degenerate/duplicate results), `edgeExists`, `snapToLattice`.
- Added `GatesEditor.tsx`: per-edge `THREE.Line` objects with raycast picking (Line threshold 0.15); click-to-select (warning-color highlight + endpoint sphere markers), click endpoint → click lattice point to move (VIZ_011), two-click add on a y-level plane with snap-to-integer lattice and Level −/+ overlay (VIZ_010), Delete/Backspace key + toolbar Delete (VIZ_012); clicks distinguished from orbit drags by 5px pointer-travel tolerance. All edits persist via `trackActions.updateTrack` (VIZ_013). Read-only catalog tracks show a "clone to edit" notice instead.
- Replaced the seq-numbered event prop with `toolbarEventBus.ts` (emit/subscribe): react-hooks v7 lint forbids setState-in-effect-on-prop; mode views now handle toolbar events in subscription callbacks. Toolbar hosts Select/Add edge/Delete in gates mode (WS_013).
- Tests: gates logic (add/delete/move/snap/validation), toolbar tools render, readonly notice, WebGL fallback (82 total). Pointer raycasting itself is untestable in jsdom — verify manually in the browser.

### M12 — Path Editor ✅
- Added `pathLogic.ts` (pure): `appendStep`, `addSegmentToStep` (rejects degenerate/duplicate-in-step), `removeStep`, `moveStep` (clamped reorder).
- Added `PathEditor.tsx`: 3D surface (edges dimmed 0.4, steps as green LineSegments, selected step white, step-number sprites always on, pending-point marker); two lattice clicks add a segment — to the selected step, or as a new step when none selected (VIZ_014, VIZ_016); clicking a step line selects it; "Path steps" DOM overlay panel lists steps with ↑/↓ reorder (VIZ_015) and ✕ remove, click-to-select; Delete key removes the selected step; Level −/+ overlay shared pattern. All edits persist via `updateTrack` (VIZ_017).
- Steps panel renders even without WebGL (canvas area shows fallback) — reorder/remove stay usable and jsdom-testable.
- Toolbar hosts "New step" (deselect → next segment starts a new step) and "Delete step" in path mode, over the event bus.
- Tests: path logic, steps panel render, reorder/remove with store + localStorage persistence assertions, readonly notice (93 total).

### M13 — Export & Sharing ✅
- Added `exportSharing.ts`: `exportTrackAsJson` (Blob + object URL + anchor download, file named after the id's basename — ETC_014), `shareableUrl` (origin + pathname + `#/tracks/{id}` preserving `?mode=`), `embedCode` (iframe snippet — ETC_015).
- Toolbar gains an "Export and sharing" group (right side, shown when a track is loaded): Export, Copy link, Copy embed with 1.5 s "Copied ✓" feedback via `navigator.clipboard`.
- Tests: URL/embed builders, JSON download (stubbed object URL + anchor click), clipboard copy via user-event's clipboard stub (100 total).

### Gates Editor rework — click-to-toggle candidates ✅ (2026-06-12)
- Reworked VIZ_010–VIZ_012 (requirements updated): gates mode renders **placed** edges (full opacity) plus **candidate** edges — every unit axis-aligned lattice edge touching a placed node — at half opacity. Clicking a candidate places it; clicking a placed edge removes it. Candidates never extend below the floor (y < 0). Empty track seeds 5 candidates around the origin.
- `gatesLogic.ts`: replaced `addEdge`/`deleteEdge`/`moveEdgeEndpoint` with `candidateEdges(track)` + `toggleEdge(track, a, b)`; kept `pointsEqual`/`edgeExists`/`snapToLattice` (still used by path editor).
- `GatesEditor.tsx`: dropped tools/selection/endpoint-move/Level overlay/Delete key; single raycast click toggles the hit edge. No toolbar events — `events` prop removed.
- `TrackEditorToolbar.tsx`: removed the "Gates tools" group (Select / Add edge / Delete).
- Follow-up (same day): placed edges render as solid cylinder pipes (`buildPipeMesh` in `sceneBuilders.ts`, shared `PIPE_RADIUS = 0.03`) for strong contrast with the half-opacity candidate lines; hovering any edge tints it warning-color + pointer cursor (VIZ_018). Plain `linewidth` was not an option — WebGL ignores it.
- Follow-up (same day): path mode renders placed edges as the same full-opacity pipes (was: dimmed 0.4 thin lines via `buildEdgesObject`).
### Path Editor rework — gate-based steps ✅ (2026-06-12)
- Reworked VIZ_014–VIZ_016 (requirements updated): a step is one or more coplanar, edge-connected **gates** (1×1 lattice planes). The existing data model already encoded this — every catalog path segment is a unit-square diagonal — so the Track schema is unchanged; gates are stored as diagonal segments.
- `pathLogic.ts`: new pure functions `gateCorners`, `gateKey`/`gatesEqual` (diagonal-agnostic square identity), `gatesAlongEdge` (4 squares having a unit edge as a side), `gateNeighbors` (4 in-plane side-neighbors), `nextGateCandidates` (neighbors of last draft gate minus draft gates, neighbors reached by crossing a placed edge, and unanchored neighbors not touching any placed node; corner-touch suffices and the opposite-of-initiating-edge gate is not banned outright, so a step can wrap all the way around the structure; gates flat on the floor or below it are never offered), `appendStep(track, gates)`. `removeStep`/`moveStep` unchanged; `addSegmentToStep` and segment-based `appendStep` removed.
- `PathEditor.tsx` rewritten: placed edges render as pipes (hover tint; selected = brighter + 1.8× radius); step creation = select edge → candidate gate quads → left-click adds + finishes step, right-click adds + continues; click-away finishes an open draft, Escape discards it. Gates render as translucent fill quads (raycast targets) + outlines: steps green (selected step brighter + white outline), draft white-outlined, candidates faint. Clicking a step gate selects the step. Level −/+ overlay and two-lattice-click flow removed; steps panel unchanged except "segs" → "gates".
- Toolbar "Path tools" (New step / Delete step) removed; with no consumers left, the toolbar event bus (`toolbarEventBus.ts`, `events` props, WS_013 wiring) was deleted entirely. CLAUDE.md architecture note updated.
- Follow-up (same day): step numbers anchor inset (0.2 lattice units) inside the top-right corner of each step's **first gate** instead of the step centroid, and render at half size (sprite scale 0.6 → 0.3). `pathLabelAnchors` uses `gateCorners` (imported from `pathLogic`) with a top→right corner pick; non-square segments fall back to the segment midpoint.
- Follow-up (same day): view mode now renders identically to path mode but read-only — pipes for placed edges + translucent green gate tiles (opacity 0.3) for path steps, plus step number labels (always on, matching path mode). Extracted the gate fill+outline geometry into shared `addGateMesh(target, gate, style)` in `sceneBuilders.ts` (used by both `TrackViewer` and `PathEditor`); removed the now-dead `buildEdgesObject`. `buildPathObject` stays (gates mode still dims the path as lines). The `show_path_labels` flag no longer gates label display (kept in the `Track` type for data compatibility); VIZ_003 updated.

### Flight animation — quadcopter + fading trail ✅ (2026-06-12)
- Added VIZ_019/VIZ_020: view mode (`TrackViewer`) now animates a stylized quadcopter flying the racing path with a fading trail line.
- `flightPath.ts` (pure): `gateCenter` (diagonal midpoint) + `flightWaypoints` (center of each step's *first* gate, empty steps skipped) + `roundCorners(points, radius)` (fillets each corner of the closed waypoint loop into two points toward its neighbors, clamped to half-edge) to soften turns — the curve is built from the rounded points (`CORNER_RADIUS = 0.4`), so the drone clips just inside each gate instead of dead-center.
- `sceneBuilders.ts`: `buildQuadcopter()` — unlit X-frame + 4 translucent rotor disks + body + danger-color nose marker; local −Z is forward (matches `Object3D.lookAt`), rotor disks face local +Y.
- `three/droneFlight.ts`: `createFlightAnimation(track)` builds a closed Catmull-Rom curve through the waypoints (continuous loop, `SPEED = 2.5` units/s), samples it arc-length-even (`getSpacedPoints`) into a trail `THREE.Line`. Per-vertex `alpha` attribute + a tiny `ShaderMaterial` (LineBasicMaterial has no per-vertex alpha) drive the trail: brightest at the drone, fading to a low resting opacity over the trailing 4 s (`trailAlpha` pure helper, capped at 0.9 loop-fraction so it never overlaps its own head). Returns `null` for <2 waypoints. `update(elapsed)` repositions/orients the quad and rewrites the alphas each frame.
- `sceneSetup.ts`: `SceneContext` gained `onFrame(cb)` — a per-frame callback registry driven by a `THREE.Clock` (absolute elapsed seconds); cleared on dispose. Gates/Path editors are unaffected.
- `TrackViewer` registers the flight on its track-rebuild effect and unsubscribes + disposes on cleanup.
- Fixed a pre-existing stale `computeBounds` test (seed track db60e7c added x=−1/x=2 path gates; expected min/max/radius were never updated).
- Tests: `flightPath.test.ts` (waypoints), `droneFlight.test.ts` (trail fade ordering, <2-gate null, alpha-at-head, dispose), `buildQuadcopter` rotor count (128 total).

### Misc follow-ups (2026-06-12)
- Camera orientation persists across workspace-mode switches — `createSceneContext` takes an optional `poseKey` (the track id), saves the camera position/target to a session-only module map on dispose, and restores it instead of reframing on the next mount with the same key. All three 3D modes (view/gates/path) pass it.
1. **mefly-nav stub** (`src/stubs/mefly-nav.tsx`): fix upstream in `~/projects/mefly.dev` (add `prepare` script), repin, delete the stub.
2. **WS_015–WS_020 (CornerButtons)** are in requirements but were never assigned to any milestone — not implemented.
