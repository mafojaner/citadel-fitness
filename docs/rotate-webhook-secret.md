# Rotating `WEBHOOK_SECRET`

Written 7 September 2026, because the current value was never saved anywhere
and the only way to set the GitHub half is to replace it everywhere.

**Updated 7 September**, the same day, once the functions learned to accept
two secrets at once. The procedure below is the zero-window version this
made possible; the original single-secret version — where the three places
had to change in one uninterrupted pass — is kept at the bottom under
[The old way](#the-old-way-single-secret) in case this project is ever
rolled back to it.

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

## Why there is no window to worry about now

The three places don't have to agree at the same instant any more. All
three functions accept either `WEBHOOK_SECRET` or, when it's set,
`WEBHOOK_SECRET_NEXT` — see `supabase/functions/_shared/webhook-auth.ts`.
That turns the rotation from one uninterrupted pass into three independent
steps done at whatever pace is convenient: publish the new value as
`WEBHOOK_SECRET_NEXT` first, move the two remaining callers across at
leisure, then promote. At every point in between, a trigger or the
scheduler sending the *old* value still works, and one sending the *new*
value already works — there is no moment where a real send meets a
function that rejects it.

This is what used to be here instead: between changing the Supabase
function secret and applying the migration, the trigger functions sent a
value the function no longer accepted, and every welcome or newsletter
email queued in that window was silently dropped with a 401 that `pg_net`
— fire and forget — surfaced nowhere. See
[The old way](#the-old-way-single-secret) for the full shape of that
problem; it no longer applies to the procedure below.

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

### 1. Publish the new value as the *next* secret

```bash
supabase secrets set WEBHOOK_SECRET_NEXT=<new-value>
```

Verify the write landed. This prints digests, never values, so the thing to
look at is the timestamp:

```bash
supabase secrets list
```

`WEBHOOK_SECRET_NEXT` should show today's date in `updated_at`, alongside
the existing `WEBHOOK_SECRET`. Both are now accepted by all three
functions, so nothing anywhere is sending a value that gets rejected —
there is no rush to do the next two steps.

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

Verify before moving on. Confirm an account whose email is not yet
confirmed, or sign up a throwaway account, then read what `pg_net` got
back:

```sql
select id, status_code, created
from net._http_response
order by created desc
limit 5;
```

A `200` means the trigger is sending a value one of the two functions now
accepts. A `401` means neither does, which at this point means the
substitution in this step went wrong rather than a timing problem — both
secrets are live on the function side already.

### 3. Add both GitHub repo secrets

Settings, Secrets and variables, Actions:

| Name | Value |
| --- | --- |
| `SUPABASE_FUNCTIONS_URL` | `https://ulyduorkvikeyxtpshoq.supabase.co/functions/v1` |
| `WEBHOOK_SECRET` | the new value |

No trailing slash on the URL. The workflow appends `/send-weekly-digest`
itself, and a trailing slash gives a double slash and a 404.

Then prove it end to end. Actions, Weekly digest, Run workflow.

**This sends real email to real Fortress members.** `send-weekly-digest` has
no dry-run mode and no recipient cap: it calls
`get_weekly_digest_recipients` and mails all of them. Run it when you are
content for that to happen.

A green run proves GitHub is sending a value the function accepts. As in
step 2, a `401` here means the value pasted into GitHub is wrong, not a
race against step 1 — the function has been accepting both secrets since
before this step started.

### 4. Promote, once every caller sends the new value

At this point the triggers and the workflow are both sending the new
value, and the functions still also accept the old one as a safety net
during this step itself. Retire it:

```bash
supabase secrets set WEBHOOK_SECRET=<new-value>
supabase secrets unset WEBHOOK_SECRET_NEXT
```

`supabase secrets list` should now show today's date on `WEBHOOK_SECRET`
and no `WEBHOOK_SECRET_NEXT` entry at all. The old value is gone from
every place that held it.

## If it goes wrong

- **A `401` in `net._http_response` after step 2.** The substitution went
  wrong — check the migration file was actually applied with the real
  value, not the placeholder. This is not a race: both secrets have been
  live on the function side since step 1.
- **The digest run fails with 401 in step 3.** The value pasted into
  GitHub is wrong — it's the copy most likely to have picked up a stray
  space. Same reasoning: not a race.
- **You promoted in step 4 and something is now failing.** Something is
  still sending the *old* value and step 2 or 3 didn't actually land.
  Undo the promotion (`supabase secrets set WEBHOOK_SECRET=<old-value>`,
  re-set `WEBHOOK_SECRET_NEXT=<new-value>`) to buy back the safety net
  while you find which caller didn't move.
- **Welcome emails missing regardless of the above.** Invoke
  `backfill-welcome-emails`. It only mails users whose `welcome_email_sent_at`
  is still null, so running it twice is harmless.

## What would make the next one cheaper

One copy is still avoidable: **the trigger bodies could read the secret
from Supabase Vault** instead of carrying it literally, which would turn
step 2 from a migration-with-substitution into a single
`vault.update_secret` call. Not needed to rotate today. Filed on the
dashboard as `sec-vault`.

## The old way (single secret)

Kept for the record and in case this project is ever rolled back off
dual-secret support. Before 7 September, the three places had to agree in
one uninterrupted pass, because a function accepted exactly one value.

Between changing the Supabase function secret and applying the migration,
the trigger functions were sending a value the function no longer
accepted. Every welcome and newsletter email queued in that window was
rejected with a 401, and nothing raised or retried: `pg_net` is fire and
forget, so a dropped email surfaced nowhere — no failed job, no red build,
no error in the app. The first sign would have been a member asking why
they never got one.

Two things made it survivable rather than fixing it:

- **Welcome email is recoverable.** `send-welcome-email` stamps
  `welcome_email_sent_at` on every successful send, and
  `backfill-welcome-emails` finds every confirmed user where that column is
  still null. Anyone who signed up during the window got their email late
  rather than never.
- **Newsletter email is not.** An article inserted during the window sent
  nothing and there was no backfill for it. So the old procedure said: do
  not publish an article while rotating. That was the whole mitigation.

The old step order was: set `WEBHOOK_SECRET` directly (not `_NEXT`), apply
the migration immediately after, verify via `net._http_response`, then add
both GitHub secrets and prove the digest — all four done back to back, in
one sitting, because every gap between them was the window above. The
individual steps (the migration substitution, the SQL Editor requirement,
the GitHub secret table, the digest workflow run) are unchanged and are
the same steps used above; only the order, the pacing, and the existence
of a window are different now.
