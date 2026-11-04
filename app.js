"use strict";

/* ---------- dom ---------- */
const $ = (id) => document.getElementById(id);
const frame = $("frame"), homePage = $("homePage"), viewportWrap = $("viewportWrap");
const urlInput = $("urlInput"), dateInput = $("dateInput");
const homeUrl = $("homeUrl"), homeDate = $("homeDate");
const statusText = $("statusText"), snapInfo = $("snapInfo"), tbTitle = $("tbTitle");

/* ---------- classic site pool ---------- */
const CLASSICS = [
  "google.com", "yahoo.com", "msn.com", "altavista.com", "ask.com",
  "bbc.co.uk", "cnn.com", "nytimes.com",
  "apple.com", "microsoft.com", "adobe.com",
  "amazon.com", "ebay.com", "craigslist.org",
  "wikipedia.org", "imdb.com",
  "myspace.com", "orkut.com", "facebook.com", "twitter.com", "youtube.com",
  "reddit.com", "digg.com", "slashdot.org",
  "rediff.com", "indiatimes.com", "sify.com",
  "github.com", "stackoverflow.com",
  "hotmail.com", "geocities.com", "angelfire.com",
  "nasa.gov", "whitehouse.gov", "india.gov.in"
];
const ERA_YEARS = [1996, 1999, 2002, 2005, 2008, 2011, 2014, 2016, 2019, 2022];

/* ---------- state ---------- */
let current = null;          // { ts: "yyyymmddhhmmss", original: "http://..." }
let capEdge = { prev: false, next: false };  // learned "no capture this way" for the current host
let capBusy = false;         // a prev/next jump is in flight
let skinOverride = "auto";
let crtOn = false, requestRun = 0, controller = null, frameTimer = null;
function cancelRequests() { requestRun++; controller?.abort(); controller = null; clearTimeout(frameTimer); busy = false; capBusy = false; $("goBtn").disabled = false; $("travelBtn").disabled = false; }
function validTs(ts) { return /^\d{14}$/.test(String(ts)) && dateToTs(tsToDate(ts)) === ts && +ts.slice(0,4) >= 1990 && +ts <= +nowTs(); }

/* ---------- small utils ---------- */
function setStatus(msg) { statusText.textContent = msg; }
function setSnapInfo(text) { snapInfo.textContent = text || "\u00a0"; }
function setTitle(t) { tbTitle.textContent = t; document.title = t + " - Wayback Window"; }

function ts14(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
         p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
}
function tsToDate(ts) {
  return new Date(Date.UTC(+ts.slice(0,4), +ts.slice(4,6)-1, +ts.slice(6,8),
                           +ts.slice(8,10), +ts.slice(10,12), +ts.slice(12,14)));
}
const MONTHS = ["January","February","March","April","May","June","July",
                "August","September","October","November","December"];
function fmtDate(d) {
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
}
function fmtTs(ts) {
  const d = tsToDate(ts);
  const p = (n) => String(n).padStart(2, "0");
  return fmtDate(d) + ", " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC";
}
function dateToTs(d) {
  const p = (n) => String(n).padStart(2, "0");
  return "" + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
         p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
}
function tsPlusDays(ts, days) {
  const d = tsToDate(ts); d.setUTCDate(d.getUTCDate() + days); return dateToTs(d);
}
function nowTs() { return dateToTs(new Date()); }

/* ---------- date parsing: any sane human format ---------- */
function parseDateInput(raw) {
  const s = raw.trim().toLowerCase().replace(/[,]/g, " ").replace(/\s+/g, " ");
  if (!s) return null;
  const mon = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
  let m;
  // ISO: 2016-03-05 or 2016/03/05
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))) {
    return build(+m[1], +m[2], +m[3]);
  }
  // numeric: 05/03/2016 -> read as DD/MM/YYYY
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) {
    return build(+m[3], +m[2], +m[1]);
  }
  // 14 feb 2009 / 14th february 2009
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)\.? (\d{4})$/)) && mon[m[2].slice(0,4).replace("sept","sep")] !== undefined) {
    const mm = mon[m[2]] || mon[m[2].slice(0,3)];
    if (mm) return build(+m[3], mm, +m[1]);
  }
  // feb 14 2009 / february 14th 2009
  if ((m = s.match(/^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)? (\d{4})$/))) {
    const mm = mon[m[1]] || mon[m[1].slice(0,3)];
    if (mm) return build(+m[3], mm, +m[2]);
  }
  // bare year
  if ((m = s.match(/^(\d{4})$/))) return build(+m[1], 1, 1);
  return null;

  function build(y, mo, d) {
    if (y < 1990 || y > new Date().getUTCFullYear()) return null;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
    if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    if (dt.getTime() > Date.now()) return null;
    return dt;
  }
}

