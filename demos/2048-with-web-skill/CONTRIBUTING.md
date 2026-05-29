# Contributing to web-skill

Thanks for contributing.

`web-skill` is still early, so small and focused contributions are especially helpful. Bug fixes, documentation improvements, tests, and API polish are all good contributions.

## Before you start

- use Node.js `>=20`
- install dependencies with `npm install`
- read the main [README](./README.md) first so the package goals and scope stay consistent

## Local workflow

Run the full verification flow before opening a pull request:

```bash
npm run verify
```

Useful commands:

```bash
npm run build
npm run typecheck
npm run test
```

## What to change carefully

- `src/` contains the package source
- `tests/` contains TypeScript tests for public behavior
- `docs/` contains contributor-facing and user-facing reference material
- `dist/` is generated output and should come from the build, not from manual edits

If you change public behavior, please update the relevant combination of:

- tests
- `README.md`
- `docs/api.md`

## Pull request guidance

- prefer small, single-purpose pull requests
- include a short explanation of the problem and the chosen fix
- mention any API or documentation changes explicitly
- avoid unrelated formatting or refactor churn in the same PR

## Scope guidance

Good contributions usually:

- make browser-to-agent workflows clearer
- improve generated markdown quality
- improve runtime validation or developer ergonomics
- make Vite integration more reliable
- improve docs for real adoption

Changes that add policy-heavy behavior should be discussed first. For example, authorization, trust boundaries, and product-specific workflow rules are usually better handled by consuming apps than by this package itself.
