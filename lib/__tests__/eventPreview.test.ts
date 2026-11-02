import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  appUrlForEvent,
  escapeHtml,
  jsString,
  previewDescription,
  renderEventPreview,
  safeImageUrl,
  truncate,
} from '../eventPreview';

const ORIGIN = 'https://thethirdspaceapp.com';

describe('escapeHtml', () => {
  it('neutralises a title that tries to break out of an attribute', () => {
    const escaped = escapeHtml('"><script>alert(1)</script>');
    assert.ok(!escaped.includes('<'));
    assert.ok(!escaped.includes('"'));
    assert.equal(escaped, '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes the ampersand first, so entities are not double-built', () => {
    assert.equal(escapeHtml('Tom & Jerry <b>'), 'Tom &amp; Jerry &lt;b&gt;');
  });
});

describe('jsString', () => {
  it('stops a literal </script> ending the script element', () => {
    assert.ok(!jsString('a</script>b').includes('</script>'));
  });

  it('still produces a valid JS string literal', () => {
    const value = 'quote " backslash \\ newline \n';
    assert.equal(JSON.parse(jsString(value)), value);
  });
});

describe('truncate', () => {
  it('leaves a short string alone', () => {
    assert.equal(truncate('Short', 20), 'Short');
  });

  it('collapses runs of whitespace', () => {
    assert.equal(truncate('a   b\n\nc', 20), 'a b c');
  });

  it('cuts at a word boundary', () => {
    const result = truncate('alpha beta gamma delta epsilon', 20);
    assert.ok(result.endsWith('…'));
    assert.ok(!result.includes('gamm…'));
    assert.ok(result.length <= 21);
  });

  it('cuts mid-word rather than losing most of a long first word', () => {
    // Backing up to a word boundary would leave almost nothing here.
    const result = truncate('a supercalifragilisticexpialidocious', 20);
    assert.ok(result.length <= 21);
    assert.ok(result.startsWith('a supercal'));
  });
});

describe('previewDescription', () => {
  it('leads with when and where, then the organizer blurb', () => {
    assert.equal(
      previewDescription({
        date: 'Sat 8 Nov',
        time: '7:00 PM',
        location: 'Canal Saint-Martin',
        description: 'Bring a picnic.',
      }),
      'Sat 8 Nov at 7:00 PM · Canal Saint-Martin — Bring a picnic.'
    );
  });

  it('copes with only some of the pieces', () => {
    assert.equal(previewDescription({ location: 'Paris' }), 'Paris');
    assert.equal(previewDescription({ description: 'Just a blurb' }), 'Just a blurb');
  });

  it('falls back to the site line when the event says nothing', () => {
    assert.match(previewDescription({}), /Find what is happening/);
  });
});

describe('safeImageUrl', () => {
  it('accepts an https URL', () => {
    assert.equal(safeImageUrl('https://example.com/a.png'), 'https://example.com/a.png');
  });

  it('rejects anything that is not https', () => {
    // A stored javascript: or data: URL must never reach the page.
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'http://example.com/a.png',
      '/icons/icon.png',
      '',
      undefined,
    ]) {
      assert.equal(safeImageUrl(value as string | undefined), undefined, `allowed: ${value}`);
    }
  });

  it('rejects a URL carrying a quote that would escape the attribute', () => {
    assert.equal(safeImageUrl('https://example.com/a.png" onerror="alert(1)'), undefined);
  });
});

describe('renderEventPreview', () => {
  const event = {
    title: 'Sunset picnic',
    description: 'Bring something to share.',
    location: 'Canal Saint-Martin',
    date: 'Sat 8 Nov',
    time: '7:00 PM',
    imageUrl: 'https://example.com/picnic.jpg',
  };

  it('describes the specific event, not the site', () => {
    const html = renderEventPreview({ event, eventId: 'abc123', origin: ORIGIN });

    assert.ok(html.includes('<meta property="og:title" content="Sunset picnic">'));
    assert.ok(html.includes('og:description" content="Sat 8 Nov at 7:00 PM · Canal Saint-Martin'));
    assert.ok(html.includes('<meta property="og:image" content="https://example.com/picnic.jpg">'));
    assert.ok(html.includes('summary_large_image'));
  });

  it('suffixes the document title with the site name', () => {
    const html = renderEventPreview({ event, eventId: 'abc123', origin: ORIGIN });
    assert.ok(html.includes('<title>Sunset picnic · The Third Space</title>'));
  });

  it('does not repeat the site name on the fallback title', () => {
    const html = renderEventPreview({ eventId: 'missing', origin: ORIGIN });
    assert.ok(html.includes('<title>An event on The Third Space</title>'));
    assert.ok(!html.includes('The Third Space · The Third Space'));
  });

  it('points the crawler and the reader at the right URLs', () => {
    const html = renderEventPreview({ event, eventId: 'abc123', origin: ORIGIN });

    assert.ok(html.includes(`og:url" content="${ORIGIN}/e/abc123"`));
    assert.ok(html.includes(`${ORIGIN}/activity_detail?eventId=abc123`));
  });

  it('escapes an event whose title is an injection attempt', () => {
    const html = renderEventPreview({
      event: { ...event, title: '"><script>alert(1)</script>' },
      eventId: 'abc123',
      origin: ORIGIN,
    });

    // The only script element is the redirect we wrote. The payload survives
    // as inert text — `&lt;script&gt;alert(1)&lt;/script&gt;` renders as
    // characters, so what matters is that it is never a tag.
    assert.equal(html.match(/<script\b/g)?.length, 1);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!html.includes('"><script>'));
  });

  it('falls back to a plain card for an event it could not load', () => {
    const html = renderEventPreview({
      eventId: 'missing',
      origin: ORIGIN,
      fallbackImage: `${ORIGIN}/icons/icon-512.png`,
    });

    assert.ok(html.includes('An event on The Third Space'));
    assert.ok(html.includes(`${ORIGIN}/icons/icon-512.png`));
    // Still sends the reader into the app rather than showing a dead end.
    assert.ok(html.includes(`${ORIGIN}/activity_detail?eventId=missing`));
  });

  it('omits the image tags entirely when there is no usable image', () => {
    const html = renderEventPreview({
      event: { ...event, imageUrl: 'javascript:alert(1)' },
      eventId: 'abc123',
      origin: ORIGIN,
    });

    assert.ok(!html.includes('og:image'));
    assert.ok(html.includes('name="twitter:card" content="summary"'));
  });

  it('encodes an id with characters that would break the URL', () => {
    const html = renderEventPreview({ eventId: 'a b&c', origin: ORIGIN });
    assert.ok(html.includes('eventId=a%20b%26c'));
    assert.ok(!html.includes('eventId=a b&c'));
  });
});

describe('appUrlForEvent', () => {
  it('builds the in-app destination', () => {
    assert.equal(appUrlForEvent(ORIGIN, 'xyz'), `${ORIGIN}/activity_detail?eventId=xyz`);
  });
});
