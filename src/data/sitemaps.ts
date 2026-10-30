// The URLs that go into the sitemaps. Child sitemap names are the ones the live WordPress
// site uses (checked Oct 28, 2026), spelling included: "arears_served" is not a typo here.
// Left out on purpose: /thank-you/, the HTML /sitemap/ page, /404, /client-portal/, and
// /blog/page/2/ (the live site listed only /blog/).

import { posts } from './blogPosts';
import { cities } from './cities';
import { subArticles, ARTICLE_BASE } from './subArticles';
import { articlesB } from './articlesB';

export interface SitemapUrl {
  path: string; // leading and trailing slash
  lastmod?: Date;
}

// The Eastern Shore page uses the city template but is listed with the pages (owner's build note, Oct 28).
const EASTERN_SHORE = '/eastern-shore-workers-comp-lawyer/';

const urls = (paths: string[]): SitemapUrl[] => paths.map((path) => ({ path }));

export const sitemaps: Record<string, SitemapUrl[]> = {
  post: [
    { path: '/blog/' },
    ...posts.map((p) => ({ path: p.path, lastmod: p.updated })),
  ],
  page: urls([
    '/',
    '/contact/',
    '/privacy-policy/',
    '/location/',
    '/reviews/',
    '/results/',
    '/disclaimer/',
    '/accessibility/',
    '/about-us/',
    '/virginia-workers-comp-faq/',
    EASTERN_SHORE,
    ...Object.values(articlesB).map((a) => a.path),
  ]),
  practice_areas: urls([
    ARTICLE_BASE,
    '/virginia-workers-comp-lawyer/virginia-back-injury-lawyer/',
    '/virginia-factory-accident-lawyer/',
    '/car-accident-at-work-in-virginia/',
    '/virginia-construction-accident-lawyer/',
    '/how-to-appeal-a-workers-comp-denial-in-virginia/',
    ...subArticles.map((a) => `${ARTICLE_BASE}${a.slug}/`),
  ]),
  attorneys: urls(['/bryn-swartz/', '/mandy-truman/']),
  arears_served: urls(cities.map((c) => c.path).filter((p) => p !== EASTERN_SHORE)),
};

// Pages that appear in a child sitemap more than once would be a bug; fail the build.
const all = Object.values(sitemaps).flat().map((u) => u.path);
const dupes = all.filter((p, i) => all.indexOf(p) !== i);
if (dupes.length) throw new Error(`Duplicate sitemap URLs: ${dupes.join(', ')}`);

export const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
