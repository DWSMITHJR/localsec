// Service Worker to block extension scripts
const BLOCKED_SCRIPTS = [
  'bundle-simple.js',
  'injection-',
  'content-script',
  'tss-',
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'extensions::',
  'extensionScripts',
  'extensionScripts_',
  'extensionScripts.'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  console.log('🛡️ Service Worker: Installing...');});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
  console.log('🛡️ Service Worker: Active and controlling all clients');});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const shouldBlock = BLOCKED_SCRIPTS.some(script => 
    url.href.includes(script) || 
    event.request.referrer && event.request.referrer.includes(script)
  );

  if (shouldBlock) {
    console.log(`🚫 Blocked request to: ${url.href}`);
    event.respondWith(new Response('', { status: 404, statusText: 'Blocked by security policy' }));
    return;
  }
  
  // Allow all other requests
  event.respondWith(fetch(event.request));
});
