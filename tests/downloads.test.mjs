import {fixtureCatalog as seed} from './fixtures.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateDownload,handleDownload} from '../server/app-downloads.mjs';
import {validateRecord,changeCatalog} from '../server/catalog.mjs';
import {validateListing} from '../server/owner-listing.mjs';
const download={enabled:true,url:'https://files.example.org/app.apk',version:'2.0.1',publisher:'App team',sizeMB:'12.5',minAndroid:'8.0',sha256:'a'.repeat(64),releaseNotes:'Improved search'};
test('APK metadata validates source and publisher claims without implying a security scan',()=>{
 assert.deepEqual(validateDownload(undefined),{enabled:false});assert.deepEqual(validateDownload(download),download);
 for(const patch of [{url:'http://files.example.org/app.apk'},{url:'javascript:alert(1)'},{url:'https://user:pass@files.example.org/app.apk'},{version:''},{publisher:''},{sizeMB:'-1'},{sizeMB:'NaN'},{sizeMB:'5000'},{sha256:'bad'},{enabled:'true'}])assert.throws(()=>validateDownload({...download,...patch}));
 const catalog=seed(),app={...catalog.apps[0],platforms:['android'],download};let changed=changeCatalog(catalog,{collection:'apps',action:'save',record:app});changed=changeCatalog(changed,{collection:'apps',action:'save',record:{...app,download:undefined,name:'Changed by older client'}});assert.deepEqual(changed.apps.find(x=>x.id===app.id).download,download);assert.throws(()=>validateRecord('apps',{...app,platforms:['ios']},catalog));
 const proposal=validateListing({category:'other',organization:'Team',contact:'team@example.org',role:'owner',platforms:['android'],download});assert.equal(proposal.download.enabled,false);assert.throws(()=>validateListing({...proposal,platforms:['ios']}));
});
test('download redirect uses only the saved approved target and rejects disabled listings',async()=>{
 const {privateKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const env={FIREBASE_PROJECT_ID:'project',FIREBASE_CLIENT_EMAIL:'service@example.org',FIREBASE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----'},original=globalThis.fetch;
 const catalog=seed();const app=catalog.apps[0];app.platforms=['android'];app.download=download;
 globalThis.fetch=async url=>String(url).includes('oauth2')?Response.json({access_token:'access'}):Response.json({fields:{content:{stringValue:JSON.stringify(catalog)}},updateTime:'v1'});
 const request=(method='GET')=>new Request('https://site.example/api/downloads/'+app.id+'?url=https://attacker.example/bad.apk',{method});
 try{let response=await handleDownload(request(),env,app.id);assert.equal(response.status,307);assert.equal(response.headers.get('Location'),download.url);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal((await handleDownload(request('HEAD'),env,app.id)).status,307);assert.equal((await handleDownload(request('POST'),env,app.id)).status,405);assert.equal((await handleDownload(request(),env,'../bad')).status,400);assert.equal((await handleDownload(request(),env,'missing')).status,404);
 app.download={...download,enabled:false};assert.equal((await handleDownload(request(),env,app.id)).status,404);app.download=download;app.download={...download,url:'javascript:bad'};assert.equal((await handleDownload(request(),env,app.id)).status,503);
 }finally{globalThis.fetch=original;}
});
