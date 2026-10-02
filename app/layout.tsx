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
  title: "Aura • Lossless Music Streaming & Studio Sound",
  description: "Experience high-fidelity lossless music streaming, synchronized lyrics, Web Audio DSP equalizer, and studio audio master with Aura.",
  manifest: "/manifest.json?v=3",
  icons: {
    icon: [
      { url: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-512.svg?v=3", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
  },
  keywords: ["music player", "lossless audio", "spotify web player", "streaming", "web audio equalizer", "lyrics", "aura sound"],
  authors: [{ name: "Aura Sound Labs" }],
  openGraph: {
    title: "Aura • Sound Reimagined",
    description: "Minimalist lossless music player with tactile depth, synchronized lyrics, and Web Audio equalizer.",
    type: "website",
    locale: "en_US",
    siteName: "Aura Music",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura • Lossless Music Streaming",
    description: "Stream high-fidelity music with real-time lyrics and studio sound equalizer.",
  },
  applicationName: "Aura Music",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aura Music",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} font-sans h-full antialiased bg-black text-zinc-100 selection:bg-violet-500/30 selection:text-violet-200`}
    >
      <head>
        {/* Aggressive Early DOM Sweeper to Eradicate Netlify Badges */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function purgeNetlify() {
                  try {
                    document.querySelectorAll('a[href*="netlify"], [class*="netlify"], [id*="netlify"], [data-netlify], iframe[title*="Netlify"]').forEach(function(el) {
                      if (el.textContent && el.textContent.indexOf('Netlify') !== -1 || (el.href && el.href.indexOf('netlify') !== -1) || el.id && el.id.indexOf('netlify') !== -1 || el.className && typeof el.className === 'string' && el.className.indexOf('netlify') !== -1) {
                        el.style.display = 'none';
                        el.remove();
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
      <body className="min-h-full flex flex-col overflow-hidden bg-black antialiased">
        <StoreProvider>
          <PwaRegister />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
