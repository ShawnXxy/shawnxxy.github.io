# Deployment

The site is published at [shawnxxy.github.io](https://shawnxxy.github.io/). The [Pages workflow](../.github/workflows/deploy.yml) uploads `static\` as the site artifact; it does not build the frontend or regenerate language statistics in its normal static path.

## Configure GitHub Pages

In the repository's Settings:

1. Under Pages, select GitHub Actions as the build and deployment source.
2. Under Secrets and variables > Actions, add `AZURE_MAPS_SUBSCRIPTION_KEY` for the contact map.
3. Check that the `github-pages` environment permits deployment from `main`.

GitHub supplies `GITHUB_TOKEN` automatically; it does not need a manually created repository secret. The Pages workflow declares `contents: read`, `pages: write`, and `id-token: write`.

During deployment, the workflow substitutes the Azure Maps key into `static\js\env-config.js`. Visitors can read this client-side key; storing it as a GitHub secret keeps it out of source control, not private after publication. Do not commit credentials or upload a local `.env` as site content.

## Publish the site

Push or merge changes into `main` to trigger the normal deployment path.

For a manual deployment, open Actions > Build and Deploy to GitHub Pages > Run workflow, select `main`, and run it. Confirm that `deploy-static` and `deploy` succeed, then open the published site.

The workflow also runs for pull requests targeting `main`. Those runs include the deployment job rather than a separate preview-only path; environment restrictions and secret availability can prevent deployment. Do not treat this workflow as validation-only for pull requests.

Avoid `[typescript]` and `[ts]` in push commit messages. Those tags select the legacy `build-typescript` job, which calls `npm run build`; the repository has no such npm script or implemented TypeScript toolchain.

## Publish updated language statistics

The [language-data workflow](../.github/workflows/update-language-data.yml), named Update GitHub Language Data, runs on Sundays at `00:00 UTC` (`0 0 * * 0`) and supports manual runs. It passes the automatic `GITHUB_TOKEN` to the generator as `git_token` and commits changed files under `static\data\`.

These automated commits do not trigger the push-based Pages workflow. [GitHub does not start push-triggered workflows for pushes made with `GITHUB_TOKEN`](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow), and the updater does not explicitly request deployment.

To refresh and publish immediately:

1. Run Actions > Update GitHub Language Data on `main`.
2. Wait for it to finish and confirm whether it committed updated data.
3. Run Actions > Build and Deploy to GitHub Pages on `main`.

A later ordinary push to `main` also publishes the committed data. Deploying alone uses the existing JSON snapshot; it does not fetch new statistics from GitHub.

For local regeneration, use the [development guide](development.md#regenerate-github-language-statistics), commit the resulting JSON files, and publish through `main`.

[Website introduction](../README.md) | [Development](development.md)
