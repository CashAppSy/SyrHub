import {withDemoData} from './demo-data.mjs';
import {localMetadata} from './local-metadata.mjs';
import {apps,categories,promotions,reviews} from './catalog-seed.mjs';
import {accessToken} from './submissions.mjs';
export const seed=()=>withDemoData({apps,categories,promotions,reviews,site:{ar:{},en:{},showPromotions:true,showRecent:true,showContribute:true,apkUrl:'',showDemoApps:true}});
export const documentRoot=env=>'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents';
export const catalogName=env=>'projects/'+env.FIREBASE_PROJECT_ID+'/databases/(default)/documents/cms/catalog';
export async function readCatalog(env,token){
 const response=await fetch(documentRoot(env)+'/cms/catalog',{headers:{Authorization:'Bearer '+token}});
 if(response.status===404)return {catalog:seed(),version:null};
 if(!response.ok)throw new Error('Catalog unavailable');
 const doc=await response.json();return {catalog:withDemoData(JSON.parse(doc.fields.content.stringValue)),version:doc.updateTime};
}
export function catalogWrite(env,catalog,version,uid){
 const content=JSON.stringify(catalog);if(new TextEncoder().encode(content).length>700000)throw new Error('Catalog limit reached');
 return {update:{name:catalogName(env),fields:{content:{stringValue:content},editedBy:{stringValue:uid},editedAt:{timestampValue:new Date().toISOString()}}},currentDocument:version?{updateTime:version}:{exists:false}};
}
export async function commit(env,token,writes){
 const response=await fetch(documentRoot(env)+':commit',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({writes})});
 if(response.status===409 || response.status===412){const e=new Error('Content changed. Refresh before saving.');e.status=409;throw e;}
 if(!response.ok){let detail;try{detail=await response.json();}catch{}if(detail?.error?.status==='FAILED_PRECONDITION'||detail?.error?.status==='ABORTED'){const e=new Error('Content changed. Refresh before saving.');e.status=409;throw e;}throw new Error('Could not save content');}
 return response.json();
}
const id=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(value)||['__proto__','constructor','prototype'].includes(value))throw new Error('Invalid ID');return value;};
function text(value,max=3000,required=false){if(value===undefined)value='';if(typeof value!=='string'||value.length>max||/[<>]/.test(value)||required&&!value.trim())throw new Error('Invalid plain text');return value.trim();}
function url(value,required=false){value=text(value,1000,required);if(!value)return '';let parsed;try{parsed=new URL(value);}catch{throw new Error('Invalid URL');}if(parsed.protocol!=='https:'||parsed.username||parsed.password||/["'\\\s]/.test(value))throw new Error('Use a valid HTTPS URL');return value;}
function date(value,month=false){value=text(value,10);if(value && !(month?/^\d{4}-\d{2}(-\d{2})?$/:/^\d{4}-\d{2}-\d{2}$/).test(value))throw new Error('Invalid date');if(value){const normalized=value.length===7?value+'-01':value;const parsed=new Date(normalized);if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==normalized)throw new Error('Invalid date');}return value;}
function bool(value){if(value===undefined)return false;if(typeof value!=='boolean')throw new Error('Invalid boolean');return value;}
export function validateRecord(collection,input,catalog){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid record');
 const record={};
 if(collection==='categories'){record.key=id(input.key);record.label=text(input.label,100,true);record.label_en=text(input.label_en,100);record.icon=text(input.icon,30,true);if(['all','favorites'].includes(record.key))throw new Error('Reserved category');return record;}
 record.id=id(input.id);
 if(collection==='apps'){
  record.name=text(input.name,150,true);record.name_en=text(input.name_en,150);record.category=id(input.category);
  if(!catalog.categories.some(x=>x.key===record.category))throw new Error('Choose an existing category');
  record.description=text(input.description,3000,true);record.description_en=text(input.description_en);
  if(!Array.isArray(input.platforms)||!input.platforms.length||input.platforms.some(x=>!['android','ios','web'].includes(x)))throw new Error('Choose at least one platform');
  record.platforms=[...new Set(input.platforms)];record.officialLink=url(input.officialLink,true);record.icon=url(input.icon);record.storeLinks={};
  for(const key of ['android','ios','web']){const link=url(input.storeLinks?.[key]);if(link)record.storeLinks[key]=link;}
  record.verified=bool(input.verified);record.isDemo=bool(input.isDemo);record.lastUpdate=date(input.lastUpdate,true);Object.assign(record,localMetadata(input,{text,date,url}));
 }else if(collection==='promotions'||collection==='reviews'){
  record.appId=id(input.appId);if(!catalog.apps.some(x=>x.id===record.appId))throw new Error('Choose an existing app');
  if(collection==='promotions'){
   if(!['coupon','promotion'].includes(input.type))throw new Error('Invalid promotion type');record.type=input.type;
   for(const key of ['title','title_en','description','description_en','discountLabel','code'])record[key]=text(input[key],key.includes('description')?3000:150,key==='title'||key==='description');
   record.link=url(input.link,true);record.expiryDate=date(input.expiryDate);record.verified=bool(input.verified);
  }else{
   record.author=text(input.author,100,true);record.comment=text(input.comment,3000,true);record.comment_en=text(input.comment_en);
   if(!Number.isInteger(input.rating)||input.rating<1||input.rating>5)throw new Error('Rating must be 1 to 5');record.rating=input.rating;record.date=date(input.date);if(!record.date)throw new Error('Date is required');
  }
 }else throw new Error('Invalid collection');
 if(input.sourceSubmission)record.sourceSubmission=id(input.sourceSubmission);
 return record;
}
export const siteKeys=['metaTitle','metaDesc','tagline','heroH1','heroSubtitle','heroBadge','suggestH2','suggestText','promoHeading','recentHeading'];
export function validateSite(input){
 const result={ar:{},en:{}};
 for(const lang of ['ar','en'])for(const key of siteKeys){const value=text(input[lang]?.[key],key==='metaDesc'||key==='heroSubtitle'||key==='suggestText'?3000:300);if(value)result[lang][key]=value;}
 for(const key of ['showPromotions','showRecent','showContribute','showDemoApps'])result[key]=input[key]===undefined?true:bool(input[key]);result.apkUrl=url(input.apkUrl);return result;
}
export function changeCatalog(catalog,input){
 const next=structuredClone(catalog),collection=input.collection;
 if(collection==='site'){if(input.action!=='save')throw new Error('Invalid action');next.site=validateSite(input.record);return next;}
 if(!['apps','categories','promotions','reviews'].includes(collection))throw new Error('Invalid collection');
 const key=collection==='categories'?'key':'id';
 if(input.action==='delete'){
  const target=id(input.id);
  if(collection==='categories' && next.apps.some(x=>x.category===target))throw new Error('Move apps to another category first');
  next[collection]=next[collection].filter(x=>x[key]!==target);
  if(collection==='apps'){next.promotions=next.promotions.filter(x=>x.appId!==target);next.reviews=next.reviews.filter(x=>x.appId!==target);}
 }else if(input.action==='save'){
  let candidate=input.record;
  if(collection==='apps'&&candidate){const prior=next.apps.find(x=>x.id===candidate.id);candidate={...candidate};for(const key of ['cities','cost','needsAccount','availability','needs','paymentMethods','lastChecked','verificationSource','verificationNotes','isDemo'])if(candidate[key]===undefined&&prior)candidate[key]=prior[key];}
  const record=validateRecord(collection,candidate,next),index=next[collection].findIndex(x=>x[key]===record[key]);
  if(index<0)next[collection].push(record);else next[collection][index]=record;
 }else throw new Error('Invalid action');
 return next;
}
export function publishSubmission(catalog,input,edited,submissionId){
 const collection={app:'apps',promo:'promotions',review:'reviews'}[edited.type], publishedId='submission-'+submissionId;
 const prior=catalog[collection].find(x=>x.id===publishedId);
 let record;
 if(edited.type==='app')record={...prior,id:publishedId,name:edited.title,name_en:input.name_en??prior?.name_en,description:edited.description,description_en:input.description_en??prior?.description_en,category:input.category||prior?.category||'other',platforms:input.platforms||prior?.platforms||['web'],officialLink:edited.url,icon:input.icon??prior?.icon,storeLinks:input.storeLinks??prior?.storeLinks,verified:input.verified??prior?.verified??false,lastUpdate:input.lastUpdate??prior?.lastUpdate};
 if(edited.type==='app')for(const key of ['cities','cost','needsAccount','availability','needs','paymentMethods','lastChecked','verificationSource','verificationNotes','isDemo'])record[key]=input[key]??prior?.[key];
 if(edited.type==='promo')record={...prior,id:publishedId,appId:edited.appId,type:edited.code?'coupon':'promotion',title:edited.title||'عرض جديد',title_en:input.name_en??prior?.title_en,description:edited.description,description_en:input.description_en??prior?.description_en,code:edited.code,discountLabel:input.discountLabel??prior?.discountLabel,link:edited.url,expiryDate:input.expiryDate??prior?.expiryDate,verified:input.verified??prior?.verified??false};
 if(edited.type==='review')record={...prior,id:publishedId,appId:edited.appId,author:edited.name,rating:edited.rating,comment:edited.description,comment_en:input.description_en??prior?.comment_en,date:prior?.date||new Date().toISOString().slice(0,10)};
 record.sourceSubmission=submissionId;
 return {catalog:changeCatalog(catalog,{collection,action:'save',record}),publishedId,collection};
}
export async function publicCatalog(env){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 try{if(!env.FIREBASE_PROJECT_ID||!env.FIREBASE_CLIENT_EMAIL||!env.FIREBASE_PRIVATE_KEY)return new Response(JSON.stringify({catalog:seed(),version:'seed'}),{headers});
 const data=await readCatalog(env,await accessToken(env));return new Response(JSON.stringify({catalog:data.catalog,version:data.version||'seed'}),{headers});
 }catch{return new Response(JSON.stringify({error:'Content temporarily unavailable'}),{status:503,headers});}
}
