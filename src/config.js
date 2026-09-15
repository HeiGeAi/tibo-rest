/** Deploy-time defaults for tibo.rest */
export const CONFIG = {
  apiUrl: "https://aihot.news/api/v1/codex-resets",
  // Relative so GH Pages /tibo-rest/ and custom domain both resolve
  fallbackUrl: "./data/fallback-events.json",
  pollMs: 5 * 60 * 1000,
  tiboHandle: "thsottiaux",
  siteName: "tibo.rest",
  aihotCalendar: "https://aihot.news/codex-reset",
  prayerKey: "tibo.rest.prayers.v1",
  vigilKey: "tibo.rest.vigil.v1",
};
