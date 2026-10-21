# Playground release plan

Repository: https://github.com/3d7tech/requ-syntax. Target: https://requstory.com/dev/.

## Build and review

Approve the phone/desktop playground mockups first. Build Vite with base /dev/, a crawlable index, canonical URL and language guide. Test source edits, diagnostics, all nine examples, diagram selection, share hashes, clipboard/downloads and direct asset loads at 320/390/1440px. CI must build, test, lint and run Chromium checks before release.

## Hosting integration

Use the existing paired Requstory Actions release, rather than another upload path. The FE staging workflow can check out a reviewed immutable requ-syntax ref in a separate directory, build its static playground and copy it into frontend/dev. Append dev to the frontend site-pages.json list. The current BE publisher already copies and backs up listed static page folders, and the matching rollback restores them. Confirm this with a deployment fixture before use.

The existing Apache rules serve real files/directories before the app fallback, so /dev/ can stay separate from app routes. Test /dev, /dev/, /dev/assets and a compressed hash URL after publication. Preserve all existing app routes and assets. Use a new paired release ID, then verify both the app and playground on phone/desktop. No Mac upload or SSH write.

The immutable source ref, cross-repo checkout access and final static artifact are still to be wired and tested after playground approval. Do not dispatch a production release before completed-build review.

## npm

Use @requstory/core, @requstory/cli and @requstory/web. The current machine is not signed in. An unauthenticated org lookup cannot prove availability or ownership. Sign in to the intended npm account, verify scope ownership and package permissions, inspect package tarballs, then configure a reviewed GitHub Actions publish workflow. Publish public packages only after final review. No token values belong in this repository.
