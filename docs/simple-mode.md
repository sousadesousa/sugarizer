# Simple mode

Simple mode hides the advanced buttons of an activity so that a small child only sees what is needed to play. The activity palette (rename, description, sharing), settings, editors, fullscreen and help are examples of what it hides.

It changes what is shown, nothing else. It is a guard against accidental taps, not a lock: it is not a security feature.

This guide has three parts: [how to turn it on](#turn-it-on) (teachers and administrators), [how it works](#how-it-works) and [how to add it to another activity](#add-it-to-another-activity) (developers).

## Activities that support it

Seven activities support simple mode. In the others the setting has no effect yet.

| Activity | Buttons a child sees in simple mode | Hidden |
|---|---|---|
| Memorize | New game, Stop | Activity, Network, Game type, Game size, Editor and its buttons, Fullscreen, Help |
| Blockrain | Play, Stop | Activity, Theme, Fullscreen, Help |
| Last One Loses | New game, Stop | Activity, Network, Levels, Switch player, Fullscreen, Help |
| Tank Operation | Stop | Activity, Fullscreen, Help |
| Implode | New game, Replay, Undo, Redo, Stop | Activity, Levels, Fullscreen, Help |
| Abacus | Clear, Stop | Activity, Abacus list, Custom, Copy, Fullscreen, Help |
| Clock | Set Time, Set Time to target, Stop | Activity, Clock styles, Write time/date/seconds, Show hours/minutes, Global time, Fullscreen, Help |

Things to know before handing a device to a child:

- **Options stay as they were.** The buttons that choose an option are hidden, so simple mode shows whatever was chosen last. In Abacus choose the abacus type and the number of rods first (the default has 15 rods). In Clock choose the clock style and display options first. In Memorize choose the game type and size first. Do this in full mode.
- **Stop is always visible**, so a child can always leave an activity.
- **Last One Loses** has private and shared buttons inside the network palette. They cannot be reached because the Network button is hidden.

## Turn it on

### On one device

1. Open **Settings** (the user menu, then My Settings).
2. Open **Simple mode**.
3. Tick **Hide advanced buttons in activities** and press OK.

Activities opened after that show their simple toolbar. Untick the box to go back. The setting belongs to the user of this device. It is stored in the browser, so a different browser or device needs its own switch.

The entry is not shown to a student who is connected to a server, because for students the setting comes from their classrooms (see below).

### For a classroom (server)

Administrators and teachers choose it in the dashboard. Administrators can add classrooms, and both can edit them.

1. Open **Classrooms** and edit a classroom (or add one).
2. In **Activity toolbar**, choose **Full** (the default) or **Simple**. This is the default for every activity of the classroom. For a kindergarten classroom choose Simple.
3. For one activity that needs a hidden button, use the small menu next to the activity in the **Activities** list: **Classroom default**, **Simple** or **Full**. The menu only appears for activities that are ticked.

Students get the result the next time their activity list loads, usually at login or when they open the home screen. They cannot change it.

How classrooms combine:

- Inside a classroom, the choice for an activity wins over the classroom default.
- A student in several classrooms gets **Simple** for an activity if any classroom that assigns it asks for Simple.
- A classroom that does not assign an activity has no say about it.

Teachers and administrators who are connected to a server use the on-device switch for themselves.

## How it works

### Settings

An activity reads two keys of the user settings (`localStorage`, key `sugar_settings`):

| Key | Value | Meaning |
|---|---|---|
| `toolbarMode` | `"simple"` or `"full"` | Default for all activities. Missing means full. |
| `toolbarOverrides` | `{ "<activity id>": "simple" or "full" }` | Mode of one activity. Wins over `toolbarMode`. |

Any other value is ignored, which gives full mode. The order is: override of the activity, then `toolbarMode`, then full.

### What hides the buttons

A button is hidden when it has the attribute `data-toolbar="advanced"`. In simple mode a rule `.toolbar-simple [data-toolbar="advanced"] { display: none !important; }` applies.

- A small script, `lib/sugar-web/activity/toolbarmode.js`, is loaded in the `<head>` of the activity before anything else. It reads the settings and the activity id (the `a` parameter of the address) and applies the rule before the page is drawn, so the full toolbar never flashes.
- `activity.js` of the same `sugar-web` copy applies the same rule when the activity starts. This is a safety net with the same result.

### Where the values come from

- **On a device:** the Simple mode screen (`js/screens/settings-simplemode.js`) writes `toolbarMode`.
- **For a student:** the server adds a `toolbarMode` property to each activity it returns to a student (`GET /api/v1/activities`). The client (`js/modules/activities.js`) stores them as `toolbarOverrides` in the settings and sets `toolbarMode` to full, which replaces older values. Teachers and administrators receive the list unchanged and their own settings are left alone.

### Server data

A classroom has two optional fields, set from the dashboard or the classroom API (`POST` and `PUT /api/v1/classrooms`):

```json
{
  "name": "Kindergarten",
  "activities": ["org.sugarlabs.Blockrain", "org.sugarlabs.Clock"],
  "toolbarMode": "simple",
  "toolbarOverrides": { "org.sugarlabs.Clock": "full" }
}
```

The server keeps only valid values: a `toolbarMode` that is not `simple` or `full` is removed, and an override is removed if its value is invalid or its activity is not in `activities`. The rules are in `api/controller/classrooms.js` (`cleanToolbar`) and `api/controller/activities.js` (`resolveToolbarMode`) in Sugarizer Server, with unit tests in `api/test/unit/toolbarMode.js`.

## Add it to another activity

Every activity ships its own copy of `sugar-web` in `lib/sugar-web/`, so the hook is added per activity. For most activities the file `lib/sugar-web/activity/activity.js` is identical, which makes the patch mechanical. Exerciser, Human Body, Jappy and Turtle Blocks JS have their own variants and need a look, and Etoys has no `sugar-web` at all.

1. **Copy the script.** Copy `lib/sugar-web/activity/toolbarmode.js` to `activities/<Name>.activity/lib/sugar-web/activity/`.
2. **Load it first.** In the `<head>` of the activity's `index.html`, add as the first element:
   ```html
   <script src="lib/sugar-web/activity/toolbarmode.js"></script>
   ```
3. **Add the safety net.** In the activity's `lib/sugar-web/activity/activity.js`, copy the two functions `activity.getToolbarMode` and `activity.applyToolbarMode` from `activities/Blockrain.activity/lib/sugar-web/activity/activity.js`, and call `activity.applyToolbarMode(environment);` right after `user = environment.user;`.
4. **Tag the buttons.** Add `data-toolbar="advanced"` to every toolbar element a small child should not see, including the `<hr/>` dividers of a toolbar. Tag toolbar elements only, never parts of the game. Elements written by Vue (`sugar-toolitem`) take the attribute like any other.
5. **Decide what stays.** Keep what is needed to use or play, and Stop. If a hidden button chooses an option, remember that the child will get the last choice (see the table above).
6. **Check in a browser** for these four settings, with no page errors:
   - no setting: every button is visible;
   - `toolbarMode: "simple"`: only the buttons you kept are visible;
   - simple with `toolbarOverrides: { "<activity id>": "full" }`: every button is visible;
   - an invalid value such as `"bogus"`: every button is visible.

   Also use the kept buttons: play a move, and make sure a child cannot enter a mode that has no visible way out.

## Limits and troubleshooting

- **Nothing changes on a device after an update.** The service worker may serve the old files. Reload twice, or clear the site data.
- **A student still sees every button.** The activity must be one of the seven above, the classroom must assign it, and its classroom (or override) must say Simple. The student's activity list reloads at login, so log in again after a change.
- **Server update.** Sugarizer Server needs a restart, and a rebuild of its Docker image if it runs in Docker, because the server code is copied into the image. The client folder only needs the new files.
- **Not a lock.** A person who knows how can change the setting in the browser. Use it to simplify, not to protect.
- **Running over plain http.** Simple mode works without https. A related fix: the first-screen tutorial no longer needs `crypto.randomUUID`, which browsers only provide on https and localhost.

## Related changes in Memorize

Two fixes came with simple mode:

- **Cards flip with a mouse on a touch screen.** Before, a device with a touch screen listened only to touches, so a mouse click did nothing. Memorize now handles touch and mouse, a tap flips once, and a finger that moves to scroll no longer flips a card.
- **A rejected tap shows what to do.** In the standard game a card must be picked from each of the two groups. Tapping a second card of the same group now shakes it and highlights the other group in yellow, where before nothing happened.
