# KetoTrack

A free, ad-free personal keto diet tracker. Available as an Android app and Windows desktop app.

![Version](https://img.shields.io/badge/version-1.0.0-green) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

- **Dashboard** — Daily macro overview, ketosis status, 7-day trend charts and day ratings
- **Macros** — Food log with barcode scanner, net carb calculation, quick-add from recipes
- **Fasting** — Live timer with 16:8 / 18:6 / 20:4 / 24h protocols, push notification on completion
- **Exercise** — Log workouts by category, track calories burned
- **Weight** — History graph with 7-day moving average, body fat % (US Navy method), goal weight line
- **Recipes** — Full recipe database with favorites, tags and categories
- **Calendar** — Monthly overview of keto days and daily nutrition
- **Export / Import** — CSV, HTML report, full JSON backup and restore
- **Settings** — TDEE calculator, manual macro goals, profile management
- **Multilingual** — German and English

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (localStorage persistence) |
| Charts | Recharts |
| Mobile | Capacitor (Android) |
| Desktop | Electron |
| Build | Vite |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
git clone https://github.com/timmasalme/KetoTracker.git
cd KetoTracker
npm install --legacy-peer-deps
npm run dev
```

App runs at `http://localhost:5173`

### Build

```bash
# Web / PWA
npm run build

# Windows installer
npm run electron:build

# Android APK (requires Android Studio + JDK 17)
npm run build
npm run cap:add:android   # first time only
npm run cap:sync
npm run cap:open:android  # then build in Android Studio
```

---

## Project Structure

```
keto-tracker/
├── src/
│   ├── types/              # TypeScript interfaces
│   ├── store/              # Zustand store (central state)
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # TDEE, macros, body fat calculations
│   ├── notifications/      # Push notification logic
│   └── components/
│       ├── layout/         # Navigation (sidebar + bottom nav)
│       ├── dashboard/      # Overview + charts
│       ├── macros/         # Food log + barcode scanner
│       ├── fasting/        # Fasting timer
│       ├── sport/          # Exercise tracking
│       ├── weight/         # Weight history
│       ├── recipes/        # Recipe database
│       ├── calendar/       # Calendar view
│       ├── export/         # Data export & import
│       ├── support/        # Support page
│       └── settings/       # Profile + macro goals
├── assets/                 # Source icons (for capacitor-assets)
├── public/                 # Static assets (favicons, manifests)
├── build/                  # Electron build resources
├── capacitor.config.ts     # Capacitor configuration
├── electron.js             # Electron main process
├── tailwind.config.js      # Design tokens
└── vite.config.ts
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## License

MIT © Tim El Masalme
