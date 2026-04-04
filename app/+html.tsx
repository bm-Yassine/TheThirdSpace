import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html,
              body {
                margin: 0;
                padding: 0;
                width: 100%;
                min-height: 100%;
              }

              body {
                background: #ffffff;
              }

              #root,
              #expo-router-root,
              body > div:first-child {
                min-height: 100%;
              }

              @supports (padding-top: env(safe-area-inset-top)) {
                @media (hover: none) and (pointer: coarse) {
                  html,
                  body,
                  #root,
                  #expo-router-root,
                  body > div:first-child {
                    height: 100dvh;
                    min-height: 100dvh;
                    background: #000000;
                  }

                  body {
                    overscroll-behavior-y: none;
                  }
                }
              }
            `,
          }}
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
