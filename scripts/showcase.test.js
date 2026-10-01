const assert = require('node:assert/strict');
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { setTimeout: delay } = require('node:timers/promises');
const {
    collectProjects,
    buildSnapshot,
    refreshShowcase,
    githubRequest,
    parseCopilotOutput,
    summarizeWithCopilot
} = require('./generate-showcase-data');

const now = new Date('2026-10-01T05:00:00Z');
const repository = (name, extra = {}) => ({
    nameWithOwner: name,
    url: `https://github.com/${name}`,
    description: 'A command-line documentation tool.',
    isPrivate: false,
    isFork: false,
    isArchived: false,
    isEmpty: false,
    ...extra
});
const pullRequest = (repo, number, mergedAt) => ({
    number,
    title: 'Add command-line documentation',
    user: { login: 'ShawnXxy' },
    repository_url: `https://api.github.com/repos/${repo}`,
    pull_request: { merged_at: mergedAt }
});
const authoredCommit = (repo, date, sha = 'a'.repeat(40)) => ({
    sha, html_url: `https://github.com/${repo}/commit/${sha}`,
    author: { login: 'ShawnXxy' },
    commit: { message: 'Update command-line documentation', author: { date }, committer: { date } }
});

async function publicGitHub(endpoint, options = {}) {
    if (endpoint === '/graphql') {
        return { data: { user: {
            pinnedItems: { nodes: [
                repository('ShawnXxy/pinned', { isFork: true }),
                repository('ShawnXxy/private', { isPrivate: true })
            ] },
            contributionsCollection: {
                commitContributionsByRepository: [{
                    repository: repository('ShawnXxy/active'),
                    contributions: {
                        totalCount: 8,
                        nodes: [{ occurredAt: '2026-09-20T07:00:00Z' }],
                        pageInfo: { hasNextPage: false }
                    }
                }]
            }
        } } };
    }
    if (endpoint === '/search/issues') {
        return {
            total_count: 2,
            incomplete_results: false,
            items: options.params.page === 1
                ? [pullRequest('community/tools', 12, '2026-09-30T12:00:00Z')]
                : [pullRequest('ShawnXxy/pinned', 2, '2026-09-29T12:00:00Z')]
        };
    }
    if (endpoint === '/repos/community/tools') {
        return {
            full_name: 'community/tools',
            html_url: 'https://github.com/community/tools',
            description: 'A command-line documentation tool.',
            private: false, fork: false, archived: false
        };
    }
    if (endpoint.endsWith('/readme')) {
        return null;
    }
    if (endpoint.endsWith('/commits')) {
        return endpoint === '/repos/ShawnXxy/active/commits'
            ? [authoredCommit('ShawnXxy/active', '2026-09-20T12:00:00Z')] : [];
    }
    if (endpoint.includes('/pulls/')) {
        const [, repo, number] = endpoint.match(/^\/repos\/(.+)\/pulls\/(\d+)$/);
        return {
            number: Number(number),
            title: 'Add command-line documentation',
            body: 'Document the existing command-line options.',
            html_url: `https://github.com/${repo}/pull/${number}`,
            user: { login: 'ShawnXxy' },
            merged_at: repo === 'community/tools'
                ? '2026-09-30T12:00:00Z' : '2026-09-29T12:00:00Z',
            base: { repo: { private: false, full_name: repo } }
        };
    }
    throw new Error(`Unexpected request: ${endpoint}`);
}

function summarize(evidence) {
    const source = evidence.sources.find(item => item.kind === 'contribution');
    return JSON.stringify({
        description: 'A command-line documentation tool.',
        descriptionSourceIds: ['repository'],
        contribution: source ? 'Submitted command-line documentation.' : '',
        contributionSourceIds: source ? [source.id] : []
    });
}

test('selects public pins and personal activity, including forks and external PRs', async () => {
    const collection = await collectProjects(publicGitHub, now);
    assert.deepEqual(collection.projects.map(project => project.title), [
        'ShawnXxy/pinned', 'community/tools', 'ShawnXxy/active'
    ]);
    assert.equal(collection.projects[0].pinned, true);
    assert.equal(collection.projects[0].isFork, true);
    assert.equal(collection.projects[0].mergedPrCount, 1);
    assert.equal(collection.projects[2].commitCount, 8);
    assert.equal(collection.projects[1].evidence.sources.at(-1).url,
        'https://github.com/community/tools/pull/12');
    assert.equal(collection.windowStart, '2026-07-03T05:00:00.000Z');
});

