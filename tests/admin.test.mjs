import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorize,config,handleAdmin} from '../server/admin.mjs';
const env={FIREBASE_WEB_API_KEY:'public-key',ADMIN_UIDS:'admin-one',FIREBASE_PROJECT_ID:'syrhub-7e44a',FIREBASE_CLIENT_EMAIL:'service@example.org',FIREBASE_PRIVATE_KEY:'private'};
const request=()=>new Request('https://site.example/api/admin/submissions',{headers:{Authorization:'Bearer test'}});
test('configuration exposes no admin identities or service-account secrets',async()=>{const data=await config(env).json();assert.deepEqual(data,{configured:true,apiKey:'public-key'});assert.equal((await handleAdmin(request(),{})).status,503);});
test('missing, unauthorized and disabled identities cannot access private submissions',async()=>{
 assert.equal(await authorize(new Request('https://site.example'),env),null);
 const original=globalThis.fetch;
 try{for(const user of [{localId:'other'},{localId:'admin-one',disabled:true}]){let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({users:[user]});};assert.equal((await handleAdmin(request(),env)).status,403);assert.equal(calls,1);}
 globalThis.fetch=async()=>Response.json({users:[{localId:'admin-one'}]});assert.equal(await authorize(request(),env),'admin-one');}finally{globalThis.fetch=original;}
});
test('cross-origin edits fail before authentication',async()=>{const r=new Request('https://site.example/api/admin/submissions/id',{method:'PATCH',headers:{Origin:'https://evil.example'}});assert.equal((await handleAdmin(r,env,'id')).status,403);});
test('authorized listing and edits use optimistic version and server-owned audit fields',async()=>{
 const {privateKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----';
 const original=globalThis.fetch;let patch,status=200;
 const doc={name:'projects/p/databases/(default)/documents/submissions/id',updateTime:'2026-10-10T12:00:00Z',fields:{name:{stringValue:'Tester'},status:{stringValue:'pending'}}};
 globalThis.fetch=async(url,options)=>{if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'admin-one'}]});if(url.includes('oauth2'))return Response.json({access_token:'access'});if(options.method==='PATCH'){patch={url,body:JSON.parse(options.body)};return Response.json(doc,{status});}return Response.json({documents:[doc],nextPageToken:'next'});};
 try{
 const bindings={...env,FIREBASE_PRIVATE_KEY:pem};assert.deepEqual((await(await handleAdmin(request(),bindings)).json()).nextCursor,'next');
 const payload={type:'app',name:'Tester',title:'Edited app',url:'https://example.org',description:'Updated description for review',status:'approved',moderationNote:'Verified',updateTime:doc.updateTime,reviewedBy:'spoofed'};
 const edit=()=>new Request('https://site.example/api/admin/submissions/id',{method:'PATCH',headers:{Origin:'https://site.example',Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(payload)});
 assert.equal((await handleAdmin(edit(),bindings,'id')).status,200);assert.equal(patch.body.fields.reviewedBy.stringValue,'admin-one');assert.equal(patch.body.fields.status.stringValue,'approved');assert.ok(patch.body.fields.reviewedAt.timestampValue);assert.match(patch.url,/currentDocument.updateTime=/);assert.ok(!patch.body.fields.createdAt);
 status=412;assert.equal((await handleAdmin(edit(),bindings,'id')).status,409);
 }finally{globalThis.fetch=original;}
});
