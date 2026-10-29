import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import StoreProvider from "../components/StoreProvider";
import PwaRegister from "../components/PwaRegister";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#070709",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://auramusicrep.netlify.app'),
  title: "Sāṅgīt • Studio Lossless Music Streaming",
  description: "Experience high-fidelity lossless music streaming, Camelot harmonic flow recommendations, live Taste DNA, real-time synchronized lyrics, and studio DSP equalizer with Sāṅgīt.",
  manifest: "/manifest.json?v=7",
  icons: {
    icon: [
      { url: "/favicon.ico?v=7", sizes: "48x48" },
      { url: "/favicon.png?v=7", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png?v=7", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=7", sizes: "512x512", type: "image/png" },
      { url: "/logo-mark.png?v=7", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=7", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-192.png?v=7", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=7", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=7",
  },
  keywords: ["music player", "lossless audio", "sangit", "sāṅgīt", "spotify killer", "harmonic flow", "web audio equalizer", "lyrics", "studio sound"],
  authors: [{ name: "Sāṅgīt Audio Labs" }],
  openGraph: {
    title: "Sāṅgīt • Sound Reimagined",
    description: "Lossless studio streaming with Camelot harmonic recommendations, real-time Taste DNA, and synchronized lyrics.",
    type: "website",
    locale: "en_US",
    siteName: "Sāṅgīt",
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sāṅgīt • Studio Lossless Music",
    description: "Stream 320kbps master studio audio with real-time lyrics, harmonic DJ flow, and live Taste DNA.",
    images: ["/logo.png"],
  },
  applicationName: "Sāṅgīt",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sāṅgīt",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} font-sans h-full antialiased bg-black text-zinc-100 selection:bg-teal-500/30 selection:text-teal-200`}
    >
      <head>
        <link rel="icon" href="/favicon.ico?v=7" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png?v=7" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=7" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png?v=7" />

        {/* Aggressive Early DOM Sweeper & Custom Element Interceptor to Eradicate Netlify Badges/Drawers */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Intercept Netlify Custom Elements (netlify-drawer, netlify-feedback, etc.)
                if (typeof window !== 'undefined' && window.customElements) {
                  var origDefine = window.customElements.define.bind(window.customElements);
                  window.customElements.define = function(name, constructor, options) {
                    if (typeof name === 'string' && name.toLowerCase().indexOf('netlify') !== -1) {
                      class EmptyNetlify extends HTMLElement {
                        connectedCallback() { this.remove(); }
                      }
                      return origDefine(name, EmptyNetlify, options);
                    }
                    return origDefine(name, constructor, options);
                  };
                }

                // 2. Deep Purge function covering shadow DOM and regular DOM
                function purgeNetlify() {
                  try {
                    var selectors = [
                      'a[href*="netlify"]',
                      '[class*="netlify"]',
                      '[id*="netlify"]',
                      '[data-netlify]',
                      '[data-netlify-drawer]',
                      'iframe[title*="Netlify"]',
                      'iframe[src*="netlify"]',
                      'netlify-drawer',
                      'netlify-feedback-badge'
                    ];

                    document.querySelectorAll(selectors.join(', ')).forEach(function(el) {
                      try {
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('opacity', '0', 'important');
                        el.style.setProperty('pointer-events', 'none', 'important');
                        el.remove();
                      } catch(e) {}
                    });

                    // Search inside shadow roots
                    document.querySelectorAll('*').forEach(function(el) {
                      if (el.shadowRoot) {
                        try {
                          el.shadowRoot.querySelectorAll(selectors.join(', ')).forEach(function(sEl) {
                            sEl.remove();
                          });
                        } catch(e) {}
                      }
                    });
                  } catch(e) {}
                }

                purgeNetlify();
                if (typeof MutationObserver !== 'undefined') {
                  var observer = new MutationObserver(function() { purgeNetlify(); });
                  observer.observe(document.documentElement, { childList: true, subtree: true });
                }
                window.addEventListener('DOMContentLoaded', purgeNetlify);
                window.addEventListener('load', purgeNetlify);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col overflow-hidden bg-black antialiased pt-safe pb-safe">
        <StoreProvider>
          <PwaRegister />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