/* ---------- url ---------- */
function normalizeUrl(raw) {
  let u = String(raw).trim();
  if (!u || u.length > 2048) return null;
  u = u.replace(/^https?:\/\/(wayback|web)\.archive\.org\/web\/\d+[^/]*\//i, "");
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!["http:","https:"].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname.includes(".") || /[<>\s]/.test(u)) return null;
    parsed.hash = ""; return parsed.href;
  } catch { return null; }
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } }

/* ---------- archive lookups ---------- */
async function apiAvailability(url, ts, signal) {
  const deadline = AbortSignal.timeout(8000);
  const r = await fetch("https://archive.org/wayback/available?url=" +
    encodeURIComponent(url) + "&timestamp=" + ts, {signal: signal ? AbortSignal.any([signal, deadline]) : deadline, credentials: "omit", referrerPolicy: "no-referrer"});
  if (!r.ok) throw new Error("availability " + r.status);
  const j = await r.json();
  const c = j && j.archived_snapshots && j.archived_snapshots.closest;
  if (c && c.available && c.url && validTs(c.timestamp)) {
    const replay = new URL(c.url);
    if (!["http:","https:"].includes(replay.protocol) || replay.hostname !== "web.archive.org" || !replay.pathname.startsWith("/web/")) return null;
    return { ts: c.timestamp, pageUrl: c.url.replace(/^http:\/\//, "https://") };
  }
  return null;
}
async function findSnapshot(url, ts, signal) { return apiAvailability(url, ts, signal); }

/* ---------- capture prev/next ----------
   The CDX index endpoint no longer sends CORS headers, so a browser cannot
   read the full capture list. Step through the availability API instead
   (it allows cross-origin reads): probe widening jumps until the closest
   snapshot lands strictly on the requested side of the current capture. */
function updateCaptureButtons() {
  const prev = $("prevCap"), next = $("nextCap"), hint = $("capHint");
  if (!current) {
    prev.disabled = true; next.disabled = true; hint.textContent = "captures";
    return;
  }
  prev.disabled = busy || capBusy || capEdge.prev || +current.ts.slice(0, 4) <= 1996;
  next.disabled = busy || capBusy || capEdge.next || +current.ts >= +nowTs();
  hint.textContent = capBusy ? "searching..." : "earlier / later";
}
async function stepCapture(dir) {
  if (!current || capBusy || busy) return;
  capBusy = true; const run = requestRun, snapshot = {...current};
  controller = new AbortController(); updateCaptureButtons();
  const jumps = [1, 31, 366]; let found = null;
  try {
    for (const j of jumps) {
      const probe = tsPlusDays(snapshot.ts, dir*j);
      const hit = await apiAvailability(snapshot.original, probe, controller.signal);
      if (run !== requestRun) return;
      if (hit && (dir > 0 ? +hit.ts > +snapshot.ts : +hit.ts < +snapshot.ts)) { found = hit; break; }
    }
    if (found) loadCapture(found.ts, snapshot.original, {});
    else setStatus("No capture found in the three sampled jumps. This is not proof there are none.");
  } catch(e) { if (run === requestRun) setStatus("Archive search unavailable. Try again later or open archive.org."); }
  finally { if (run === requestRun) { capBusy = false; updateCaptureButtons(); } }
}

/* ---------- rendering ---------- */
function skinForYear(y) {
  if (y <= 1999) return "navigator";
  if (y <= 2007) return "xp";
  if (y <= 2013) return "chrome2010";
  return "modern";
}
function applySkin(yearGuess) {
  const skin = skinOverride === "auto" ? skinForYear(yearGuess || 1999) : skinOverride;
  document.body.dataset.skin = skin;
}
function waybackIdUrl(ts, pageUrl) {
  return "https://web.archive.org/web/" + ts + "id_/" + pageUrl.replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_)?\//, "");
}
function loadCapture(ts, originalUrl, opts) {
  opts = opts || {};
  if (!validTs(ts) || !normalizeUrl(originalUrl)) { setStatus("Invalid capture link."); return; }
  clearTimeout(frameTimer); frameTimer = setTimeout(() => setStatus("Frame may be blocked or incomplete. Open archive.org to inspect it."), 20000);
  const key = hostOf(originalUrl);
  if (!current || current.key !== key) capEdge = { prev: false, next: false };
  current = { ts, original: originalUrl, key };
  const src = waybackIdUrl(ts, originalUrl);
  frame.style.display = "block";
  homePage.style.display = "none";
  frame.src = src;
  setStatus("Opening " + hostOf(originalUrl) + " as archived…");
  setTitle(hostOf(originalUrl) + " - " + fmtTs(ts));
  const requested = opts.requestedTs && opts.requestedTs.slice(0, 8) !== ts.slice(0, 8)
    ? " (nearest to " + fmtDate(tsToDate(opts.requestedTs)) + ")"
    : "";
  setSnapInfo("captured " + fmtTs(ts) + requested);
  $("openOrigBtn").disabled = false;
  $("urlInput").value = originalUrl.replace(/^https?:\/\//, "");
  dateInput.value = fmtDate(tsToDate(ts));
  dateInput.title = dateInput.value;
  applySkin(+ts.slice(0, 4));
  history.replaceState(null, "", "#u=" + encodeURIComponent(originalUrl) + "&ts=" + ts);
  updateCaptureButtons();
}
frame.addEventListener("load", () => {
  if (frame.style.display === "block" && frame.src) { clearTimeout(frameTimer); setStatus("Frame load event received; archive content cannot be verified here."); }
});

/* approximate fallback: hand the guess to Wayback, it 302s to nearest */
function loadApproximate(ts, originalUrl) {
  if (!validTs(ts) || !normalizeUrl(originalUrl)) return;
  const key = hostOf(originalUrl);
  if (!current || current.key !== key) capEdge = { prev: false, next: false };
  current = { ts, original: originalUrl, key, unverified: true };
  frame.style.display = "block";
  homePage.style.display = "none";
  frame.src = waybackIdUrl(ts, originalUrl);
  setStatus("Archive index unreachable - asking Wayback directly…");
  setTitle(hostOf(originalUrl) + " - near " + fmtDate(tsToDate(ts)));
  setSnapInfo("Requested date only: " + fmtDate(tsToDate(ts)) + ". Capture unverified.");
  $("openOrigBtn").disabled = false;
  dateInput.value = fmtDate(tsToDate(ts));
  dateInput.title = dateInput.value;
  applySkin(+ts.slice(0, 4));
  updateCaptureButtons();
  history.replaceState(null, "", "#u=" + encodeURIComponent(originalUrl) + "&ts=" + ts);
}

/* ---------- travel ---------- */
let busy = false;
async function travel(rawUrl, rawDate) {
  if (busy) return;
  cancelRequests(); const run = requestRun; controller = new AbortController();
  const url = normalizeUrl(rawUrl);
  if (!url) { setStatus("That address doesn't look right."); return; }
  const date = parseDateInput(rawDate);
  if (!date) { setStatus("Can't read that date - try '14 feb 2009' or '2009-02-14'."); return; }
  busy = true;
  $("goBtn").disabled = true; $("travelBtn").disabled = true; updateCaptureButtons();
  const ts = ts14(date);
  setStatus("Searching the archive for " + hostOf(url) + " near " + fmtDate(date) + "…");
  try {
    const hit = await findSnapshot(url, ts, controller.signal);
    if (run !== requestRun) return;
    if (hit) {
      loadCapture(hit.ts, hit.pageUrl.replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_)?\//, ""), { requestedTs: ts });
    } else {
      setStatus("No indexed capture found - trying Wayback directly…");
      loadApproximate(ts, url);
    }
  } catch(e) { if (run === requestRun) loadApproximate(ts, url); }
  finally { if (run === requestRun) {busy = false; $("goBtn").disabled = false; $("travelBtn").disabled = false; updateCaptureButtons();} }
}

/* ---------- home page helpers ---------- */
function fillChips() {
  const sc = $("siteChips");
  CLASSICS.slice(0, 12).forEach((s) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = s;
    b.onclick = () => { homeUrl.value = s; };
    sc.appendChild(b);
  });
  const yc = $("yearChips");
  ERA_YEARS.forEach((y) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = y;
    b.onclick = () => { homeDate.value = "1 jan " + y; updateInterpreted(); };
    yc.appendChild(b);
  });
}
function updateInterpreted() {
  const d = parseDateInput(homeDate.value || "");
  $("interpreted").textContent = d ? "→ " + fmtDate(d) : " ";
}
homeDate.addEventListener("input", updateInterpreted);
dateInput.addEventListener("input", () => {
  const d = parseDateInput(dateInput.value || "");
  dateInput.title = d ? fmtDate(d) : "";
});

