# Playground release plan

Repository: https://github.com/3d7tech/requ-syntax. Target: https://requstory.com/dev/.

## Build and review

Phone/desktop mockups were approved on 21 October 2026. Build Vite with base /dev/, a crawlable index, canonical URL and language guide. Test source edits, diagnostics, all nine examples, diagram selection, share hashes, clipboard/downloads and direct asset loads at 320/390/1440px. CI must build, test, lint and run Chromium checks before release.

## Hosting integration

Use the existing paired Requstory Actions release, rather than another upload path. The syntax repository is private. Download the playground-<sha> artifact from its passing CI run, verify release.json names that exact commit, and place its unchanged files in the FE repository at rebuild/playground-release. Keep source in requ-syntax. The FE build calls scripts/stage-playground.mjs to copy the reviewed artifact into dist/dev and append dev to site-pages.json, sitemap.xml and llms.txt. This uses the existing FE Actions credentials; no cross-repo token or Mac upload is needed. The current BE publisher already copies and backs up listed static page folders, and the matching rollback restores them. Confirm this with a deployment fixture before use.

The existing Apache rules serve real files/directories before the app fallback, so /dev/ can stay separate from app routes. Test /dev, /dev/, /dev/assets and a compressed hash URL after publication. Preserve all existing app routes and assets. Use a new paired release ID, then verify both the app and playground on phone/desktop. No Mac upload or SSH write.

CI attaches sourceCommit metadata to the artifact. Review the generated-artifact PR and passing frontend checks before publication. Future updates replace the committed artifact from another passing syntax CI run. Do not dispatch a production release before completed-build review.

## npm

Use @requstory/core, @requstory/cli and @requstory/web. The current machine is not signed in. An unauthenticated org lookup cannot prove availability or ownership. Sign in to the intended npm account, verify scope ownership and package permissions, inspect package tarballs, then configure NPM_TOKEN in the npm-release GitHub environment. The manual publish.yml checks a vX.Y.Z tag has passing CI and matches all package versions before publishing in dependency order. Set environment reviewers if available. Publish public packages only after final review. No token values belong in this repository.