test('bounds merged PR search with one inclusive range qualifier', async () => {
    let query;
    await collectProjects(async (endpoint, options) => {
        if (endpoint === '/search/issues') query = options.params.q;
        return publicGitHub(endpoint, options);
    }, now);
    assert.equal(query,
        'is:pr is:public author:ShawnXxy is:merged merged:2026-07-03T05:00:00.000Z..2026-10-01T05:00:00.000Z');
});

test('refuses partial activity rather than publishing a misleading complete snapshot', async () => {
    await assert.rejects(collectProjects(async endpoint => {
        if (endpoint === '/graphql') {
            return { data: { user: null }, errors: [{ message: 'SAML authorization required' }] };
        }
        throw new Error('Must stop after GraphQL errors');
    }, now), /SAML authorization required/);
    await assert.rejects(collectProjects(async (endpoint, options) => {
        if (endpoint === '/search/issues') {
            return { incomplete_results: true, total_count: 0, items: [] };
        }
        return publicGitHub(endpoint, options);
    }, now), /incomplete/i);
    await assert.rejects(collectProjects(async (endpoint, options) => {
        if (endpoint === '/search/issues') {
            return { incomplete_results: false, total_count: 1001, items: [] };
        }
        return publicGitHub(endpoint, options);
    }, now), /1,000|1000/);
});

test('keeps an empty pinned repository without requesting nonexistent commit history', async () => {
    const collection = await collectProjects(async (endpoint, options) => {
        if (endpoint === '/repos/ShawnXxy/pinned/commits') throw new Error('Empty repository has no commit history');
        const result = await publicGitHub(endpoint, options);
        if (endpoint === '/graphql') result.data.user.pinnedItems.nodes[0].isEmpty = true;
        if (endpoint === '/search/issues') return { total_count: 0, incomplete_results: false, items: [] };
        return result;
    }, now);
    assert.equal(collection.projects[0].title, 'ShawnXxy/pinned');
    assert.equal(collection.projects[0].evidence.sources.length, 1);
    const snapshot = await buildSnapshot(collection, null, summarize);
    assert.equal(snapshot.projects[0].contribution, '');
});

test('caps additional projects at three by personal recency and excludes archived candidates', async () => {
    const collection = await collectProjects(async (endpoint, options) => {
        const recent = endpoint.match(/^\/repos\/ShawnXxy\/recent-(\d+)\/commits$/);
        if (recent) {
            return [authoredCommit(`ShawnXxy/recent-${recent[1]}`, `2026-09-${29 - Number(recent[1])}T12:00:00Z`)];
        }
        const result = await publicGitHub(endpoint, options);
        if (endpoint === '/graphql') {
            for (let index = 0; index < 5; index += 1) {
                result.data.user.contributionsCollection.commitContributionsByRepository.push({
                    repository: repository(`ShawnXxy/recent-${index}`, { isArchived: index === 0 }),
                    contributions: {
                        totalCount: index + 1,
                        nodes: [{ occurredAt: `2026-09-${29 - index}T07:00:00Z` }],
                        pageInfo: { hasNextPage: false }
                    }
                });
            }
        }
        return result;
    }, now);
    assert.deepEqual(collection.projects.map(project => project.title), [
        'ShawnXxy/pinned', 'community/tools', 'ShawnXxy/recent-1', 'ShawnXxy/recent-2'
    ]);
});