/* ---------- events ---------- */
$("goBtn").onclick = () => travel(urlInput.value, dateInput.value);
$("travelBtn").onclick = () => {
  urlInput.value = homeUrl.value; dateInput.value = homeDate.value;
  travel(homeUrl.value, homeDate.value);
};
[urlInput, dateInput].forEach((el) => el.addEventListener("keydown", (e) => {
  if (e.key === "Enter") travel(urlInput.value, dateInput.value);
}));
[homeUrl, homeDate].forEach((el) => el.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("travelBtn").click();
}));
$("surpriseBtn").onclick = () => {
  homeUrl.value = CLASSICS[Math.floor(Math.random() * CLASSICS.length)];
  const y = ERA_YEARS[Math.floor(Math.random() * (ERA_YEARS.length - 1))];
  homeDate.value = (1 + Math.floor(Math.random() * 28)) + " " +
    MONTHS[Math.floor(Math.random() * 12)].slice(0, 3).toLowerCase() + " " + y;
  updateInterpreted();
};
$("homeBtn").onclick = goHome;
$("tbClose").onclick = goHome;
$("backBtn").onclick = () => history.back();
$("reloadBtn").onclick = () => { if (frame.src && frame.style.display === "block") { setStatus("Reloading…"); frame.src = frame.src; } };
$("openOrigBtn").onclick = () => {
  if (current) window.open("https://web.archive.org/web/" + current.ts + "/" + current.original, "_blank", "noopener");
};
$("prevCap").onclick = () => stepCapture(-1);
$("nextCap").onclick = () => stepCapture(1);
$("skinSelect").onchange = (e) => {
  skinOverride = e.target.value;
  applySkin(current ? +current.ts.slice(0, 4) : undefined);
};
$("crtToggle").onclick = () => {
  crtOn = !crtOn;
  viewportWrap.classList.toggle("crt", crtOn);
  $("crtToggle").textContent = "CRT: " + (crtOn ? "on" : "off");
};
$("tbMax").onclick = () => {
  const w = $("window");
  if (document.fullscreenElement) document.exitFullscreen();
  else if (w.requestFullscreen) w.requestFullscreen().catch(() => setStatus("Fullscreen is unavailable in this browser."));
};
function goHome() {
  cancelRequests();
  frame.style.display = "none"; frame.src = "about:blank";
  homePage.style.display = "block";
  current = null;
  setStatus("Ready"); setSnapInfo(""); setTitle("Wayback Window - Home");
  $("openOrigBtn").disabled = true;
  history.replaceState(null, "", location.pathname);
  applySkin();
  updateCaptureButtons();
}

/* ---------- boot ---------- */
fillChips();
applySkin();
(function boot() {
  const h = location.hash;
  const mU = h.match(/u=([^&]+)/), mT = h.match(/ts=(\d{14})/);
  if (mU && mT) {
    try { const u = normalizeUrl(decodeURIComponent(mU[1]));
    if (u && validTs(mT[1])) loadApproximate(mT[1], u); else setStatus("Invalid capture link."); } catch(e) { setStatus("Invalid capture link."); }
  }
})();
