# Contact form pipeline

How the website's contact forms work, what a person must do before launch, and how to check that it is healthy. Written for Bryn and for future Claude sessions. Status as of Oct 28, 2026: code and tests are done; nothing has been deployed and no secret exists in any file.

## How it works, in plain words

1. A visitor fills in the form (the main Contact form, or the sidebar form on bio, practice-area and city pages; both are the same component, `src/components/ContactForm.astro`). The page checks the fields, loads Cloudflare's bot check (Turnstile) the first time the visitor uses the form (not on page load), and sends the entry to `/api/contact`.
2. A small Cloudflare Worker (`src/worker/`) answers only `/api/*`. Every other page is still a plain static file.
3. The Worker checks the entry again on the server (including the required acknowledgement checkbox; an entry without it is refused and never stored).
4. **It saves the entry to the database first** (Cloudflare D1, database `pathfinder-forms`), before any screening or emailing.
5. It runs the bot checks: Turnstile, the hidden trap field, and a minimum fill time (3 seconds).
6. It screens the message with the rules stored in Cloudflare's settings store (KV, key `rules`). Three outcomes: **lead**, **screened**, **unsure** (unsure is treated as a lead).
7. It emails both inboxes (`bswartz@` and `mtruman@pathfinderlaw.com`, nobody else) through Gmail, sent as `admin@pathfinderlaw.com`, with Reply-To set to the visitor. Screened messages get "[Screened]" at the start of the subject.
8. It records in the database whether the email was delivered. If sending fails, the visitor sees the firm's phone number (804-505-0633) instead of a success message, and the outside alarm is pinged.

### What each outcome does
| Case | Saved | Emailed | Visitor sees |
|---|---|---|---|
| Normal message | yes | yes | Thank-you page |
| Screened by a rule (agency, many links, repeat sender) | yes | yes, with "[Screened]" | Thank-you page |
| Sent in under 3 seconds | yes | yes, with "[Screened]" | Thank-you page |
| Hidden trap field filled in (a bot) | yes, as screened | no | Looks like success (so the bot learns nothing) |
| Turnstile says "not human" | yes, as screened | no | Failure message with the phone number |
| Turnstile token issued for a hostname not in `ALLOWED_HOSTNAMES` | yes, as screened | no | Failure message with the phone number |
| Rules store missing or broken | yes, as unsure | yes, as a normal lead | Thank-you page |
| Turnstile service unreachable | yes | yes (a Cloudflare outage must not cost a lead), subject ends "- spam check unavailable" | Thank-you page |
| `TURNSTILE_SECRET` missing (setup mistake) | yes | yes, subject ends "- TURNSTILE NOT CONFIGURED"; `ALERT_URL` pinged (at most once an hour) and the code `turnstile_not_configured` logged | Thank-you page |
| Database down | no (email only, flagged "NOT saved") | yes | Thank-you page, and the alarm fires |
| Gmail refuses or is down | yes, marked failed | no | Failure message with the phone number, alarm fires |
| Missing acknowledgement or bad field | no | no | "Please check the fields" |

### Screening rules (all in KV, none in the code)
- Signals: an agency domain (as the sender or in a link), agency phrases ("virtual assistant", "SEO", "AI employee" and others), links in the message, a repeat sender (same email, 3 earlier messages in 24 hours). "VA" and the phone's country are never signals.
- A message that mentions an injury, a job, a doctor or comp words (the `caseWords` list) is **never screened** unless it comes from or links to a known agency domain.
- One link to any other site makes the message **unsure**, not spam.
- Any trouble reading or applying the rules makes the message **unsure**.
- No AI scoring.
- The starting rules are in `docs/starter-rules.json`. Add the real agency domains to `agencyDomains` (the file has one placeholder, `example-agency.com`). Claude can tune the rules later with a KV-only key.

### Privacy and ethics built in
- Names, emails, phone numbers and message text are stored only in the database and in the two emails. They are never written to Worker logs or analytics; the Worker logs only fixed event codes such as `send_failed` (a test checks this).
- No IP address is stored. The visitor's address is passed to Cloudflare's Turnstile check only, and not kept.
- Spam (rows marked screened) is deleted after 90 days by the daily job. Leads and unsure rows are kept.
- Every submission, screened ones included, is treated as confidential.
- The email footer repeats that no attorney-client relationship exists and that the sender acknowledged this.
- Every lead email has a line "Bot check (Turnstile): ..." showing `pass`, `fail`, `spam check unavailable` or `TURNSTILE NOT CONFIGURED`. The launch-day test from a phone should show `pass`.
- The once-an-hour limit on the "Turnstile not configured" alarm is a self-expiring key (`alert-sent:turnstile_not_configured`) in the same settings store as the rules. It needs no setup and can be ignored.
- On a death claim or an incident that hurt more than one worker, run a conflict check on the names before reading further (plan rule).

