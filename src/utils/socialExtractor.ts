import { Language, SocialPlatform } from '../types/recipe';
import {
  cleanSocialText,
  detectPlatformFromUrl,
  extractCreatorHandleFromUrl,
  extractYouTubeVideoId,
  formatPlatformLabel,
} from './recipeParser';

export interface SocialLinkFetchResult {
  ok: boolean;
  platform: SocialPlatform | null;
  normalizedUrl: string;
  title?: string;
  videoTitle?: string;
  creatorHandle?: string;
  creatorName?: string;
  captionText?: string;
  hasExplicitDescription?: boolean;
  coverImage?: string;
  audioUrl?: string;
  videoDurationSec?: number;
  reason?: 'unsupported_url' | 'login_wall' | 'offline' | 'network_error';
  message: string;
}

const TRACKING_PARAMS = new Set([
  'igsh',
  'igshid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'mibextid',
  'is_from_webapp',
  'sender_device',
  '_r',
  'web_id',
  'si',
  'pp',
  'feature',
  'ab_channel',
]);

export function normalizeSocialUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function isLoginWallResponse(data: {
  url?: string | null;
  title?: string | null;
  description?: string | null;
}): boolean {
  const finalUrl = (data.url || '').toLowerCase();
  const title = (data.title || '').toLowerCase().trim();
  const desc = (data.description || '').toLowerCase().trim();

  if (finalUrl.includes('/login') || finalUrl.includes('accounts/login')) return true;
  if (title === 'facebook' || title === 'log in to facebook' || title === 'instagram') return true;
  if (
    desc === 'explore the things you love.' ||
    desc.includes('create an account or log in to instagram')
  ) {
    return true;
  }
  return false;
}

function cleanSocialVideoHeadline(raw: string): string {
  return cleanSocialText(raw, { stripAllHashtags: true }).slice(0, 120);
}

function cleanTikTokTitle(rawTitle: string, rawDescription: string, creatorHandle: string): string {
  const cleanDesc = cleanSocialText(rawDescription, { stripAllHashtags: true });

  if (cleanDesc) {
    const firstSentence = cleanDesc.split(/\n|(?<=[.!?])\s+/)[0].trim();
    if (firstSentence.length >= 4 && firstSentence.length <= 95) {
      return firstSentence;
    }
  }

  const headline = cleanSocialVideoHeadline(rawTitle);
  if (headline && !/on tiktok$/i.test(headline) && (!creatorHandle || !headline.includes(creatorHandle))) {
    return headline.slice(0, 95);
  }

  return '';
}

