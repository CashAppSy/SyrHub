import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle,validate} from '../server/submissions.mjs';
const app={type:'app',name:'Tester',title:'Example App',description:'A useful Syrian application',url:'https://example.org/app'};
const post=data=>new Request('https://syrhub.example/api/submissions',{method:'POST',headers:{Origin:'https://syrhub.example','Content-Type':'application/json',Authorization:'Bearer valid-user'},body:JSON.stringify(data)});
const env={FIREBASE_WEB_API_KEY:'public-key',FIREBASE_PROJECT_ID:'syrhub-7e44a',FIREBASE_CLIENT_EMAIL:'service@example.org',FIREBASE_PRIVATE_KEY:'key',TURNSTILE_SECRET_KEY:'test-secret',TURNSTILE_SITE_KEY:'test-site'};
test('validates each contribution type; rejects unsafe URLs and invalid fields',()=>{
 assert.equal(validate(app).type,'app');
 assert.equal(validate({...app,type:'promo',appId:'sufra-food',code:'SAVE'}).code,'SAVE');
 assert.equal(validate({...app,type:'review',appId:'sufra-food',rating:4}).rating,4);
 for(const invalid of [{...app,url:'javascript:alert(1)'},{...app,url:'https://user:pass@example.org'},{...app,description:'short'},{...app,type:'review',appId:'app',rating:6},{...app,email:'invalid'},{...app,name:42}])assert.throws(()=>validate(invalid));
});
test('unconfigured deployment fails closed; config never exposes secrets',async()=>{
 assert.equal((await handle(post(app),{})).status,503);
 assert.deepEqual(await(await handle(new Request('https://syrhub.example/api/submissions'),{FIREBASE_PRIVATE_KEY:'secret'})).json(),{configured:false,turnstileSiteKey:''});
});
test('rejects cross-origin requests, oversized bodies and missing verification',async()=>{
 const request=post(app);request.headers.set('Origin','https://attacker.example');assert.equal((await handle(request,env)).status,403);
 const large=post(app);large.headers.set('Content-Length','20000');assert.equal((await handle(large,env)).status,413);
 assert.equal((await handle(post({...app,description:'x'.repeat(17000)}),env)).status,413);
 assert.equal((await handle(post(app),env)).status,400);
});
test('verified contribution signs OAuth JWT and stores server-owned pending status',async()=>{
 const {privateKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const exported=await crypto.subtle.exportKey('pkcs8',privateKey);
 const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(exported).toString('base64')+'\n-----END PRIVATE KEY-----';
 const original=globalThis.fetch;let stored;
 globalThis.fetch=async(url,options)=>{
  if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'member-id',email:'member@example.org'}]});
  if(url.includes('siteverify'))return Response.json({success:true,hostname:'syrhub.example',action:'contribution'});
  if(url.includes('oauth2'))return Response.json({access_token:'test-access-token'});
  stored=JSON.parse(options.body);assert.match(url,/projects\/syrhub-7e44a/);assert.equal(options.headers.Authorization,'Bearer test-access-token');return Response.json({}, {status:200});
 };
 try{const response=await handle(post({...app,turnstileToken:'verified',status:'approved',email:'spoofed@example.org',userId:'spoofed-user'}),{...env,FIREBASE_PRIVATE_KEY:pem});assert.equal(response.status,201);assert.equal(stored.fields.status.stringValue,'pending');assert.ok(stored.fields.createdAt.timestampValue);assert.equal(stored.fields.userId.stringValue,'member-id');assert.equal(stored.fields.email.stringValue,'member@example.org');}finally{globalThis.fetch=original;}
});
test('invalid Turnstile token, hostname or action never contacts Firestore',async()=>{
 const original=globalThis.fetch;
 try{for(const result of [{success:false},{success:true,hostname:'attacker.example',action:'contribution'},{success:true,hostname:'syrhub.example',action:'other'}]){let calls=0;globalThis.fetch=async(url)=>{calls++;return Response.json(url.includes('accounts:lookup')?{users:[{localId:'member-id'}]}:result);};assert.equal((await handle(post({...app,turnstileToken:'bad'}),env)).status,403);assert.equal(calls,2);}}finally{globalThis.fetch=original;}
});

test('anonymous, invalid and disabled accounts cannot submit even with a Turnstile token',async()=>{
 const original=globalThis.fetch;
 try{
  let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({users:[]});};
  const anonymous=post({...app,turnstileToken:'verified'});anonymous.headers.delete('Authorization');
  assert.equal((await handle(anonymous,env)).status,401);assert.equal(calls,0);
  assert.equal((await handle(post({...app,turnstileToken:'verified'}),env)).status,401);assert.equal(calls,1);
  globalThis.fetch=async()=>Response.json({users:[{localId:'blocked',disabled:true}]});
  assert.equal((await handle(post({...app,turnstileToken:'verified'}),env)).status,401);
 }finally{globalThis.fetch=original;}
});
