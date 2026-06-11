---
name: css-design-system
description: CSS Design System — --tb-* token reference and CSS Module conventions for all component styles
metadata:
  type: project
---

All component styles use **CSS Modules** (`.module.css` co-located with the component). All color, spacing, typography, and motion values reference **`--tb-*` CSS custom properties** defined in `src/index.css`. Never hardcode color or spacing values in component CSS.

## Token Reference

```css
/* Colour */
--tb-color-bg           /* page background: warm beige #ebe6db */
--tb-color-surface      /* card/panel surface: off-white #fffdf8 */
--tb-color-surface-mid  /* secondary surface #f5f1e8 */
--tb-color-border       /* default border #d8cfbf */
--tb-color-border-focus /* focused border #8a6f3e */
--tb-color-text         /* body text #1f2933 */
--tb-color-text-heading /* heading text #3b2f14 */
--tb-color-text-sub     /* secondary text #5c4a28 */
--tb-color-text-muted   /* muted/placeholder #b8a888 */
--tb-color-accent       /* primary accent (warm brown) #8a6f3e */
--tb-color-accent-bg    /* tinted accent background #f3e4c8 */
--tb-color-hover-bg     /* hover surface #f8f0e0 */
--tb-color-success      /* success green #7ab87a */
--tb-color-danger       /* danger red #b94040 */
--tb-color-warning      /* warning orange #c87d2a */
--tb-color-canvas-bg    /* 3D canvas dark background #1e1a14 */
--tb-color-canvas-grid  /* 3D grid line rgba #d8cfbf at 12% */
--tb-color-canvas-line  /* 3D track line amber #c9993a */

/* Spacing (rem) */
--tb-space-xs  /* 0.25rem */
--tb-space-sm  /* 0.5rem  */
--tb-space-md  /* 1rem    */
--tb-space-lg  /* 1.5rem  */
--tb-space-xl  /* 2rem    */

/* Border radius */
--tb-radius-sm /* 6px  */
--tb-radius-md /* 12px */
--tb-radius-lg /* 20px */

/* Typography */
--tb-font-sans       /* system-ui stack */
--tb-font-mono       /* monospace stack */
--tb-font-size-xs    /* 0.65rem */
--tb-font-size-sm    /* 0.82rem */
--tb-font-size-md    /* 0.92rem */
--tb-font-size-base  /* 1rem    */
--tb-font-size-lg    /* 1.1rem  */

/* Shadows */
--tb-shadow-sm  /* subtle panel shadow */
--tb-shadow-md  /* card shadow */
--tb-shadow-lg  /* elevated dialog shadow */

/* Motion */
--tb-transition /* 0.15s ease — use on interactive states */
```

## CSS Module Example

```css
/* MyComponent.module.css */
.container {
  background: var(--tb-color-surface);
  border: 1px solid var(--tb-color-border);
  border-radius: var(--tb-radius-md);
  padding: var(--tb-space-md);
}

.btn {
  padding: var(--tb-space-xs) var(--tb-space-md);
  background: var(--tb-color-accent);
  color: #fff;
  border-radius: var(--tb-radius-sm);
  font-size: var(--tb-font-size-sm);
  transition: opacity var(--tb-transition);
}

.btn:hover { opacity: 0.85; }
```
