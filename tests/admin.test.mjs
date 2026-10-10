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
