# Sugarizer fork: handoff summary (2026-10-01)

Paste or point a new session at this file to continue the work.

## Repositories

Public forks of llaske/sugarizer and llaske/sugarizer-server. No pull requests were opened and nothing
was sent upstream.

- `sousadesousa/sugarizer` (client) and `sousadesousa/sugarizer-server` (server).
- Upstream released Sugarizer 2.0.0 on 2026-07-17 (the Enyo home screen replaced by Vue 3). The fork's
  `master` is 1.9.0 and was not touched.
- Working rules: no pull requests unless asked; new branches are fine; commit messages end with the
  Co-Authored-By and Claude-Session lines; no model names in commits or code.
- All work is pushed and nothing was left uncommitted.

## Server branches (`sugarizer-server`, all merged in `integration/all`)

- `ccr-89f9689d-58eykd`: auth fixes (token bound to its user, scrypt passwords, no regular-expression
  injection in login), `scripts/hash_passwords.js`.
- `security/hardening`: admin sign-up bypass through `X-Real-IP` fixed, secret from the environment or
  `secret.key`, headers and cookie flags, login rate limit.
- `ci/github-actions`: workflow (Node 22, MongoDB), lint fixes.
- `deps/upgrade`: MongoDB driver 3.5 to 6, Express 4.21, EJS 3, ws 8, multer 2, ESLint 9
  (see `docs/migrate.md` in the server repository).
- `docker/modernize`: multi-stage Node 22 image, compose file with `mongo:8.0`.

## Client branches (`sugarizer`)

On upstream 2.0.0 (current):

- `upgrade/2.0`: exact copy of upstream v2.0.0.
- `2.0/vendored-libs`: axios 0.34.0 in 58 files.
- `2.0/tests`: Playwright end-to-end tests and workflow, fix for a RequireJS loading race in 4 activities.
- `2.0/paint`: Paint libraries from pinned npm packages (`npm run libs:update` / `libs:check`).
- `2.0/paint-vue`: Paint rewritten with Vue 3, stamp drag bug fixed.
- `2.0/offline`: service worker.
- `2.0/electron`: Electron 44.
- `integration/2.0`: all of the above merged; 79 end-to-end tests pass locally and on GitHub CI (Jappy is
  an expected failure).
- `activity-guide`: this folder and the Activity Guide (built from `integration/2.0`).

On 1.9 (older, kept as reference): `electron/upgrade`, `ci/tests`, `pwa/offline`, `deps/vendored-libs`,
`activities/paint`, `activities/paint-vue`, `integration/all`. `integration/all` does not include the
two Paint branches.

## Documents

- Plan and status: https://claude.ai/code/artifact/646d5bd1-41a8-413d-962b-53644dd5c176
- Earlier fork status and disclosure note: https://claude.ai/code/artifact/68af57a0-3983-43a0-9f13-3c50e95d1da8
- Activity Guide page: https://claude.ai/artifact/AfGBJDfReByticPyE6aSSf (Doc version:
  https://claude.ai/code/artifact/33ccab2f-1164-4492-9274-8264329b7504). Its source, screenshots and the
  scripts that made them are in `activity-guide/`.

## Not verified

- Phones, tablets, the Android and iOS apps, Electron on Windows and macOS (only Linux with a virtual
  display and emulated touch).
- `2.0/vendored-libs` and `2.0/electron` have no CI run (upstream's 2.0 has no test workflow); they were
  checked locally.
- The server with the 2.0 client: only sign-up, login, Journal, activities and users calls were
  exercised; classrooms, assignments and the dashboard were not.
- Upstream's own Jest tests and lint could not run here; they were left untouched.
- Jappy throws an error on a new instance in 2.0 (not investigated).
- Activity Guide ages and categories are suggestions, not tested with children.
- The server tests ran against a patched FerretDB build (real MongoDB was not available); that build and
  its patches were not saved. GitHub CI uses real MongoDB.

## Raspberry Pi 4 GB question (answered in the session)

- Server: Node about 100 to 120 MB (measured); MongoDB likely 100 to 300 MB (not measured). Client files
  are 630 MB, the server is about 47 MB with its dependencies.
- Pi 4 catch: MongoDB 5.0 and later need ARMv8.2, so a Pi 4 needs MongoDB 4.4.x (untested with the
  driver 6 server). The Docker compose file on `docker/modernize` uses `mongo:8.0`, which will not start
  on a Pi 4.
- Browser memory (JS heap): home screen 7 MB, simple activities 8 to 11 MB, Scratch 76 MB, Etoys 150 MB.

## Open decisions and possible next steps

1. Move the fork's `master` to `integration/2.0` after review?
2. Make a Pi-friendly Docker setup (older MongoDB, memory cap) on a new branch?
3. Look at the Jappy error, or at the Electron navigation guards that 2.0 still lacks?
4. Make the Abacus decimal 3-rod setup (Rods 3, Top 0, Bottom 9) the default so it opens ready for a young
   child (asked for an almost 6-year-old in a Montessori setting who likes numbers); on a new branch.
