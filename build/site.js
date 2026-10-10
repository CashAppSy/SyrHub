// Explicit public asset list: never publish credentials, tools or old APKs.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, {recursive:true});
for (const file of ['index.html','offline.html','sw.js','manifest.webmanifest','storage.js','apps-data.js','promotions-data.js','reviews-data.js','sitemap.xml','SyrHub-Icon.png','enhancements.css','contributions.js','_headers']) fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.cpSync(path.join(root,'icons'),path.join(out,'icons'),{recursive:true});
console.log('Web/PWA assets prepared in dist/');
