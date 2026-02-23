# Pi Day

A **partner calendar** app for couples to stay in sync: shared schedule, daily goals and tasks, and optional **business/order management**. Built with Expo (React Native), Supabase, and AI-powered import.

## Features

- **Partner calendar** — Shared calendar with month and day views. Switch between partners (e.g. Adrian & Sarah) to see and manage events per person.
- **Today** — Today view with events, daily todos, and order due-date summary. Quick add for todos and order reminders.
- **Goals & tasks** — Goals with periods (daily/weekly/monthly), habits, streaks, and reminders. Milestones and optional stakes.
- **Orders** — Lightweight order/business tracking: status (Pending, In Progress, Complete), due dates, notes, and archiving. Optional reminders (daily, week-after-create, on-due-date).
- **AI import** — Import events from photos or PDFs (work schedules, flyers). Uses AI to parse and create events; you review and assign to a partner before saving.
- **Notifications** — Push and local notifications: daily todo reminder, goal reminders, order reminders. Custom notification sound on receive.
- **Custom sounds** — In-app sounds for notifications, menu open/close, check-off, order states (pending, complete, archive), habits (complete, unselect), and trash.
- **Theming** — Multiple themes, font scale (compact/default/large), and per-partner name/color. Auto-delete of past events (all or by category).

## Tech stack

- **Expo** (SDK 54), **React Native**, **expo-router**
- **Supabase** — auth, profiles, events, recurrences, categories, goals, habits, orders
- **OpenAI** — AI import (schedule/flyer parsing)
- **expo-notifications**, **expo-av** (sounds), **expo-image-picker** / **expo-document-picker**
- **NativeWind** (Tailwind-style styling), **date-fns**

## Getting started

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd pi-day
   npm install
   ```

2. **Environment**  
   Create a `.env` (or use Expo env vars) with:
   - `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for Supabase.
   - For AI import: your OpenAI API key (see `src/services/aiImport` usage).
   - For push in dev builds: `EXPO_PUBLIC_EAS_PROJECT_ID` (from [expo.dev](https://expo.dev) or `eas init`).

3. **Supabase**  
   Run the SQL migrations in order (e.g. `supabase_schema.sql`, then the `supabase_migration_*.sql` files) in the Supabase SQL editor.

4. **Run**
   ```bash
   npx expo start
   ```
   Then open in Expo Go (or use a dev build for push notifications).

## Project layout

- `app/` — Expo Router screens: `(tabs)` (Today, Calendar, Goals, Orders, More).
- `src/components/` — UI: calendar, today, todo, orders, settings, AI import.
- `src/contexts/` — Theme, user mode (which partner is selected).
- `src/hooks/` — Data and settings (events, goals, orders, categories, notifications, etc.).
- `src/services/` — Supabase, notifications, goals, AI import.
- `src/utils/` — Date helpers, sounds.
- `assets/` — Icon, splash, and sound files.

## License

Private.
