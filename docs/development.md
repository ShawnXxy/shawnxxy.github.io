# Development

Edit the files in `static\` directly. The frontend uses HTML, CSS, and ordinary browser scripts with jQuery and Bootstrap; there is no frontend build step.

## Preview locally

With Git and Python 3 installed, run these PowerShell commands:

```powershell
git clone https://github.com/ShawnXxy/shawnxxy.github.io.git
Set-Location shawnxxy.github.io
python -m http.server 8000 --bind 127.0.0.1 --directory .\static
```

If you already have a checkout, run only the server command from its root. Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) and refresh after edits. Stop the server with Ctrl+C.

Serve `static\` as the web root rather than opening `index.html` directly. Node.js and GitHub credentials are not needed to preview the profile or committed language statistics. Without Azure Maps configuration, the contact map displays an error.

## Edit content and appearance

| Location | What to edit |
|---|---|
| `static\data\about-content.json` | Profile section headings, introduction, personal information, know-how, project showcase, work experience, education, and text-styling rules. |
| `static\index.html` | Page structure, landing-page identity, social links, resume link, other headings, and Contact-panel details. |
| `static\css\style.css` and `static\css\responsive.css` | Appearance and responsive layout. |
| `static\js\` | Profile rendering, navigation, greeting, language-statistics display, and map behavior. |
| `static\images\` and `static\downloadable\` | Images and downloadable files. |

All six Profile headings, including Know-how, are defined in `sections.titles`.
Edit those strings to rename headings; `ContentManager` renders them on page load.
Their HTML elements contain only `data-section-title` keys. Education, showcase,
and experience entries keep their existing JSON structure.

With Node.js installed, run the heading regression check with `node .\tests\profile-titles.test.js`.
The static deployment job also runs this check before uploading the site.

The content JSON is revalidated on every page load. The renderer's script URL
includes a source hash to avoid loading an older cached renderer. If you edit
`static\js\content-manager.js`, update its `v` value in `static\index.html` to the
hash reported by the heading check.

Contact details appear in both the profile JSON and `index.html`; editing one does not update the other. Map coordinates and controls are configured separately in `static\js\azure-maps-integration.js`.

## Regenerate GitHub language statistics

This step requires Node.js `>=18.0.0`, npm, and a GitHub token. Set `git_token` in the repository-root `.env` file or in the shell environment; [`.env.example`](../.env.example) lists the configuration names. The Azure Maps key is not needed for this step.

From the repository root, run:

```powershell
npm ci
npm run build-languages
```

The generator uses `@octokit/core` and `dotenv` and writes:

- `static\data\github-languages.json`: the language percentages loaded by the website.
- `static\data\github-languages-detailed.json`: repository metadata and per-repository language data for reference.

The generator requests up to 100 public repositories owned by `ShawnXxy`, excludes forks, and aggregates language byte counts. It keeps at most eight languages with at least 1% each. Individual language-request failures are logged and skipped, so review the output before committing refreshed data.

The generator logs a token prefix; redact it before sharing console output. Keep `git_token` out of `static\` and never commit credentials. See [Deployment](deployment.md) for publishing the generated files.

## Preview Azure Maps

For an optional local map preview, create a temporary `static\.env` containing only:

```dotenv
AZURE_MAPS_SUBSCRIPTION_KEY=your_azure_maps_key_here
```

Replace the placeholder with your Azure Maps subscription key, then use the Python server above. On `localhost` or `127.0.0.1`, the browser reads this file over HTTP. The repository-root `.env` is outside that server's document root.

Do not copy the root `.env` into `static\` or put `git_token` in the served file. The map key is visible to the browser, even though `.env` is ignored by Git. Remove the temporary file after previewing.

Use the direct Python server rather than `.\dev.ps1 static`. The existing helper can copy `git_token` into the served directory, and its cleanup paths can leave injected configuration and `.env` behind.

[Website introduction](../README.md) | [Deployment](deployment.md)
