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

Once installed, share a link or reel from Instagram, TikTok, Facebook, YouTube, or another app by choosing **Tal's Recipes** from the system share sheet. The PWA opens the recipe extractor with the shared URL or text ready for extraction.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the application and deployment design.
