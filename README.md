# KetoTrack

A modern, free and ad-free keto diet tracker available for Web, Android, Desktop and Linux.

![Version](https://img.shields.io/badge/version-1.1.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/react-18-blue)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)

---

## Overview

KetoTrack helps users monitor their ketogenic lifestyle with macro tracking, fasting timers, exercise logging, recipes, analytics and progress history — all stored locally for maximum privacy.

The application is built with React, TypeScript and Vite and supports:

- 🌐 Web / PWA
- 🤖 Android (Capacitor)
- 🖥️ Windows Desktop (Electron)
- 🐧 Linux AppImage
- 🍎 macOS DMG

---

## Features

### Dashboard

- Daily macro overview
- Ketosis status tracking
- 7-day trend charts
- Day ratings and progress summaries

### Macros & Nutrition

- Food logging
- Barcode scanner support
- Net carb calculation
- Recipe quick-add support
- Daily calorie tracking

### Fasting

- Live fasting timer
- Presets for:
  - 16:8
  - 18:6
  - 20:4
  - 24h fasting
- Push notification on fasting completion

### Exercise Tracking

- Workout logging
- Exercise categories
- Calories burned tracking

### Weight Tracking

- Weight history charts
- 7-day moving average
- Goal weight indicator
- Body fat calculation (US Navy method)

### Recipes

- Recipe database
- Favorites system
- Categories & tags
- Quick nutrition import

### Calendar

- Monthly keto overview
- Nutrition history
- Day-by-day summaries

### Export & Backup

- CSV export
- HTML reports
- Full JSON backup & restore
- Local-first data storage

### Settings

- TDEE calculator
- Manual macro goals
- Profile management
- Language settings

### Localization

- 🇩🇪 German
- 🇺🇸 English

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Routing | React Router DOM |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Mobile Runtime | Capacitor |
| Desktop Runtime | Electron |
| Build Tool | Vite |
| Icons | Lucide React |
| Date Utilities | date-fns |

---

## Project Structure

```text
keto-tracker/
├── src/
│   ├── components/         # Application components
│   ├── hooks/              # Custom React hooks
│   ├── notifications/      # Push notification handling
│   ├── store/              # Zustand application state
│   ├── types/              # TypeScript interfaces/types
│   ├── utils/              # Utility functions and calculations
│   └── main.tsx            # Application entry point
│
├── public/                 # Static assets
├── assets/                 # App icons and branding assets
├── build/                  # Electron build resources
│
├── electron.js             # Electron main process
├── capacitor.config.ts     # Capacitor configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind theme setup
└── package.json
```

---

## Installation

### Prerequisites

- Node.js 18+
- npm

### Clone Repository

```bash
git clone https://github.com/timmasalme/KetoTracker.git
cd KetoTracker
```

### Install Dependencies

```bash
npm install --legacy-peer-deps
```

---

## Development

### Start Web Development Server

```bash
npm run dev
```

Application runs at:

```text
http://localhost:5173
```

### Start Electron Development Mode

```bash
npm run electron:dev
```

---

## Production Builds

### Web Build

```bash
npm run build
```

### Desktop Build (Electron)

```bash
npm run electron:build
```

Generated desktop builds:

- Windows NSIS installer
- Linux AppImage
- macOS DMG

---

## Android Build

### Add Android Platform

```bash
npm run cap:add:android
```

### Sync Capacitor

```bash
npm run cap:sync
```

### Open Android Studio

```bash
npm run cap:open:android
```

Requirements:

- Android Studio
- JDK 17
- Android SDK

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Create production web build |
| `npm run preview` | Preview production build locally |
| `npm run electron:dev` | Run Electron in development mode |
| `npm run electron:build` | Create desktop builds |
| `npm run cap:add:android` | Add Android platform |
| `npm run cap:add:ios` | Add iOS platform |
| `npm run cap:sync` | Sync Capacitor project |
| `npm run cap:open:android` | Open Android Studio |

---

## Privacy

KetoTrack is designed as a local-first application.

- No ads
- No analytics tracking
- No forced cloud account
- Local storage persistence
- Full export/import support

---

## Contributing

Contributions are welcome.

Please read:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

before submitting pull requests.

---

## License

MIT License © Tim El Masalme

