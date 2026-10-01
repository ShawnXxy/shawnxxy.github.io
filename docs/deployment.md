# Deployment

The site is published at [shawnxxy.github.io](https://shawnxxy.github.io/). The [Pages workflow](../.github/workflows/deploy.yml) generates the showcase and uploads `static\` as the site artifact; it does not build the frontend or regenerate language statistics in its normal static path.

## Configure GitHub Pages

In the repository's Settings:

1. Under Pages, select GitHub Actions as the build and deployment source.
2. Under Secrets and variables > Actions, add `AZURE_MAPS_SUBSCRIPTION_KEY` for the contact map.
3. Check that the `github-pages` environment permits deployment from `main`.
4. Configure the [showcase credentials](#showcase-credentials) before publishing.

GitHub supplies `GITHUB_TOKEN` automatically; it does not need a manually created repository secret. The static artifact job declares `contents: read` and `pages: read`; the deployment job declares `pages: write` and `id-token: write`.

Showcase collection uses a short-lived GitHub App installation token generated
for each run, not a stored `GIT_TOKEN` or the automatic workflow token.

During deployment, the workflow substitutes the Azure Maps key into `static\js\env-config.js`. Visitors can read this client-side key; storing it as a GitHub secret keeps it out of source control, not private after publication. Do not commit credentials or upload a local `.env` as site content.

## Publish the site

Push or merge changes into `main` to trigger the normal deployment path.

For a manual deployment, open Actions > Build and Deploy to GitHub Pages > Run workflow, select `main`, and run it. Confirm that `deploy-static` and `deploy` succeed, then open the published site.

Pull requests targeting `main` run `verify`, including the deployment-gate, Profile-title, and showcase checks, without secrets, AI requests, or deployment. Publishing is limited to pushes, manual runs, or the daily schedule on `main` after verification and an artifact job succeed.

To check the deployment gate locally, run `node .github\tests\pages-deployment.test.js` from the repository root with Node.js installed.

Every permitted deployment uses `deploy-static`; commit messages do not select a different build mode.

Manually running this workflow on a non-`main` branch runs the offline checks and
a read-only GitHub App collection check. It does not call Copilot, write a
showcase snapshot, upload a Pages artifact, or deploy. Only repository names,
counts, and the collection window are logged. Pull-request runs do not receive
the app credentials or perform this live check.

## Publish updated language statistics

The [language-data workflow](../.github/workflows/update-language-data.yml), named Update GitHub Language Data, runs on Sundays at `00:00 UTC` (`0 0 * * 0`) and supports manual runs. It passes the automatic `GITHUB_TOKEN` to the generator as `git_token` and commits changed files under `static\data\`.

These automated commits do not trigger the push-based Pages workflow. [GitHub does not start push-triggered workflows for pushes made with `GITHUB_TOKEN`](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow), and the updater does not explicitly request deployment.

To refresh and publish immediately:

1. Run Actions > Update GitHub Language Data on `main`.
2. Wait for it to finish and confirm whether it committed updated data.
3. Run Actions > Build and Deploy to GitHub Pages on `main`.

A later ordinary push to `main` or the daily Pages run also publishes the committed data. Deployment uses the existing language snapshot; it does not fetch new language statistics from GitHub.

For local regeneration, use the [development guide](development.md#regenerate-github-language-statistics), commit the resulting JSON files, and publish through `main`.

## Automated showcase

The showcase uses public GitHub evidence and Copilot CLI to generate
`static/data/github-showcase.json`. The Pages workflow refreshes it daily at
03:17 UTC, on pushes to `main`, and on manual runs from `main`. Generation and
deployment happen in the same workflow; generated data is not committed back
to the repository. Pull requests run the offline checks without credentials,
AI requests, or deployment.

Pinned repositories appear first, including pinned forks. Up to three other
non-archived repositories follow, ordered by fetched default-branch commit author
timestamps or authored PR merge timestamps in the preceding 90 days. Candidate
discovery uses GitHub contribution counts and authored, merged public PRs,
including repositories owned by other users or organizations.
Commit and merged-PR counts remain separate; neither is presented as impact.

Commit pages are collected before selecting the additional repositories, and
only the three newest qualifying commits are retained for each candidate.
Contribution-calendar dates are not used as exact activity timestamps.
Repositories without a qualifying default-branch commit or merged PR are not
selected as additional recent projects; pinned repositories remain eligible.

Each project has a project description and, where supported, a personal
contribution summary with source links. Summaries use repository metadata,
up to 12,000 characters of the README, and at most three recent merged PRs and
three recent default-branch commits attributed to `ShawnXxy`. PR bodies and
commit messages are bounded excerpts. The generator does not claim to inspect
all code or all historical contributions. GitHub contribution counts follow
[GitHub's contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference);
they can exclude fork-only or non-default-branch work. The contribution
summaries describe sampled evidence, not every item included in the counts.

Copilot runs in a temporary, isolated configuration with tools disabled. It
receives public evidence, not GitHub credentials in its prompt. Generated text
is rendered as text rather than HTML. Source references, authorship, visibility,
dates, and output structure are checked, but these checks cannot establish the
truth of every generated sentence. Review the published prose and its sources.

Each Copilot invocation has a three-minute deadline. Timeout, cancellation, and
output-limit failures terminate the owned process tree before temporary files
are removed. If termination fails, the generator reports the failure and keeps
the temporary directory rather than deleting files a process may still use.

The static job has a 60-minute budget. Nine sequential Copilot invocations can
use nearly 27 minutes, leaving the remaining budget for dependency installation,
GitHub collection, caching, and artifact upload.

The Actions cache retains the last successful snapshot. Unchanged evidence and
instructions reuse the existing summary; counts and refresh dates still update.
Cache eviction causes summaries to be generated again. API, authorization,
partial-response, or AI failures fail the refresh before replacing the snapshot
or deploying. The currently published site remains available. Saturated
100-repository commit results or PR searches exceeding 1,000 results fail
explicitly rather than silently truncating coverage.

The checked-in snapshot has no generated content. Until the first successful
refresh, local previews show the maintained `sections.showcase` entries in
`about-content.json` with an explanatory status. A missing or invalid generated
file also shows this fallback. A successfully generated empty snapshot is shown
as empty, not replaced by outdated curated projects. Other profile sections are
not generated or rewritten.

The maintained Profile content renders without waiting for the showcase request.
Showcase loading, including its response body, has a 10-second timeout. A failed
or timed-out request displays the curated fallback with an explanatory status.

### Showcase credentials

1. Add the `COPILOT_GITHUB_TOKEN` Actions repository secret: a fine-grained
   personal access token with the **Copilot Requests** permission and access to
   your Copilot plan. AI requests use that account's allowance or billing.
   See [Copilot CLI authentication](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#copilot-login-options).
2. Set the repository Actions variable `SHOWCASE_APP_CLIENT_ID` to the GitHub
   App's Client ID and the repository Actions secret `SHOWCASE_APP_PRIVATE_KEY`
   to its complete PEM private key. Install the app on the repository owner's
   account with Contents and Pull requests permissions set to read-only.
   Obtain any required repository or organization approval; registration alone
   does not prove access to the collector's GraphQL and REST queries.
3. Before switching production credentials, manually run **Build and Deploy to
   GitHub Pages** on the branch containing the app integration. The read-only
   collection check exercises pinned repositories, contribution counts, merged
   PR search, README reads, and commit history without publishing or using
   Copilot. Resolve access failures rather than treating them as no activity.
4. Configure GitHub Pages to use GitHub Actions, then run the workflow on `main`
   after merging. Production preflight requires the app variable, app private
   key, and Copilot credential before installation or generation. Missing
   configuration fails deployment instead of silently skipping generation.

The workflow uses `actions/create-github-app-token@v3` to mint a token immediately
before collection, with read-only Contents and Pull requests permissions.
The token covers the owner's installation grants, expires after one hour, and
is revoked by the action when the job ends. It is not saved as a repository
secret or cached. `COPILOT_GITHUB_TOKEN` remains separate and retains its own
expiration requirements. Protect and rotate the app private key as required.

The workflow installs Copilot CLI `1.0.90` with Node.js 22. Its daily schedule is
not a real-time guarantee; GitHub can delay runs or disable a public repository's
schedule after 60 days without repository activity. Manual runs remain available.

For local generation and checks, see [Development](development.md#regenerate-github-showcase).

[Website introduction](../README.md) | [Development](development.md)
