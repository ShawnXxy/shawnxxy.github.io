const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const workflow = readFileSync(path.join(__dirname, '..', 'workflows', 'deploy.yml'), 'utf8');
const deployJob = workflow.split(/^  deploy:\r?$/m)[1];
assert.ok(deployJob, 'The deploy job must exist');
const condition = deployJob.match(/^    if: (.*(?:\r?\n {6}.+)*)/m);
assert.ok(condition, 'The deploy job must have a condition');

// ponytail: handles this boolean if scalar; use an Actions parser for richer expressions.
const expression = condition[1]
    .replace(/^>-\s*/, '')
    .replace(/needs\.([\w-]+)/g, "needs['$1']");

const cases = [
    ['pull_request', 'refs/pull/1/merge', 'success', false],
    ['pull_request', 'refs/heads/main', 'success', false],
    ['push', 'refs/heads/main', 'success', true],
    ['workflow_dispatch', 'refs/heads/main', 'success', true],
    ['push', 'refs/heads/feature', 'success', false],
    ['workflow_dispatch', 'refs/heads/feature', 'success', false],
    ['workflow_dispatch', 'refs/tags/main', 'success', false],
    ['schedule', 'refs/heads/main', 'success', true],
    ['schedule', 'refs/heads/feature', 'success', false],
    ['schedule', 'refs/heads/main', 'failure', false],
    ['schedule', 'refs/heads/main', 'skipped', false],
    ['push', 'refs/heads/main', 'failure', false],
    ['push', 'refs/heads/main', 'skipped', false],
    ['workflow_dispatch', 'refs/heads/main', 'skipped', false],
    ['workflow_dispatch', 'refs/heads/main', 'cancelled', false],
];

for (const [eventName, ref, staticResult, expected] of cases) {
    const actual = runInNewContext(expression, {
        github: { event_name: eventName, ref },
        needs: {
            'deploy-static': { result: staticResult },
        },
    }, { timeout: 1000 });
    assert.equal(actual, expected, `${eventName} ${ref} (${staticResult})`);
}

console.log(`${cases.length} Pages deployment gate checks passed.`);

test('main push messages cannot bypass showcase generation', () => {
    const staticJob = workflow.split(/^  deploy-static:\r?$/m)[1].split(/^  deploy:\r?$/m)[0];
    const condition = staticJob.match(/^    if: (.*(?:\r?\n {6}.+)*)/m);
    assert.ok(condition, 'Static generation must have a production gate');
    const expression = condition[1].trim()
        .replace(/^>-\s*/, '')
        .replace(/^\$\{\{\s*|\s*\}\}$/g, '');
    for (const message of ['Update profile', '[ts] Update profile', '[typescript] Update profile']) {
        const actual = runInNewContext(expression, {
            github: { ref: 'refs/heads/main', event_name: 'push', event: { head_commit: { message } } },
            contains: (value, needle) => String(value || '').includes(needle)
        });
        assert.equal(actual, true, `Showcase generation must run for ${message}`);
    }
    for (const [eventName, ref] of cases) {
        const actual = runInNewContext(expression, { github: { event_name: eventName, ref } });
        const expected = ref === 'refs/heads/main' && ['push', 'workflow_dispatch', 'schedule'].includes(eventName);
        assert.equal(actual, expected, `Generation gate for ${eventName} ${ref}`);
    }
    assert.doesNotMatch(workflow, /^  build-typescript:/m, 'There must not be an alternate artifact path');
    assert.match(deployJob, /^    needs: deploy-static\r?$/m);
    const generate = staticJob.indexOf('run: npm run build-showcase');
    const upload = staticJob.indexOf('uses: actions/upload-pages-artifact@');
    assert.ok(generate >= 0 && upload > generate, 'Generate showcase content before uploading the Pages artifact');
});

test('the static job allows a cold-cache refresh plus setup and artifact work', () => {
    const staticJob = workflow.split(/^  deploy-static:\r?$/m)[1].split(/^  deploy:\r?$/m)[0];
    const minutes = Number(staticJob.match(/^    timeout-minutes: (\d+)/m)?.[1]);
    assert.ok(minutes >= 60, 'Allow at least 60 minutes for nine three-minute summaries and the other job steps');
});

