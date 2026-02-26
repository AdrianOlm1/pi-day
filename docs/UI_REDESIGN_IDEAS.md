# Pi Day — UI Redesign & Cozy Character Ideas

A living doc for making the app feel more **cozy, comfortable, and fun** without losing clarity. Use it as a backlog for future iterations.

---

## ✅ Implemented

### Haptics & polish
- **Centralized haptics** (`src/utils/haptics.ts`) — `hapticLight()`, `hapticMedium()`, etc., used across the app.
- **Tab bar** — Light haptic on tab switch; existing scale + pill animation.
- **Today** — FAB and goal check-in use medium haptic; date strip accent bar has a short entrance animation (scaleX + opacity).
- **Buttons** — Primary (filled) uses medium haptic, others light.
- **Orders** — Card tap and “Complete” use haptics; FAB uses medium haptic.
- **Notes** — Note card tap uses light haptic + press opacity.
- **Calendar** — Day cell tap uses light haptic (MonthView).
- **Goals** — Check-in uses medium haptic; add-button uses light haptic.
- **Settings** — All toggles/actions use `hapticLight()`.
- **Empty states** — EmptyState icon has a gentle idle float animation (~2.2s cycle).

### Varied copy & friendlier tone
- **Greetings** (`src/utils/greetings.ts`) — `getGreetingLabel(userName)` varies by time (morning/afternoon/evening) with multiple phrasings (e.g. “Rise and shine, Adrian”, “Hey Sarah”).
- **Moment lines** — `getMomentLine(weatherCode, temp)` is time- and weather-aware, with weekend/Friday variants (e.g. “Easy morning — you’ve earned it”, “Almost there — Friday vibes”).
- **Empty states** — All empty-state message sets in `emptyStateMessages.ts` expanded and softened (friendlier subtitles, more variety).

### Visual tweaks
- **Cozy theme** — New **Cozy** theme (`cozy_cream`) in Settings: warm cream background (`#F5F0E8`), soft brown text, warm gradient accents. Designed to feel calm and comfortable.

### Calendar
- **Today pulse** — In month view, the “today” cell has a gentle breathing pulse (opacity 0.4 ↔ 0.75, ~2.4s cycle) so today feels alive.
- **Selected-day ring** — When a non-today day is selected, a soft ring appears with a spring animation (scale + opacity).

### Feature ideas implemented
- **Goals — Weekly wins card** — When the user has at least one completion this week, a card at the top of the Goals tab shows: “You completed N goals this week. Nice going.” with a leaf icon.

### Today (home) — Cozy character
- **Glass card scale-in** — Cards use a slight scale-in (0.98 → 1) after the translateY stagger so they feel like they settle in.
- **Moment line icon** — A small time/weather-aware icon (sunny, partly-sunny, moon, cloudy, rainy) next to the moment line with a delayed bounce animation.
- **Date accent bar breathing** — The accent bar under the date has a subtle idle opacity pulse (0.88 ↔ 1, ~2.4s) for a living feel.
- **Order row polish** — Order rows have press opacity (0.85) and light haptic on tap.
- **Time-based avatar ring** — Avatar ring and inner icon tint by time: morning = warm amber, afternoon = gold, evening = soft indigo, night = deeper indigo (moon); icon switches to moon at night.
- **Line-art empty state** — Schedule empty state shows a simple “window” line-art illustration (rounded frame + cross panes) with a gentle idle float animation (`EmptyStateIllustration`; optional “cup” variant).
- **First event stagger + scale** — First event in Today’s schedule loads in with a slightly longer fade (320ms) and a scale-in from 0.98 → 1 for a gentle “loads in” feel.
- **Weather widget** — Time + weather moved into a soft “pill” (rounded container with theme-tinted background). The whole pill has a subtle idle animation: slow float (translateY 0 → -2.5px) and scale (1 → 1.02) over ~2.8s so the right corner feels active but not jarring.

---

## Calendar — More ideas (backlog)

Use these to keep improving the calendar’s character and usefulness.

### Already done
- Today cell: subtle breathing pulse.
- Selected day: soft ring with spring.

