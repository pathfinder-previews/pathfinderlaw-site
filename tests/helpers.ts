import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import type { Deps, Env } from '../src/worker/types.ts';

// A D1-shaped wrapper over Node's built-in SQLite, running the real migration.
export function makeDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_create_submissions.sql', import.meta.url), 'utf8'));
  const mk = (sql: string, args: unknown[] = []) => ({
    bind: (...v: unknown[]) => mk(sql, v),
    run: async () => void sqlite.prepare(sql).run(...(args as never[])),
    first: async () => (sqlite.prepare(sql).get(...(args as never[])) as never) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...(args as never[])) as never[] }),
  });
  return { prepare: (sql: string) => mk(sql), sqlite };
}

export const STARTER_RULES = JSON.parse(readFileSync(new URL('../docs/starter-rules.json', import.meta.url), 'utf8'));

// The settings store: key "rules" holds `value`; any other key (alert markers) is kept in memory.
export function makeKv(value: string | null | 'throw') {
  const other = new Map<string, string>();
  const puts: { key: string; ttl?: number }[] = [];
  return {
    puts,
    get: async (key: string) => {
      if (value === 'throw') throw new Error('kv down');
      return key === 'rules' ? value : other.get(key) ?? null;
    },
    put: async (key: string, v: string, o?: { expirationTtl?: number }) => {
      if (value === 'throw') throw new Error('kv down');
      other.set(key, v); puts.push({ key, ttl: o?.expirationTtl });
    },
  };
}

export function fakeServiceAccountKey() {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return JSON.stringify({
    client_email: 'forms-sender@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  });
}

export interface Calls { url: string; method: string; body: string; auth?: string }

// Routes every outside call the Worker makes to a scripted stand-in.
let counter = 0;
export function makeWorld(opts: { gmail?: number; token?: number; turnstile?: 'pass' | 'fail' | 'down'; hostname?: string; now?: string } = {}) {
  const calls: Calls[] = [];
  const deps: Deps = {
    now: () => new Date(opts.now ?? '2026-11-03T15:00:00Z'),
    uuid: () => `id-${++counter}-xxxxxxxx`,
    fetch: (async (url: string, init: RequestInit = {}) => {
      const body = init.body ? String(init.body) : '';
      calls.push({ url: String(url), method: init.method ?? 'GET', body, auth: (init.headers as Record<string, string> | undefined)?.authorization });
      const u = String(url);
      if (u.includes('oauth2.googleapis.com')) {
        return opts.token && opts.token !== 200
          ? new Response('{"error":"unauthorized_client"}', { status: opts.token })
          : Response.json({ access_token: 'tok', expires_in: 3600 });
      }
      if (u.includes('gmail.googleapis.com')) return new Response('{}', { status: opts.gmail ?? 200 });
      if (u.includes('siteverify')) {
        if (opts.turnstile === 'down') throw new Error('network');
        return Response.json({ success: opts.turnstile !== 'fail', hostname: opts.hostname ?? 'pathfinderlaw.com' });
      }
      return new Response('ok'); // heartbeat / alert pings
    }) as typeof fetch,
  };
  return { deps, calls };
}

export function decodeRaw(call: Calls) {
  const raw = JSON.parse(call.body).raw as string;
  const text = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const [head, b64] = text.split('\r\n\r\n');
  return { head, body: Buffer.from(b64.replace(/\r\n/g, ''), 'base64').toString('utf8') };
}

export const goodInput = (o: Record<string, unknown> = {}) => ({
  name: 'Pat Example', email: 'pat@example.com', phone: '804-555-0100',
  message: 'I hurt my back at work in Richmond and my claim was denied.',
  acknowledged: true, company: '', form: 'main', fillMs: 25000, turnstileToken: 'tok', ...o,
});

export const liveEnv = (extra: Partial<Env> = {}): Env & { sqlite: DatabaseSync } => {
  const db = makeDb();
  return {
    DB: db, sqlite: db.sqlite, SETTINGS: makeKv(JSON.stringify(STARTER_RULES)), GOOGLE_SA_KEY: fakeServiceAccountKey(),
    TURNSTILE_SECRET: 's', HEARTBEAT_URL: 'https://hb.example/ping', ALERT_URL: 'https://hb.example/fail', ...extra,
  } as never;
};

export const post = (body: unknown) =>
  new Request('https://x.test/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
