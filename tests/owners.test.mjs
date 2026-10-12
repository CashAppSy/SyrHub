import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate,handle} from '../server/submissions.mjs';
import {handleMySubmissions,requestSummary} from '../server/my-submissions.mjs';
import {seed,publishSubmission,validateRecord} from '../server/catalog.mjs';
const listing={name_en:'Local app',category:'other',organization:'Team',contact:'team@example.org',role:'owner',platforms:['web'],cities:['damascus'],icon:'https://example.org/icon.png',storeLinks:{web:'https://example.org/'},screenshots:['https://example.org/screen.png'],notes:'Contact us for further information'};
const contribution={type:'app',name:'Owner',title:'My app',url:'https://example.org',description:'A local app serving people in Damascus',listing};
async function environment(){const {privateKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);return {FIREBASE_WEB_API_KEY:'public',FIREBASE_PROJECT_ID:'project',FIREBASE_CLIENT_EMAIL:'service@example.org',FIREBASE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----',TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret'};}
const request=(method='GET',cursor='')=>new Request('https://site.example/api/my-submissions'+cursor,{method,headers:{Authorization:'Bearer member-token'}});
function doc(id,uid,status='pending'){return {name:'projects/project/databases/(default)/documents/submissions/'+id,fields:{userId:{stringValue:uid},title:{stringValue:'My app'},type:{stringValue:'app'},status:{stringValue:status},createdAt:{timestampValue:'2026-10-12T00:00:00Z'},responseNote:{stringValue:'Feedback'},moderationNote:{stringValue:'Private internal note'},reviewedBy:{stringValue:'private-admin'},email:{stringValue:'private@example.org'},listingDetails:{stringValue:JSON.stringify(listing)}}};}
test('owner listings validate media, role, platforms and cities without trusting ownership claims',()=>{
 const result=validate({...contribution,userId:'spoof',status:'approved'});assert.deepEqual(JSON.parse(result.listingDetails),listing);assert.equal(result.userId,undefined);assert.equal(result.status,undefined);assert.equal(result.verified,undefined);
 for(const patch of [{role:'verified_owner'},{platforms:[]},{cities:['unknown']},{icon:'javascript:alert(1)'},{screenshots:['http://insecure.example/s.png']},{screenshots:Array(6).fill('https://example.org/s.png')},{storeLinks:{web:'https://user:pass@example.org'}},{contact:''}])assert.throws(()=>validate({...contribution,listing:{...listing,...patch}}));
 assert.throws(()=>validate({...contribution,type:'need'}));
 const published=publishSubmission(seed(),listing,validate(contribution),'owner-request');const app=published.catalog.apps.find(x=>x.id===published.publishedId);assert.deepEqual(app.screenshots,listing.screenshots);assert.equal(app.icon,listing.icon);assert.deepEqual(app.cities,['damascus']);assert.equal(app.verified,false);assert.ok(!JSON.stringify(app).includes('team@example.org'));assert.ok(!JSON.stringify(app).includes(listing.notes));
 assert.throws(()=>validateRecord('apps',{...app,screenshots:['javascript:bad']},seed()));
});
test('request summaries expose decisions but exclude private owner/contact and admin data',()=>{
 const item=requestSummary(doc('own','member','rejected'),'member');assert.equal(item.status,'rejected');assert.equal(item.responseNote,'Feedback');for(const key of ['reviewedBy','email','listingDetails','userId','moderationNote'])assert.equal(item[key],undefined);assert.equal(requestSummary(doc('other','another'),'member'),null);
});
test('request tracking requires sign-in and queries only the signed-in account, with bounded pagination',async()=>{
 const env=await environment(),original=globalThis.fetch;let query;
 globalThis.fetch=async(url,options)=>{if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'member'}]});if(url.includes('oauth2'))return Response.json({access_token:'access'});query=JSON.parse(options.body).structuredQuery;return Response.json([...Array.from({length:26},(_,i)=>({document:doc('request-'+String(i).padStart(2,'0'),'member')})),{document:doc('other-user','other')}]);};
 try{let response=await handleMySubmissions(request(),env);assert.equal(response.status,200);let data=await response.json();assert.equal(data.items.length,25);assert.equal(data.nextCursor,'request-24');assert.equal(query.where.fieldFilter.field.fieldPath,'userId');assert.equal(query.where.fieldFilter.value.stringValue,'member');assert.equal(query.limit,26);assert.ok(!JSON.stringify(data).includes('private-admin'));assert.ok(!JSON.stringify(data).includes('other-user'));
 response=await handleMySubmissions(request('GET','?cursor=request-24'),env);assert.equal(response.status,200);assert.equal(query.startAt.before,false);assert.match(query.startAt.values[0].referenceValue,/\/submissions\/request-24$/);
 assert.equal((await handleMySubmissions(request('GET','?cursor=../someone'),env)).status,400);assert.equal((await handleMySubmissions(request('POST'),env)).status,405);assert.equal((await handleMySubmissions(request(),{})).status,503);
 const anonymous=request();anonymous.headers.delete('Authorization');assert.equal((await handleMySubmissions(anonymous,env)).status,401);globalThis.fetch=async()=>Response.json({users:[{localId:'member',disabled:true}]});assert.equal((await handleMySubmissions(request(),env)).status,401);
 }finally{globalThis.fetch=original;}
});
test('owner submission stores private listing details and server-owned identity and pending status',async()=>{
 const env=await environment(),original=globalThis.fetch;let stored;
 globalThis.fetch=async(url,options)=>{if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'member',email:'member@example.org'}]});if(url.includes('siteverify'))return Response.json({success:true,hostname:'site.example',action:'contribution'});if(url.includes('oauth2'))return Response.json({access_token:'access'});stored=JSON.parse(options.body);return Response.json({});};
 try{const response=await handle(new Request('https://site.example/api/submissions',{method:'POST',headers:{Origin:'https://site.example','Content-Type':'application/json',Authorization:'Bearer member'},body:JSON.stringify({...contribution,turnstileToken:'verified',userId:'someone-else',status:'approved'})}),env);assert.equal(response.status,201);assert.equal(stored.fields.userId.stringValue,'member');assert.equal(stored.fields.status.stringValue,'pending');assert.deepEqual(JSON.parse(stored.fields.listingDetails.stringValue),listing);}finally{globalThis.fetch=original;}
});
