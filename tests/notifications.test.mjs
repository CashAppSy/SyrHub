import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleNotifications,validateNotification,dispatchBatch} from '../server/notifications.mjs';
import {publicConfig} from '../server/user-auth.mjs';
const origin='https://site.example';
const request=(admin=false,body,account='admin')=>new Request(origin+'/api/'+(admin?'admin/':'')+'notifications',{method:body?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer '+account,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
const env={FIREBASE_WEB_API_KEY:'public-key',FIREBASE_PROJECT_ID:'project',FIREBASE_CLIENT_EMAIL:'service@example.org',ADMIN_UIDS:'admin',FIREBASE_MESSAGING_SENDER_ID:'sender',FIREBASE_WEB_APP_ID:'app',FIREBASE_VAPID_KEY:'public-vapid'};
test('public configuration exposes only public authentication and push settings',async()=>{const data=await publicConfig({...env,FIREBASE_PRIVATE_KEY:'private',TURNSTILE_SECRET_KEY:'secret'}).json();assert.equal(data.pushConfigured,true);assert.equal(data.authConfigured,true);assert.ok(!JSON.stringify(data).includes('private'));assert.ok(!JSON.stringify(data).includes('secret'));assert.ok(!JSON.stringify(data).includes('admin'));});
test('notification content permits internal public destinations and rejects unsafe links',()=>{assert.equal(validateNotification({title:'Title',body:'Message',href:'/#!app'},origin).href,'/#!app');for(const href of ['https://outside.example','javascript:alert(1)','/api/catalog','/admin/','https://user:pass@site.example/'])assert.throws(()=>validateNotification({title:'Title',body:'Message',href},origin));assert.throws(()=>validateNotification({title:'',body:'Message'},origin));});
test('notification permissions, draft publication, deduplicated metrics, batching and archiving',async()=>{
 const {privateKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const binding={...env,FIREBASE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----'};
 const docs=new Map(),root='projects/project/databases/(default)/documents';let tick=0,pushCalls=0;const original=globalThis.fetch;
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('accounts:lookup')){const id=JSON.parse(options.body).idToken;return Response.json({users:id==='invalid'?[]:[{localId:id,email:id+'@example.org',disabled:id==='disabled'}]});}
  if(url.includes('oauth2'))return Response.json({access_token:'access'});
  if(url.includes('fcm.googleapis.com')){pushCalls++;return Response.json({name:'accepted'});}
  if(url.endsWith(':runAggregationQuery')){const input=JSON.parse(options.body).structuredAggregationQuery.structuredQuery,collection=input.from[0].collectionId,id=input.where.fieldFilter.value.stringValue;return Response.json([{result:{aggregateFields:{total:{integerValue:String([...docs.values()].filter(x=>x.name.includes('/'+collection+'/')&&x.fields.campaignId?.stringValue===id).length)}}}}]);}
  if(url.endsWith(':commit')){const writes=JSON.parse(options.body).writes;for(const w of writes){const existing=docs.get(w.update.name);if(w.currentDocument.exists===false&&existing||w.currentDocument.updateTime&&w.currentDocument.updateTime!==existing?.updateTime)return Response.json({}, {status:409});}const time='2026-10-11T01:00:'+String(++tick).padStart(2,'0')+'.000Z';for(const w of writes)docs.set(w.update.name,{...w.update,updateTime:time});return Response.json({writeResults:writes.map(()=>({updateTime:time}))});}
  const uri=new URL(url),pathname=decodeURIComponent(uri.pathname.split('/v1/')[1]);if(docs.has(pathname))return Response.json(docs.get(pathname));
  if(['notifications','notification_devices'].some(c=>pathname===root+'/'+c)){const all=[...docs.values()].filter(x=>x.name.startsWith(pathname+'/')),offset=Number(uri.searchParams.get('pageToken')||0),size=Number(uri.searchParams.get('pageSize'));return Response.json({documents:all.slice(offset,offset+size),nextPageToken:offset+size<all.length?String(offset+size):undefined});}
  return Response.json({}, {status:404});
 };
 try{
  assert.equal((await handleNotifications(request(false,undefined,'invalid'),binding)).status,401);
  assert.equal((await handleNotifications(request(true,undefined,'member'),binding,{},true)).status,403);
  const cross=request(true,{action:'save'});cross.headers.set('Origin','https://attacker.example');assert.equal((await handleNotifications(cross,binding,{},true)).status,403);
  let response=await handleNotifications(request(true,{action:'save',record:{title:'A new feature',body:'Try our application',href:'/#apps'}}),binding,{},true);assert.equal(response.status,200);let item=(await response.json()).item;assert.equal(item.status,'draft');
  assert.equal((await(await handleNotifications(request(false),binding)).json()).items.length,0);
  const jobs=[];response=await handleNotifications(request(true,{action:'send',id:item.id,version:item.version}),binding,{waitUntil:job=>jobs.push(job)},true);assert.equal(response.status,200);await Promise.all(jobs);
  let items=(await(await handleNotifications(request(false),binding)).json()).items;assert.equal(items.length,1);assert.equal(items[0].createdBy,undefined);assert.equal(items[0].pushCursor,undefined);
  for(let i=0;i<2;i++)assert.equal((await handleNotifications(request(false,{action:'read',id:item.id},'member'),binding)).status,200);
  await handleNotifications(request(false,{action:'click',id:item.id},'member'),binding);
  item=(await(await handleNotifications(request(true),binding,{},true)).json()).items[0];assert.equal(item.reads,1);assert.equal(item.clicks,1);assert.equal(item.pushState,'complete');
  response=await handleNotifications(request(true,{action:'send',id:item.id,version:item.version}),binding,{},true);assert.equal(response.status,409);
  for(let i=0;i<23;i++)assert.equal((await handleNotifications(request(false,{action:'subscribe',token:'device-token-long-enough-'+i},'member'),binding)).status,200);
  const data=JSON.parse(docs.get(root+'/notifications/'+item.id).fields.payload.stringValue);data.pushState='sending';await dispatchBatch(binding,{...data,version:item.version},'access');assert.equal(pushCalls,10);
  item=(await(await handleNotifications(request(true),binding,{},true)).json()).items[0];assert.equal(item.pushState,'partial');assert.equal(item.pushAccepted,10);
  const more=[];response=await handleNotifications(request(true,{action:'continue',id:item.id,version:item.version}),binding,{waitUntil:job=>more.push(job)},true);assert.equal(response.status,200);await Promise.all(more);assert.equal(pushCalls,20);item=(await(await handleNotifications(request(true),binding,{},true)).json()).items[0];const final=[];await handleNotifications(request(true,{action:'continue',id:item.id,version:item.version}),binding,{waitUntil:job=>final.push(job)},true);await Promise.all(final);assert.equal(pushCalls,23);
  item=(await(await handleNotifications(request(true),binding,{},true)).json()).items[0];assert.equal(item.pushState,'complete');assert.equal(item.pushAccepted,23);
  response=await handleNotifications(request(true,{action:'archive',id:item.id,version:item.version}),binding,{},true);assert.equal(response.status,200);assert.equal((await(await handleNotifications(request(false),binding)).json()).items.length,0);
 }finally{globalThis.fetch=original;}
});

test('push failures are counted once even when the upstream error body is malformed',async()=>{
 const original=globalThis.fetch;let saved,index=0;
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('/notification_devices?'))return Response.json({documents:[1,2].map(i=>({name:'projects/project/databases/(default)/documents/notification_devices/device-'+i,fields:{payload:{stringValue:JSON.stringify({token:'device-'+i,enabled:true})}},updateTime:'2026-10-11T01:00:00Z'}))});
  if(url.includes('fcm.googleapis.com')){if(++index===1)return new Response('not JSON',{status:503});throw new Error('Network failed');}
  if(url.endsWith(':commit')){saved=JSON.parse(JSON.parse(options.body).writes[0].update.fields.payload.stringValue);return Response.json({writeResults:[{updateTime:'2026-10-11T01:00:01Z'}]});}
  throw new Error('Unexpected request');
 };
 try{await dispatchBatch(env,{id:'campaign',title:'Title',body:'Message',href:'/',createdAt:'2026-10-11T01:00:00Z',version:'2026-10-11T01:00:00Z'},'access');assert.equal(saved.pushFailed,2);assert.equal(saved.pushAccepted,0);assert.equal(saved.pushState,'complete');}finally{globalThis.fetch=original;}
});
