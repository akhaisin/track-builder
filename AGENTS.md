# track-builder

Visual web editor for designing compact indoor FPV drone racing tracks built from PVC pipes and connectors. Tracks are arranged on a 3D lattice grid. Users browse catalog tracks, create and manage local tracks, edit gate placements and racing paths, and visualize the result.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Package manager | pnpm |
| State management | Zustand |
| 3D rendering | Three.js |
| Layout panels | react-resizable-panels |
| Routing | React Router (HashRouter) |
| Testing | Vitest + jsdom + @testing-library |

## Commands

```bash
pnpm dev          # dev server → http://localhost:5173
pnpm build        # type-check + production build
pnpm lint         # run ESLint
pnpm test:run     # run tests once
pnpm test         # run tests in watch mode
```

## Validation

After any changes, all three must pass before a task is complete:

```bash
pnpm build
pnpm lint
pnpm test:run
```

## Architecture

Hash-based SPA routing (`/#/tracks/{id}?mode=...`). Three-panel resizable layout: catalog (left, collapsible) / workspace (center) / debug (right, dev-only).

Two Zustand stores: `tracks.store.ts` (unified track CRUD + localStorage sync) and `metadata.store.ts` (per-track readonly flag, remote load status, errors). Remote tracks are served as static JSON files and fetched lazily on selection.

Workspace modes — `view`, `gates`, `path`, `json` — are controlled via the `?mode=` URL query parameter. The center panel hosts `TrackEditor`: a toolbar (`TrackEditorToolbar`, mode switcher + export/sharing) above a scene panel (`TrackEditorScene`). All editing interactions live inside the mode views. `TrackEditorScene` holds a ref to the current track entry in the tracks store and renders the appropriate mode view.

Remote catalog tracks are organized into subdirectories (e.g. `public/tracks/RG5/rg5-06.json`). Track IDs are their path relative to `public/tracks/` without the `.json` extension (e.g. `RG5/rg5-06`). The catalog panel renders remote tracks as a tree mirroring this directory hierarchy.

```
src/
├── App.tsx
├── main.tsx
├── index.css                        # Global reset + --tb-* design tokens
├── pages/
│   └── TracksBuilderPage.tsx
├── store/
│   ├── tracks.store.ts
│   ├── useTracksStore.ts
│   ├── metadata.store.ts
│   └── useMetadataStore.ts
├── features/
│   ├── catalog/TracksCatalog.tsx
│   ├── trackEditor/
│   │   ├── TrackEditor.tsx          # Center panel host; owns toolbar→scene event flow
│   │   ├── TrackEditorToolbar.tsx   # Mode switcher + mode-specific actions
│   │   └── TrackEditorScene.tsx     # Renders active mode; holds ref to current track
│   └── debugTools/DebugTools.tsx
├── layout/
│   ├── Layout.tsx
│   ├── SidePanel.tsx
│   └── layout.store.ts
├── hooks/
│   └── useParentWindowSync.ts
└── types/
    ├── tracks.ts
    └── metadata.ts
```

## Key Conventions

- **Package manager**: always `pnpm`
- **Routing**: hash-based `/#/tracks/{id}?mode=...`

## Memory Banks

Project knowledge is indexed at [`.claude/memory/MEMORY.md`](.claude/memory/MEMORY.md).
Load the index and relevant files before working on any feature.

@.claude/memory/MEMORY.md
