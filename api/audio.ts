import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Streams a built-in library track through our own origin.
 *
 * The catalogue is hosted on the Internet Archive, which serves files from
 * whichever storage node it picks per request — and not every node sends
 * `Access-Control-Allow-Origin`. On the web `expo-audio` goes through the Web
 * Audio API, which needs CORS, so the same track plays for one listener and is
 * silently blocked for the next. Measured directly: a request blocked by CORS,
 * then the identical URL succeeding two minutes later.
 *
 * Proxying makes that deterministic. It is only used on the web; native
 * playback is not subject to CORS and streams from the Archive directly.
 *
 * This is deliberately NOT a general-purpose proxy: it accepts a single URL
 * shape on one host, and refuses a redirect that leaves that host, so it
 * cannot be turned into an open relay or used to reach internal addresses.
 */

/** Exactly the shape lib/musicCatalogue.ts emits, and nothing else. */
const ALLOWED = /^https:\/\/archive\.org\/download\/[A-Za-z0-9._%-]+\/[A-Za-z0-9._%()'\- ]+\.mp3$/;

const onArchiveOrg = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname === 'archive.org' || hostname.endsWith('.archive.org'));
  } catch {
    return false;
  }
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const raw = request.query.src;
  const src = Array.isArray(raw) ? raw[0] : raw || '';

  if (!ALLOWED.test(src)) {
    return response.status(400).json({ error: 'Unsupported source' });
  }

  try {
    const upstream = await fetch(src, {
      headers: {
        // Forwarded so the player can seek instead of pulling whole files.
        ...(request.headers.range ? { Range: String(request.headers.range) } : {}),
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });

    // follow: 'redirect' resolved somewhere — make sure it stayed on the host
    // we vouched for rather than anywhere the Archive chose to point us.
    if (!onArchiveOrg(upstream.url)) {
      return response.status(502).json({ error: 'Upstream redirected off-host' });
    }

    if (!upstream.ok && upstream.status !== 206) {
      return response.status(502).json({ error: `Upstream returned ${upstream.status}` });
    }

    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    const length = upstream.headers.get('content-length');
    if (length) response.setHeader('Content-Length', length);
    const range = upstream.headers.get('content-range');
    if (range) response.setHeader('Content-Range', range);
    response.setHeader('Accept-Ranges', 'bytes');

    // The catalogue is fixed, so this is safe to cache hard at the edge —
    // which is also what keeps the proxy from costing real bandwidth.
    response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
    response.setHeader('Access-Control-Allow-Origin', '*');

    if (request.method === 'HEAD') {
      return response.status(upstream.status).end();
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return response.status(upstream.status === 206 ? 206 : 200).send(buffer);
  } catch (error) {
    console.error('Audio proxy failed:', error);
    return response.status(502).json({ error: 'Could not fetch that track' });
  }
}
