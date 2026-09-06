# Rotating `WEBHOOK_SECRET`

Written 7 September 2026, because the current value was never saved anywhere
and the only way to set the GitHub half is to replace it everywhere.

## Why this is three places and not one

`WEBHOOK_SECRET` is a shared secret. Three parties hold a copy, and all three
have to agree or the traffic between them is rejected:

| Where | Who reads it | How it gets there |
| --- | --- | --- |
| Supabase function secrets | `send-welcome-email`, `send-newsletter-email`, `send-weekly-digest` | `supabase secrets set` |
| Two Postgres trigger functions | `notify_welcome_email`, `notify_newsletter_email` send it as a header | baked into the function body by a migration |
| GitHub Actions repo secret | the weekly digest workflow sends it as a header | Settings, Secrets and variables, Actions |

The value itself cannot be read back from any of them. `supabase secrets
list` returns a SHA-256 digest, GitHub never shows a secret after saving, and
the trigger bodies are only readable by someone who can already read
`pg_proc`. That is the correct design and it is why a lost value means a
rotation rather than a lookup.

## What breaks while you do it, and for how long

Between changing the Supabase function secret and applying the migration,
the trigger functions are sending a value the functions no longer accept.
Every welcome and newsletter email queued in that window is rejected with a
401.

**Nothing raises and nothing retries.** `pg_net` is fire and forget, so a
dropped email surfaces nowhere: no failed job, no red build, no error in the
app. The first sign would be a member asking why they never got an email.

Two things make this survivable:

- **Welcome email is recoverable.** `send-welcome-email` stamps
  `welcome_email_sent_at` on every successful send, and
  `backfill-welcome-emails` finds every confirmed user where that column is
  still null. Anyone who signs up during the window gets their email late
  rather than never.
- **Newsletter email is not.** An article inserted during the window sends
  nothing and there is no backfill for it. So do not publish an article
  while rotating. That is the whole mitigation.

Realistically the window is the time between two commands, so keep them
back to back and do it when you are not also publishing.

## Before you start

Generate the new value as hex. Base64 can contain `+`, `/` and `=`, which are
all legal in an HTTP header but are one careless quote away from trouble in
SQL and in a shell. Hex has none of those characters:

```bash
openssl rand -hex 32
```

**Put it in your password manager before you use it anywhere.** That is the
only step that stops this document being needed a second time.

## The rotation

### 1. Set the new secret on the Supabase functions

```bash
supabase secrets set WEBHOOK_SECRET=<new-value>
```

Verify the write landed. This prints digests, never values, so the thing to
look at is the timestamp:

```bash
supabase secrets list
```

`WEBHOOK_SECRET` should show today's date in `updated_at`.

### 2. Re-point the two trigger functions

Take `supabase/migrations/20260907120000_rotate_webhook_secret.sql`, replace
the two `__WEBHOOK_SECRET__` placeholders with the new value, and apply the
substituted copy. **Do not commit the substituted copy.** The repository is
public and a secret in version history outlives any later fix.

**Apply it through the SQL Editor**, not the CLI. `supabase db query` does
not exist in CLI 2.x (the `db` subcommands are diff, dump, push, pull, reset
and lint), and `db push` is the wrong tool here because it would apply the
committed file with the placeholder still in it. The SQL Editor also keeps
the substituted text out of your shell history and off disk.

Supabase dashboard, your project, SQL Editor, New query. Paste the
substituted file, press Run. You want `Success. No rows returned`.

The file guards itself before it changes anything: if the placeholder is
still there, it raises and nothing is replaced.

One side effect to know about. Because this file lives in
`supabase/migrations/` but is applied by hand, a future `supabase db push`
will try to apply it, hit the guard and fail. That failure is safe, it
changes nothing, but it is confusing if you have forgotten why. If it gets
in the way, record the version as already applied:

```sql
insert into supabase_migrations.schema_migrations (version)
values ('20260907120000')
on conflict do nothing;
```

### 3. Verify the database half before touching GitHub

The two halves above are what actually carries user email, so prove them
before moving on. Confirm an account whose email is not yet confirmed, or
sign up a throwaway account, then read what `pg_net` got back:

```sql
select id, status_code, created
from net._http_response
order by created desc
limit 5;
```

A `200` means the trigger and the function agree. A `401` means they do not,
and you have caught it here rather than from a member.

### 4. Add both GitHub repo secrets

Settings, Secrets and variables, Actions:

| Name | Value |
| --- | --- |
| `SUPABASE_FUNCTIONS_URL` | `https://ulyduorkvikeyxtpshoq.supabase.co/functions/v1` |
| `WEBHOOK_SECRET` | the new value |

No trailing slash on the URL. The workflow appends `/send-weekly-digest`
itself, and a trailing slash gives a double slash and a 404.

### 5. Prove the digest end to end

Actions, Weekly digest, Run workflow.

**This sends real email to real Fortress members.** `send-weekly-digest` has
no dry-run mode and no recipient cap: it calls
`get_weekly_digest_recipients` and mails all of them. Run it when you are
content for that to happen, which is the same thing as saying the digest has
now fired for the first time.

A green run proves GitHub and the function secret agree. It does not prove
step 2, which is why step 3 exists separately: the workflow and the triggers
are different callers holding different copies.

## If it goes wrong

- **Welcome emails missing after the window.** Invoke
  `backfill-welcome-emails`. It only mails users whose `welcome_email_sent_at`
  is still null, so running it twice is harmless.
- **The digest run fails with 401.** GitHub and the function secret disagree.
  Re-enter the GitHub secret; it is the copy most likely to have picked up a
  stray space on paste.
- **A `401` in `net._http_response`.** The triggers and the function secret
  disagree. Re-apply step 2, checking the substitution.

## What would make the next one cheaper

Three copies is the cost of the current design, and two of them are avoidable:

- **The trigger bodies could read the secret from Supabase Vault** instead of
  carrying it literally, which would turn step 2 from a migration into a
  single `vault.update_secret` call and remove the substituted-file dance.
- **The functions could accept two secrets during a rotation**, a current and
  a next, which removes the window entirely: publish the new value as
  `WEBHOOK_SECRET_NEXT`, move every caller, then promote it. Standard
  practice, and roughly an hour of work across the three email functions.

Neither is needed to rotate today. Both are filed on the dashboard.
