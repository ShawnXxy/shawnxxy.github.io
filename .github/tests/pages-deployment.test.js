const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
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
    ['pull_request', 'refs/pull/1/merge', 'skipped', 'success', false],
    ['pull_request', 'refs/heads/main', 'skipped', 'success', false],
    ['push', 'refs/heads/main', 'skipped', 'success', true],
    ['push', 'refs/heads/main', 'success', 'skipped', true],
    ['workflow_dispatch', 'refs/heads/main', 'skipped', 'success', true],
    ['workflow_dispatch', 'refs/heads/main', 'success', 'skipped', true],
    ['push', 'refs/heads/feature', 'skipped', 'success', false],
    ['workflow_dispatch', 'refs/heads/feature', 'skipped', 'success', false],
    ['workflow_dispatch', 'refs/tags/main', 'skipped', 'success', false],
    ['schedule', 'refs/heads/main', 'skipped', 'success', true],
    ['schedule', 'refs/heads/feature', 'skipped', 'success', false],
    ['schedule', 'refs/heads/main', 'skipped', 'failure', false],
    ['schedule', 'refs/heads/main', 'skipped', 'skipped', false],
    ['push', 'refs/heads/main', 'skipped', 'failure', false],
    ['push', 'refs/heads/main', 'failure', 'skipped', false],
    ['workflow_dispatch', 'refs/heads/main', 'skipped', 'skipped', false],
    ['workflow_dispatch', 'refs/heads/main', 'skipped', 'cancelled', false],
];

for (const [eventName, ref, typescriptResult, staticResult, expected] of cases) {
    const actual = runInNewContext(expression, {
        always: () => true,
        github: { event_name: eventName, ref },
        needs: {
            'build-typescript': { result: typescriptResult },
            'deploy-static': { result: staticResult },
        },
    }, { timeout: 1000 });
    assert.equal(actual, expected, `${eventName} ${ref} (${typescriptResult}, ${staticResult})`);
}

console.log(`${cases.length} Pages deployment gate checks passed.`);
