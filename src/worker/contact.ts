import { DEFAULT_ALLOWED_HOSTNAMES, FIRM_PHONE, MIN_FILL_MS, TURNSTILE_TEST_SECRET, TURNSTILE_VERIFY_URL } from './config.ts';
import { alertThrottled, logCode, ping } from './alerts.ts';
import { SendError, sendMail } from './google.ts';
import { decide, loadRules } from './screen.ts';
import type { Deps, Env } from './types.ts';
import { realDeps } from './types.ts';
import { validate, type Submission } from './validate.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// pass: Cloudflare says human. fail: Cloudflare says not human (or no token).
// error: Cloudflare could not be reached (an outage; the lead is still delivered).
// not_configured: TURNSTILE_SECRET is missing (a setup mistake; delivered, alarm raised).
// wrong_hostname: a valid token, but issued on a site not in ALLOWED_HOSTNAMES (treated like fail).
type Turnstile = 'pass' | 'fail' | 'error' | 'not_configured' | 'wrong_hostname';

export function allowedHostnames(env: Env): string[] {
  return (env.ALLOWED_HOSTNAMES || DEFAULT_ALLOWED_HOSTNAMES)
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

async function verifyTurnstile(env: Env, deps: Deps, token: string, ip: string | null): Promise<Turnstile> {
  const secret = env.TURNSTILE_SECRET || (env.PREVIEW_MODE ? TURNSTILE_TEST_SECRET : '');
  if (!secret) return 'not_configured';
  if (!token) return 'fail';
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set('remoteip', ip); // sent to Cloudflare for the check; never stored or logged
    const res = await deps.fetch(env.TURNSTILE_VERIFY_URL || TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    if (!res.ok) return 'error';
    const data = (await res.json()) as { success?: boolean; hostname?: string };
    if (data.success !== true) return 'fail';
    // Previews run on test addresses with the always-pass test key: no hostname check there.
    if (!env.PREVIEW_MODE && data.hostname && !allowedHostnames(env).includes(data.hostname.toLowerCase())) return 'wrong_hostname';
    return 'pass';
  } catch {
    return 'error';
  }
}

export interface Processed {
  status: 'ok' | 'verification_failed' | 'delivery_failed';
  outcome: 'lead' | 'screened' | 'unsure';
  reason: string;
  delivery: 'sent' | 'failed' | 'skipped';
}

const TURNSTILE_LINE: Record<string, string> = {
  pass: 'pass',
  fail: 'fail',
  wrong_hostname: 'fail (token issued for a hostname not in ALLOWED_HOSTNAMES)',
  error: 'spam check unavailable (Cloudflare could not be reached; delivered anyway)',
  not_configured: 'TURNSTILE NOT CONFIGURED (the TURNSTILE_SECRET secret is missing; fix it in the Cloudflare dashboard)',
  skipped: 'skipped (automated self-test)',
};

// Added to the end of the subject so the "[Screened]" and "[Form Test" filters still match.
const SUBJECT_MARK: Record<string, string> = {
  error: ' - spam check unavailable',
  not_configured: ' - TURNSTILE NOT CONFIGURED',
};

export function emailBody(sub: Submission, o: { id: string; outcome: string; reason: string; logged: boolean; turnstile?: string }) {
  return [
    `Form: ${sub.form === 'sidebar' ? 'sidebar' : 'main contact'} form`,
    `Screening: ${o.outcome} (${o.reason})`,
    `Bot check (Turnstile): ${TURNSTILE_LINE[o.turnstile ?? 'skipped'] ?? o.turnstile}`,
    ...(o.logged ? [] : ['WARNING: the form log was unavailable, so this submission was NOT saved to the database. This email is the only record.']),
    '',
    `Name: ${sub.name}`,
    `Email: ${sub.email}`,
    `Phone: ${sub.phone}`,
    '',
    'Message:',
    sub.message,
    '',
    '---',
    'The sender confirmed that sending this form does not create an attorney-client relationship and that Pathfinder Injury Law has not agreed to represent them. Treat as confidential.',
    `Reference: ${o.id}`,
    'Reply to this email to reach the sender.',
  ].join('\n');
}

// The one path every submission takes: log, bot checks, screen, email, update log.
export async function processSubmission(
  env: Env,
  deps: Deps,
  sub: Submission,
  opts: { ip?: string | null; test?: { tag: string } } = {},
): Promise<Processed> {
  const id = deps.uuid();
  const created = deps.now().toISOString();
  const isTest = opts.test ? 1 : 0;
  const db = env.DB;
  let logged = false;

  // 1. Log first. If the log is down we still try to deliver, and raise the alarm.
  try {
    if (!db) throw new Error('no_db');
    await db
      .prepare(
        `INSERT INTO submissions (id, created_at, form, outcome, reason, is_test, turnstile, delivery_status, name, email, phone, message)
         VALUES (?, ?, ?, 'unsure', 'pending', ?, 'skipped', 'pending', ?, ?, ?, ?)`,
      )
      .bind(id, created, sub.form, isTest, sub.name, sub.email, sub.phone, sub.message)
      .run();
    logged = true;
  } catch {
    logCode('db_insert_failed');
    await ping(env.ALERT_URL, deps);
  }

  // 2. Bot checks and screening.
  let turnstile: Turnstile | 'skipped' = 'skipped';
  let outcome: Processed['outcome'] = 'lead';
  let reason = 'clean';
  let deliver = true;

  if (opts.test) {
    reason = 'self_test';
  } else {
    turnstile = await verifyTurnstile(env, deps, sub.turnstileToken, opts.ip ?? null);
    if (turnstile === 'not_configured') {
      // A setup mistake, not an outage: deliver the lead, but sound the alarm (at most hourly).
      logCode('turnstile_not_configured');
      await alertThrottled(env, deps, 'turnstile_not_configured');
    } else if (turnstile === 'error') {
      logCode('turnstile_unavailable');
    }
    if (sub.company) {
      outcome = 'screened';
      reason = 'trap_field';
      deliver = false;
    } else if (turnstile === 'fail') {
      outcome = 'screened';
      reason = 'turnstile_failed';
      deliver = false;
    } else if (turnstile === 'wrong_hostname') {
      // Same handling as a failed check: stored as screened, not emailed, visitor refused.
      outcome = 'screened';
      reason = 'turnstile_wrong_hostname';
      deliver = false;
      logCode('turnstile_wrong_hostname');
    } else {
      try {
        const rules = await loadRules(env.SETTINGS);
        let earlier = 0;
        if (db) {
          const since = new Date(deps.now().getTime() - rules.limits.repeatWindowHours * 3600_000).toISOString();
          const row = await db
            .prepare('SELECT COUNT(*) AS n FROM submissions WHERE LOWER(email) = ? AND created_at >= ? AND id != ? AND is_test = 0')
            .bind(sub.email.toLowerCase(), since, id)
            .first<{ n: number }>();
          earlier = row?.n ?? 0;
        }
        ({ outcome, reason } = decide(sub, rules, earlier));
      } catch {
        outcome = 'unsure';
        reason = 'rules_error'; // any trouble with the rules counts as a lead
        logCode('rules_error');
      }
      if (!(sub.fillMs >= MIN_FILL_MS)) {
        // Too fast to be a person. Still emailed, tagged [Screened], so nothing is lost.
        if (outcome === 'lead' || outcome === 'unsure') {
          outcome = 'screened';
          reason = 'too_fast';
        }
      }
    }
  }

  if (logged) {
    await db!
      .prepare('UPDATE submissions SET outcome = ?, reason = ?, turnstile = ? WHERE id = ?')
      .bind(outcome, reason, turnstile, id)
      .run()
      .catch(() => logCode('db_update_failed'));
  }

  // 3. Email.
  let delivery: Processed['delivery'] = 'skipped';
  let detail: string | null = null;
  if (deliver) {
    const prefix = opts.test ? `[Form Test ${opts.test.tag}] ` : outcome === 'screened' ? '[Screened] ' : '';
    try {
      await sendMail(env, deps, {
        subject: `${prefix}Website inquiry (${sub.form === 'sidebar' ? 'sidebar form' : 'main form'})${SUBJECT_MARK[turnstile] ?? ''}`,
        body: emailBody(sub, { id, outcome, reason, logged, turnstile }),
        replyTo: sub.email,
      });
      delivery = 'sent';
    } catch (e) {
      delivery = 'failed';
      detail = e instanceof SendError ? e.code : 'unknown';
      logCode('send_failed', { detail });
      // Authorization failures and any failed real lead alert the phones at once.
      await ping(env.ALERT_URL, deps);
    }
  }
  if (logged) {
    await db!
      .prepare('UPDATE submissions SET delivery_status = ?, delivery_at = ?, delivery_detail = ? WHERE id = ?')
      .bind(delivery, deps.now().toISOString(), detail, id)
      .run()
      .catch(() => logCode('db_update_failed'));
  }

  const status = turnstileBlocked(reason) ? 'verification_failed' : delivery === 'failed' ? 'delivery_failed' : 'ok';
  return { status, outcome, reason, delivery };
}

const turnstileBlocked = (reason: string) => reason === 'turnstile_failed' || reason === 'turnstile_wrong_hostname';

export async function handleContact(request: Request, env: Env, deps: Deps = realDeps): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json({ ok: false, error: 'bad_request' }, 415);
  }
  let input: unknown;
  try {
    const text = await request.text();
    if (text.length > 20_000) return json({ ok: false, error: 'too_large' }, 413);
    input = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }
  const v = validate(input);
  if (!v.ok) return json({ ok: false, error: v.error }, 400);
  const sub = v.value;

  // Previews: same checks as live, but nothing is stored or sent.
  if (env.PREVIEW_MODE) {
    const t = await verifyTurnstile(env, deps, sub.turnstileToken, null);
    logCode('preview_submission', { form: sub.form, trap: sub.company !== '', turnstile: t });
    if (t === 'fail') return json({ ok: false, error: 'verification_failed' }, 403);
    return json({ ok: true, preview: true, message: 'Preview: nothing was sent.' });
  }

  const result = await processSubmission(env, deps, sub, { ip: request.headers.get('CF-Connecting-IP') });
  if (result.status === 'verification_failed') return json({ ok: false, error: 'verification_failed' }, 403);
  if (result.status === 'delivery_failed') return json({ ok: false, error: 'delivery_failed', phone: FIRM_PHONE }, 502);
  return json({ ok: true });
}