test('showcase preflight requires app credentials and keeps Copilot authentication separate', () => {
    const preflight = workflow.match(/    - name: Check (?:Copilot|showcase) credentials\r?\n([\s\S]*?)(?=\r?\n    - name:)/)?.[1];
    assert.ok(preflight, 'A credential preflight must precede generation');
    assert.match(preflight, /SHOWCASE_APP_CLIENT_ID: \$\{\{ vars\.SHOWCASE_APP_CLIENT_ID \}\}/);
    assert.match(preflight, /SHOWCASE_APP_PRIVATE_KEY: \$\{\{ secrets\.SHOWCASE_APP_PRIVATE_KEY \}\}/);
    assert.match(preflight, /COPILOT_GITHUB_TOKEN: \$\{\{ secrets\.COPILOT_GITHUB_TOKEN \}\}/);
    assert.doesNotMatch(workflow, /secrets\.GIT_TOKEN\b/);
    assert.match(workflow, /GH_TOKEN: \$\{\{ steps\.showcase-app-token\.outputs\.token \}\}/);
    const script = preflight.match(/node <<'NODE'\r?\n([\s\S]*?)\r?\n        NODE/)?.[1];
    assert.ok(script, 'The preflight must have an executable credential check');
    const credentials = {
        SHOWCASE_APP_CLIENT_ID: 'client-test-value',
        SHOWCASE_APP_PRIVATE_KEY: 'key-test-value',
        COPILOT_GITHUB_TOKEN: 'copilot-test-value'
    };
    const environments = [{}, credentials, ...Object.keys(credentials).map(name => ({ ...credentials, [name]: '' }))];
    for (const env of environments) {
        const missing = Object.keys(credentials).filter(name => !env[name]);
        const process = { env, exitCode: 0 };
        const messages = [];
        runInNewContext(script, { process, console: { error: message => messages.push(message) } });
        assert.equal(process.exitCode, missing.length ? 1 : 0);
        for (const name of missing) assert.ok(messages.some(message => message.includes(name)));
        assert.ok(messages.every(message => !message.includes('test-value')));
    }
});

test('production mints a read-only app token immediately before collection', () => {
    const staticJob = workflow.split(/^  deploy-static:\r?$/m)[1].split(/^  deploy:\r?$/m)[0];
    const tokenStep = staticJob.match(/    - name: Create GitHub App token\r?\n([\s\S]*?)(?=\r?\n    - name:)/)?.[1];
    assert.ok(tokenStep, 'The workflow must mint an installation token instead of storing one');
    assert.match(tokenStep, /id: showcase-app-token/);
    assert.match(tokenStep, /uses: actions\/create-github-app-token@v3/);
    assert.match(tokenStep, /client-id: \$\{\{ vars\.SHOWCASE_APP_CLIENT_ID \}\}/);
    assert.match(tokenStep, /private-key: \$\{\{ secrets\.SHOWCASE_APP_PRIVATE_KEY \}\}/);
    assert.match(tokenStep, /owner: \$\{\{ github\.repository_owner \}\}/);
    assert.match(tokenStep, /permission-contents: read/);
    assert.match(tokenStep, /permission-pull-requests: read/);
    assert.doesNotMatch(tokenStep, /permission-[\w-]+: write|skip-token-revoke/);
    assert.ok(staticJob.indexOf('Restore the last generated showcase') < staticJob.indexOf('Create GitHub App token'));
    assert.ok(staticJob.indexOf('Create GitHub App token') < staticJob.indexOf('Generate public project'));
});

test('live app-access verification is manual, non-main, read-only and never uses Copilot', () => {
    const verifyJob = workflow.split(/^  verify:\r?$/m)[1].split(/^  deploy-static:\r?$/m)[0];
    const diagnostics = [
        verifyJob.match(/    - name: Create app token for access check\r?\n([\s\S]*?)(?=\r?\n    - name:)/)?.[1],
        verifyJob.match(/    - name: Verify GitHub App public data access\r?\n([\s\S]*)/)?.[1]
    ];
    for (const step of diagnostics) {
        assert.ok(step, 'Both token creation and collection must be gated');
        const expression = step.match(/^      if: (.*(?:\r?\n {8}.+)*)/m)?.[1].replace(/^>-\s*/, '');
        assert.ok(expression);
        for (const [event, ref, expected] of [
            ['workflow_dispatch', 'refs/heads/feature', true],
            ['workflow_dispatch', 'refs/heads/main', false],
            ['workflow_dispatch', 'refs/tags/test', false],
            ['pull_request', 'refs/heads/feature', false],
            ['pull_request', 'refs/pull/4/merge', false],
            ['push', 'refs/heads/feature', false],
            ['schedule', 'refs/heads/main', false]
        ]) {
            assert.equal(runInNewContext(expression, {
                github: { event_name: event, ref },
                startsWith: (value, prefix) => value.startsWith(prefix)
            }), expected, `${event} ${ref}`);
        }
    }
    assert.match(diagnostics[0], /uses: actions\/create-github-app-token@v3/);
    assert.match(diagnostics[0], /permission-contents: read/);
    assert.match(diagnostics[0], /permission-pull-requests: read/);
    assert.match(diagnostics[1], /GH_TOKEN: \$\{\{ steps\.check-app-token\.outputs\.token \}\}/);
    assert.match(diagnostics[1], /collectProjects\(\)/);
    assert.doesNotMatch(verifyJob, /COPILOT_GITHUB_TOKEN|build-showcase|refreshShowcase|upload-pages-artifact|deploy-pages@/);
});
