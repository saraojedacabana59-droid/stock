/*
 * Consulta de stock SF-SERVISOFT: funciona SIN INTERNET.
 * - La página (index, íconos, manifest) queda guardada en el celular.
 * - datos.json: si hay internet trae lo último; si no, usa la última copia guardada.
 */
var VERSION = 'stock-sf-v3';
var BASE = ['./', 'index.html', 'manifest.json', 'icono-192.png', 'icono-512.png'];

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
    var url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== location.origin) return;

    // Datos: primero internet (lo más nuevo), si no hay, la copia guardada
    if (url.pathname.endsWith('/datos.json')) {
        e.respondWith(
            fetch(e.request, { cache: 'no-store' }).then(function (r) {
                if (r.ok) { var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put('datos.json', copia); }); }
                return r;
            }).catch(function () {
                return caches.open(VERSION).then(function (c) { return c.match('datos.json'); }).then(function (r) {
                    return r || new Response('{"sinDatos":true}', { status: 503, headers: { 'Content-Type': 'application/json' } });
                });
            })
        );
        return;
    }

    // Página e íconos: se abre al instante desde el celular y se actualiza por detrás
    e.respondWith(
        caches.open(VERSION).then(function (c) {
            return c.match(e.request, { ignoreSearch: true }).then(function (guardado) {
                var red = fetch(e.request).then(function (r) { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(function () { return guardado; });
                return guardado || red;
            });
        })
    );
});
