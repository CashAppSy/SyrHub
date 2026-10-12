import {test} from 'node:test';
import assert from 'node:assert/strict';
import local from '../local-data.js';
import {seed,changeCatalog,validateRecord,publishSubmission} from '../server/catalog.mjs';
import {renderAppPage,renderSitemap} from '../server/app-pages.mjs';
import {validate} from '../server/submissions.mjs';
const app=()=>({...seed().apps[0],cities:['damascus'],needs:['توصيل طعام'],cost:'free',availability:'reported',paymentMethods:['نقداً'],needsAccount:'yes'});
test('local search recognizes Arabic needs/cities without assuming undocumented coverage',()=>{
 const catalog=seed(),a=app();assert.equal(local.parse('توصيل طعام في دِمَشق').city,'damascus');assert.ok(local.score(a,'توصيل طعام في دمشق',catalog.categories)>0);assert.equal(local.score({...a,cities:[]},'توصيل طعام في دمشق',catalog.categories),0);assert.equal(local.score(a,'توصيل طعام في حلب',catalog.categories),0);assert.ok(local.score({...a,cities:['nationwide']},'food delivery in Aleppo',catalog.categories)>0);assert.equal(local.score(a,'طبيب في دمشق',catalog.categories),0);assert.equal(local.parse('مطعم في ريف دمشق').city,'rif-dimashq');assert.ok(local.score(a,'أفضل تطبيق توصيل طعام في دمشق',catalog.categories)>0);assert.equal(local.score(a,'توصيل طعام في دمشق',catalog.categories,'homs'),0);assert.ok(local.score(a,'توصيل طعام',catalog.categories,'damascus')>0);
});
test('local metadata stays unknown by default and verified availability needs evidence',()=>{
 const catalog=seed(),a=app();let value=validateRecord('apps',a,catalog);assert.deepEqual(value.cities,['damascus']);assert.equal(value.cost,'free');let updated=changeCatalog(changeCatalog(catalog,{collection:'apps',action:'save',record:a}),{collection:'apps',action:'save',record:{...catalog.apps[0],name:'Changed by an older client'}});assert.deepEqual(updated.apps.find(x=>x.id===a.id).cities,['damascus']);assert.equal(validateRecord('apps',catalog.apps[0],catalog).availability,'unknown');
 for(const patch of [{cities:['imaginary']},{cost:'fake'},{availability:'verified'},{lastChecked:'2026-02-31'},{paymentMethods:['<script>bad</script>']},{verificationSource:'javascript:bad'}])assert.throws(()=>validateRecord('apps',{...a,...patch},catalog));
 value=validateRecord('apps',{...a,availability:'verified',lastChecked:new Date().toISOString().slice(0,10),verificationNotes:'Tested sign-in and service on a device'},catalog);assert.equal(value.availability,'verified');
 const current=changeCatalog(catalog,{collection:'apps',action:'save',record:{...value,id:'submission-request'}});const published=publishSubmission(current,{category:a.category,platforms:a.platforms},{type:'app',title:'Updated',description:'Updated app description',url:a.officialLink},'request');assert.deepEqual(published.catalog.apps.find(x=>x.id==='submission-request').cities,['damascus']);
});
test('app pages are rendered before JavaScript, escape content and use a live sitemap',async()=>{
 const catalog=seed();catalog.apps=[{...app(),isDemo:false,name:'App $& Name',description:'Description </script><script>bad</script>'}];catalog.reviews=[];const data={catalog,version:'v1'};
 const response=renderAppPage(data,catalog.apps[0].id,'https://site.example');assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('<title>App $&amp; Name — SyrHub</title>'));assert.ok(html.includes('id="serverAppPage"'));assert.ok(html.includes('Description &lt;/script&gt;'));assert.ok(!html.includes('</script><script>bad</script>'));assert.ok(html.includes('rel="canonical" href="https://site.example/apps/'));assert.ok(html.includes('دمشق'));assert.equal((html.match(/id="seoJsonLd"/g)||[]).length,1);assert.equal(renderAppPage(data,'not-found','https://site.example').status,404);
 let xml=renderSitemap(data,'https://site.example');assert.ok(xml.includes('/apps/'+catalog.apps[0].id));assert.ok(!xml.includes('#app/'));catalog.apps=[];xml=renderSitemap(data,'https://site.example');assert.ok(!xml.includes('/apps/'));
});
test('need/report validation accepts authenticated-workflow data and rejects invalid cities/reasons',()=>{
 const need={type:'need',name:'Member',title:'تطبيق لحجز طبيب',description:'أحتاج تطبيقاً لحجز طبيب في مدينتي',city:'homs'};assert.equal(validate(need).city,'homs');assert.throws(()=>validate({...need,title:''}));assert.throws(()=>validate({...need,city:'not-a-city'}));const report={type:'report',name:'Member',appId:'app-id',reason:'broken_link',description:'الرابط الرسمي لا يفتح على هاتفي'};assert.equal(validate(report).reason,'broken_link');assert.throws(()=>validate({...report,reason:'wrong'}));assert.throws(()=>validate({...report,appId:''}));
});

test('all existing catalog data is demo by default, including stored content, and can be hidden',async()=>{
 const {withDemoData}=await import('../server/demo-data.mjs');const catalog=seed();for(const key of ['apps','promotions','reviews'])assert.ok(catalog[key].every(x=>x.isDemo));
 const stored={...catalog,site:{},apps:catalog.apps.map(x=>({...x,isDemo:false})),reviews:catalog.reviews.map(x=>({...x,isDemo:false})),promotions:catalog.promotions.map(x=>({...x,isDemo:false}))};
 const merged=withDemoData(stored);for(const key of ['apps','promotions','reviews'])assert.ok(merged[key].every(x=>x.isDemo));assert.equal(new Set(merged.apps.map(x=>x.id)).size,merged.apps.length);
 const hidden=withDemoData({...merged,site:{...merged.site,showDemoApps:false}});for(const key of ['apps','promotions','reviews'])assert.equal(hidden[key].length,0);
 const html=await renderAppPage({catalog:merged},merged.apps[0].id,'https://site.example').text();assert.ok(html.includes('noindex, nofollow'));assert.ok(!html.includes('"aggregateRating"'));assert.ok(!renderSitemap({catalog:merged},'https://site.example').includes('/apps/'));
 const real=withDemoData({...stored,site:{demoMode:false}});assert.equal(real.apps[0].isDemo,false);
});
