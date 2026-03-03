import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#722F37" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SAQ Futé" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* SEO */}
        <meta name="description" content="Trouvez les meilleurs vins au meilleur prix à la SAQ. Recherche, deals, accords mets-vins et sommelier IA." />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SAQ Futé — Buvez mieux, dépensez moins" />
        <meta property="og:description" content="Trouvez les meilleurs vins au meilleur prix à la SAQ. Recherche, deals, accords mets-vins et sommelier IA." />
        <meta property="og:url" content="https://saq-fute.vercel.app" />
        <meta property="og:image" content="https://saq-fute.vercel.app/icon.png" />
        <meta property="og:site_name" content="SAQ Futé" />
        <meta property="og:locale" content="fr_CA" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SAQ Futé — Buvez mieux, dépensez moins" />
        <meta name="twitter:description" content="Trouvez les meilleurs vins au meilleur prix à la SAQ." />
        <meta name="twitter:image" content="https://saq-fute.vercel.app/icon.png" />

        {/* Service Worker registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
