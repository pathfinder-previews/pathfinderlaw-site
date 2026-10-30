-- Contact form log. Every submission is written here BEFORE it is screened or
-- emailed. The name, email, phone and message are confidential prospective-client
-- information: they live only in this table and in the two firm inboxes, never
-- in Worker logs. No IP address is stored.
CREATE TABLE IF NOT EXISTS submissions (
  id              TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL,                 -- ISO 8601, UTC
  form            TEXT NOT NULL CHECK (form IN ('main', 'sidebar')),
  outcome         TEXT NOT NULL CHECK (outcome IN ('lead', 'screened', 'unsure')),
  reason          TEXT NOT NULL,                 -- short code, e.g. 'clean', 'agency_domain'
  is_test         INTEGER NOT NULL DEFAULT 0,    -- 1 = the morning self-test
  turnstile       TEXT NOT NULL,                 -- pass | fail | wrong_hostname | error | not_configured | skipped
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed | skipped
  delivery_at     TEXT,
  delivery_detail TEXT,                          -- error code only, e.g. 'auth', 'http_500'
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  message         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions (email, created_at);