test('resolves actual commit times before the recent-project cutoff and reuses the fetched evidence', async () => {
    const times = { alpha: '07:00:00', beta: '09:00:00', gamma: '08:00:00', latest: '23:00:00' };
    const requests = [];
    const collection = await collectProjects(async (endpoint, options) => {
        requests.push(endpoint);
        if (endpoint === '/graphql') {
            return { data: { user: {
                pinnedItems: { nodes: [repository('ShawnXxy/pinned')] },
                contributionsCollection: { commitContributionsByRepository: Object.keys(times).map(name => ({
                    repository: repository(`ShawnXxy/${name}`),
                    contributions: {
                        totalCount: 1, nodes: [{ occurredAt: '2026-09-30T00:00:00Z' }],
                        pageInfo: { hasNextPage: false }
                    }
                })) }
            } } };
        }
        if (endpoint === '/search/issues') return { total_count: 0, incomplete_results: false, items: [] };
        const name = endpoint.match(/^\/repos\/ShawnXxy\/([^/]+)\/commits$/)?.[1];
        if (name && times[name]) return [authoredCommit(`ShawnXxy/${name}`, `2026-09-30T${times[name]}Z`)];
        return publicGitHub(endpoint, options);
    }, now);
    assert.deepEqual(collection.projects.map(project => project.title), [
        'ShawnXxy/pinned', 'ShawnXxy/latest', 'ShawnXxy/beta', 'ShawnXxy/gamma'
    ]);
    for (const name of Object.keys(times)) {
        assert.equal(requests.filter(endpoint => endpoint === `/repos/ShawnXxy/${name}/commits`).length, 1);
    }
    assert.equal(requests.includes('/repos/ShawnXxy/alpha/readme'), false);
    assert.equal(collection.projects[1].lastContributionAt, '2026-09-30T23:00:00Z');
});

test('finds the latest authored commits across pages even when rebased commits appear first', async () => {
    const commits = Array.from({ length: 100 }, (_, index) => {
        const commit = authoredCommit('ShawnXxy/active', '2026-09-20T12:00:00Z', index.toString(16).padStart(40, '0'));
        commit.commit.committer.date = '2026-10-01T04:00:00Z';
        return commit;
    });
    commits.push(authoredCommit('ShawnXxy/active', '2026-09-30T23:00:00Z', 'f'.repeat(40)));
    const collection = await collectProjects(async (endpoint, options) => {
        if (endpoint === '/repos/ShawnXxy/active/commits') {
            const offset = ((options.params.page || 1) - 1) * options.params.per_page;
            return commits.slice(offset, offset + options.params.per_page);
        }
        const result = await publicGitHub(endpoint, options);
        if (endpoint === '/graphql') {
            result.data.user.contributionsCollection.commitContributionsByRepository[0].contributions.totalCount = 101;
        }
        return result;
    }, now);
    const active = collection.projects.find(project => project.title === 'ShawnXxy/active');
    assert.equal(collection.projects[1].title, 'ShawnXxy/active');
    assert.equal(active.lastContributionAt, '2026-09-30T23:00:00Z');
    const sources = active.evidence.sources.filter(source => source.kind === 'contribution');
    assert.equal(sources.length, 3);
    assert.equal(sources[0].id, `commit-${'f'.repeat(40)}`);
});

test('does not substitute calendar buckets for missing commit timestamps or accept repeated pages', async () => {
    const collection = await collectProjects(async (endpoint, options) => {
        if (endpoint.endsWith('/commits')) return [];
        return publicGitHub(endpoint, options);
    }, now);
    assert.deepEqual(collection.projects.map(project => project.title), ['ShawnXxy/pinned', 'community/tools']);
    await assert.rejects(collectProjects(async (endpoint, options) => {
        if (endpoint === '/repos/ShawnXxy/active/commits') {
            return Array.from({ length: options.params.per_page }, (_, index) =>
                authoredCommit('ShawnXxy/active', '2026-09-20T12:00:00Z', index.toString(16).padStart(40, '0')));
        }
        return publicGitHub(endpoint, options);
    }, now), /repeated a page/);
});

test('reuses unchanged summaries but refreshes changed evidence and keeps source links', async () => {
    const collection = await collectProjects(publicGitHub, now);
    let calls = 0;
    const generate = async evidence => { calls += 1; return summarize(evidence); };
    const first = await buildSnapshot(collection, null, generate);
    assert.equal(calls, 3);
    assert.deepEqual(first.projects[2].contributionSourceIds, [`commit-${'a'.repeat(40)}`]);
    assert.ok(first.projects[0].sources.every(source => !('text' in source)));

    collection.generatedAt = '2026-10-02T05:00:00.000Z';
    const second = await buildSnapshot(collection, first, generate);
    assert.equal(calls, 3);
    assert.equal(second.generatedAt, collection.generatedAt);
    assert.equal(second.projects[0].summaryGeneratedAt, first.generatedAt);

    collection.projects[0].evidence.sources[0].text += ' Now supports a new option.';
    const third = await buildSnapshot(collection, second, generate);
    assert.equal(calls, 4);
    assert.equal(third.projects[0].summaryGeneratedAt, collection.generatedAt);
});