async function fetchTikTokViaTikWm(normalizedUrl: string): Promise<Partial<SocialLinkFetchResult> | null> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 7500);
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(normalizedUrl)}`, {
      signal: controller.signal,
    });
    const json = await res.json();
    if (json?.code !== 0 || !json?.data) return null;

    const d = json.data as {
      title?: string;
      content_desc?: string | string[];
      cover?: string;
      origin_cover?: string;
      music?: string;
      music_info?: { play?: string };
      duration?: number;
      author?: { unique_id?: string; nickname?: string };
    };

    const contentDescText = Array.isArray(d.content_desc)
      ? d.content_desc.map((part) => (typeof part === 'string' ? part.trimEnd() : '')).join('\n').trim()
      : typeof d.content_desc === 'string'
        ? d.content_desc.trim()
        : '';

    const rawTitleText = typeof d.title === 'string' ? d.title.trim() : '';

    // TikWM's `content_desc` carries structured descriptions; when empty, `title` is often only a short hook + hashtags
    const hasExplicitDescription = contentDescText.length >= 25;
    const fullCaption = contentDescText || rawTitleText;

    const handle = d.author?.unique_id ? `@${d.author.unique_id}` : '';
    const cleanHeadline = cleanSocialVideoHeadline(rawTitleText);
    const candidateLines = fullCaption
      .split(/\n/)
      .map((line) => line.replace(/#[\p{L}\p{N}_-]+/gu, '').trim())
      .filter(
        (line) =>
          line.length >= 3 &&
          !/^\(.*(?:זמן הכנה|כמות|prep|cook|yield|servings).*\)$/iu.test(line) &&
          !/^(ingredients|what you need|מצרכים|המצרכים|רכיבים|חומרים|מה צריך|instructions|הוראות הכנה|איך מכינים)[?:]?$/iu.test(
            line.replace(/[^\p{L}\p{N}\s:?]/gu, '').trim()
          )
      );

    // Prefer a short punchy recipe line over a long intro hook
    const shortDishLine = candidateLines.find(
      (line) => line.length >= 4 && line.length <= 68 && !/^(כל מי ש|אם אתם|here is|everyone)/iu.test(line)
    );
    const extractedHeadline = shortDishLine || candidateLines[0] || cleanHeadline || '';

    return {
      ok: true,
      title: extractedHeadline.slice(0, 95) || undefined,
      videoTitle: cleanHeadline || extractedHeadline.slice(0, 95) || undefined,
      creatorHandle: handle || undefined,
      creatorName: d.author?.nickname || undefined,
      captionText: fullCaption || undefined,
      hasExplicitDescription,
      coverImage: d.cover || d.origin_cover || undefined,
      audioUrl: d.music || d.music_info?.play || undefined,
      videoDurationSec: typeof d.duration === 'number' && d.duration > 0 ? d.duration : undefined,
    };
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function fetchYouTubeMetadata(
  normalizedUrl: string,
  lang: Language
): Promise<SocialLinkFetchResult> {
  const isHe = lang === 'he';
  const videoId = extractYouTubeVideoId(normalizedUrl);
  const canonicalUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : normalizedUrl;
  const fallbackCover = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;

  let title: string | undefined;
  let authorName: string | undefined;
  let creatorHandle = extractCreatorHandleFromUrl(normalizedUrl) || undefined;
  let coverImage = fallbackCover;
  let descriptionText: string | undefined;

  const fetchJsonWithTimeout = async (url: string, ms: number) => {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      globalThis.clearTimeout(timer);
    }
  };

  // Run YouTube oEmbed + optional Microlink description fetch concurrently
  const [ytOembed, microlink] = await Promise.all([
    fetchJsonWithTimeout(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`, 5000),
    fetchJsonWithTimeout(`https://api.microlink.io/?url=${encodeURIComponent(canonicalUrl)}`, 3500),
  ]);

  let oembedData = ytOembed as {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
  } | null;

  if (!oembedData?.title) {
    const noembed = (await fetchJsonWithTimeout(
      `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`,
      4500
    )) as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
      error?: string;
    } | null;
    if (noembed && !noembed.error && noembed.title) {
      oembedData = noembed;
    }
  }

  if (oembedData) {
    title = oembedData.title?.replace(/\s*-\s*YouTube$/i, '').trim() || undefined;
    authorName = oembedData.author_name || undefined;
    if (oembedData.author_url) {
      const parsedHandle = extractCreatorHandleFromUrl(oembedData.author_url);
      if (parsedHandle) creatorHandle = parsedHandle;
    }
    if (!creatorHandle && authorName) {
      creatorHandle = `@${authorName.replace(/\s+/g, '').toLowerCase()}`;
    }
    if (oembedData.thumbnail_url) {
      coverImage = oembedData.thumbnail_url;
    }
  }

  if (microlink?.status === 'success' && microlink?.data) {
    const m = microlink.data as {
      title?: string | null;
      author?: string | null;
      description?: string | null;
      image?: { url?: string } | null;
    };
    if (!title && m.title) {
      title = m.title.replace(/\s*-\s*YouTube$/i, '').trim();
    }
    if (!creatorHandle && m.author) {
      creatorHandle = `@${m.author.replace(/^@/, '').replace(/\s+/g, '').toLowerCase()}`;
    }
    if (!coverImage && m.image?.url) {
      coverImage = m.image.url;
    }
    if (m.description && m.description.trim()) {
      descriptionText = m.description.trim();
    }
  }

  if (title || descriptionText || coverImage) {
    const message = descriptionText
      ? isHe
        ? 'נמשכו אוטומטית שם הסרטון, הערוץ, התמונה והתיאור מיוטיוב.'
        : 'Automatically extracted YouTube video title, channel, thumbnail & description.'
      : isHe
        ? 'נמשכו שם הסרטון, הערוץ והתמונה מיוטיוב. הדביקו את תיאור המתכון או התמלול מטה לחילוץ מצרכים ושלבים.'
        : 'Extracted YouTube title, channel & thumbnail. Paste the video description or transcript below to extract ingredients & steps.';

    return {
      ok: true,
      platform: 'youtube',
      normalizedUrl,
      title,
      videoTitle: title,
      creatorHandle,
      creatorName: authorName,
      captionText: descriptionText,
      hasExplicitDescription: Boolean(descriptionText && descriptionText.length >= 25),
      coverImage,
      message,
    };
  }

  return {
    ok: false,
    platform: 'youtube',
    normalizedUrl,
    creatorHandle,
    coverImage,
    reason: 'network_error',
    message: isHe
      ? 'לא ניתן למשוך כרגע פרטי סרטון מיוטיוב. הדביקו את תיאור המתכון או התמלול מטה לחילוץ אוטומטי.'
      : 'Could not reach YouTube metadata right now. Paste the video description or transcript below to extract the recipe.',
  };
}