### High impact, medium effort
- **Current-time line (week view)** — In week/day view, a horizontal line (or gradient) at the current time so “now” is visible at a glance. Optional: auto-scroll to keep “now” in view when opening the tab.
- **Day summary header** — In day view, a small header under the date: “3 events today” or “Nothing scheduled” with a subtle entrance animation. Reuses the friendlier empty copy when 0.
- **Mini month strip above day view** — A single row of month days (or week days) above the day’s event list for quick “jump to another day” without leaving day view. Tappable days with light haptic; today and selected day highlighted.
- **Event cards — micro-interaction** — On tap, event cards in `DayItinerary` could scale down slightly (0.98) or show a brief highlight. Category color stripe is already there; a tiny “press” feedback adds polish.

### Medium impact, higher effort
- **Swipe between days** — In day view, swipe left/right to go to previous/next day with a subtle parallax or slide. Complements the existing week strip for navigation.
- **Day theme / label** — Optional per-day tag: “Focus”, “Rest”, “Social”, or a single emoji. Could be stored per date (e.g. in a small local table) and shown as a pill under the date or in the header. Tapping could open a small picker.
- **Week view “today” highlight** — In week strip, today’s column could have a soft background tint or a thin vertical “today” line at the current time.
- **Month view — first day of month** — Slight visual nudge for the 1st (e.g. bolder number or small “Start of month” style) so scanning is easier.

### Lower priority / exploration
- **Animated transition when changing month** — When swiping to next/previous month, a short slide or crossfade instead of an instant swap.
- **Event creation from empty state** — When the selected day has no events, the empty state CTA could be “Add event” that opens the event form with the date pre-filled.
- **Holidays / special dates** — Optional overlay of small dots or labels for configurable “special days” (e.g. holidays, birthdays) without cluttering the grid.
- **Drag event to reschedule** — Long-press an event in day/week view and drag to another day or time slot (requires backend/UX for time change).

---

## Calendar — Goals & Orders integration

Unify the day view so the calendar feels like **one place for the day**: events, goals due that day, and orders due that day. Keeps the calendar cozy and useful without feeling cluttered.

### Core integration (high value, keeps calendar readable)

1. **Day view = Events + Goals + Orders in one scroll**
   - In both **Week** (day view) and **Month** (selected day list), under the date header show three optional sections in one scroll:
     - **Schedule** — Existing `DayItinerary` (events). Keep as the main visual (time blocks / list).
     - **Goals for this day** — Compact list: daily goals that apply to the selected date (repeating or `due_date` = that day), plus weekly goals for the week containing that day, plus long-term goals with `target_end_date` on that day. Each row: emoji + title + optional check (if viewing today and already checked in). Same cozy card style as Today tab; tap opens goal detail or quick check-in (today only).
     - **Orders due** — Orders with `due_date` = selected date. Compact row: customer + status pill; tap opens order detail sheet (reuse `OrderDetailSheet`). Soft "Due today" / "Due [date]" label so it doesn't feel like a separate app.
   - **Empty sections are hidden** — If no goals for that day, no "Goals" block. If no orders due, no "Orders" block. So most days stay event-only unless there's something to show.
   - **Day summary line** — Under the date: "3 events · 2 goals · 1 order" (or "Nothing scheduled" when all empty). Subtle, one line; reinforces that the day is "complete" at a glance.

2. **Section headers that feel cozy**
   - No "Schedule" title; events list appears directly. Goals and Orders use small, friendly labels: "Goals for [DayName]", "Orders due". Same typography as date header (caption/subhead), with a soft left accent or icon (leaf, cart). Optional: very subtle entrance (fade or short stagger) when the section has content.

3. **"Today" stays special**
   - When the selected day is **today**, Goals section can show checkboxes and allow check-in (reuse Today logic). When the selected day is past/future, show goals as read-only "You had X goals" or "X goals planned" with no check-in. Keeps the calendar from duplicating full goal-editing UX on every day.