test('rejects invented or misattributed sources without replacing the previous file', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'showcase-test-'));
    const outputPath = path.join(directory, 'github-showcase.json');
    try {
        const first = await refreshShowcase({
            request: publicGitHub, summarize, now, outputPath
        });
        const original = readFileSync(outputPath, 'utf8');
        const changed = async (endpoint, options) => {
            const result = await publicGitHub(endpoint, options);
            if (endpoint === '/graphql') {
                result.data.user.pinnedItems.nodes[0].description = 'Updated project documentation.';
            }
            return result;
        };
        await assert.rejects(refreshShowcase({
            request: changed, now, outputPath,
            summarize: async () => JSON.stringify({
                description: 'A documentation tool.',
                descriptionSourceIds: ['repository'],
                contribution: 'Built the entire project.',
                contributionSourceIds: ['repository']
            })
        }), /contribution.*source/i);
        assert.equal(readFileSync(outputPath, 'utf8'), original);
        await assert.rejects(refreshShowcase({
            request: changed, now, outputPath,
            summarize: async () => { throw new Error('Copilot unavailable'); }
        }), /Copilot unavailable/);
        assert.equal(readFileSync(outputPath, 'utf8'), original);
        assert.equal(first.projects.length, 3);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test('does not turn API failures into empty public data', async t => {
    t.mock.method(global, 'fetch', async () => new Response('Forbidden', { status: 403 }));
    const previous = process.env.GH_TOKEN;
    process.env.GH_TOKEN = 'test-only-token';
    try {
        await assert.rejects(githubRequest('/repos/community/tools'), /403/);
    } finally {
        if (previous === undefined) delete process.env.GH_TOKEN;
        else process.env.GH_TOKEN = previous;
    }
});

test('reads unwrapped CLI JSON events and rejects tool use or failed runs', () => {
    const content = JSON.stringify({
        description: 'A command-line tool that converts Markdown documentation to HTML.',
        descriptionSourceIds: ['repository'], contribution: '', contributionSourceIds: []
    });
    const events = [
        { type: 'assistant.message', data: { content, toolRequests: [] } },
        { type: 'result', exitCode: 0 }
    ];
    const output = events.map(event => JSON.stringify(event)).join('\n');
    assert.equal(parseCopilotOutput(output), content);
    events[0].data.toolRequests.push({ name: 'powershell' });
    assert.throws(() => parseCopilotOutput(events.map(event => JSON.stringify(event)).join('\n')), /tool/i);
    assert.throws(() => parseCopilotOutput('{"type":"result","exitCode":1}'), /failed|unsuccessful/i);
});

test('browser loader distinguishes generated, pending, empty and invalid snapshots', async () => {
    const snapshot = await buildSnapshot(await collectProjects(publicGitHub, now), null, summarize);
    const context = {
        window: {},
        document: { addEventListener() {} },
        console: { log() {}, error() {} },
        URL,
        AbortController, setTimeout, clearTimeout,
        fetch: async () => ({ ok: true, json: async () => snapshot })
    };
    vm.runInNewContext(readFileSync(path.join(__dirname, '../static/js/content-manager.js'), 'utf8'), context);
    const manager = new context.window.ContentManager();
    await manager.loadShowcaseData();
    assert.equal(manager.showcaseData.projects.length, 3);

    context.fetch = async () => ({
        ok: true, json: async () => ({ ...snapshot, generatedAt: null, projects: [] })
    });
    await manager.loadShowcaseData();
    assert.equal(manager.showcaseData, null);
    assert.match(manager.showcaseMessage, /curated/i);

    context.fetch = async () => ({ ok: true, json: async () => ({ ...snapshot, projects: [] }) });
    await manager.loadShowcaseData();
    assert.equal(manager.showcaseData.projects.length, 0);

    snapshot.projects[0].sources[0].url = 'javascript:alert(1)';
    context.fetch = async () => ({ ok: true, json: async () => snapshot });
    await manager.loadShowcaseData();
    assert.equal(manager.showcaseData, null);
    assert.match(manager.showcaseMessage, /unavailable/i);
});

test('renders the maintained Profile while showcase loading is pending, then updates it', async () => {
    const profile = JSON.parse(readFileSync(path.join(__dirname, '../static/data/about-content.json'), 'utf8'));
    const snapshot = await buildSnapshot(await collectProjects(publicGitHub, now), null, summarize);
    let finishShowcase;
    const context = {
        window: {}, document: { addEventListener() {} },
        console: { log() {}, error() {} }, URL, AbortController, clearTimeout,
        setTimeout: (callback, delay) => delay === 500 ? callback() : setTimeout(callback, delay),
        fetch: async url => url.includes('github-showcase')
            ? new Promise(resolve => { finishShowcase = resolve; })
            : { ok: true, json: async () => profile }
    };
    vm.runInNewContext(readFileSync(path.join(__dirname, '../static/js/content-manager.js'), 'utf8'), context);
    const manager = new context.window.ContentManager();
    const rendered = [];
    for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(manager))) {
        if (method.startsWith('render')) manager[method] = () => rendered.push(method);
    }
    const initializing = manager.init();
    try {
        await new Promise(setImmediate);
        assert.ok(manager.contentData);
        assert.ok(rendered.includes('renderSectionTitles'));
        assert.ok(rendered.includes('renderWhoAmISection'));
        assert.ok(rendered.includes('renderExperienceSection'));
        assert.ok(rendered.includes('renderEducationSection'));
        assert.equal(manager.showcaseData, null);
    } finally {
        finishShowcase({ ok: true, json: async () => snapshot });
        await initializing;
        await new Promise(setImmediate);
    }
    assert.equal(manager.showcaseData.projects.length, 3);
    assert.equal(rendered.at(-1), 'renderShowcaseSection');
});

