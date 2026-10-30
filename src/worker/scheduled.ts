import { SPAM_RETENTION_DAYS } from './config.ts';
import { logCode, ping } from './alerts.ts';
import { processSubmission } from './contact.ts';
import { SendError, sendMail } from './google.ts';
import type { Deps, Env } from './types.ts';

const ET = 'America/New_York';
const etParts = (d: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ET, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour };
};

// UTC instant when the given Eastern calendar day begins (handles daylight saving).
function etMidnight(y: number, m: number, d: number): Date {
  for (const offset of [4, 5]) {
    const t = new Date(Date.UTC(y, m - 1, d, offset));
    const p = etParts(t);
    if (p.y === y && p.m === m && p.d === d && p.h === 0) return t;
  }
  return new Date(Date.UTC(y, m - 1, d, 5));
}

// Start and end (UTC ISO strings) of the Eastern calendar day `daysAgo` days before `now`.
export function etDayRange(now: Date, daysAgo: number) {
  const { y, m, d } = etParts(now);
  const day = new Date(Date.UTC(y, m - 1, d - daysAgo)); // calendar arithmetic only
  const next = new Date(Date.UTC(y, m - 1, d - daysAgo + 1));
  const start = etMidnight(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
  const end = etMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  const label = day.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return { start: start.toISOString(), end: end.toISOString(), label };
}

// Morning self-test: a tagged message through the exact same path as a real one.
// Only a delivered test pings the outside check-in service. No ping = alarm.
export async function runSelfTest(env: Env, deps: Deps) {
  const tag = deps.uuid().slice(0, 8);
  const result = await processSubmission(
    env,
    deps,
    {
      name: 'Morning self-test',
      email: 'admin@pathfinderlaw.com',
      phone: '804-505-0633',
      message: `Automated morning test ${tag}. No action needed.`,
      form: 'main',
      company: '',
      fillMs: 60_000,
      turnstileToken: '',
    },
    { test: { tag } },
  );
  if (result.delivery === 'sent') return ping(env.HEARTBEAT_URL, deps);
  return false;
}

interface Row {
  id: string;
  created_at: string;
  form: string;
  outcome: string;
  reason: string;
  turnstile: string;
  delivery_status: string;
  delivery_detail: string | null;
  name: string;
  email: string;
  phone: string;
  is_test: number;
}

export async function buildDigest(env: Env, deps: Deps): Promise<{ subject: string; body: string }> {
  if (!env.DB) throw new Error('no_db');
  const now = deps.now();
  const day = etDayRange(now, 1);
  const prior = etDayRange(now, 2);
  const cols = 'id, created_at, form, outcome, reason, turnstile, delivery_status, delivery_detail, name, email, phone, is_test';

  const yesterday = (
    await env.DB.prepare(`SELECT ${cols} FROM submissions WHERE created_at >= ? AND created_at < ? ORDER BY created_at`)
      .bind(day.start, day.end)
      .all<Row>()
  ).results;
  const real = yesterday.filter((r) => !isTest(r));
  const leads = real.filter((r) => r.outcome !== 'screened');
  const screened = real.filter((r) => r.outcome === 'screened');

  // Anything from the last 7 days that never reached the inboxes (not counting deliberate skips).
  const weekAgo = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const undelivered = (
    await env.DB.prepare(
      `SELECT ${cols} FROM submissions WHERE created_at >= ? AND created_at < ? AND delivery_status IN ('pending','failed') ORDER BY created_at`,
    )
      .bind(weekAgo, new Date(now.getTime() - 10 * 60_000).toISOString()) // ignore ones still being processed
      .all<Row>()
  ).results;

  const testRows = yesterday.filter(isTest);
  const twoDayCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM submissions WHERE created_at >= ? AND created_at < ? AND is_test = 0')
    .bind(prior.start, day.end)
    .first<{ n: number }>();

  const errors = {
    sendFailures: yesterday.filter((r) => r.delivery_status === 'failed').length,
    turnstileErrors: yesterday.filter((r) => r.turnstile === 'error').length,
    turnstileNotConfigured: yesterday.filter((r) => r.turnstile === 'not_configured').length,
    rulesErrors: yesterday.filter((r) => r.reason === 'rules_error').length,
  };

  const lines: string[] = [`Daily website form digest for ${day.label}`, ''];
  lines.push(`Leads (including "unsure"): ${leads.length}`);
  lines.push(`Screened: ${screened.length}`);
  lines.push('');
  if (screened.length) {
    lines.push('Screened messages (check each; a real person would be a mistake):');
    for (const r of screened) {
      const note = r.delivery_status === 'skipped' ? 'not emailed' : 'emailed with [Screened]';
      lines.push(`- ${r.name} <${r.email}>, ${r.form} form: ${r.reason} (${note})`);
    }
    lines.push('');
  }
  lines.push('Delivery check:');
  if (undelivered.length === 0) {
    lines.push(`- OK. Every logged submission from the last 7 days that should have been emailed was delivered.`);
  } else {
    // Contact details are listed so nobody has to open the database to call the person back.
    // Message text is left out (it can be long); it is in the database under the id.
    lines.push(`- PROBLEM. ${undelivered.length} logged submission(s) were not delivered. Contact these people (the message text is in the database under the id):`);
    for (const r of undelivered) {
      const when = new Date(r.created_at).toLocaleString('en-US', { timeZone: ET, dateStyle: 'medium', timeStyle: 'short' });
      const tag = isTest(r) ? ' [morning self-test, no action needed]' : '';
      lines.push(`  ${r.name}, ${r.email}, ${r.phone}, ${when} Eastern${tag}`);
      lines.push(`    id ${r.id}, ${r.form} form, ${r.delivery_status}${r.delivery_detail ? `: ${r.delivery_detail}` : ''}`);
    }
  }
  lines.push(`- Morning self-test rows yesterday: ${testRows.length} (${testRows.filter((r) => r.delivery_status === 'sent').length} delivered)`);
  lines.push('');
  lines.push(`Errors yesterday: ${errors.sendFailures} failed send(s), ${errors.turnstileErrors} bot-check error(s), ${errors.rulesErrors} rules error(s).`);
  if (errors.turnstileNotConfigured) {
    lines.push(`TURNSTILE NOT CONFIGURED on ${errors.turnstileNotConfigured} submission(s): the TURNSTILE_SECRET secret is missing, so no bot check ran. Add it in the Cloudflare dashboard.`);
  }
  if ((twoDayCount?.n ?? 0) === 0) {
    lines.push('', 'NOTE: no submissions at all in the last two days. If that is unusual, test the form from a phone.');
  }
  const flag = undelivered.length || errors.sendFailures || errors.turnstileNotConfigured ? ' (ATTENTION)' : '';
  return { subject: `Form digest: ${leads.length} lead(s), ${screened.length} screened${flag}`, body: lines.join('\n') };
}

const isTest = (r: Row) => r.reason === 'self_test';

export async function runDigest(env: Env, deps: Deps) {
  try {
    const { subject, body } = await buildDigest(env, deps);
    await sendMail(env, deps, { subject, body });
    return true;
  } catch (e) {
    logCode('digest_failed', { detail: e instanceof SendError ? e.code : 'unknown' });
    await ping(env.ALERT_URL, deps);
    return false;
  }
}

export async function runPurge(env: Env, deps: Deps) {
  if (!env.DB) return;
  const cutoff = new Date(deps.now().getTime() - SPAM_RETENTION_DAYS * 86400_000).toISOString();
  try {
    await env.DB.prepare("DELETE FROM submissions WHERE outcome = 'screened' AND created_at < ?").bind(cutoff).run();
  } catch {
    logCode('purge_failed');
  }
}
