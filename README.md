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