### Daily jobs (cron)
| UTC time | Job |
|---|---|
| 12:15 | **Morning self-test.** Sends a message tagged `[Form Test xxxxxxxx]` through the same path to both inboxes. If Gmail accepts it, the Worker pings `HEARTBEAT_URL`. If not, no ping, and the outside service raises the alarm. |
| 12:30 | **Daily digest** email (yesterday's lead count; every screened message with its reason; a check that every logged submission from the last 7 days was delivered, listing the name, email, phone, time and id of any that were not so the person can be called back without opening the database; error counts; a note if two days passed with no submissions), then the 90-day spam purge. |

Cron runs in UTC. 12:30 UTC is 7:30 a.m. Eastern standard time (now until March 14, 2027). **When daylight time starts, change only the hours in `wrangler.jsonc`, from 12 to 11 (`15 11 * * *` and `30 11 * * *`). Nothing else needs to change.** The Worker picks the job by the minute alone (15 = self-test, 30 = digest and purge), so keep the minutes at 15 and 30. Any other minute is logged as `cron_unrecognized` and does nothing.

The Gmail filters from the plan should match only the exact "[Screened]" tag and the "[Form Test" tag, so no filter can bury a real lead.

## Secrets and settings (names are exact)

| Name | Type | What it is | Who adds it |
|---|---|---|---|
| `GOOGLE_SA_KEY` | Worker secret | The whole JSON key file of the service account `forms-sender@pathfinder-forms-sender.iam.gserviceaccount.com` | Bryn pastes it into the secret box; nobody views or stores it |
| `TURNSTILE_SECRET` | Worker secret | The Turnstile site's secret key | Bryn |
| `HEARTBEAT_URL` | Worker secret | The check-in service's "I am alive" address | Bryn (after the vendor is chosen) |
| `ALERT_URL` | Worker secret | The check-in service's "failure" address | Bryn |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build variable (not secret; it is public on the page) | Turnstile's public site key | Set in the live Worker's Build variables |
| `ALLOWED_HOSTNAMES` | Plain variable in `wrangler.jsonc` (not secret) | Comma-separated hostnames a Turnstile token may be issued for. Default `pathfinderlaw.com,www.pathfinderlaw.com` (also used if unset). A token from any other hostname is stored as screened (`turnstile_wrong_hostname`), not emailed, and the visitor sees the phone number, the same as a failed check. For the launch test, add the locked test hostname to the list in `wrangler.jsonc`, deploy, test, then remove it. Edit it in the file, not the dashboard: every deploy resets plain variables to the file. | Claude or Bryn, by a commit |

Previews need none of these. The previews build uses Cloudflare's published always-pass Turnstile test key automatically. A **live** build (`PUBLIC_SITE_LIVE=1`) with no `PUBLIC_TURNSTILE_SITE_KEY` fails on purpose, so the test key can never go live by accident.

## One-time steps for a human (in order)

1. **Create the Turnstile site** (Cloudflare dashboard, production account, Turnstile) for `pathfinderlaw.com` (add the `*.workers.dev` hostname only if testing there). Copy the site key and the secret key.
2. **Set the build variable** `PUBLIC_TURNSTILE_SITE_KEY` on the live Worker (Settings, Build, Variables and secrets, Build section).
3. **Add the four secrets** on the live Worker `pathfinderlaw-site` (Settings, Variables and Secrets, type Secret): `GOOGLE_SA_KEY`, `TURNSTILE_SECRET`, `HEARTBEAT_URL`, `ALERT_URL`. Create the Google JSON key only on the day of launch testing (Google may block key creation by organization policy; check first).
4. **Apply the database migration** (creates the table). One command, from a copy of this repo, logged in to Cloudflare as admin@:
   ```bash
   npx wrangler d1 migrations apply pathfinder-forms --remote
   ```
5. **Add the rules** to the settings store:
   ```bash
   npx wrangler kv key put --binding SETTINGS --remote rules --path docs/starter-rules.json
   ```
   (Edit the agency domains in that file first. Use a copy outside the repo if the list should stay private; the repo is public.)
6. **Cron triggers** are already declared in `wrangler.jsonc` (`15 12 * * *` and `30 12 * * *`) and are created when the live Worker deploys. After the first deploy, confirm both appear under the Worker's Settings, Triggers.
7. **Add the rate-limit rule** in the Cloudflare dashboard (Security, WAF, Rate limiting rules). Rate limiting is not coded:
   - If incoming requests match: URI Path equals `/api/contact` and Method equals `POST`
   - Count by IP address; the free plan offers a short window (10 seconds in my understanding; check the screen), so use the largest limit the screen allows that stops floods, for example 5 requests per window
   - Action: Block, for the longest duration offered
   - A blocked visitor sees the form's failure message with the phone number.
8. **Choose the outside check-in service** (free tier, texts both phones and emails). Create two checks: a **heartbeat** expected daily by about 7:45 a.m. Eastern (give its ping address to `HEARTBEAT_URL`) and a **failure** address that alerts at once (`ALERT_URL`). The Worker only does a plain GET, so any vendor that supports this works.
9. **Gmail filters** (Bryn or Claude): label and keep in the inbox "[Screened]" and "[Form Test" subjects.

## Launch checklist
- [ ] Steps 1 to 9 above done
- [ ] `node --test tests/` passes and `npm run build` succeeds
- [ ] After deploy, post a real test from a phone on the live site; confirm it arrives in both inboxes with Reply-To set and a row appears in the database
- [ ] Test the acknowledgement: the form must refuse to send with the box unchecked
- [ ] Test the alarm path: open the `ALERT_URL` address once by hand and confirm both phones are alerted
- [ ] Confirm the morning test arrives and the heartbeat shows green the next morning
- [ ] Confirm the next morning's digest arrives at 7:30
- [ ] Confirm the privacy policy mentions Turnstile, Web Analytics, and the retention schedule
- [ ] Confirm the old Gravity Forms and Mailgun stop being used at cutover; Seventh Wall confirms deletion in writing
- [ ] Put a reminder on the calendar for March 2027 to change the cron hours in `wrangler.jsonc` from 12 to 11 (daylight time; hours only)

## Running the tests and a local trial
```bash
node --test tests/
```
The tests use Node's built-in SQLite as a stand-in for D1 and mock Google, Turnstile and the check-in service. They cover: validation, every screening rule, all outcomes in the table above, the Google sign-in (RS256) and its scope, no personal data in logs, preview mode, the morning test, the digest and the purge.

To run the Worker locally with a local database (nothing remote, nothing real is sent), create a file `.dev.vars` (it is git-ignored) with fake values and these three override variables pointing at a local stand-in server: `GOOGLE_TOKEN_URL`, `GMAIL_SEND_URL`, `TURNSTILE_VERIFY_URL`. Then:
```bash
npm run build
npx wrangler d1 migrations apply pathfinder-forms --local
npx wrangler kv key put --binding SETTINGS --local rules --path docs/starter-rules.json
npx wrangler dev --local --test-scheduled
```
Trigger a cron by hand with `curl "localhost:8787/cdn-cgi/handler/scheduled?cron=30+12+*+*+*"`. If the installed local runtime is older than the compatibility date in `wrangler.jsonc`, add `--compatibility-date` with the date it names (local only).

## Known limits and decisions
- **Admin@ sends all mail.** A flood could hit admin@'s daily Gmail limit; the rate-limit rule and Turnstile guard against that. Changing admin@'s password is a planned event (see the plan), not automatic.
- **Bot-check failures are not emailed.** A Turnstile "not human" result and a filled trap field are saved but not emailed, to keep floods out of the inboxes. A real person who fails Turnstile sees the phone number. Both are listed in the digest.
- **Digest check window.** The delivery check ignores rows less than 10 minutes old so a message being processed is not reported as lost.
- **Logs.** Cloudflare may record the request path and time for the Worker; the Worker itself never writes message content. Do not add `console.log` of any submission field.
- **Preview mode** (`PREVIEW_MODE` in `wrangler.preview.jsonc`) validates exactly as live, then sends and stores nothing and answers "Preview: nothing was sent."
