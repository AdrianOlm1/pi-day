# Goals Tab — Character & Design Ideas

Ideas to make the Goals tab feel **lively**, **cozy**, and aligned with a clear **fire + growth** character for the app.

---

## App & tab character: **Fire + sprouting plant**

- **Fire** = streaks, consistency, warmth, “keeping the flame alive.”
- **Plant / sprout** = growth, small steps, patience, “plant today, harvest later.”
- **Cozy** = soft gradients, breathing background, friendly copy, no corporate tone.

Together: *“Keep the flame. Grow at your pace.”*

---

## Implemented (current)

- **Breathing background** — `ACBackgroundBreathing` with user-color tint so the Goals tab has the same “living” feel as Today.
- **Header** — Flame icon in a soft ring (growth/flame motif), rotating **tagline** instead of only “X goals tracked” (e.g. “Keep the flame · Grow at your pace”, “Small steps add up”).
- **Empty state** — Dual icon (flame outline + leaf), CTA “Light your first goal”, and extra fire/growth empty-state messages in the rotation.
- **Weekly wins** — Subtitle “Small steps — you're growing.” for a growth tone.
- **StreakFlame** — Existing: flame when streak > 0, leaf when 0 (already on-theme).

---

## UI / feature ideas (future)

### Visual

- **Subtle growth/flame illustration** — Small mascot or motif (e.g. a tiny sprout with a little flame, or a campfire + leaf) in the empty state or header area. Could be SVG or Lottie for a gentle animation.
- **Progress as “growth”** — For streak or period progress, optional visual: vine/leaf that “grows” with each check-in, or a flame that gets slightly taller/bigger as the streak increases (purely cosmetic).
- **Warm gradient on cards** — Habit cards could get a very soft warm gradient (user color at low opacity) on the top edge to tie into the fire/growth theme.
- **Micro-animations** — When checking in: small particle or glow that suggests “spark” or “leaf”; when reaching a milestone: brief flame or sprout burst (in addition to existing milestone modal).

### Copy & tone

- **Rotating encouragement** — When all goals are done for the day: “Flame still burning.” / “You grew today.” / “Rest well — you earned it.”
- **Streak messages** — Short lines near the streak count: “Day 7 — one week of steady light.” / “Streak alive.”
- **Section headers** — Optional softer labels: “Today’s sparks” instead of “TODAY’S DAILY GOALS”, “Your flames” for “MY GOALS” (or keep current and add a small flame/leaf icon).

### Features

- **“Spark” moment** — Optional daily prompt or tip (one sentence) at the top: e.g. “One small win today beats a big plan tomorrow.” Dismissible, low friction.
- **Weekly growth summary** — Expand “weekly wins” into a tiny “growth report”: e.g. “This week: 5 goals done, 2 streaks still burning.” with a leaf or flame icon.
- **Partner goals** — When viewing partner’s habits, a short line like “Cheering them on” or “Their flames this week” to keep the theme.

### Cozy / character

- **Mascot or icon set** — A single recurring character (e.g. small flame + leaf hybrid) used only in Goals: empty state, maybe celebration modal, and optionally in the tab bar when the Goals tab is active.
- **Sound** — Check-in sound could be a soft “spark” or “leaf” tone (if you add more sounds) to match the theme.
- **Haptics** — Already in place; optional: slightly different pattern for “milestone” vs “regular check-in” to make milestones feel special.

---

## Consistency with the rest of the app

- **Today** — Greeting, weather, moment line, breathing background → “cozy daily home.”
- **Goals** — Fire + growth, taglines, breathing background with warm tint → “cozy place to grow and keep streaks.”
- **Other tabs** — Same design system (glass cards, radius, spacing); character is strongest on Today and Goals so the app feels friendly without being noisy everywhere.

Use this doc as a backlog: pick the ideas that best fit your priorities and add them incrementally.
