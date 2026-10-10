/* SyrHub offline shell. Increment CACHE_NAME when public assets change. */
var CACHE_NAME = 'syh-cache-v28';

var CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './SyrHub-Icon.png',
  './icons/App-SyrHub-Icon.png',
  './apps-data.js',
  './promotions-data.js',
  './reviews-data.js',
  './storage.js',
  './enhancements.css',
  './contributions.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

function offlineFallback(){
  return caches.match('./offline.html').then(function(res){
    return res || caches.match('./index.html');
  }).then(function(res){
    // Pages redirects .html paths; normalize cached redirect responses for navigation.
    return res ? new Response(res.body, { status: res.status, headers: res.headers }) : Response.error();
  });
}

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.map(function(key){
          if(key !== CACHE_NAME){ return caches.delete(key); }
        })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event){
  var request = event.request;
  if(request.method !== 'GET'){ return; }
  if(new URL(request.url).pathname.indexOf('/api/') !== -1){ return; }

  var url = new URL(request.url);

  /* لا نعترض طلبات التتبع والإعلانات — تبقى حية دائماً */
  if(url.origin === 'https://www.googletagmanager.com' ||
     url.origin === 'https://www.google-analytics.com' ||
     url.origin === 'https://www.google.com' ||
     url.origin === 'https://fonts.gstatic.com' ||
     url.origin === 'https://fonts.googleapis.com'){
    return;
  }

  /* التصفح: نتصل بالشبكة أولاً مع الرجوع للنسخة المخزنة عند انقطاعها */
  if(request.mode === 'navigate'){
    event.respondWith(
      fetch(request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put('./index.html', copy);
        });
        return response;
      }).catch(function(){
        return offlineFallback();
      })
    );
    return;
  }

  /* بقية الموارد: من الكاش أولاً ثم الشبكة، وتُخزَّن كل مورد جديد */
  event.respondWith(
    caches.match(request).then(function(cached){
      if(cached){ return cached; }
      return fetch(request).then(function(response){
        if(response && response.status === 200 && response.type === 'basic'){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(request, copy); });
        }
        return response;
      });
    }).catch(function(){
      return offlineFallback();
    })
  );
});