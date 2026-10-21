# Create the npm token

1. Sign in at https://www.npmjs.com/ with the account that can publish under `@requstory`. If the scope does not exist yet, create the `requstory` organisation first and give your account publishing rights.
2. Open your avatar → **Access Tokens** → **Generate New Token** → **Granular Access Token**.
3. Name it `requ-syntax-github` and choose a short expiry, such as 30 days.
4. Under **Packages and scopes**, choose **Read and write (publish and stage)**, then select the `@requstory` scope. This must cover the new core, cli and web packages, not only existing packages.
5. Enable **Bypass two-factor authentication** for unattended Actions publishing. Leave organisation-management permissions at **No access**; these are separate from package rights.
6. Generate the token and copy it once. Do not paste it into chat or commit it.
7. Open https://github.com/3d7tech/requ-syntax/settings/secrets/actions → **New repository secret**.
8. Name the secret **NPM_TOKEN**, paste the token as its value, and save. Tell me “token saved”.

The release workflow uses the `npm-release` environment and can read this repository secret. Package publishing is still pending; adding a secret does not publish anything. The reviewed release must pass CI, then be tagged and published through Actions.

Official npm instructions: https://docs.npmjs.com/creating-and-viewing-access-tokens/
