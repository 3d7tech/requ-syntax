# Memory update: 25 October 2026

> **Action needed:** the main memory document lives on the local machine and wasn't reachable from the cloud session that did this work. Copy these entries into it, then delete this file. The same file is in all five repos (requ-syntax, requstory-cli, requstory-ml, requstoryBE, requstoryFE); remove it from each once the main memory is updated.

## Customer stories (requstoryFE PR #222, branch `claude/use-case-stories`)

- Six illustrative, story-led use case pages at `/use-cases/stories/<slug>/`, plus an index at `/use-cases/stories/`.
  - `after-the-contract-was-signed` (founder, small software company): Founders, Onboarding
  - `two-offices-one-process` (ops lead after a merger): Operations leads
  - `the-workshop-started-on-slide-two` (consultant, dental group client): Consultants
  - `the-agent-never-handed-back` (online shop, AI support agent): AI-agent teams
  - `the-website-would-not-let-us-in` (insurance broker, JavaScript site, Internet Archive copy plus template): Operations leads
  - `we-published-how-we-work` (agency, operating-model.requ, weekly recheck): AI-agent teams
- Where they live: `rebuild/src/site/content.ts` (`story()` helper, `stories`, `storiesIndex`, `STORY_NOTE`, `SHOTS`). `Page` has optional `note`, `scene`, `image` and `published`; `Section` has `images`; link cards take an optional image.
- Visuals:
  - Animated before-and-after scene per story: `rebuild/src/site/storyScene.ts`. Inline SVG, CSS only, with a wide layout and a tall phone layout; reduced motion shows the fixed state.
  - App screenshots: `public/rebuild-assets/stories/*.jpg`, taken from the blog screenshots and captioned as public example maps.
  - Existing how-to videos are placed in the matching stories.
  - Cover images: `public/rebuild-assets/stories/cover-<slug>.jpg`, used as the share image and on the cards. Regenerate them by hand after `pnpm build` with `node scripts/story-covers.mjs` (needs Playwright) whenever a story's title or scene changes.
- SEO and AEO: Article, VideoObject, per-story FAQPage and CollectionPage/ItemList structured data; og:image with size and alt; article:published_time; max-image-preview:large; image entries in the sitemap; a "Customer stories" group in llms.txt; the Markdown copies include images, transcripts and FAQs. Tests enforce titles ≤ 60 characters and descriptions ≤ 160, and check that the media and markup are present.
- Linked from the matching use case pages, the /use-cases/ index, the homepage fallback (one link; stories are kept out of "Who it is for") and the in-app menu (Explore tab → "Customer stories").
- Rule: every story carries `STORY_NOTE` (an illustrative composite: no real company or person named or quoted, and outcomes are what the product shows). A test enforces it. Don't add invented quotes or business metrics. Replace a story with a real one only with the customer's written consent.

## Removed the committed Google OAuth client secret (requstoryFE PR #223)

- `requstoryFE/client_secret_964530211003-….json` had been committed since 2 Aug 2024 (`d415af6`). Nothing used it: the live rebuild signs in with the public client ID from the backend's `GOOGLE_CLIENT_ID`, and the legacy app only used `REACT_APP_CLIENT_ID`. The PR deletes the file and adds `client_secret_*.json` to `.gitignore`.
- **To do:** reset the client secret in Google Cloud Console → APIs & Services → Credentials. It's still in git history, and the same OAuth client is live. Resetting it doesn't affect sign-in.

## Research "constantly failing": diagnosis (requstoryBE PR #123, merged)

- New manual workflow **Diagnostics (read-only)** (`.github/workflows/diagnostics.yml`, script `rebuild/deploy/diagnose-research.php`). It connects with the existing cPanel SSH key and prints recent research runs, whether the app would accept finished runs, the queue, failed jobs, log lines about research and the AI service, and the scheduler log. It changes nothing and masks emails and tokens. Run it from GitHub Actions (input: hours to look back), or ask Claude to start it.
- First run (25 Oct, 72 hours back):
  - **Research works.** 4 runs completed (6–21 credits each), the app can read every finished run, the queue is empty, the worker starts every 5 seconds, and there were no failed jobs or errors.
  - **All 8 failures were websites blocking our reader:**
    - ubagroup.com ×4, each "read" 150 pages in under 30 seconds and got nothing usable back ("did not give enough readable pages");
    - firstbankgroup.com ×3 ("blocks automated readers");
    - homedepot.com ×1, in the nightly run.
    - Nothing was charged for any of them.
  - **The browser fallback is off.** Cloudflare Browser Rendering isn't configured in production, so pages that a real browser could read are never retried in one.
- Why users saw "no message": the server records a message, but the app showed it as small plain text above the "Research this company" button, so the panel looked unchanged and people retried blocked sites.

## Research failure warning (requstoryFE PR #224, branch `claude/research-failure-warning`)

- `rebuild/src/onemap/researchFailure.ts` turns a failed run's message into a title, detail and next steps. `Research.tsx` shows it in an amber warning box (`role="alert"`).
- For blocked sites ("blocks automated readers" or "did not give enough readable pages"), the box says retrying now gives the same result, research is free to retry in a few days, and the map can still be built by hand. The retry button becomes a quieter outline button, "Try research again".
- Blocked sites are detected by matching the backend's message wording. If those messages change in `rebuild/app/Jobs/ResearchCompany.php`, update `researchFailure.ts`.

## Cloudflare Browser Rendering (to do)

- To switch it on: in the requstoryBE GitHub production environment, add the variable `CLOUDFLARE_ACCOUNT_ID` (32 hex characters) and the secret `CLOUDFLARE_BROWSER_TOKEN` (an API token with Browser Rendering permission), then redeploy the backend.
- The code (`PageRenderer`) uses the `/browser-rendering/content` call, which is billed on browser time only, and only after a plain read fails for a reason a browser can fix. Each page waits up to 20 seconds.
- Pricing (Cloudflare, Oct 2026): Workers Free gives 10 browser-minutes a day, about 30–60 page renders, so one fully blocked 150-page site can use up a day's allowance. Workers Paid includes 10 hours a month, then $0.09 an hour, so a fully blocked site costs about 5–8 cents. The Workers Paid subscription price itself wasn't confirmed; it's believed to be $5 a month.
- It won't get past every bot protection: banks may still block it.
- Suggestion: start on Free and watch the Diagnostics output, then move to Paid if the daily allowance runs out.

## State at the end of the session

- Open PRs: requstoryFE #222, #223 and #224. A frontend release is needed after merging.
- Merged: requstoryBE #123.
