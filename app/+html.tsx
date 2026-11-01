import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * The HTML shell for every statically rendered web page.
 *
 * Expo's export does not emit PWA metadata, so without this the app cannot be
 * installed to a desktop or home screen with its own icon and name — it would
 * appear as a generic browser shortcut. This adds the manifest, the iOS
 * touch icon (iOS ignores the manifest for home-screen icons) and the theme
 * colour that tints the browser and OS chrome.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <meta
          name="description"
          content="Find what is happening around you — and the people doing it."
        />

        {/* Installability */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B0F1A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Third Space" />

        {/* iOS reads this rather than the manifest for the home-screen icon. */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

        {/* Link previews, for when someone shares an event. */}
        <meta property="og:site_name" content="The Third Space" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="The Third Space" />
        <meta
          property="og:description"
          content="Find what is happening around you — and the people doing it."
        />
        <meta property="og:image" content="/icons/icon-512.png" />
        <meta name="twitter:card" content="summary" />

        {/*
          Keeps the body background from flashing white before React mounts,
          and stops the page itself scrolling behind the full-screen feed.
        */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body { background-color: #0B0F1A; }
          body { overscroll-behavior-y: none; }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
