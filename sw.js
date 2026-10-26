// Laden-App: offline-fähig. Bei jeder neuen Version CACHE hochzählen.
const CACHE = "laden-v14";
const LOCAL = ["./", "index.html", "tagesabschluss.html", "roestplan.html", "bruehbuch.html", "verkauf.html", "abpackhilfe.html", "manifest.webmanifest",
  "icon-180.png", "icon-192.png", "icon-512.png", "lib/pdf.min.js", "lib/pdf.worker.min.js", "lib/xlsx.full.min.js"];
const CDN = ["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(async c => {
  await c.addAll(LOCAL);
  await Promise.all(CDN.map(u => c.add(new Request(u, {mode: "no-cors"})).catch(() => {})));
}).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  .then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    // Seiten: erst Netz (frische Version); antwortet es nicht binnen 2,5 s (schlechter Empfang), die gespeicherte Version zeigen
    const net = fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return r;
    });
    const cached = () => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match("index.html"));
    e.respondWith(new Promise(res => {
      let done = false; const fin = r => { if (!done && r) { done = true; res(r); } };
      const t = setTimeout(() => cached().then(r => r ? fin(r) : net.then(fin, () => {})), 2500);
      net.then(r => { clearTimeout(t); fin(r); }, () => { clearTimeout(t); cached().then(r => fin(r || Response.error())); });
    }));
  } else if (url.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res;
    })));
  }
});
