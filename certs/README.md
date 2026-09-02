# certs

Store credentials live here and **are not committed**. `.gitignore` ignores
everything in this directory except this file.

This repository is public, so a key committed here is a compromised key even
if the commit is reverted — it was served to anyone watching in between. If
that ever happens, rotate the key in the Google Cloud console rather than
deleting the commit.

## `play-service-account.json`

The Play Console service account key, referenced by `submit.production.android.serviceAccountKeyPath`
in `eas.json`. To create it:

1. Play Console → **Setup → API access** → link or create a Google Cloud project.
2. Create a service account, grant it the **Release manager** role.
3. In Google Cloud → **IAM & Admin → Service Accounts → Keys → Add key → JSON**.
4. Save the downloaded file here as `play-service-account.json`.

Grant it the narrowest role that can publish to the track you submit to.
It is a key that can ship code to your users under your name.