export async function fetchSocialLinkMetadata(
  rawUrl: string,
  lang: Language = 'en'
): Promise<SocialLinkFetchResult> {
  const normalizedUrl = normalizeSocialUrl(rawUrl);
  const platform = detectPlatformFromUrl(normalizedUrl);
  const extractedHandle = extractCreatorHandleFromUrl(normalizedUrl);
  const isHe = lang === 'he';

  if (!platform) {
    return {
      ok: false,
      platform: null,
      normalizedUrl,
      reason: 'unsupported_url',
      message: isHe
        ? 'אנא הזינו קישור תקין מאינסטגרם, טיקטוק, פייסבוק או יוטיוב.'
        : 'Please enter a valid Instagram, TikTok, Facebook, or YouTube recipe video URL.',
    };
  }

  const platLabel = formatPlatformLabel(platform, lang);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      platform,
      normalizedUrl,
      creatorHandle: extractedHandle || undefined,
      reason: 'offline',
      message: isHe
        ? `מצב אופליין — הקישור מ-${platLabel} נשמר. הדביקו את הכיתוב או התמלול מטה לחילוץ המתכון.`
        : `Offline mode — ${platLabel} link saved. Paste the caption or transcript below to extract steps.`,
    };
  }

  // Primary CORS-enabled YouTube extractor (oEmbed + Noembed + Microlink description)
  if (platform === 'youtube') {
    return fetchYouTubeMetadata(normalizedUrl, lang);
  }

  // Primary CORS-enabled TikTok extractor (gets full caption, duration, cover, creator, audio stream)
  if (platform === 'tiktok') {
    const tikwm = await fetchTikTokViaTikWm(normalizedUrl);
    if (tikwm?.ok) {
      return {
        ok: true,
        platform,
        normalizedUrl,
        title: tikwm.title,
        videoTitle: tikwm.videoTitle || tikwm.title,
        creatorHandle: tikwm.creatorHandle || extractedHandle || undefined,
        creatorName: tikwm.creatorName,
        captionText: tikwm.captionText,
        hasExplicitDescription: tikwm.hasExplicitDescription,
        coverImage: tikwm.coverImage,
        audioUrl: tikwm.audioUrl,
        videoDurationSec: tikwm.videoDurationSec,
        message: tikwm.hasExplicitDescription
          ? isHe
            ? 'נמשכו אוטומטית הכיתוב, התיאור, היוצר והמצרכים מהסרטון בטיקטוק.'
            : 'Automatically extracted TikTok video caption, creator, ingredients & timeline.'
          : isHe
            ? 'תיאור הסרטון ריק ממצרכים — בודק את פס הקול של הסרטון לחילוץ מתכון מלא...'
            : 'Video description has no ingredient list — checking spoken video audio for transcript fallback...',
      };
    }
  }

  // Secondary CORS-enabled metadata extractor (Microlink)
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 6500);

  try {
    const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(normalizedUrl)}`;
    const response = await fetch(endpoint, { signal: controller.signal });
    const json = await response.json();

    if (json?.status !== 'success' || !json?.data) {
      return {
        ok: false,
        platform,
        normalizedUrl,
        creatorHandle: extractedHandle || undefined,
        reason: 'login_wall',
        message: isHe
          ? `${platLabel} חוסם גישה אוטומטית לקישור זה. הדביקו את התיאור או התמלול של הסרטון מטה והאפליקציה תחלץ אוטומטית את המתכון, המצרכים והתזמונים.`
          : `${platLabel} blocked automated preview for this link. Paste the video caption or transcript below to auto-extract the recipe & ingredients.`,
      };
    }

    const data = json.data as {
      url?: string | null;
      title?: string | null;
      author?: string | null;
      description?: string | null;
      image?: { url?: string } | null;
    };

    if (isLoginWallResponse(data)) {
      return {
        ok: false,
        platform,
        normalizedUrl,
        creatorHandle: extractedHandle || undefined,
        reason: 'login_wall',
        message: isHe
          ? `${platLabel} דורש התחברות כדי לקרוא פוסט זה ישירות. הדביקו את הכיתוב או התמלול מטה לחילוץ אוטומטי מלא.`
          : `${platLabel} requires sign-in to read this post directly. Paste the caption or transcript below to auto-extract ingredients and steps.`,
      };
    }

    const rawDesc = cleanSocialText(data.description || '', { stripAllHashtags: false });

    const authorHandle =
      extractedHandle ||
      (data.author ? `@${data.author.replace(/^@/, '').split(/\s|·/)[0].toLowerCase()}` : '');

    const suggestedTitle =
      platform === 'tiktok'
        ? cleanTikTokTitle(data.title || '', data.description || '', authorHandle)
        : (data.title || '').replace(/\s*[|·-]\s*(Instagram|Facebook|TikTok|YouTube).*$/i, '').trim();

    return {
      ok: true,
      platform,
      normalizedUrl: data.url || normalizedUrl,
      title: suggestedTitle || undefined,
      videoTitle: cleanSocialVideoHeadline(suggestedTitle || data.title || '') || undefined,
      creatorHandle: authorHandle || undefined,
      creatorName: data.author || undefined,
      captionText: rawDesc || undefined,
      hasExplicitDescription: rawDesc.length >= 40,
      coverImage: data.image?.url || undefined,
      message: isHe
        ? `נמשכו אוטומטית פרטי הסרטון והמתכון מ-${platLabel}.`
        : `Automatically extracted ${platLabel} video details, caption & recipe.`,
    };
  } catch {
    return {
      ok: false,
      platform,
      normalizedUrl,
      creatorHandle: extractedHandle || undefined,
      reason: 'network_error',
      message: isHe
        ? `לא ניתן היה למשוך כרגע מ-${platLabel}. הדביקו את הכיתוב או התמלול מטה לחילוץ אוטומטי.`
        : `Could not reach ${platLabel} metadata right now. Paste the caption or transcript below to extract the recipe offline.`,
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
