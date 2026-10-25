# Wayback Window

The web, on any day. Type an address and a date; the page opens as the
Wayback Machine captured it, dressed in the browser chrome of its era.

Live at https://aditya2375.github.io/wayback-window/

## Using it

- Enter a URL and a date. Most human formats work: `2005`, `14 feb 2009`,
  `02/14/2009`.
- The page loads inside a period window: Netscape Navigator before 2000,
  XP-era chrome to 2007, early Chrome to 2013, a modern window after.
- The arrow buttons step to the previous or next capture of the same site.
- `archive.org` opens the current capture on the Wayback Machine itself.

## How it works

- Snapshots are found through the Wayback availability API
  (`archive.org/wayback/available`), which permits cross-origin reads.
- The CDX capture index no longer allows browser access, so prev/next does
  not download a capture list. It probes the availability API with widening
  jumps until the closest snapshot lands on the requested side of the
  current capture.
- One static page, no build step, nothing uploaded anywhere.
