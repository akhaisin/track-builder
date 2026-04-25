# Track Builder — Agent Changelog

## M1 — Project Bootstrap

**Goal:** Initialize the project skeleton with branding, mefly-nav integration, and an under-construction placeholder page.

### What was done

- Scaffolded React + TypeScript + Vite project using `pnpm create vite@latest` with the `react-ts` template.
- Renamed project to `track-builder` in `package.json`.
- Placed `under-construction.svg` in `src/assets/`.
- Replaced the default Vite welcome page (`App.tsx` / `App.css`) with a centered display of `under-construction.svg`.
- Added `public/favicon.svg` — quadcopter drone icon (64×64, SVG).
- Updated `index.html` title to `Track Builder`.
- Added dependencies:
  - `mefly-nav` (`github:akhaisin/mefly-nav#v0.1.3`) — nav receiver widget
  - `react-router-dom` ^7 — required peer dependency for mefly-nav
- Integrated `mefly-nav` the same way as in `learning-react`:
  - `useHostSync(['https://mefly.dev', 'https://www.mefly.dev'])` called at app shell level
  - `<MeflyNavReceiver>` rendered with hover activation mode and standard styling tokens
  - `HashRouter` wraps the app (required for `useHostSync` / nav sync)
  - `mefly-nav/style.css` imported in `App.tsx`
- Added GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) to deploy to GitHub Pages on push to `main`.
- Set `base: '/track-builder/'` in `vite.config.ts` so asset paths resolve correctly under the Pages sub-path.

### File layout after M1

```
track-builder/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml  # builds + deploys to GitHub Pages
├── public/
│   └── favicon.svg           # drone icon
├── src/
│   ├── assets/
│   │   └── under-construction.svg
│   ├── App.tsx               # app shell with mefly-nav + under-construction page
│   ├── App.css               # minimal shell styles
│   ├── index.css             # base styles (from Vite template)
│   └── main.tsx              # React root
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.app.json
```
