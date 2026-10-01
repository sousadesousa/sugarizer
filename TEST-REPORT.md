# Test report: activities/abacus-default (5e1d1f33)

Verdict: **READY TO MERGE** (no defects found; test-coverage gaps noted below, non-blocking).

## 1. Diff and test review: PASS (with gaps)
- Product change is 2 lines in `activities/Abacus.activity/js/game.js`: new `defaultAbacus = 0`; `initActivity` calls `initAbacus(this.defaultAbacus)` instead of `Suanpan()` when there is no journal data. The journal path (`initAbacus(data.mode)` + `customarr` + restore) is untouched; `clear()` uses `abacustype` and `resize()` uses the saved `mode`, both untouched.
- Test 1 (new instance: only #decimal-button is #808080) would catch a regression of the default.
- Test 2 (Suanpan restored from journal) would catch a regression of restore.
- Gaps (not covered by the spec): Custom (mode 10) restore, clear keeping the abacus, resize keeping abacus/beads. I verified these manually (section 3).

## 2. Flakiness: PASS (1 cold-start flake)
`npx playwright test test/e2e/abacus.spec.js --repeat-each=3`
- Run 1 (first run after `npm ci`): 5 passed, 1 failed. "a new instance opens on the Decimal abacus" timed out inside `helpers.createUser` (the `waitForTimeout(800)` loop, helpers.js:65), before reaching Abacus code.
- Runs 2 and 3: 6/6 passed (25.3 s). Not reproduced; unrelated to the change.

## 3. Exploratory (throwaway Playwright script, python http.server :8090, no-server mode): all PASS
| Check | Result |
|---|---|
| New instance highlighted buttons | `['decimal']` only; screenshot shows 15 rods x 10 beads (Decimal), not Suanpan |
| Clear button | still `['decimal']` |
| Drag a bead, then resize 1024x700 -> 700x500 -> 1024x700 | still `['decimal']`; canvas pixel-identical to pre-resize (moved state differs from cleared state, so the bead really moved) |
| Switch to Custom, Stop, wait 2.5 s, reopen `&o=<objectId>` | `['custom']` restored |
| Console/page errors (excluding network) | none |

## 4. Full suite: PASS
`CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --workers=2`: **148 passed (4.8 m)**, 0 failed. Jappy did not fail in this environment and Last One Loses passed first time.