4. **Month view: light at-a-glance cues**
   - In the month grid, optional **small dots or a tiny icon** on a day cell when that day has: at least one order due, and/or at least one goal (daily due that day or long-term deadline that day). Reuse existing `DayCell`; pass `hasOrdersDue` / `hasGoals` booleans and render a tiny dot (e.g. below the date number) in a muted color. Prefer minimal: one dot for "has something" rather than two separate markers. Keeps the month view visually appealing while hinting "this day has more than events".

### UX and animations (cozy, not noisy)

5. **Staggered section entrance** — When switching the selected day or opening the list, animate sections in with a short stagger (Schedule → Goals → Orders, ~60–80 ms apart) using `FadeInDown` or opacity + translateY. Same feel as Today tab cards.

6. **Goal/order rows: press state** — Light haptic on tap; optional scale 0.98 or opacity 0.9 on press.

7. **Quick actions from calendar (optional, later)** — "Add goal for this day" or "Add order" with due date pre-filled from a small "+" in the Goals/Orders section header when that section is visible.

### Technical notes

- **Data**: Add `useGoals(userId)` and `useOrders()` to the calendar screen. Filter orders by `due_date === dateStr`. Use/expand `dailyGoalsForDate(dateStr)` and add helpers for weekly goals for the week containing the date and long-term goals with `target_end_date` on that date.
- **Components**: Reuse `DayItinerary`. Add `DayGoalsSection` (goal rows for one date, optional check-in when date is today) and `DayOrdersSection` (order rows, tap → detail sheet). Use in both `SelectedDayList` and `DayView`.

### Priority order (suggested)

1. **Phase 1** — Day view sections: add Goals and Orders sections below events in `SelectedDayList` and `DayView`, with "empty section = hidden" and day summary line.
2. **Phase 2** — Month view dots: add `hasOrdersDue` / `hasGoals` to month `DayCell` for at-a-glance.
3. **Phase 3** — Stagger animation and section header polish; optional "Add goal/order for this day" from calendar.

### New ideas for integrating orders & goals in the calendar

Ways to go beyond the current day-view sections and make goals/orders feel more woven into the calendar without clutter.

- **Month grid dots** — In month view, show a small dot (or two: one for goals, one for orders) on day cells that have goals or orders due. Tapping the day still opens the existing day list; the dot is a glanceable cue. Keeps the grid clean while signalling “this day has more.”
- **Week strip badges** — In week view, on each day pill in the strip, show a tiny badge count (e.g. “2” for 2 goals) or a small leaf/cart icon when that day has goals or orders. No extra tap; just at-a-glance.
- **Single “Also today” card** — Replace separate Goals and Orders sections with one compact card: “3 goals · 1 order due.” Tapping the card opens a small bottom sheet that lists goals (with check-in when today) and orders. One line on the calendar, detail on demand. Reduces scrolling further.
- **Timeline integration** — In day view, show goals and orders as short blocks on the same timeline as events (e.g. “Morning run” at 7, “Order: Acme Co” as a due-today chip). Requires mapping “due today” to a time (e.g. end of day or a chosen time) so they sit on the ruler. More visual but more complex.
- **FAB or header quick-add** — From the calendar tab, “Add event” (current FAB), plus a long-press or secondary action: “Add goal for [selected day]” or “Add order due [selected day]” with the date pre-filled. Keeps the calendar as the place to plan the day.
- **Goals/orders filter toggle** — In the calendar header or control bar, a subtle toggle: “Show goals & orders” on/off. When off, the day view shows only events (and the summary line can say “3 events” only). When on, current behavior. For users who want a minimal calendar sometimes.
- **Past days: completion summary** — When the selected day is in the past, show a single line under the date: “2 of 3 goals done · 1 order completed” (from completions and order status). No expandable sections; just a gentle recap. Makes the calendar feel like a light journal.
- **Order due-date picker from calendar** — When creating or editing an order, optional “Pick from calendar” that opens a month view to choose the due date. Links the mental model “when is this due?” to the calendar.
- **Goal deadline on calendar** — Long-term goals with `target_end_date` could appear as a small milestone marker on that date in month view (e.g. “Marathon” on race day). Tapping the day shows the goal in the list. Connects big goals to the grid.

---

## Animation ideas (future)

