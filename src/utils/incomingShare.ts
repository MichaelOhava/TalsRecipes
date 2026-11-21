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
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
  }

  if (!url && !text && !title) return null;
  return { url, title, text };
}
