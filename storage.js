/**
 * SyrHub Storage — إدارة مركزية للتخزين المحلي (localStorage)
 * ==========================================
 * كل التعامل مع localStorage يتم هنا عبر هذه الواجهة.
 * ES5 فقط — بدون let/const/arrow/class/modules.
 * جميع الدوال محمية بـ try/catch حتى لا يعطّل خطأ تخزين الموقع أبداً.
 */

var SyhStorage = (function(){
  'use strict';

  var PREFIX = 'syh-';
  var MAX_RECENT = 10;
  var MAX_COMPARE = 4;
  var memory = {};

  function canUseStorage(){
    try{
      var k = '__syh_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    }catch(e){
      return false;
    }
  }

  var supported = canUseStorage();

  function read(key, fallback){
    try{
      var raw;
      if(supported){
        raw = window.localStorage.getItem(PREFIX + key);
      } else {
        raw = memory[key];
      }
      return raw === null || raw === undefined ? fallback : JSON.parse(raw);
    }catch(e){
      return fallback;
    }
  }

  function write(key, value){
    var raw;
    try{
      raw = JSON.stringify(value);
    }catch(e){
      return;
    }
    try{
      if(supported){
        window.localStorage.setItem(PREFIX + key, raw);
      } else {
        memory[key] = raw;
      }
    }catch(e){
      memory[key] = raw;
    }
  }

  /* ============ المفضلة Favorites ============ */

  function getFavorites(){
    var list = read('favorites', []);
    return Array.isArray(list) ? list : [];
  }

  function addFavorite(id){
    var list = getFavorites();
    if(list.indexOf(id) === -1){
      list.push(id);
      write('favorites', list);
    }
  }

  function removeFavorite(id){
    var list = getFavorites().filter(function(x){ return x !== id; });
    write('favorites', list);
  }

  function isFavorite(id){
    return getFavorites().indexOf(id) !== -1;
  }

  function clearFavorites(){
    write('favorites', []);
  }

  /* ============ شوهد مؤخراً Recently Viewed ============ */

  function getRecentlyViewed(){
    var list = read('recent', []);
    return Array.isArray(list) ? list : [];
  }

  function addRecentlyViewed(id){
    var list = getRecentlyViewed().filter(function(x){ return x !== id; });
    list.unshift(id);
    if(list.length > MAX_RECENT){ list.length = MAX_RECENT; }
    write('recent', list);
  }

  function clearRecentlyViewed(){
    write('recent', []);
  }

  /* ============ المقارنة Comparison ============ */

  function getCompareList(){
    var list = read('compare', []);
    return Array.isArray(list) ? list : [];
  }

  function setCompareList(list){
    var clean = Array.isArray(list) ? list.slice() : [];
    if(clean.length > MAX_COMPARE){ clean.length = MAX_COMPARE; }
    write('compare', clean);
  }

  function addCompareItem(id){
    var list = getCompareList();
    if(list.indexOf(id) === -1 && list.length < MAX_COMPARE){
      list.push(id);
      setCompareList(list);
    }
  }

  function removeCompareItem(id){
    setCompareList(getCompareList().filter(function(x){ return x !== id; }));
  }

  function clearCompareList(){
    write('compare', []);
  }

  return {
    getFavorites: getFavorites,
    addFavorite: addFavorite,
    removeFavorite: removeFavorite,
    isFavorite: isFavorite,
    clearFavorites: clearFavorites,
    getRecentlyViewed: getRecentlyViewed,
    addRecentlyViewed: addRecentlyViewed,
    clearRecentlyViewed: clearRecentlyViewed,
    getCompareList: getCompareList,
    setCompareList: setCompareList,
    addCompareItem: addCompareItem,
    removeCompareItem: removeCompareItem,
    clearCompareList: clearCompareList
  };
})();