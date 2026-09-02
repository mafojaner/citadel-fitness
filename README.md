
## Before you push

CI blocks on typecheck, lint, tests and a control-character scan. It runs on
push, so by the time it goes red, `main` is already red — and this repo
pushes straight to `main`.

The same four gates run locally as a pre-push hook. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

`git push --no-verify` skips it, for when you mean to.
