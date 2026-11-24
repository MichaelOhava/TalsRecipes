import { Language, Recipe } from '../types/recipe';
import {
  detectPlatformFromUrl,
  extractCreatorHandleFromUrl,
  formatPlatformLabel,
} from './recipeParser';

export interface IncomingSharePayload {
  url?: string;
  title?: string;
  text?: string;
}

const SOCIAL_URL_PATTERN =
  /(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:instagram\.com|instagr\.am|tiktok\.com|facebook\.com|fb\.watch|fb\.com|youtube\.com|youtu\.be)\/[^\s<>"')\]}]+/i;

export function parseIncomingShare(locationUrl: string): IncomingSharePayload | null {
  const location = new URL(locationUrl);
  const params = location.search ? new URLSearchParams(location.search) : new URLSearchParams();
  const hashParams =
    location.hash && location.hash.startsWith('#')
      ? new URLSearchParams(location.hash.slice(1))
      : new URLSearchParams();

  const title = params.get('title') || hashParams.get('title') || undefined;
  const text = params.get('text') || hashParams.get('text') || undefined;
  const explicitUrl = params.get('url') || hashParams.get('url') || undefined;
  const combinedText = [title, text].filter(Boolean).join(' ');
  const match = (explicitUrl || combinedText).match(SOCIAL_URL_PATTERN);

  let url = explicitUrl || (match ? match[0] : undefined);
  if (url) {
    url = url.replace(/[.,;!?]+$/, '');
    for (let attempt = 0; attempt < 2 && !/^https?:\/\//i.test(url); attempt += 1) {
      try {
        const decoded = decodeURIComponent(url);
        if (decoded === url) break;
        url = decoded;
      } catch {
        break;
      }
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
  }

  if (!url && !text && !title) return null;
  return { url, title, text };
}

export function createIncomingShareDraft(
  payload: IncomingSharePayload,
  lang: Language,
  now = Date.now()
): Recipe | null {
  if (!payload.url) return null;
  const platform = detectPlatformFromUrl(payload.url);
  if (!platform) return null;

  const creatorHandle = extractCreatorHandleFromUrl(payload.url) || '@shared.creator';
  const platformLabel = formatPlatformLabel(platform, lang);
  const title = payload.title?.trim() || `${platformLabel} shared video`;

  return {
    id: `rec-shared-${now}`,
    title,
    videoTitle: payload.title?.trim() || undefined,
    platform,
    sourceUrl: payload.url,
    creatorHandle,
    creatorName: creatorHandle.replace(/^@/, '') || 'Creator',
    coverImage: '',
    prepMinutes: 10,
    cookMinutes: 15,
    servings: 2,
    difficulty: 'Easy',
    tags: [platformLabel],
    summary: `${platformLabel} link shared for recipe extraction.`,
    ingredients: [],
    steps: [],
    transcript: [],
    savedAt: new Date(now).toISOString(),
    isFavorite: true,
    isCustom: true,
    videoDurationSec: 0,
  };
}
