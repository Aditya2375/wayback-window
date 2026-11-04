# Wayback Window

Explore Internet Archive captures in period-inspired browser frames.

Live: https://aditya2375.github.io/wayback-window/

## Dates and navigation

Use `2005`, `14 feb 2009` or `2009-02-14`. Numeric dates are **DD/MM/YYYY**, not MM/DD/YYYY. Dates and capture metadata use UTC. Impossible dates are rejected.

The availability API may return a nearby capture. A fallback when it fails is a requested date, explicitly unverified, not a verified capture. Earlier/later buttons probe at most three jumps (day, month, year); they do not promise adjacent captures or prove none exist. API calls time out after eight seconds each. Home cancels active work so stale responses cannot reopen a page.

## Safety and limits

Only HTTP(S) URLs without credentials are accepted. Share-link timestamp and URL values are validated. Archive API replay URLs are restricted to web.archive.org. Frames allow scripts for replay but not same-origin access, forms, popups or top navigation; this can break old interactive sites. No frame load event proves the archived content is correct or even successfully rendered. Use archive.org to inspect it. Never sign in or submit private information to an old page.

URLs/dates are sent to the Internet Archive; replayed pages can contact third parties. No accounts, database, payment, server or private-document upload. The Internet Archive can be unavailable, block frames, omit assets or return errors; the app cannot bypass it.

## Local checks

Serve this folder over HTTP. Test real API availability separately from deterministic intercepted-response UI tests. Include invalid schemes/dates/timestamps, hostile share hashes, metadata failures, home cancellation, directional jumps, skins, keyboard focus and desktop/mobile layout. Source uses external app.js/style.css and a restrictive page policy. No build step.
