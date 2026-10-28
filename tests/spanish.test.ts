// Checks on the DRAFT Spanish pages (dist/). Run `npm run build` first; without a build these skip.
// Everything Spanish is revertable as one unit: this file, src/data/spanish.ts, the Spanish
// template and pages, and the redirect-line removal all arrive in one commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spanishPages, SPANISH_FORM } from '../src/data/spanish.ts';

const dist = new URL('../dist/', import.meta.url);
const built = existsSync(new URL('index.html', dist));
const opts = { skip: built ? false : 'dist/ not built; run npm run build first' };
const fileFor = (path: string) => new URL(`.${path}index.html`, dist);
const read = (path: string) => readFileSync(fileFor(path), 'utf8');
const origin = 'https://pathfinderlaw.com';

const internalLinks = (html: string) => {
  const links = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const href = m[1].split('#')[0];
    if (href.startsWith('/') && !href.startsWith('//') && !/\.[a-z0-9]+$/i.test(href)) links.add(href);
  }
  return [...links];
};
const hreflangs = (html: string) =>
  Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));

test('there are three Spanish pages at the approved addresses', () => {
  assert.deepEqual(spanishPages.map((p) => p.path), [
    '/abogados-de-compensacion-al-trabajador-en-virginia/',
    '/abogados-de-compensacion-al-trabajador-en-richmond/',
    '/abogados-de-compensacion-al-trabajador-en-la-costa-este-de-virginia/',
  ]);
});

for (const page of spanishPages) {
  test(`${page.path}: lang="es", Spanish title and description, English link at the top`, opts, () => {
    const html = read(page.path);
    assert.match(html, /<html lang="es">/);
    assert.ok(html.includes(`<meta name="description" content="${page.description.text}">`));
    assert.match(html, /"inLanguage":"es-US"/);
    const link = html.indexOf(`<a href="${page.englishPath}" lang="en" hreflang="en"`);
    assert.ok(link > 0 && link < html.indexOf('<h2'), 'visible English link should come before the first heading');
    assert.match(html.slice(link, link + 200), />English<\/a>/);
  });

  test(`${page.path}: hreflang pair with ${page.englishPath} resolves both ways, x-default is English`, opts, () => {
    const es = hreflangs(read(page.path));
    const en = hreflangs(read(page.englishPath));
    for (const alt of [es, en]) {
      assert.equal(alt['en'], origin + page.englishPath);
      assert.equal(alt['es'], origin + page.path);
      assert.equal(alt['x-default'], origin + page.englishPath);
    }
    for (const url of Object.values(es)) assert.ok(existsSync(fileFor(url.slice(origin.length))), `${url} is not built`);
  });

  test(`${page.path}: every internal link resolves`, opts, () => {
    for (const href of internalLinks(read(page.path))) assert.ok(existsSync(fileFor(href)), `broken link: ${href}`);
  });

  test(`${page.path}: Spanish form keeps the checkbox, trap field and JSON fields; no Spanish-speaking-staff claim`, opts, () => {
    const html = read(page.path);
    assert.match(html, /name="acknowledged" type="checkbox" required/);
    assert.match(html, /name="company" type="text" tabindex="-1"/);
    assert.ok(html.includes(SPANISH_FORM.consent));
    assert.ok(html.includes(SPANISH_FORM.hint));
    for (const field of ['acknowledged:', 'company:', 'fillMs:', 'turnstileToken:', '/api/contact']) assert.ok(html.includes(field), field);
    assert.ok(html.includes('Podemos coordinar un intérprete o un servicio de traducción'));
    assert.doesNotMatch(html, /hablamos espa|personal que habla|habla espa[ñn]ol(?! ?\?)|mejores abogados|nos aseguraremos|garantiz/i);
  });
}

test('English Shore page carries the Spanish line (ES-E-01) linking to page C', opts, () => {
  const html = read('/eastern-shore-workers-comp-lawyer/');
  assert.match(html, /<span lang="es">¿Habla español\? Lea esta página en español: <a href="\/abogados-de-compensacion-al-trabajador-en-la-costa-este-de-virginia\/">Abogados de compensación al trabajador en la Costa Este de Virginia<\/a>\.<\/span>/);
});

test('Spanish form wording: acknowledgement keeps the approved meaning pieces', () => {
  const c = SPANISH_FORM.consent;
  assert.match(c, /no me convierte en cliente/);
  assert.match(c, /no .*crea una relación abogado-cliente/);
  assert.match(c, /Pathfinder Injury Law no ha aceptado representarme/);
  assert.equal(SPANISH_FORM.thankYou, '/gracias/');
});

test('Spanish thank-you page is noindex and out of every sitemap', opts, () => {
  const html = read('/gracias/');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow/);
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(headers, /\/gracias\/\n\s+X-Robots-Tag: noindex, nofollow/);
  for (const name of ['page', 'post', 'practice_areas', 'attorneys', 'arears_served']) {
    assert.ok(!readFileSync(new URL(`${name}-sitemap.xml`, dist), 'utf8').includes('/gracias/'));
  }
});

test('XML page sitemap lists all four new addresses; HTML sitemap lists the Spanish pages', opts, () => {
  const xml = readFileSync(new URL('page-sitemap.xml', dist), 'utf8');
  const html = read('/sitemap/');
  for (const p of ['/eastern-shore-workers-comp-lawyer/', ...spanishPages.map((s) => s.path)]) {
    assert.ok(xml.includes(`${origin}${p}</loc>`), `${p} missing from page-sitemap.xml`);
  }
  for (const s of spanishPages) assert.ok(html.includes(`href="${s.path}"`), `${s.path} missing from the HTML sitemap`);
});

test('redirects: the two old Spanish addresses no longer redirect; occupational-diseases redirect stays', () => {
  const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
  assert.ok(!/abogados-de-compensacion/.test(redirects.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n')));
  assert.ok(/occupational-diseases/.test(redirects));
});
