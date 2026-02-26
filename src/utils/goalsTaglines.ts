/**
 * Short taglines for the Goals tab — fire + growth character.
 * One shown at random so the tab feels alive and on-theme.
 */

const GOALS_TAGLINES = [
  'Keep the flame · Grow at your pace',
  'Small steps add up',
  'One spark, then another',
  'Your goals, your rhythm',
  'Warm up the streak',
  'Plant today, harvest later',
  'Stay cozy. Keep going.',
  'Little flames, big light',
  'Grow steady',
  'Feed the fire',
];

export function getGoalsTagline(): string {
  return GOALS_TAGLINES[Math.floor(Math.random() * GOALS_TAGLINES.length)];
}
