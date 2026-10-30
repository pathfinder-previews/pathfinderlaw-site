import type { Deps, Env } from './types.ts';

// Plain HTTPS GET to an outside check-in service. Works with any vendor that
// accepts a GET. Never logs the URL (it often contains a secret token).
export async function ping(url: string | undefined, deps: Deps): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await deps.fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Fixed codes only. Never pass submitted text or error messages in here.
export function logCode(code: string, facts: Record<string, string | number | boolean> = {}) {
  console.error(JSON.stringify({ event: code, ...facts }));
}

// Ping ALERT_URL at most once per window for a given problem, so a busy day with
// a standing configuration error sends one alarm an hour, not one per visitor.
// The "already alerted" marker is a KV key that expires by itself. If KV is
// missing or failing, alert anyway: too loud beats silent.
export async function alertThrottled(env: Env, deps: Deps, problem: string, windowSeconds = 3600): Promise<boolean> {
  const key = `alert-sent:${problem}`;
  try {
    const kv = env.SETTINGS;
    if (kv?.put) {
      if (await kv.get(key)) return false;
      await kv.put(key, deps.now().toISOString(), { expirationTtl: windowSeconds });
    }
  } catch {
    // fall through and alert
  }
  return ping(env.ALERT_URL, deps);
}
