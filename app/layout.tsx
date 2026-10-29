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
  manifest: "/manifest.json?v=6",
  icons: {
    icon: [
      { url: "/favicon.png?v=6", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png?v=6", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=6", sizes: "512x512", type: "image/png" },
      { url: "/logo-mark.png?v=6", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png?v=6", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=6", sizes: "512x512", type: "image/png" },
    ],
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
      <body className="min-h-full flex flex-col overflow-hidden bg-black antialiased pt-safe pb-safe">
        <StoreProvider>
          <PwaRegister />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
