const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const root = join(__dirname, '..');
const data = JSON.parse(readFileSync(join(root, 'static', 'data', 'about-content.json'), 'utf8'));
const html = readFileSync(join(root, 'static', 'index.html'), 'utf8');
const profile = html.match(/<section class="content" id="about">([\s\S]*?)<\/section>/);
assert.ok(profile, 'The Profile section must exist');

function createContainer() {
    return {
        children: [],
        set innerHTML(value) {
            assert.equal(value, '', 'Content must be inserted as text, not HTML');
            this.children = [];
        },
        get textContent() {
            return this.children.map(child => child.textContent).join('');
        },
        appendChild(child) {
            this.children.push(child);
        }
    };
}

const headings = [...profile[1].matchAll(/<(h[34])\b[^>]*data-section-title="([^"]+)"[^>]*>(.*?)<\/\1>/gs)]
    .map(([, , key, content]) => {
        assert.equal(content.trim(), '', 'Heading text must have a single source in JSON');
        return Object.assign(createContainer(), { dataset: { sectionTitle: key } });
    });
const keys = ['whoAmI', 'skills', 'knowHow', 'showcase', 'experience', 'education'];
assert.deepEqual(headings.map(heading => heading.dataset.sectionTitle), keys);
assert.equal(headings.length, (profile[1].match(/<h[34]\b/g) || []).length);
assert.deepEqual(Object.keys(data.sections.titles).sort(), [...keys].sort());
assert.equal(data.sections.titles.education, 'My Brain Upgrades');
assert.equal(Object.hasOwn(data.sections.whoAmI, 'title'), false);

const errors = [];
const context = {
    window: {},
    console: { error: message => errors.push(message) },
    document: {
        addEventListener() {},
        querySelectorAll: () => headings,
        createElement: tagName => ({ tagName }),
        createTextNode: textContent => ({ textContent })
    }
};
runInNewContext(readFileSync(join(root, 'static', 'js', 'content-manager.js'), 'utf8'), context);
const manager = new context.window.ContentManager();
manager.contentData = { ...data.sections, titles: { ...data.sections.titles } };
manager.stylingRules = data.styling;
manager.renderSectionTitles();

for (const heading of headings) {
    assert.equal(heading.textContent, data.sections.titles[heading.dataset.sectionTitle]);
    assert.ok(heading.children.every(child => child.className !== 'first-letter'));
}
const punctuation = heading => heading.children
    .filter(child => child.className === 'punctuation-highlight')
    .map(child => child.textContent).join('');
assert.equal(punctuation(headings[0]), '?');
assert.equal(punctuation(headings[1]), '');
assert.equal(punctuation(headings[2]), '\u2013');
assert.equal(errors.length, 0);

for (const key of keys) {
    manager.contentData.titles[key] = `${key}: <img src=x onerror=alert(1)> & "updated"?`;
}
manager.renderSectionTitles();
for (const heading of headings) {
    assert.equal(heading.textContent, manager.contentData.titles[heading.dataset.sectionTitle]);
    assert.ok(heading.children.every(child => !child.tagName || child.tagName === 'span'));
}

const previousEducationTitle = headings[5].textContent;
for (const invalid of [undefined, '', ' ', null, 42]) {
    manager.contentData.titles.education = invalid;
    manager.renderSectionTitles();
    assert.match(errors.at(-1), /education/);
    assert.equal(headings[5].textContent, previousEducationTitle);
}
assert.equal(errors.length, 5);

const paragraph = createContainer();
manager.applyStyleToText('Hello, world!', paragraph);
assert.equal(paragraph.textContent, 'Hello, world!');
assert.equal(paragraph.children[0].className, data.styling.firstLetterRule.className);
assert.equal(paragraph.children[0].textContent, 'H');
assert.equal(punctuation(paragraph), ',!');

console.log('Profile title checks passed.');
