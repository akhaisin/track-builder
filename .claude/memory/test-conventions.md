---
name: test-conventions
description: Testing conventions — file co-location, DOM matchers, mocking strategy
metadata:
  type: project
---

- Test files co-located with the code they test: `Foo.test.tsx` next to `Foo.tsx`.
- Use `@testing-library/jest-dom/vitest` for DOM matchers.
- Mock stores and heavy dependencies (Three.js, Layout) in page-level tests.
- Do not test internal store implementation details; test observable behavior via hooks or components.