test('bounds both showcase request and response-body loading and clears the timer', async () => {
    for (const pending of ['request', 'body']) {
        let expire;
        let cleared = false;
        let signal;
        const context = {
            window: {}, document: { addEventListener() {} },
            console: { log() {}, error() {} }, URL, AbortController,
            setTimeout(callback, delay) {
                assert.equal(delay, 10000);
                expire = callback;
                return 42;
            },
            clearTimeout(timer) { assert.equal(timer, 42); cleared = true; },
            fetch: async (url, options) => {
                signal = options.signal;
                const wait = () => new Promise((resolve, reject) => {
                    signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
                });
                return pending === 'request' ? wait() : { ok: true, json: wait };
            }
        };
        vm.runInNewContext(readFileSync(path.join(__dirname, '../static/js/content-manager.js'), 'utf8'), context);
        const manager = new context.window.ContentManager();
        const loading = manager.loadShowcaseData();
        await new Promise(setImmediate);
        assert.equal(typeof expire, 'function', `${pending} needs a bounded timeout`);
        expire();
        await loading;
        assert.equal(signal.aborted, true);
        assert.equal(cleared, true);
        assert.equal(manager.showcaseData, null);
        assert.match(manager.showcaseMessage, /unavailable.*curated/i);
    }
});

