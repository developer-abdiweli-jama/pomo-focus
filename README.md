# Pomo Focus

A local-first Pomodoro and goal planning app. Goals, focus sessions, distractions, reviews, and settings are stored in the browser with IndexedDB. There is no account or backend.

## Run locally

Use Node.js 22 or newer and npm:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The production build can be checked with:

```sh
npm run build
npm run preview
```

## Checks

```sh
npm test
npm run lint
npm run test:e2e
```

The end-to-end suite builds the production app, serves it locally, and runs the flows in Chrome. It uses `/usr/bin/google-chrome` by default; set `CHROME_EXECUTABLE_PATH` if Chrome is installed elsewhere.

## Local data

The app stores records in IndexedDB on the current browser profile. Use **Settings → Export data to JSON** to back up records before clearing browser data or changing profiles. The service worker caches the application shell and production assets for offline use after the first online visit.

## Run automatically on this Ubuntu PC

The local production preview is available at `http://127.0.0.1:4173`. On the configured PC, a user service starts it automatically and restarts it if it exits. The app window opens when the desktop session starts. The server listens on loopback, so it is not exposed to other devices or the public internet.

After changing the app, rebuild it:

```sh
npm run build
```

Manage the local service:

```sh
systemctl --user status pomo-focus.service
systemctl --user restart pomo-focus.service
systemctl --user stop pomo-focus.service
systemctl --user start pomo-focus.service
journalctl --user -u pomo-focus.service -f
```

The service and desktop auto-start are workstation setup, not part of the hosted app bundle. See `../plan.txt` for the current local-first scope and deferred account/cloud work.
