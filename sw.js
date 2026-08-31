// Service worker: instala o site como app (Android/iOS), cacheia o "shell" básico,
// e agora também recebe notificações push reais enviadas pelo servidor (funciona com o app fechado).
const CACHE = 'imobicrm-shell-v4';
const SHELL = ['./index.html', './config.js', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // network-first para dados (Supabase e navegação), cache-first só pro shell estático
  const url = event.request.url;
  if (url.includes('supabase.co')) return; // nunca cachear chamadas de API/dados
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
  );
});

// Notificação push real, enviada pelo servidor mesmo com o app fechado
self.addEventListener('push', (event) => {
  let data = { title: 'ImobiCRM', body: 'Você tem um compromisso agendado.' };
  try { data = event.data.json(); } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'ImobiCRM', {
      body: data.body || '',
      icon: 'icons/icon-96.png',
      badge: 'icons/icon-96.png',
      data: { url: data.url || './index.html' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
