# Test report: branch `fix/client-cleanup`

Tested commit: `1a12334aa6efeb05181237894da03129b7cb7587` (latest on origin). Chromium 1x, Linux. **Real Electron was NOT run** (no binary/display): check 6 is Node-level testing of `navigation.js` / `ipc-validation.js` plus reading `main.js`.

## Verdict: ready to merge into master, with 4 non-blocking findings (below)

No regression found; all fixes verified. One requested check (Jappy restore, 3b) cannot pass, but it is broken identically on master (pre-existing, not introduced by the branch).

| # | Check | Result |
|---|---|---|
| 1 | Lint works, catches errors, ignore list, CI | PASS |
| 2 | Spot-check of app-code fixes | PASS |
| 3a | Jappy new instance: no page error | PASS |
| 3b | Jappy saved instance restores its content | **FAIL (pre-existing, same on master)** |
| 4 | Flaky test x30, suite x2, no blind sleeps | PASS |
| 5 | SugarL10n TypeError fixed, 8 copies | PASS |
| 6 | Electron navigation / IPC validation | PASS, minor findings |
| 7 | devDependencies | PASS |
| 8 | Full e2e, libs:check | PASS |

## 1. Lint: PASS
- Fresh `rm -rf node_modules && npm ci --ignore-scripts`, `npm run lint` exits 0; `npm run libs:check` "up to date".
- Appended `undefinedVarXYZ.foo(); const q=1; q=2;` one at a time to `js/app.js`, `activities/Jappy.activity/js/activity.js`, `activities/Vote.activity/js/components/SugarL10n.js` and `main.js`: each exits 1 with `no-undef` and `no-const-assign`. Reverted with `git checkout -- .`. An undefined call added to Chart.activity also fails.
- `.eslintignore` evaluated with ESLint's `isPathIgnored` on every tracked .js: nothing under `js/`, root scripts, `tests/` ignored; `test/chai.js` only in `test/`. Outside `lib/`, only the vendored/generated files, `*.min.js` and `Scratch.activity/` that the report lists (matches the list). Whole `Scratch.activity` is ignored (documented as build output).
- `.github/workflows/lint.yml` parses as YAML: `npm ci --ignore-scripts` then `npm run lint`, on push and pull_request. Not run on GitHub.
- Caveat (documented): activities have many rules off and ~230 library globals declared, so they are checked weakly.

## 2. App-code fixes read from the diff: PASS
- `listview.js`: the two `beforeUnmount` are merged; listener removal and timer clear both kept, `container` defined in the merged hook.
- `activities.js`: `l10n.get` became `sugarizer.modules.i18next.t`; `t` is exported and the module is set at startup.
- `sandbox.js`: `settings` is now `var`, only used locally.
- `i18next.js`: implicit globals `useI18n`/`timestampToElapsedString`/`getFormattedSize` are now local `let`; every consumer goes through the module's returned object.
- `settings-myprivacy.js`: the removed `okClicked` was the dead first duplicate; the async one (the one bound in the template) remains.
- Also `homescreen.js` `n`, `platform/shared.js` unreachable returns, unused vars: no behaviour lost.

## 3. Jappy
- **3a PASS.** Script (createUser, open Jappy with a new aid): master gives pageerror `Cannot read properties of undefined (reading 'split')`; branch gives no page error. The Jappy test is out of `knownFailures` and passes in the suite.
- **3b FAIL, pre-existing.** Create an instance, `editor.setValue('print("hello saved jappy")')`, click Stop, reopen with `&o=<objectId>`: the editor is **empty** and the page throws `string.split is not a function`, **identical on master and branch**. Cause, from `codeeditor.js`: `serialize()` stores the `window.files` values (CodeMirror `Doc` objects, not strings), so the saved JSON `text` is an object, and on load `editor.setValue(window.files[title])` passes a `Doc` to `setValue`. Saved Jappy content is not restorable on master either; the branch fixes only the new-instance error. Should be fixed upstream (generated file) separately; not a blocker for this branch.

