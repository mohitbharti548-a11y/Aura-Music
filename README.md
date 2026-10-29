<div align="center">

# ✦ SĀṄGĪT (संगीत)
### Studio Lossless Music Streaming • Re-engineered Algorithmic Intelligence

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

<p align="center">
  A state-of-the-art music streaming web & desktop application engineered for audiophiles. Built with a reverse-engineered and upgraded recommendation suite that surpasses Spotify: Camelot Wheel harmonic key & BPM flow, Neural & Phonetic Omni-Search with typo tolerance, real-time Taste DNA profiling with acoustic radar, steerable serendipity controls, and 320kbps master studio audio.
</p>

</div>

---

## ⚡ Beyond-Spotify Algorithmic Capabilities

- 🎼 **Harmonic Camelot Wheel & DJ Flow Engine**: Unlike Spotify's abrupt transition jumps, Sāṅgīt evaluates musical keys (1A-12B Camelot clock) and ±8% BPM tempo continuity for seamless, studio-grade playlist progression.
- 🧬 **Live Taste DNA & Real-Time Wrapped**: 365-day accessible music profile with a 5-dimension Acoustic Radar (Energy, Valence, Danceability, Organic Warmth, Tempo Pace) and Diurnal Chronotypes.
- 🎚️ **Steerable Serendipity Slider**: Defeats Spotify's repetitive 25-song echo chamber. Users can freely dial their algorithm between *Familiar Comfort (90/10)* and *Deep Discovery (10/90)*.
- 🔍 **Neural & Phonetic Omni-Search**: Solves Spotify's transliteration blindness. Handles Hindi/Punjabi/global phonetic variations with Damerau-Levenshtein fuzzy matching and extracts natural language intent (e.g. *"romantic 90s"*, *"chill acoustic lofi"*).
- 💎 **320kbps Master Stream Engine**: Dual-pipeline streaming resolving master audio with automated cryptographic DES fallback — zero 30-second preview restrictions.
- 🎙️ **Synchronized LRC Lyrics Engine**: Real-time karaoke-style lyric scrolling with auto-centering and interactive timeline seeking.
- 🎛️ **10-Band Studio Web Audio Equalizer**: BiquadFilter DSP audio graph with Bass Boost, 3D Spatial Reverb, and preset profiles.

---

## 📲 Download & Installation Guide

### 🤖 1. Android Installation Options

#### Option A: Direct Standalone APK File (`.apk`)
Download the pre-built **`Aura-Music.apk`** from the **[GitHub Releases](../../releases)** tab or generate it via PWABuilder:
1. Download **`Aura-Music.apk`** directly to your phone.
2. Tap the downloaded file in your notification bar or file manager.
3. Allow *"Install from this source"* if prompted by Android.
4. Tap **"Install"** — Aura installs as a complete standalone Android application in your app drawer.

#### Option B: 1-Click WebAPK Browser Install
1. Open the Aura web player in **Google Chrome** on your phone.
2. Tap the **"Install Aura App"** prompt banner at the top, or tap **⋮ ➔ "Install App"**.
3. Android packages and installs Aura as an auto-updating WebAPK.

---

### 🍎 2. iOS Installation (iPhone & iPad)
> **Apple Safari Add-to-Home PWA**
1. Open the Aura web player in **Safari** on your iPhone or iPad.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom bar).
3. Scroll down and tap **"Add to Home Screen"** (`+`).
4. Tap **"Add"** in the top right corner.
5. Aura will launch in borderless, full-screen standalone mode with Lock Screen and Dynamic Island media controls.

---

### 💻 3. Desktop Installation (Windows, macOS, Linux)
Download pre-built standalone binaries directly from the **[GitHub Releases](../../releases)** tab:

| Operating System | Installer Package | Description |
| :--- | :--- | :--- |
| **Android** | `Aura-Music.apk` | Standalone native Android APK package |
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
