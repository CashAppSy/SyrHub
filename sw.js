/* SyrHub Service Worker — v1.16.0
   ⚠️ عند تغيير أي شيء في index.html/offline.html ارفع CACHE_NAME إلى vN+1 وفي sw.js نفسد القيم نفسها (FIREBASE_CONFIG). */
var CACHE_NAME = 'syh-cache-v26';

/* ══════════════ 🔔 Firebase Cloud Messaging (إشعارات الخلفية) ══════════════
   املأ القيم نفسها الموضوعة في index.html (FIREBASE) — عند بقائها فارغة
   تبقى معالجة الإشعارات الخلفية معطّلة ولا يتغيّر سلوك الكاش إطلاقاً. */
var FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDeQqbytuAjm7qQpHwSfeXIUmYuXobeQgg',
  projectId: 'test-d371d',
  messagingSenderId: '549208423494',
  appId: '1:549208423494:web:3f6c9314da24e9c1ef1e47'
};
if(FIREBASE_CONFIG.apiKey){
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    var fbMessaging = firebase.messaging();
    fbMessaging.onBackgroundMessage(function(payload){
      var d = payload.data || {};
      var n = payload.notification || {};
      var title = n.title || 'SyrHub';
      var body = n.body || (d.appName ? 'تحديث من ' + d.appName : 'لديك إشعار جديد من SyrHub');
      var url = d.url || './';
      self.registration.showNotification(title, {
        body: body,
        icon: './SyrHub-Icon.png',
        badge: './SyrHub-Icon.png',
        data: { url: url }
      });
    });
    self.addEventListener('notificationclick', function(event){
      var url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './';
      event.notification.close();
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
          for(var i = 0; i < list.length; i++){
            if('focus' in list[i]){ list[i].focus(); return undefined; }
          }
          if(clients.openWindow){ return clients.openWindow(url); }
          return null;
        })
      );
    });
  }catch(e){}
}
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
  './storage.js'
];

function offlineFallback(){
  return caches.match('./offline.html').then(function(res){
    return res || caches.match('./index.html');
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
      var network = fetch(request).then(function(response){
        if(response && response.status === 200 && response.type === 'basic'){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(request, copy);
          });
        }
        return response;
      });
      return cached || network;
    }).catch(function(){
      return offlineFallback();
    })
  );
});