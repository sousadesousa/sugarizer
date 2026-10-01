# Sugarizer Activity Guide

A single web page listing the 61 activities of Sugarizer 2.0, each with a screenshot, a
description, a suggested age and a category, plus a tour of the Sugarizer Server admin
dashboard. Open `index.html` in a browser: it needs no server (the text font comes from
Google Fonts and falls back to system fonts offline).

Ages and categories are suggestions, not Sugarizer's. They come from each activity's
welcome text and from opening it; they were not tested with children.

## Files

- `index.html`: the page (built, do not edit by hand)
- `img/NN-name.jpg`: one screenshot per activity (NN = position in `activities.json`)
- `admin/*.jpg`: screenshots of the dashboard pages
- `source/acts_data.py`: category, age, needs and description of each activity
- `source/site_template.html`: page template (CSS and JavaScript)
- `source/build.py`: builds `index.html` (`python3 activity-guide/source/build.py`)
- `tools/`: scripts that made the screenshots and checks (see below)

## Update the guide

1. Add or change an activity in `source/acts_data.py` (the build stops if an activity of
   `activities.json` is missing there).
2. Take new screenshots: serve the repository (`python3 -m http.server 8090` at its root)
   and run `node activity-guide/tools/shots.js <output folder>`; rename or copy the
   files to `img/NN-name.jpg`.
3. Run `python3 activity-guide/source/build.py`.

## Tools

They use Playwright and a Chromium (`/opt/pw-browsers/chromium`, change it if yours is
elsewhere). Paths and ports are the ones used when they were written:

- `shots.js`, `shots2.js`: screenshot every activity at 1024 x 640 on a static server at
  `127.0.0.1:8090`, running in no-server mode (the second adds content to Paint, Physics JS,
  Gears, Get Things Done, 3D Volume and Human Body)
- `dashshots.js`, `dlogin.js`: create sample users and a classroom on a running Sugarizer
  Server (`127.0.0.1:8080`) and screenshot the dashboard pages
- `mem.js`: memory and download size of the browser for the home screen and some activities
- `v2-smoke.js`, `v2-server.js`: Sugarizer 2.0 start-up, sign-up and open Paint, without and
  with a server
- `collab-paint.js`: two users share Paint through a server; usage:
  `node collab-paint.js Paint.activity Paint.activity` (host folder, guest folder)
- `electron-v2.js`: the desktop app under a virtual display (`xvfb-run`), creates a user
  and draws in Paint
