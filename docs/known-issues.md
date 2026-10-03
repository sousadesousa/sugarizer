# Known issues and follow-ups

Open items found while testing the 2026 cleanup rounds. None of them block the
branches that were tested. Remove an item once it is fixed.

## Desktop app (Electron, `main.js`)

These were found by testing the validation code in Node. The Electron app
itself was not run.

- **Saving an empty text crashes the main process.** `save-file-dialog` accepts
  `{filename: "a.json", text: ""}`, then `saveFile` does
  `if (arg.text) ... else Buffer.from(arg.binary)`, which throws a `TypeError`.
  Either the validator should require non-empty content, or `saveFile` should
  test `typeof arg.text === "string"`.
- **External links are passed raw.** `isExternalUrl` accepts strings such as
  `http:\\a`, `https:a` or ` http://a`, and the raw string is passed to
  `shell.openExternal`. Pass `new URL(url).href` instead. The scheme is still
  http(s), so the risk is low.
- **Overwrites in a chosen folder.** In a folder the user picked, the page can
  overwrite an existing file that has an allowed extension, because there is no
  existence check. On Windows, reserved names such as `CON.json` are not
  rejected.
- **Large temp files freeze the app.** `create-tempfile` with a text of about
  280 MB blocks the main thread for about 3 s while it decodes, before refusing
  it.
- Sub-frames and the devtools window are not covered by the navigation guard.

## Activities

- **Jappy: saved code is not restored.** `serialize()` in
  `activities/Jappy.activity/js/codeeditor.js` stores the CodeMirror `Doc`
  objects of `window.files` instead of their text. On reopen,
  `editor.setValue()` gets an object and the editor stays empty
  (`string.split is not a function`). `codeeditor.js` is generated, so the fix
  belongs in its source. This was already broken before the cleanup round.
- **Video Viewer on the Sugar desktop is untested.** See
  `activities/VideoViewer.activity/README.md`.

## Lint

- **Some activity code issues are not fixed yet.** A few lint rules are turned
  off only for the files that break them, using the `overrides` blocks at the
  end of `.eslintrc.json`. Those blocks are the to-do list (exact lines in
  [client-cleanup-report.md](client-cleanup-report.md)):
  - Tangram: duplicate keys, global assign, self assign, multiline.
  - TurtleBlocksJS: unreachable code, fallthrough, unsafe negation.
  - Stopwatch: octal literal.
  - MazeWeb: unreachable code.
  - Chart: fallthrough.
  - PhysicsJS: assignment in a condition.
  - Curriculum and Vote `Export.js`: async promise executors.
  - Speak `sax.js`: setter return.
- **Possible undefined names.** These are declared as globals but are not
  defined in their activity, so some may be real bugs:
  - DollarStreet `reject`
  - Story `resolve`
  - FractionBounce `Score`
  - Gridpaint `colors`
  - HumanBody `canvasPosition`, `rayCaster`, `mousePosition`, `gearSketch`
  - MazeWeb `control`
  - Planets `planets`
  - Pomodoro `handleWork*Click`, `handleBreak*Click`
  - SharedNotes `textvalue`
  - several TurtleBlocksJS names
