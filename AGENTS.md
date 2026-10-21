# Requ syntax

Read spec.md, PLAN.md, DECISIONS.md and STATUS.md before work. Keep answers short.

Separate project; do not change Requstory app features. Scope: @requstory. Target playground path: /dev/. JSON integration is deferred.

Use strict TypeScript, ESM, Node 20+. Core has no runtime dependencies; the user replaced ELK with deterministic grids.
Run pnpm build, pnpm test and pnpm lint before each milestone commit.
Use M<n>: <name> commit messages. No paid calls. Never read secrets.
Keep parser/render nonthrowing, output deterministic, and SVG escaped.
Phone/desktop playground mockups approved 21 October 2026. Build scope is approved; completed-build review is still required before publishing/deploying.
Publish/deploy only after review, through GitHub Actions. Remote: https://github.com/3d7tech/requ-syntax (main).