## 4. Flaky test: PASS
- `lastoneloses.spec.js -g "shared game: the guest" --repeat-each=30 --workers=4`: **30 passed**, 0 failures.
- Full suite: run 1 **158 passed** (6.9 min). Run 2 had 157 passed and 1 failure, `abacus.spec.js "a journal instance keeps its abacus"`, **caused by me**: my throwaway lint edit (`undefinedVarXYZ`) was in the working tree during that run (the error text is `undefinedVarXYZ is not defined`). Run 3 on the clean tree: **158 passed**. So two clean full runs, both green.
- `createUser` (`test/e2e/helpers.js`): no `waitForTimeout`/`setTimeout`/sleep; only condition waits and explicit click timeouts.

## 5. SugarL10n: PASS
Vote: pushed a finished poll through the app's own `saveToHistory()` (via the Vue root; the presence broadcast after it throws offline, irrelevant), advanced `Date.now` by 5 minutes, opened History. Master: console `TypeError: Assignment to constant variable. at localizeTimestamp (SugarL10n.js:140)` twice, no date shown. Branch: no errors, shows "5 minutes ago". The diff is exactly 8 identical changes `const levels = 0` to `let levels = 0` (Abecedarium, FoodChain, LastOneLoses, Paint, TamTamMicro, TankOp, VideoViewer, Vote); no `const levels` remains in any activity; all other copies already used `let`. The Paint spec for an old timestamp passes.

## 6. Electron (Node-level only; Electron not run)
Read `navigation.js`, `ipc-validation.js`, their specs and the `main.js` diff.
- `main.js`: guard attached to `mainWindow.webContents` only; `sandbox: true` added; `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true` unchanged; IPC handlers use the validators; `LoadFile` read error handled (it only reads files picked in the open dialog). Nothing weakened. Subframes and the devtools window are unguarded, as documented.
- `isAppUrl`, ~35 hostile URLs. Refused: `..%2f`, `..%2F`, `%2e%2e`, mixed `..%2f..%2f`, `file:///C:/...`, `C|`, `file:////etc/passwd`, backslash traversal, `file://localhost/etc/passwd`, sibling prefix `sugarizer-evil`, `file://host/...`, leading space/tab, `javascript:`, `JaVaScRiPt:`, `data:`, `blob:file:`, `view-source:`, `filesystem:`. Accepted, all legitimately inside the app folder: `file://localhost/<app>/index.html`, uppercase `FILE:`, `%252e%252e` (a literal dir name), `%00`, RTL-override and full-width-dot names, 1 MB URLs. Windows path semantics could not be run here.
- `validateSaveRequest`, ~45 cases. Refused: `../`, `..\`, `a/b`, `C:a`, `a.json:stream`, NUL/newline in name, 256-char name, `.`/`..`, array/object names, missing content, relative/array/UNC directory, unchosen directory (parent, sub, `/`, different case), directory with NUL, `.sh/.exe/.html/.svg`/no extension in a chosen directory. A chosen directory (also with `..` or trailing `/`) works.
- `validateTempfileRequest`: non-string, missing and over-size refused.

Findings (minor, none blocks the merge):
1. `{filename:"a.json", text:""}` is **accepted**, but `saveFile` does `if (arg.text) ... else Buffer.from(arg.binary)`, so an empty text throws `TypeError` in the main process. Pre-existing crash path; the validator should require non-empty content or `saveFile` should test `typeof`.
2. `isExternalUrl` accepts `http:\\a`, `https:a`, ` http://a`, `http://a\0`, and `main.js` passes the **raw** string to `shell.openExternal`. Passing `new URL(url).href` would be safer. The scheme is still http(s), so low risk.
3. In a user-chosen directory the renderer can overwrite existing files with a known extension (no existence check); on Windows reserved names such as `CON.json` are not rejected. By design/low.
4. `create-tempfile` with a ~280 MB text (under the length cap, over the byte cap) blocks the main thread ~3 s while decoding before refusing. Low.

## 7. devDependencies: PASS
Commit c49003b6 removes `@babel/eslint-parser` and `eslint-plugin-vue` (package.json and lockfile). `rm -rf node_modules && npm ci --ignore-scripts && npm run lint` works. Nothing outside `package.json`/lockfile references them. `@babel/core`, `@vue/cli-plugin-babel`, `babel-jest` stay, and `test:unit`/`test:coverage` still use `vue-cli-service` (untouched, not run).

## 8. Full suite / libs: PASS
Clean full runs 158 passed (twice); `npm run libs:check` green; `npm run lint` exit 0.
