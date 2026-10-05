# Redesign

The new look replaces the old one one activity at a time. This guide says what exists, how to move an activity to the new look and what to check.

State: the Home, Memorize and Sprint Math use the new look. The other activities still have the old toolbar (55px, dark) and are not changed.

## What the new look is

Light surfaces, dark ink, Lexend for titles and buttons, Atkinson Hyperlegible for text, 44px minimum touch targets, rounded corners (10 to 14px), no black panels. The design is in the Sugarizer Redesign canvas (Home, Memorize, Sprint Math, Dashboard). The Dashboard (Sugarizer Server) is not part of this repository.

## Files

| File | What it is |
|---|---|
| `css/tokens.css` | The design values as CSS custom properties (colours, fonts, radii, shadows, `--toolbar-h`, `--target`) and the bundled fonts (`@font-face`). Load it first. |
| `fonts/` | Lexend (400, 500, 600, 700) and Atkinson Hyperlegible (400, 700), latin and latin-ext, woff2. Open font licence, texts in `fonts/OFL-*.txt`. Nothing is loaded from the network. |
| `css/sugar-redesign.css` | The shared look of an activity: light toolbar and palettes, buttons, fields. Loaded after the sugar-web sheets. |
| `css/redesign/home-*.css` | The Home: top bar and search (`home-shell`), the ring (`home-ring`), popups, prompts and dialogs (`home-popups`), list and Journal (`home-listview`), settings and login (`home-settings`), first launch tutorial (`home-tutorial`). |
| `scripts/sync-sugar-redesign.js` | Adds the two links to an activity's `index.html`. |

Token names to know: `--ink`, `--ink-soft`, `--surface`, `--bg`, `--tile`, `--control`, `--line`, `--accent`, `--ok`, `--bad` (and `--bad-tint`, `--ok-tint`). The error colour is `--bad`, not `--danger`, because Bootstrap defines `--danger` itself.

## Move an activity to the new look

1. Run `node scripts/sync-sugar-redesign.js <Name>` (the folder name without `.activity`). It adds `../../css/tokens.css` before the sugar sheets and `../../css/sugar-redesign.css` after them. `--check` only reports. The script refuses an activity without the standard sugar-96dpi and sugar-200dpi links (Etoys).
2. Set the bar height in the activity's `css/activity.css`: `:root { --toolbar-h: 64px; }`. The default is 55px, which keeps the old size.
3. Look for a hard-coded toolbar height in the activity (see the list below) and make it follow `--toolbar-h`, or read it from `toolbar.offsetHeight`.
4. Replace colours written in the activity's own CSS and in its script (`style.background = "#777"` and so on) with the tokens. Prefer classes in the stylesheet over inline styles in the script. Keep sizes and animation logic in the script.
5. Check the activity in a browser at 1280x800, 1024x700, 1200x900 and a phone (390x844): toolbar, palettes, the screen of the game, dialogs, the end state.
6. Check simple mode (docs/simple-mode.md): the four settings cases still give the same buttons, and nothing flashes.
7. Run the activity with a mouse and with touch.

Colours that the script or the user's colour set inline (the user colour, `gameOver` text, filter icons) need `!important` in the stylesheet to be overridden. Say so in a comment when you use it.

## Toolbar icons

Activity toolbar icons are white SVGs made for the old dark bar. `sugar-redesign.css` draws them again on a pseudo element with `filter: invert(1) hue-rotate(180deg)`, so they appear dark. This works for the monochrome icons. An icon that has its own colours may look wrong after the inversion: give that button its own dark icon.

On the Home, icons are recoloured through `--stroke-color` and `--fill-color` (set by `.xo-colorN` classes or inline by the icon component). An icon with a hard-coded white colour in its file does not follow them: edit the file (use `&stroke_color;` and `&fill_color;` entities) or override the variable with `!important`.

## Hard-coded toolbar height

Moving to a 64px bar breaks code that assumes 55px. Activities where it was found:

- JavaScript with a literal 55: Abacus, Measure, MediaViewer, Reflection, Speak, XOEditor, SharedNotes, EbookReader, VideoViewer, TurtleBlocksJS.
- CSS with a literal 55 or 75 (toolbar, canvas offset, `calc(100vh - 55px)`): 3DVolume, Calligra, Calculate, Chart, ColorMyWorld, Curriculum, Fototoon, MindMath, Pomodoro, Record, Story, TankOp, VideoViewer, Vote.
- Palettes with `55px` inline: Calculate, Calligra, Measure.
- About fifteen more read `toolbar.offsetHeight` and need nothing (Chess, Tangram, MindMath, Falabracman, MazeWeb, Clock, TamTamMicro, HumanBody).

## Cannot be restyled with CSS alone

Etoys (drawn inside the Squeak canvas), Scratch (React GUI), Exerciser (React build). TurtleBlocksJS and Jappy have their own layout and toolbar code. Each of these needs its own look at what is possible.

## Offline

The service worker (`sw.js`) caches files as they are used, so the fonts are cached after the first visit and work offline. Checked: Home and Memorize load offline with Lexend and Atkinson Hyperlegible.

## Checks used so far

- All 61 activities open without a page error (Chromium, 1024x700, no server).
- Memorize: mouse and touch, same-group tap feedback, mismatch, match; Sprint Math: right and wrong answer, low time, game over, four simple-mode cases, no flash.
- Home: ring, popup, list, Journal with and without entries, settings and its dialogs, first screen, new user, tutorial, at 1280x800 and 390x844.
- Not run: the unit tests (`npm run test:unit`) and the Playwright e2e suite, because the test runner is not installed in the working environment, and screenshot baselines.