- **Today (home)** — ~~Slight scale-in (0.98 → 1) on glass cards~~ ✅; ~~small icon next to the moment line with a subtle bounce~~ ✅; ~~date accent bar breathing~~ ✅.
- **Goals** — Streak flame already has a pulse; consider a quick “confetti” or glow when hitting a milestone. Weekly wins card could have a gentle fade-in (already in place; could add stagger with metrics bubble).
- **Orders** — Status change: animate the status pill (e.g. Pending → In Progress). Optional: horizontal “stepper” with step animation on change.
- **Notes** — Stagger entrance (FadeInDown) per note card when the list loads. Empty state: “first note” CTA with a pencil or notebook icon idle animation.
- **GlassCard** — Optional: very subtle inner “shimmer” or gradient shift on mount (keep minimal for performance).

---

## Redesign / personality (ongoing)

- **Copy** — Greetings and moment lines now vary; can add seasonal variants (e.g. autumn, winter) or more weekend phrases.
- **Color & shape** — Cozy theme added; keep pill radius and cozy card radius on new components.
- **Typography** — Optional: slightly rounder font for headings in one theme (test readability).
- **Illustration** — Empty states or milestone screens: simple, friendly illustrations (line-art character or object) for more character.

---

## Feature ideas (backlog, excluding Finance)

- **Today** — “Focus mode”: hide orders/goals and show only schedule + one goal at a time. Optional: “Mood” or “Energy” one-tap (e.g. ☀️ 🌤 ⛅).
- **Goals** — Weekly wins card ✅. Optional: “Rest day” or “Skip today” for a goal without breaking the streak.
- **Notes** — Optional: per-note “mood” or color tag. “Pinned” note at top of list for a quick scratchpad or daily note.
- **Orders** — Optional: timeline view (by due date). “Quick complete” from the list (single tap to mark complete with haptic + sound).
- **Calendar** — See “Calendar — More ideas” above (day theme, current-time line, mini month strip, swipe between days, etc.).

---

## Home page — More ideas (backlog)

Ways to make the home feel even more inviting and give it unique character.

### High impact, low effort
- **"Your day is clear" empty state** — When there are no events and no daily goals, show a single cozy message with a soft illustration or floating icon instead of two separate empty blocks.
- **Moment line as a tappable "tip"** — Tap the moment line to cycle or reveal a second line (e.g. "Stay hydrated") for a light, helpful touch.

### Personality & warmth
- **Mood / energy one-tap** — Optional row under the date: "How's your energy?" with 3 tappable options (e.g. ☀️ 🌤 ⛅). Stored locally.
- **Seasonal or time-based header** — ✅ Avatar ring + icon now tint by time (sun/moon); optional: seasonal accent (e.g. autumn tint in Cozy theme).
- **Illustration in empty states** — ✅ Schedule empty state has line-art "window"; optional cup variant or character elsewhere.

### Polish
- **Schedule card "focus mode"** — Optional: collapse orders and show only Today's schedule + one goal at a time.
- **Stagger the first event** — ✅ First event now has longer fade + scale 0.98 → 1 on load.

---

## Haptics reference (current)

| Action              | Haptic   | Where                          |
|---------------------|----------|---------------------------------|
| Tab switch          | Light    | Tab bar                         |
| FAB (add)           | Medium   | Today, Orders                   |
| Primary button      | Medium   | Button (filled)                 |
| Secondary button    | Light    | Button (outline/ghost/tinted)    |
| Card / row tap      | Light    | OrderCard, NoteCard, Settings   |
| Complete / archive  | Medium   | OrderCard Complete, goal check-in |
| Calendar day select | Light    | MonthView DayCell               |
| Add goal (inline)   | Light    | TodoSection handleAdd           |
| Settings open       | Light    | Header settings button          |

---

## Sounds

Keep existing sounds (check, trash, menu open/close, habit complete, all-habit-complete). Consider:

- Softer “complete” sound for orders (already have `order_complete`).
- Optional: very subtle “tick” when moving a goal in the reorder list (or rely on haptic only).

---

*Last updated: after Today (home) cozy character (card scale-in, moment line icon, date accent breathing, order row polish), and Home page backlog section.*
