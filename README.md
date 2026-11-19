# Tal's Recipes

Tal's Recipes is a React Progressive Web App for saving, searching, and cooking along with recipe videos from Instagram, TikTok, Facebook, and YouTube.

## Development

```bash
npm install
npm run dev
```

Run `npm run lint` for the TypeScript check and `npm run build` for a standard production build.

## GitHub Pages deployment

The `main` branch is deployed automatically by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The Pages build runs the type check and `npm run build:gh-pages`, which uses relative asset URLs for the repository site:

<https://michaelohava.github.io/TalsRecipes/>

The workflow requires GitHub Pages to use **GitHub Actions** as its source. It needs `pages: write` and `id-token: write` permissions, which are declared in the workflow.

## Installing on iPhone

1. Open the deployed HTTPS URL in Safari.
2. Tap **Share**, then **Add to Home Screen**.
3. Keep **Open as Web App** enabled and tap **Add**.

The app includes an installable web manifest, service worker, Apple touch icon, standalone display mode, and iOS-specific metadata. iOS storage and offline behavior are controlled by Safari and can be cleared from iPhone Settings.

Android/Chromium: once installed, supported links can appear as **Tal's Recipes** in the system share sheet through the Web Share Target manifest.

iPhone/iPad: Safari does not currently register Web Share Target PWAs in third-party app share sheets. Create the iPhone Shortcuts workflow described in the install guide (the app will also explain the exact URL construction). The shortcut can receive an Instagram reel URL and open **Tal's Recipes** directly in the recipe extractor.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the application and deployment design.
