/* SyrHub offline shell. Increment CACHE_NAME when public assets change. */
var CACHE_NAME = 'syh-cache-v37';

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
  './account.js',
  './landing.js',
  './owners',
  './owners.js',
  './owners.css',
  './local-data.js',
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
  if(/^\/(api|admin)(\/|$)/.test(new URL(request.url).pathname)){ return; }

  var url = new URL(request.url);

  if(url.origin !== self.location.origin){return;}

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
      fetch(request, {signal:AbortSignal.timeout(8000)}).then(function(response){
        if(!response.ok){return response;}
        var copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(function(cache){
          var path=new URL(request.url).pathname;return cache.put(path==='/'||path==='/index.html'?'./index.html':request, copy);
        }));
        return response;
      }).catch(function(){
        return caches.match(request).then(function(cached){return cached||offlineFallback();});
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

self.addEventListener('push',function(event){
 var payload;try{payload=event.data.json();}catch(e){return;}
 var data=payload.data||payload.notification||payload;
 if(!data.title||!data.body)return;
 var target;try{target=new URL(data.href||'/',self.location.origin);if(target.origin!==self.location.origin)target=new URL('/',self.location.origin);}catch(e){return;}
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){var visible=list.filter(function(client){return client.visibilityState==='visible';});if(visible.length){visible.forEach(function(client){client.postMessage({type:'syh:notification',data:data});});return;}return self.registration.showNotification(data.title,{body:data.body,icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:data.campaignId||'syrhub',data:{href:target.href,campaignId:data.campaignId||''},renotify:false});}));
});
self.addEventListener('notificationclick',function(event){
 event.notification.close();var target=new URL(event.notification.data?.href||'/',self.location.origin);if(target.origin!==self.location.origin)return;if(event.notification.data?.campaignId)target.searchParams.set('syh_notification',event.notification.data.campaignId);var href=target.href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){for(var client of list){if(new URL(client.url).origin===self.location.origin){return client.navigate(href).then(function(window){return window&&window.focus();});}}return self.clients.openWindow(href);}));
});
