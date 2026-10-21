# Contributing to Requ

Use Node 20 or later and pnpm 10.18.3.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

Keep parser/render behavior deterministic, escape SVG output and return diagnostics for invalid source. Add a focused regression when fixing a parser, lint or rendering bug. Keep the public examples and language guide in sync.

Before opening a pull request:

```sh
pnpm build
pnpm test
pnpm lint
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:visual
pnpm test:playground
```

`pnpm gallery` builds a local gallery. For intentional rendering changes, update snapshots with `pnpm exec vitest run -u` and inspect the diagrams before committing.

Package source lives in `packages/core`, `packages/cli` and `packages/web`; the playground and generated public pages live in `apps/playground`.

See [development notes](docs/DEVELOPMENT.md) for advanced API and renderer details. Open an issue with a small Requ example and the expected output when reporting a bug.
