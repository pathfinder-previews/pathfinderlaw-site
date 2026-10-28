// Checks on the built site (dist/). Run `npm run build` first; without a build these tests skip.
// Covers the Eastern Shore page: it is built, listed in the sitemaps, linked from the pages
// that should link to it, carries LegalService data, and every internal link on it resolves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const built = existsSync(new URL('index.html', dist));
const opts = { skip: built ? false : 'dist/ not built; run npm run build first' };

const SHORE = '/eastern-shore-workers-comp-lawyer/';
const fileFor = (path: string) => new URL(`.${path.endsWith('/') ? path + 'index.html' : path}`, dist);
const read = (path: string) => readFileSync(fileFor(path), 'utf8');

// Every JSON-LD block on a page, flattened to a list of graph nodes.
function graphOf(html: string): any[] {
  const out: any[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    out.push(...(JSON.parse(m[1])['@graph'] ?? []));
  }
  return out;
}

// Same-site links (not mailto, tel, files or anchors only) found in href attributes.
function internalLinks(html: string): string[] {
  const links = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const href = m[1].split('#')[0];
    if (href.startsWith('/') && !href.startsWith('//') && !/\.[a-z0-9]+$/i.test(href)) links.add(href);
  }
  return [...links];
}

test('Eastern Shore page is built with its title, heading and no Spanish markup', opts, () => {
  const html = read(SHORE);
  assert.match(html, /<title>Eastern Shore Workers(?:'|&#39;) Comp Lawyer \| Pathfinder Injury Law<\/title>/);
  assert.match(html, /<h1[^>]*>\s*Eastern Shore Workers’ Compensation Lawyer\s*<\/h1>/);
  assert.match(html, /<html lang="en">/);
});

test('Eastern Shore page uses the Round 3 wording', opts, () => {
  const html = read(SHORE);
  assert.match(html, /Virtually all employers with three or more employees regularly in service in Virginia are required to carry workers’ compensation insurance\./);
  assert.match(html, /must approve all attorney fees in Workers’ Comp cases\. We are generally paid on contingency/);
  assert.match(html, /Costs we advance are subject to reimbursement from the client\./);
  assert.doesNotMatch(html, /sets attorney fees/);
  assert.doesNotMatch(html, /every employer with three or more people/);
  assert.match(html, /give notice to your employer within thirty days of the accident/);
  assert.doesNotMatch(html, /written notice/i);
  assert.doesNotMatch(html, /—/);
});

test('Eastern Shore page links resolve to built pages', opts, () => {
  for (const href of internalLinks(read(SHORE))) {
    assert.ok(existsSync(fileFor(href)), `broken link on the Eastern Shore page: ${href}`);
  }
});

test('Eastern Shore page is linked from Location, Contact, Workers Comp page and another city page', opts, () => {
  for (const page of ['/location/', '/contact/', '/virginia-workers-comp-lawyer/', '/richmond-workers-comp-lawyer/', '/about-us/', '/sitemap/']) {
    assert.ok(internalLinks(read(page)).includes(SHORE), `${page} should link to ${SHORE}`);
  }
  assert.match(read('/richmond-workers-comp-lawyer/'), />The Eastern Shore</);
});

test('XML page sitemap lists the Eastern Shore page once, and arears_served does not repeat it', opts, () => {
  const page = readFileSync(new URL('page-sitemap.xml', dist), 'utf8');
  assert.equal(page.split(`https://pathfinderlaw.com${SHORE}</loc>`).length - 1, 1);
  const areas = readFileSync(new URL('arears_served-sitemap.xml', dist), 'utf8');
  assert.ok(!areas.includes(SHORE));
});

test('redirects: the occupational-diseases redirect stays and nothing redirects the Eastern Shore address', () => {
  const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
  assert.ok(/occupational-diseases/.test(redirects));
  const rules = redirects.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  assert.ok(!rules.includes('eastern-shore'));
});

test('redirect targets are built pages', opts, () => {
  const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
  for (const line of redirects.split('\n')) {
    const [from, to, code] = line.trim().split(/\s+/);
    if (!from || from.startsWith('#') || code !== '301' || !to.startsWith('/') || /[:*]/.test(from + to)) continue;
    assert.ok(existsSync(fileFor(to)), `${from} redirects to ${to}, which is not built`);
  }
});

test('LegalService data: both offices, phone, appointment hours, areas, nothing invented', opts, () => {
  const ls = graphOf(read(SHORE)).find((n) => n['@type'] === 'LegalService');
  assert.ok(ls, 'LegalService missing');
  assert.equal(ls.name, 'Pathfinder Injury Law');
  assert.equal(ls.telephone, '+18045050633');
  const streets = ls.location.map((l: any) => `${l.address.streetAddress}, ${l.address.addressLocality}, ${l.address.addressRegion} ${l.address.postalCode}`);
  assert.deepEqual(streets, [
    '8010 Ridge Road, Suite A, Richmond, VA 23229',
    '6294 Cropper Street, Chincoteague, VA 23336',
  ]);
  const areas = ls.areaServed.map((a: any) => a.name);
  for (const want of ['Accomack County', 'Northampton County', 'Virginia', 'Richmond', 'Virginia Beach', 'Fairfax County']) {
    assert.ok(areas.includes(want), `areaServed missing ${want}`);
  }
  const text = JSON.stringify(ls);
  assert.doesNotMatch(text, /geo|latitude|longitude|aggregateRating|reviewCount|ratingValue|sameAs|knowsLanguage|availableLanguage|Spanish/i);
  assert.match(text, /by appointment only/i);
});

test('LegalService is on every page type that carries structured data', opts, () => {
  for (const page of ['/', '/contact/', SHORE, '/richmond-workers-comp-lawyer/']) {
    assert.ok(graphOf(read(page)).some((n) => n['@type'] === 'LegalService'), `${page} lacks LegalService`);
  }
});

test('preview build keeps the new page noindex unless PUBLIC_SITE_LIVE=1', opts, () => {
  const robots = read(SHORE).match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? '';
  if (process.env.PUBLIC_SITE_LIVE === '1') assert.doesNotMatch(robots, /noindex/);
  else assert.match(robots, /noindex/);
});
