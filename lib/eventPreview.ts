/**
 * Link previews for a shared event.
 *
 * The web app is a static export: one index.html with one set of Open Graph
 * tags. A shared event link therefore previewed as the generic site card, the
 * same title and logo for every event, which is close to useless when the
 * whole point of sharing is "look at this one".
 *
 * Crawlers do not run JavaScript, so the tags have to be in the bytes of the
 * first response. `/e/<id>` is served by a function that renders this document
 * — real tags for the crawler, an immediate redirect into the app for anyone
 * with a browser.
 *
 * This half is kept pure so the escaping can be tested.
 */

export type PreviewEvent = {
  title?: string;
  description?: string;
  location?: string;
  date?: string;
  time?: string;
  imageUrl?: string;
};

const SITE_NAME = 'The Third Space';
const FALLBACK_TITLE = 'An event on The Third Space';
const FALLBACK_DESCRIPTION = 'Find what is happening around you — and the people doing it.';

/**
 * Escapes for both HTML text and double-quoted attribute values.
 *
 * Titles and descriptions are written by organizers, so they reach this
 * function as untrusted input on our own origin. A title of
 * `"><script>…</script>` would otherwise break out of the meta tag.
 */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Collapses whitespace and trims to a length that previews without clipping. */
export const truncate = (value: string, max: number): string => {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) {
    return collapsed;
  }
  // Cut at a word boundary so the ellipsis does not land mid-word.
  const cut = collapsed.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

/** "Sat 8 Nov at 7:00 PM · Canal Saint-Martin" — whatever of it exists. */
export const previewDescription = (event: PreviewEvent): string => {
  const when = [event.date, event.time].filter(Boolean).join(' at ');
  const where = event.location?.trim();
  const lead = [when, where].filter(Boolean).join(' · ');
  const body = event.description?.trim();

  if (lead && body) return truncate(`${lead} — ${body}`, 200);
  if (lead) return truncate(lead, 200);
  if (body) return truncate(body, 200);
  return FALLBACK_DESCRIPTION;
};

/**
 * Only absolute http(s) URLs are usable as og:image — a crawler has no origin
 * to resolve a relative path against, and a javascript: or data: URL in a
 * stored field should never be echoed back into the page.
 */
export const safeImageUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(trimmed) ? trimmed : undefined;
};

/**
 * A string literal safe to embed in an inline <script>.
 *
 * JSON.stringify handles quotes and backslashes but leaves `<` alone, and the
 * HTML parser ends the script at a literal `</script>` wherever it appears —
 * inside a string or not.
 */
export const jsString = (value: string): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

export type PreviewOptions = {
  event?: PreviewEvent;
  eventId: string;
  /** Absolute origin this is served from, e.g. https://thethirdspaceapp.com */
  origin: string;
  /** Used when the event has no image of its own. */
  fallbackImage?: string;
};

/** The destination a human gets redirected to. */
export const appUrlForEvent = (origin: string, eventId: string): string =>
  `${origin}/activity_detail?eventId=${encodeURIComponent(eventId)}`;

export const renderEventPreview = ({
  event,
  eventId,
  origin,
  fallbackImage,
}: PreviewOptions): string => {
  const title = truncate(event?.title?.trim() || FALLBACK_TITLE, 70);
  const description = previewDescription(event ?? {});
  const image = safeImageUrl(event?.imageUrl) ?? safeImageUrl(fallbackImage);
  const target = appUrlForEvent(origin, eventId);
  const canonical = `${origin}/e/${encodeURIComponent(eventId)}`;
  // The fallback title already names the site; suffixing it would read
  // "An event on The Third Space · The Third Space".
  const documentTitle = title === FALLBACK_TITLE ? title : `${title} · ${SITE_NAME}`;

  const e = escapeHtml;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(documentTitle)}</title>
<link rel="canonical" href="${e(canonical)}">
<meta name="description" content="${e(description)}">

<meta property="og:site_name" content="${e(SITE_NAME)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
${image ? `<meta property="og:image" content="${e(image)}">` : ''}

<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
${image ? `<meta name="twitter:image" content="${e(image)}">` : ''}

<style>
  html,body{height:100%;margin:0;background:#0B0F1A;color:#f9fafb;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{height:100%;display:flex;align-items:center;justify-content:center;
    text-align:center;padding:24px}
  a{color:#a5b4fc}
</style>
</head>
<body>
<main>
  <div>
    <p>Opening ${e(title)}…</p>
    <noscript><p><a href="${e(target)}">Continue to the event</a></p></noscript>
  </div>
</main>
<script>
  // replace() rather than assign() so Back returns to wherever the link was
  // opened from, not to this redirect.
  window.location.replace(${jsString(target)});
</script>
</body>
</html>
`;
};
