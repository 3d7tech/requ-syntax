# Create the npm token

1. Sign in at https://www.npmjs.com/ with the account that can publish under `@requstory`. If the scope does not exist yet, create the `requstory` organisation first and give your account publishing rights.
2. Open your avatar → **Access Tokens** → **Generate New Token**.
3. Name it `requ-syntax-github` and choose a short expiry, such as 30 days.
4. Under **Packages and scopes**, choose **Read and write (stage only)**, then select the `@requstory` scope. This must cover the new core, cli and web packages, not only existing packages.
5. Leave **Bypass two-factor authentication** off. Leave organisation-management permissions at **No access**; these are separate from package rights.
6. Generate the token and copy it once. Do not paste it into chat or commit it.
7. Open https://github.com/3d7tech/requ-syntax/settings/secrets/actions → **New repository secret**.
8. Name the secret **NPM_TOKEN**, paste the token as its value, and save. Tell me “token saved”.

The release workflow uses the `npm-release` environment and can read this repository secret. It stages packages through GitHub Actions; a maintainer then reviews and approves them in npm with 2FA. Adding a secret does not publish anything.

Official npm instructions: https://docs.npmjs.com/creating-and-viewing-access-tokens/
