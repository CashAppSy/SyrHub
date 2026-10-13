import {template} from './page-template.mjs';
import local from '../local-data.js';
import {publicCatalog} from './catalog.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const script=value=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,x=>'\\u'+x.charCodeAt(0).toString(16).padStart(4,'0'));
export function renderAppPage(data,id,origin,english=false){
 const app=data.catalog.apps.find(x=>x.id===id);if(!app)return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>التطبيق غير موجود — SyrHub</title><h1>التطبيق غير موجود</h1><p>قد يكون أُزيل من الدليل.</p><a href="/">العودة إلى التطبيقات</a></html>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
 const title=(english?app.name_en||app.name:app.name)+' — SyrHub',description=english?app.description_en||app.description:app.description;
 const canonical=origin+'/apps/'+encodeURIComponent(app.id),category=data.catalog.categories.find(x=>x.key===app.category)||{};
 const cities=(app.cities||[]).map(key=>key==='nationwide'?(english?'Across Syria':'كل سوريا'):(local.cities.find(x=>x[0]===key)||[])[english?2:1]).filter(Boolean).join('، ');
 const facts='<dl><dt>'+(english?'Coverage':'المدن المخدومة')+'</dt><dd>'+escape(cities||(english?'Unknown':'غير معروف'))+'</dd><dt>'+(english?'Last checked':'آخر تحقق')+'</dt><dd>'+escape(app.lastChecked||(english?'Not checked':'لم يُتحقق'))+'</dd></dl>';
 const reviews=data.catalog.reviews.filter(x=>x.appId===app.id),schema={'@context':'https://schema.org','@type':'SoftwareApplication',name:english?app.name_en||app.name:app.name,description,url:canonical,applicationCategory:category.label_en||category.label||app.category,operatingSystem:(app.platforms||[]).join(', ')};
 const ratedReviews=reviews;if(app.icon)schema.image=app.icon;if(ratedReviews.length)schema.aggregateRating={'@type':'AggregateRating',ratingValue:(ratedReviews.reduce((n,x)=>n+x.rating,0)/ratedReviews.length).toFixed(1),ratingCount:ratedReviews.length,bestRating:5,worstRating:1};
 let html=template.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+escape(title)+'</title>');
 for(const key of ['description','og:title','og:description','og:url','og:image','twitter:title','twitter:description','twitter:image']){const value=key.includes('title')?title:key.includes('description')?description:key.endsWith('image')?app.icon||origin+'/icons/App-SyrHub-Icon.png':canonical;const rx=new RegExp('<meta (?:name|property)="'+key+'"[^>]*>','g');html=html.replace(rx,()=>'<meta '+(key.startsWith('og:')?'property':'name')+'="'+key+'" content="'+escape(value)+'">');}
 html=html.replace(/<link rel="canonical"[^>]*>/g,'').replace('<head>',()=>'<head>\n<link rel="canonical" href="'+escape(canonical)+'">');
 html=html.replace('<body>',()=>'<body><section id="serverAppPage" class="server-app-page"><a href="/">SyrHub</a><h1>'+escape(schema.name)+'</h1><p>'+escape(description)+'</p><p>'+escape(english?category.label_en||category.label:category.label)+'</p>'+facts+'<a href="'+escape(app.officialLink)+'" rel="noopener">'+(english?'Official website':'الموقع الرسمي')+'</a><h2>'+(english?'Reviews':'المراجعات')+'</h2>'+reviews.map(x=>'<article><strong>'+escape(x.author)+'</strong><p>'+escape(english?x.comment_en||x.comment:x.comment)+'</p><span>'+x.rating+' / 5</span></article>').join('')+'</section>');
 html=html.replace('<script type="application/ld+json" id="seoJsonLd"></script>',()=>'<script type="application/ld+json" id="seoJsonLd">'+script(schema)+'</script>').replace('</head>',()=>'<script type="application/json" id="syh-bootstrap">'+script(data)+'</script></head>');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function appPage(request,env,id){const response=await publicCatalog(env);if(!response.ok)return new Response('Content temporarily unavailable',{status:503,headers:{'Retry-After':'60','Cache-Control':'no-store'}});const url=new URL(request.url);return renderAppPage(await response.json(),id,url.origin,url.searchParams.get('lang')==='en');}
export function renderSitemap(data,origin){
 const urls=[{url:origin+'/'},{url:origin+'/owners'},...data.catalog.apps.map(app=>({url:origin+'/apps/'+encodeURIComponent(app.id),date:app.lastChecked||app.lastUpdate}))];
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(x=>'<url><loc>'+escape(x.url)+'</loc>'+(/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')?'<lastmod>'+x.date+'</lastmod>':'')+'</url>').join('')+'</urlset>';
}
export async function sitemap(request,env){const response=await publicCatalog(env);if(!response.ok)return new Response('Sitemap temporarily unavailable',{status:503,headers:{'Retry-After':'60'}});return new Response(renderSitemap(await response.json(),new URL(request.url).origin),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});}
