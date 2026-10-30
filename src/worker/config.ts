export const SENDER = 'admin@pathfinderlaw.com'; // Gmail user the service account acts as
export const RECIPIENTS = ['bswartz@pathfinderlaw.com', 'mtruman@pathfinderlaw.com'];
export const FIRM_PHONE = '804-505-0633';
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Cloudflare's published always-pass test secret, used only in preview mode.
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
// Hostnames a Turnstile token may be issued for, when ALLOWED_HOSTNAMES is unset.
export const DEFAULT_ALLOWED_HOSTNAMES = 'pathfinderlaw.com,www.pathfinderlaw.com';
export const MIN_FILL_MS = 3000;
export const SPAM_RETENTION_DAYS = 90;
