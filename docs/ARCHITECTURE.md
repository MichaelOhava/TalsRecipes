# Architecture

## Application

- `src/main.tsx` is the browser entry point. It mounts the React application and registers the generated service worker.
- `src/App.tsx` contains the user-facing recipe experience and application state.
- `src/index.css` contains the global styling and Tailwind layers.
- `public/` contains static icons and PWA assets copied into the production bundle.
- `index.html` supplies the document shell, responsive viewport, theme color, and iOS Home Screen metadata.

## Build and hosting

Vite bundles the React application. `vite-plugin-pwa` generates `manifest.webmanifest` and the Workbox service worker during production builds. `vite.config.ts` uses `base: './'` for GitHub Pages so assets resolve below `/TalsRecipes/`, and caches the generated application shell plus Google font resources.

The Pages workflow:

1. Installs dependencies with Node 20.
2. Runs the TypeScript check.
3. Builds with `GITHUB_PAGES=true`.
4. Uploads `dist/` as a Pages artifact.
5. Deploys the artifact using the GitHub Pages environment.

GitHub Pages provides HTTPS, which is required for service workers and installable PWAs. The app does not require a separate server for its static shell; runtime API behavior remains subject to browser network and provider CORS policies.

## PWA lifecycle

`registerSW({ immediate: true })` registers the generated service worker on startup. The service worker uses `autoUpdate`, so a newly deployed bundle can update the installed app without requiring an App Store release. Safari's Add to Home Screen flow uses the manifest and Apple metadata to launch the site in standalone mode.

## Incoming share target

The web manifest declares an HTTP GET share target for `title`, `text`, and `url`. On GitHub Pages, the target is `/TalsRecipes/`; the app reads normal query parameters and hash parameters, finds a social URL in shared text, immediately persists a draft to local storage, opens that draft in the import dialog, and starts link/caption extraction automatically. Saving edits updates the existing draft rather than creating a duplicate. Share payloads are stripped from the browser address bar after intake.

iPhone sharing is not automatic. Safari/iOS does not expose the Web Share Target manifest entry as a third-party app share-sheet target in the way Android/Chromium does. The install guide provides an iPhone Shortcuts handoff that receives a URL, encodes it, and opens `/TalsRecipes/?url=ENCODED_URL`.
