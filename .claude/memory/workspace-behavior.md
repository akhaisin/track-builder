---
name: workspace-behavior
description: Workspace UI behavior — mode routing, toolbar, and store/panel/debug conventions
metadata:
  type: project
---

## Workspace Modes

- Toolbar is displayed at the top of the center panel.
- Active mode is read from and written to URL query param `?mode=`.
- Default mode is `view` (absent from URL = `view`).
- Current modes: `view`, `gates`, `path`, `json`.

## Store Conventions

- The tracks store has no readonly/remote concept — it holds all tracks uniformly.
- The metadata store owns the `readonly` flag and remote load status; this is the sole source of truth for whether a track is local or remote.

## Debug Panel

- `DebugTools.tsx` is only rendered when `import.meta.env.DEV` is true.
- Never render it in production builds.

## Iframe Sync

- Route changes are synced with the parent window via `postMessage`.
- Outbound: `HASH_CHANGED` on every route change.
- Inbound: `NAVIGATE_TO_HASH` to navigate the embedded app.
- Implemented in `hooks/useParentWindowSync.ts`.
