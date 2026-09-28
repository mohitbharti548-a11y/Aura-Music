<div align="center">

# ✦ AURA MUSIC
### Lossless Sound Reimagined • Minimalist Studio Streaming

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

<p align="center">
  A state-of-the-art music streaming web & desktop application engineered for audiophiles and clean design enthusiasts. Featuring dual-engine fallback for full 320kbps streams, real-time synchronized lyrics, a 10-band Web Audio DSP equalizer, smart radio dynamic recommendations, and seamless cross-platform installation.
</p>

</div>

---

## ⚡ Key Capabilities

- 💎 **320kbps Master Stream Engine**: Dual-pipeline streaming resolving master audio with automated cryptographic DES fallback — zero 30-second preview restrictions.
- 🎙️ **Synchronized LRC Lyrics Engine**: Real-time karaoke-style lyric scrolling with auto-centering, past lyric dimming, and interactive timeline seeking.
- 🎛️ **10-Band Studio Web Audio Equalizer**: BiquadFilter DSP audio graph with Bass Boost, 3D Spatial Reverb, and preset profiles (Bass+, Vocal Clarity, Treble Master, Studio Flat).
- 📻 **Smart Radio Dynamic Recommendations**: 30-track fair-interleaving dynamic radio generation matching artist, genre, release era, and acoustic energy.
- 🫧 **Floating Dynamic Island Playbar**: Ultra-clean minimal outline controls with expandable features hub, quick queue manager, and sleep timer.
- 📱 **Universal Cross-Platform (PWA & Desktop)**: Installable natively on **Android**, **iOS**, **Windows**, **macOS**, and **Linux**.

---

## 📲 Download & Installation Guide

### 🤖 1. Android Installation (PWA / WebAPK)
> **Direct Browser Install (Instant)**
1. Open the Aura web player URL in **Google Chrome** or **Samsung Internet** on your Android phone.
2. Tap the **"Install Aura App"** prompt banner at the top of the screen, or tap **⋮ (Menu) ➔ "Install App"** / **"Add to Home Screen"**.
3. Android will automatically package and install Aura as a standalone native WebAPK with full offline audio caching and home screen launcher icon.

---

### 🍎 2. iOS Installation (iPhone & iPad)
> **Apple Safari Add-to-Home PWA**
1. Open the Aura web player in **Safari** on your iPhone or iPad.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom bar).
3. Scroll down and tap **"Add to Home Screen"** (`+`).
4. Tap **"Add"** in the top right corner.
5. Aura will launch in borderless, full-screen standalone mode without any browser search bars or chrome UI.

---

### 💻 3. Desktop Installation (Windows, macOS, Linux)
Download pre-built standalone binaries directly from the **[GitHub Releases](../../releases)** tab:

| Operating System | Installer Package | Description |
| :--- | :--- | :--- |
| **Windows** | `Aura-Setup-x64.exe` | Windows 10/11 64-bit installer with desktop shortcut |
| **macOS** | `Aura-Universal.dmg` | macOS installer (Apple Silicon M1/M2/M3 & Intel) |
| **Linux** | `Aura-x86_64.AppImage` | Portable standalone binary for Ubuntu, Debian, Fedora |

---

## 🛠️ Local Development & Quickstart

### Prerequisites
- **Node.js**: v20.x or later
- **npm** or **yarn** / **pnpm**
- **PostgreSQL Database** (optional for local music library indexing)

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/my-music-app.git
cd my-music-app
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## 📦 Packaging & Building Desktop Release

To build the native desktop installers locally:

```bash
# 1. Build Next.js Web Assets
npm run build

# 2. Package Windows / Mac Desktop Binary
npx electron-builder
```
The compiled binaries will be output into the `dist/` directory.

---

## 🏗️ Architecture & Tech Stack

```
my-music-app/
├── app/                        # Next.js 16 App Router Pages & API Routes
│   ├── api/recommendations/    # 30-track Dynamic Smart Radio Engine
│   ├── api/search/             # JioSaavn & Deezer Multi-Source Search
│   ├── api/lyrics/             # Synchronized LRC Lyrics Parser
│   └── page.tsx                # Main Music Discovery, Queue & Player View
├── components/                 # UI Components
│   ├── PlayerBar.tsx           # Floating Dynamic Island with minimal controls
│   ├── ExpandedPlayer.tsx      # Full-Screen Spotify-style Playcard & Lyrics
│   ├── EqualizerModal.tsx      # Web Audio DSP 10-Band Biquad Filter EQ
│   ├── QueueDrawer.tsx         # Up Next queue & Dynamic Similar Radio
│   └── PwaRegister.tsx         # PWA Service Worker & Install Prompt Banner
├── features/player/            # Redux Toolkit State Management
│   └── playerSlice.ts          # Playback, Queue, Radio, History, Equalizer State
├── lib/                        # Core Audio Processing & Decryption
│   ├── des.ts                  # Pure TypeScript FIPS 46-3 DES Decryptor
│   ├── jiosaavn-client.ts      # 320kbps Master Stream Resolver
│   └── recommendations.ts      # Multi-factor Music Recommendation Algorithms
├── desktop/                    # Native Desktop Wrapper (Electron)
│   ├── main.js                 # Native Window, Tray & Media Key Handlers
│   └── preload.js              # Context Bridge API
└── public/                     # PWA Manifest, Service Worker & Vector Assets
    ├── manifest.json           # Web App Manifest
    ├── sw.js                   # Cache-first & Network-first Service Worker
    └── icons/                  # 192x192 and 512x512 PWA Icons
```

---

## 📄 License
MIT License. Built with precision for modern audio lovers.