test('Copilot timeout, cancellation and output limits stop descendants before cleanup', { timeout: 30000 }, async t => {
    function running(pid) {
        if (!Number.isInteger(pid) || pid <= 0) return false;
        try {
            process.kill(pid, 0);
            if (process.platform === 'linux') {
                const stat = readFileSync(path.join(path.sep, 'proc', String(pid), 'stat'), 'utf8');
                return stat.slice(stat.lastIndexOf(')') + 2, stat.lastIndexOf(')') + 3) !== 'Z';
            }
            return true;
        } catch (error) {
            if (error.code === 'ESRCH' || error.code === 'ENOENT') return false;
            throw error;
        }
    }

    const originalTimeout = global.setTimeout;
    let fireDeadline;
    t.mock.method(global, 'setTimeout', (callback, milliseconds, ...args) => {
        if (milliseconds === 180000) {
            fireDeadline = callback;
            return originalTimeout(() => {}, milliseconds);
        }
        return originalTimeout(callback, milliseconds, ...args);
    });

    for (const mode of ['timeout', 'cancel', 'sigint', 'sigterm', 'output-limit', 'success']) {
        const directory = mkdtempSync(path.join(tmpdir(), 'showcase-cli-test-'));
        const bin = path.join(directory, 'fake cli');
        const marker = path.join(directory, 'processes.json');
        const fake = path.join(bin, 'fake.cjs');
        mkdirSync(bin);
        writeFileSync(fake, `
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const child = ${JSON.stringify(mode)} === 'success' ? null :
    spawn(process.execPath, ['-e', 'setTimeout(function(){},8000)'], {stdio: 'ignore'});
fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({
    pid: process.pid, childPid: child?.pid, home: process.env.COPILOT_HOME,
    trackedByRunner: Boolean(process.env.RUNNER_TRACKING_ID)
}));
process.stdin.resume();
if (${JSON.stringify(mode)} === 'success') {
    process.stdin.on('end', () => {
        console.log(JSON.stringify({type: 'assistant.message', data: {content: '{"ok":true}', toolRequests: []}}));
        console.log(JSON.stringify({type: 'result', exitCode: 0}));
    });
} else {
    if (${JSON.stringify(mode)} === 'output-limit') process.stdout.write('x'.repeat(600 * 1024));
    setTimeout(() => {}, 8000);
}
`);
        if (process.platform === 'win32') {
            writeFileSync(path.join(bin, 'copilot.cmd'), `@echo off\r\n"${process.execPath}" "${fake}" %*\r\n`);
        } else {
            writeFileSync(path.join(bin, 'copilot'), `#!/usr/bin/env node\nrequire(${JSON.stringify(fake)});\n`, { mode: 0o755 });
        }
        const environment = {
            PATH: process.env.PATH,
            COPILOT_GITHUB_TOKEN: process.env.COPILOT_GITHUB_TOKEN,
            RUNNER_TRACKING_ID: process.env.RUNNER_TRACKING_ID
        };
        const listeners = [process.listenerCount('SIGINT'), process.listenerCount('SIGTERM')];
        process.env.PATH = `${bin}${path.delimiter}${environment.PATH}`;
        process.env.COPILOT_GITHUB_TOKEN = 'test-only-token';
        process.env.RUNNER_TRACKING_ID ||= 'showcase-test-runner';
        fireDeadline = undefined;
        const controller = new AbortController();
        let outcome;
        const finished = summarizeWithCopilot({ sources: [] }, controller.signal)
            .then(value => { outcome = { value }; }, error => { outcome = { error }; });
        let info;
        try {
            const started = Date.now();
            while (!existsSync(marker) && !outcome && Date.now() - started < 5000) await delay(20);
            assert.ok(existsSync(marker), outcome?.error?.message || `${mode}: fake CLI did not start`);
            info = JSON.parse(readFileSync(marker, 'utf8'));
            if (mode === 'timeout') {
                assert.equal(typeof fireDeadline, 'function', 'Deadline must stop the process tree, not just its shell');
                fireDeadline();
            } else if (mode === 'cancel') {
                controller.abort();
            } else if (mode === 'sigint' || mode === 'sigterm') {
                process.emit(mode.toUpperCase());
            }
            const stopped = await Promise.race([finished.then(() => true), delay(3000).then(() => false)]);
            assert.equal(stopped, true, `${mode}: Copilot invocation did not settle`);
            if (mode === 'success') {
                assert.equal(outcome.error, undefined);
                assert.deepEqual(JSON.parse(outcome.value), { ok: true });
            } else {
                assert.match(outcome.error?.message || '', /timed out|cancelled|output limit/i);
                if (mode === 'sigint') assert.equal(outcome.error.exitCode, 130);
                if (mode === 'sigterm') assert.equal(outcome.error.exitCode, 143);
            }
            const cleanupStarted = Date.now();
            while ((running(info.pid) || running(info.childPid)) && Date.now() - cleanupStarted < 1000) await delay(20);
            assert.equal(running(info.pid), false, `${mode}: CLI process survived`);
            assert.equal(running(info.childPid), false, `${mode}: descendant survived`);
            assert.equal(existsSync(info.home), false, `${mode}: temporary directory was not cleaned`);
            assert.equal(info.trackedByRunner, true);
            assert.deepEqual([process.listenerCount('SIGINT'), process.listenerCount('SIGTERM')], listeners);
        } finally {
            if (!info && existsSync(marker)) info = JSON.parse(readFileSync(marker, 'utf8'));
            for (const pid of [info?.childPid, info?.pid]) {
                if (!running(pid)) continue;
                if (process.platform === 'win32') {
                    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
                } else {
                    process.kill(pid, 'SIGKILL');
                }
            }
            await finished;
            for (const [name, value] of Object.entries(environment)) {
                if (value === undefined) delete process.env[name];
                else process.env[name] = value;
            }
            rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
        }
    }
});
