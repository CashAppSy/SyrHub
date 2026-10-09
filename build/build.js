/**
 * SyrHub — أداة البناء
 * ==========================================
 * اقرأ بياناتك من ملفات JSON في مجلد `data` ثم أعد توليد ملفات
 * `apps-data.js` / `promotions-data.js` / `reviews-data.js` و` sitemap.xml`.
 *
 * الاستخدام بعد تعديل أي ملف في data/:
 *   node build/build.js
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var DATA_DIR = path.join(ROOT, 'data');
var SITE_URL = 'https://ali-mhd-ibrahim.github.io/SyrHub/';

var PLATFORMS = ['android', 'ios', 'web'];

function readJson(name){
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function writeData(filename, parts){
  var header = '/**\n' +
    ' * SyrHub — ' + parts.map(function(p){ return p[0]; }).join(' + ') + '\n' +
    ' * ==========================================\n' +
    ' * ⚠️ ملف مُولَّد آلياً بواسطة build/build.js — لا تعدّله يدوياً.\n' +
    ' * عدّل المصدر في data/*.json ثم أعد التشغيل: node build/build.js\n' +
    ' */\n\n';
  var body = header;
  parts.forEach(function(p){
    body += 'var ' + p[0] + ' = ' + JSON.stringify(p[1], null, 2) + ';\n\n';
  });
  fs.writeFileSync(path.join(ROOT, filename), body);
  console.log('→ ' + filename + ' (' + parts.map(function(p){ return p[1].length; }).join(', ') + ')');
}

function main(){
  var cats = readJson('categories.json');
  var apps = readJson('apps.json');
  var promos = readJson('promotions.json');
  var reviews = readJson('reviews.json');

  var errors = [];
  var catKeys = {};
  cats.forEach(function(c){ catKeys[c.key] = true; });

  var ids = {};
  apps.forEach(function(app){
    if(!app.id || ids[app.id]){ errors.push('معرّف مكرر أو ناقص: ' + app.id); }
    ids[app.id] = true;
    if(!catKeys[app.category]){ errors.push(app.id + ': فئة غير معروفة "' + app.category + '"'); }
    (app.platforms || []).forEach(function(p){
      if(PLATFORMS.indexOf(p) === -1){ errors.push(app.id + ': منصة غير معروفة "' + p + '"'); }
    });
    if(app.officialLink && /example\.com|example\.org/.test(app.officialLink)){
      console.log('  ⚠️ تنبيه: ' + app.id + ' يستخدم رابطاً تجريبياً (example.com) — استبدله قبل النشر.');
    }
  });

  if(errors.length){
    console.error('فشل البناء — الأخطاء:');
    errors.forEach(function(e){ console.error('  - ' + e); });
    process.exit(1);
  }

  writeData('apps-data.js', [['CATEGORIES', cats], ['APPS', apps]]);
  writeData('promotions-data.js', [['PROMOTIONS', promos]]);
  writeData('reviews-data.js', [['REVIEWS', reviews]]);

  /* ============ sitemap.xml ============ */
  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <url>\n';
  xml += '    <loc>' + SITE_URL + '</loc>\n';
  xml += '    <changefreq>weekly</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';
  apps.forEach(function(app){
    xml += '  <url>\n';
    xml += '    <loc>' + SITE_URL + '#app/' + encodeURIComponent(app.id) + '</loc>\n';
    if(app.lastUpdate){ xml += '    <lastmod>' + app.lastUpdate + '</lastmod>\n'; }
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });
  xml += '</urlset>\n';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log('→ sitemap.xml (' + (apps.length + 1) + ' عنواناً)');

  console.log('— تم البناء بنجاح.');
}

main();