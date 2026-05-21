# KetoTrack

Persönlicher Keto-Diät Tracker — läuft als Web-App, Android-App, iOS-App und Desktop-App.

## Stack

| Schicht | Technologie |
|---------|-------------|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (mit localStorage Persistenz) |
| Charts | Recharts |
| Mobile | Capacitor (Android / iOS) |
| Desktop | Electron |
| Build | Vite |

---

## Schnellstart (Web / PWA)

```bash
npm install
npm run dev
```

App läuft auf http://localhost:5173

---

## Android / iOS (Capacitor)

```bash
# Erst bauen
npm run build

# Plattformen einrichten (einmalig)
npm run cap:add:android
npm run cap:add:ios

# Dateien synchronisieren
npm run cap:sync

# In Android Studio öffnen
npm run cap:open:android
```

> Voraussetzung: Android Studio + JDK 17 installiert

---

## Desktop App (Electron)

```bash
# Entwicklung
npm run electron:dev

# Installer bauen
npm run electron:build
```

---

## Projektstruktur

```
keto-tracker/
├── src/
│   ├── types/           # Alle TypeScript Interfaces
│   │   └── index.ts
│   ├── store/           # Zustand Store (zentraler State)
│   │   └── index.ts
│   ├── hooks/           # Custom React Hooks
│   │   └── index.ts
│   ├── utils/
│   │   └── calculations.ts  # TDEE, Makros, KFA, Rating
│   ├── components/
│   │   ├── layout/      # Navigation (Sidebar + Bottom Nav)
│   │   ├── dashboard/   # Übersicht + Charts
│   │   ├── macros/      # Essen-Log + Einträge
│   │   ├── fasting/     # Fasten-Timer
│   │   ├── sport/       # Sport-Tracking
│   │   ├── weight/      # Gewichtsverlauf
│   │   ├── recipes/     # Rezepte-Datenbank
│   │   └── settings/    # Profil + Makro-Ziele
│   ├── index.css        # Global Styles + Tailwind
│   ├── main.tsx         # Einstiegspunkt
│   └── App.tsx          # Root Component
├── public/
│   └── manifest.json    # PWA Manifest
├── capacitor.config.ts  # Mobile Konfiguration
├── electron.js          # Desktop Hauptprozess
├── tailwind.config.js   # Design-Tokens (Farben, Fonts)
└── vite.config.ts
```

---

## Features

### ✅ Implementiert
- **Dashboard** — Tagesübersicht, Ketose-Status, 7-Tage Charts, Tagesbewertungen
- **Makros** — Essen-Log, Fortschrittsbalken, Quick-Add aus häufigen Rezepten
- **Fasten** — Timer mit Live-Anzeige, 16:8 / 18:6 / 20:4 / 24h Protokolle
- **Sport** — Einheiten loggen, kcal-Verbrauch, Kategorien
- **Gewicht** — Verlaufsgraph, KFA-Berechnung (US Navy), Zielgewicht-Linie
- **Rezepte** — CRUD, Favoriten, Häufigkeits-Tracking, Kategorien, Tags
- **Einstellungen** — Profil, TDEE-Berechnung, manuelle Makro-Ziele

### 🔧 Berechnungen
- TDEE via Mifflin-St Jeor (männlich)
- Körperfettanteil via US Navy Method
- Tagesbewertung (excellent / good / okay / bad)
- Keto-Makro-Split: 70% Fett / 25% Protein / 5% Carbs (max 20g)

---

## Design System

| Token | Wert |
|-------|------|
| Hintergrund | `#f8f4ec` (Warm Cream) |
| Karten | `#ffffff` |
| Text | `#1a1a18` (Charcoal) |
| Ketose ✅ | `#3d6b4f` (Forest Green) |
| Warnung | `#c49a2a` (Amber) |
| Überlimit | `#b03a2e` (Brick Red) |
| Schrift | DM Sans (UI) · Playfair Display (Headlines) |
