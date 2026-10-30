import { logCode } from './alerts.ts';
import { handleContact } from './contact.ts';
import { runDigest, runPurge, runSelfTest } from './scheduled.ts';
import { realDeps, type Deps, type Env } from './types.ts';

// Cron triggers (UTC) are set only in wrangler.jsonc. Jobs are chosen by the
// MINUTE alone, so the hours can change there (daylight saving) with no code change:
//   minute 15  morning self-test
//   minute 30  daily digest, then spam purge
//   anything else: logged and ignored
export function cronJob(cron: string): 'self_test' | 'digest' | 'none' {
  const minute = cron.trim().split(/\s+/)[0];
  if (minute === '15') return 'self_test';
  if (minute === '30') return 'digest';
  return 'none';
}

export async function runScheduled(cron: string, env: Env, deps: Deps): Promise<string> {
  const job = cronJob(cron);
  if (job === 'self_test') await runSelfTest(env, deps);
  else if (job === 'digest') await runDigest(env, deps).then(() => runPurge(env, deps));
  else logCode('cron_unrecognized', { minute: cron.trim().split(/\s+/)[0] ?? '' });
  return job;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return handleContact(request, env);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },

  async scheduled(event: { cron: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(runScheduled(event.cron, env, realDeps));
  },
};
