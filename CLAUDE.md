# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Collaboration Guidelines

- User is a beginner developer — explain changes in plain language, avoid jargon, and guide step-by-step.
- Do NOT rewrite entire files. Make surgical, minimal edits only.
- When pointing to code to edit, provide the exact line to `Ctrl+F` search for so the user can find it.
- Describe changes as: "Find this line → delete it → paste this in its place."

## Commands

```bash
npm start          # Dev server at localhost:3000
npm run build      # Production build → /build directory
npm test           # Jest test runner (watch mode)
```

Capacitor (Android sync after web build):
```bash
npm run build && npx cap sync android    # Build web app and sync to Android
npx cap open android                     # Open Android Studio
cd android && ./gradlew assembleDebug    # Build debug APK
```

Supabase Edge Functions (deploy market data proxy):
```bash
supabase functions deploy get-market-data
```

## Architecture

**Single monolithic component** — virtually all UI, state, and business logic lives in `src/App.js` (~3,900 lines). There is no component decomposition or custom hooks.

Entry point: `src/index.js` → mounts `<AppWrapper>` → `<AppContent>` (main component).

**State management**: Pure `useState`/`useEffect` hooks only. No Redux or Context API. Persistent data is stored in `localStorage` (session key: `kj_auto_login_session`).

**Styling**: Tailwind CSS loaded at runtime from CDN (not installed as a npm package). Configured in `public/index.html`.

**Tabs / features in AppContent**:
- Portfolio (stocks & ETFs with real-time prices)
- Account ledger (wallet / savings / insurance products)
- FIRE dashboard (retirement projection calculations)
- Dividend tracking
- Settings (theme, avatar, custom app title)

**Market data flow**: React → Supabase Edge Function (`supabase/functions/get-market-data/index.ts`) → Yahoo Finance API. The edge function bypasses CORS restrictions.

**Mobile**: Capacitor wraps the built React app in an Android WebView. `android/app/src/main/java/com/example/app/MainActivity.java` is a thin `BridgeActivity` with no custom logic.

**Backend**: Supabase (PostgreSQL + Auth + Edge Functions). Supabase JS SDK is used directly in `src/App.js`. Google OAuth via `@react-oauth/google`.

**Deployment**: Vercel (config in `.vercel/project.json`).

## Key Files

| File | Purpose |
|------|---------|
| `src/App.js` | All application logic and UI (~3,900 lines) |
| `supabase/functions/get-market-data/index.ts` | Edge function: fetches Yahoo Finance data server-side |
| `capacitor.config.ts` | Capacitor app config (appId, webDir) |
| `android/build.gradle` | Android Gradle config (SDK 36, minSdk 24, Java 21) |
| `public/index.html` | HTML shell — Tailwind CDN loaded here |
