import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,changeCatalog,publishSubmission,validateRecord,publicCatalog} from '../server/catalog.mjs';
import {handleAdmin} from '../server/admin.mjs';
import {handleContent} from '../server/content-admin.mjs';
test('catalog CRUD validates relationships, safe text and links, and cascading deletion',()=>{
 let catalog=seed();catalog=changeCatalog(catalog,{collection:'categories',action:'save',record:{key:'new',label:'جديد',icon:'⭐'}});
 const app={id:'new-app',name:'New app',category:'new',description:'A new app',platforms:['web'],officialLink:'https://example.org'};
 catalog=changeCatalog(catalog,{collection:'apps',action:'save',record:app});assert.equal(catalog.apps.at(-1).name,'New app');
 assert.throws(()=>changeCatalog(catalog,{collection:'categories',action:'delete',id:'new'}));
 for(const data of [{...app,category:'missing'},{...app,name:'<script>alert(1)</script>'},{...app,icon:'https://example.org/"onload="bad'},{...app,platforms:[]}])assert.throws(()=>validateRecord('apps',data,catalog));
 catalog=changeCatalog(catalog,{collection:'reviews',action:'save',record:{id:'review-new',appId:'new-app',author:'Tester',rating:5,comment:'Good application',date:'2026-10-11'}});
 catalog=changeCatalog(catalog,{collection:'apps',action:'delete',id:'new-app'});assert.ok(!catalog.reviews.some(x=>x.appId==='new-app'));assert.ok(!catalog.apps.some(x=>x.id==='new-app'));
});
test('approval is idempotent and strips all private submission fields',()=>{
 const input={category:'other',platforms:['android'],name_en:'New App'},edited={type:'app',title:'تطبيق جديد',description:'وصف التطبيق الجديد',url:'https://example.org',name:'Private author',email:'private@example.org'};
 let published=publishSubmission(seed(),input,edited,'submission-id');published=publishSubmission(published.catalog,input,edited,'submission-id');
 const apps=published.catalog.apps.filter(x=>x.id===published.publishedId);assert.equal(apps.length,1);assert.equal(apps[0].category,'other');assert.equal(apps[0].email,undefined);assert.equal(apps[0].moderationNote,undefined);
});
test('atomic approval, public reads, content edits, stale versions, and unpublishing',async()=>{
 const {privateKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const env={FIREBASE_PROJECT_ID:'project',FIREBASE_CLIENT_EMAIL:'service@example.org',FIREBASE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----',FIREBASE_WEB_API_KEY:'key',ADMIN_UIDS:'admin'};
 const root='projects/project/databases/(default)/documents',submissionName=root+'/submissions/request-id',catalogName=root+'/cms/catalog';
 const docs=new Map([[submissionName,{name:submissionName,updateTime:'2026-10-11T00:00:00.000Z',fields:{type:{stringValue:'app'},createdAt:{timestampValue:'2026-10-11T00:00:00Z'},email:{stringValue:'private@example.org'}}}]]);
 let tick=1,forceConflict=false,lastWrites;const original=globalThis.fetch;
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'admin'}]});
  if(url.includes('oauth2'))return Response.json({access_token:'access'});
  if(url.endsWith(':commit')){
   lastWrites=JSON.parse(options.body).writes;
   if(forceConflict)return Response.json({}, {status:409});
   for(const write of lastWrites){const existing=docs.get(write.update.name);if(write.currentDocument.exists===false&&existing || write.currentDocument.updateTime&&existing?.updateTime!==write.currentDocument.updateTime)return Response.json({}, {status:409});}
   const version='2026-10-11T00:00:'+String(tick++).padStart(2,'0')+'.000Z';
   for(const write of lastWrites){const old=docs.get(write.update.name);docs.set(write.update.name,{name:write.update.name,fields:write.updateMask?{...old.fields,...write.update.fields}:write.update.fields,updateTime:version});}
   return Response.json({writeResults:lastWrites.map(()=>({updateTime:version}))});
  }
  const name=decodeURIComponent(url.split('/v1/')[1].split('?')[0]);if(docs.has(name))return Response.json(docs.get(name));return Response.json({}, {status:404});
 };
 const request=(path,body,method='POST')=>new Request('https://site.example/api/admin/'+path,{method,headers:{Origin:'https://site.example',Authorization:'Bearer test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const payload=()=>({type:'app',name:'Private author',email:'private@example.org',title:'Published App',url:'https://example.org',description:'Published app description',status:'approved',moderationNote:'Private note',updateTime:docs.get(submissionName).updateTime,category:'other',platforms:['web'],reviewedBy:'spoofed'});
 try{
  let response=await handleAdmin(request('submissions/request-id',payload(),'PATCH'),env,'request-id');assert.equal(response.status,200);assert.equal(lastWrites.length,2);assert.equal(lastWrites[0].update.fields.reviewedBy.stringValue,'admin');assert.equal(lastWrites[0].update.fields.createdAt,undefined);
  let publicData=await(await publicCatalog(env)).json();assert.equal(publicData.catalog.apps.filter(x=>x.id==='submission-request-id').length,1);assert.ok(!JSON.stringify(publicData).includes('private@example.org'));assert.ok(!JSON.stringify(publicData).includes('Private note'));
  response=await handleAdmin(request('submissions/request-id',payload(),'PATCH'),env,'request-id');assert.equal(response.status,200);publicData=await(await publicCatalog(env)).json();assert.equal(publicData.catalog.apps.filter(x=>x.id==='submission-request-id').length,1);
  let version=docs.get(catalogName).updateTime;
  response=await handleContent(request('content',{collection:'site',action:'save',version,record:{ar:{heroH1:'عنوان جديد'},showPromotions:false}}),env);assert.equal(response.status,200);assert.equal((await(await publicCatalog(env)).json()).catalog.site.ar.heroH1,'عنوان جديد');
  response=await handleContent(request('content',{collection:'site',action:'save',version,record:{}}),env);assert.equal(response.status,409);
  forceConflict=true;const before=docs.get(submissionName).updateTime;response=await handleAdmin(request('submissions/request-id',{...payload(),title:'Must not publish'},'PATCH'),env,'request-id');assert.equal(response.status,409);assert.equal(docs.get(submissionName).updateTime,before);assert.equal((await(await publicCatalog(env)).json()).catalog.apps.find(x=>x.id==='submission-request-id').name,'Published App');forceConflict=false;
  response=await handleAdmin(request('submissions/request-id',{...payload(),status:'rejected'},'PATCH'),env,'request-id');assert.equal(response.status,200);assert.ok(!(await(await publicCatalog(env)).json()).catalog.apps.some(x=>x.id==='submission-request-id'));
 }finally{globalThis.fetch=original;}
});
