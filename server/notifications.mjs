import {accessToken} from './submissions.mjs';
import {authorize} from './admin.mjs';
import {bodyJSON} from './content-admin.mjs';
import {userIdentity,json} from './user-auth.mjs';
const idOK=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,150}$/.test(id);
const ready=env=>!!(env.FIREBASE_WEB_API_KEY&&env.FIREBASE_PROJECT_ID&&env.FIREBASE_CLIENT_EMAIL&&env.FIREBASE_PRIVATE_KEY);
const base=env=>'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents';
const name=(env,path)=>'projects/'+env.FIREBASE_PROJECT_ID+'/databases/(default)/documents/'+path;
async function call(env,token,path,options={}){
 const response=await fetch(base(env)+path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
 if(response.status===404)return null;
 if(!response.ok){const e=new Error(response.status===409||response.status===412?'تغيّر السجل. حدّث القائمة وحاول مجدداً.':'Notification storage unavailable');e.status=response.status===409||response.status===412?409:502;throw e;}
 return response.json();
}
function unpack(doc){if(!doc)return null;return {...JSON.parse(doc.fields.payload.stringValue),id:doc.name.split('/').pop(),version:doc.updateTime};}
function fields(record){const {version,...payload}=record;return {payload:{stringValue:JSON.stringify(payload)},createdAt:{timestampValue:record.createdAt}};}
async function store(env,token,collection,id,record,version){
 const write={update:{name:name(env,collection+'/'+id),fields:fields(record)},currentDocument:version?{updateTime:version}:{exists:false}};
 const result=await call(env,token,':commit',{method:'POST',body:JSON.stringify({writes:[write]})});return {...record,id,version:result.writeResults[0].updateTime};
}
async function list(env,token,collection,cursor='',size=20){const params=new URLSearchParams({pageSize:String(size),orderBy:'createdAt desc'});if(cursor)params.set('pageToken',cursor);const data=await call(env,token,'/'+collection+'?'+params);return {items:(data?.documents||[]).map(unpack),nextCursor:data?.nextPageToken||null};}
async function count(env,token,collection,id){const result=await call(env,token,':runAggregationQuery',{method:'POST',body:JSON.stringify({structuredAggregationQuery:{structuredQuery:{from:[{collectionId:collection}],where:{fieldFilter:{field:{fieldPath:'campaignId'},op:'EQUAL',value:{stringValue:id}}}},aggregations:[{alias:'total',count:{}}]}})});return Number(result?.[0]?.result?.aggregateFields?.total?.integerValue||0);}
export function validateNotification(input,origin){
 if(typeof input.title!=='string'||!input.title.trim()||input.title.length>120||typeof input.body!=='string'||!input.body.trim()||input.body.length>1000)throw new Error('العنوان والنص مطلوبان (120 و1000 حرف كحد أقصى).');
 const href=typeof input.href==='string'?input.href:'/';const url=new URL(href,origin);
 if(href.length>1000||url.origin!==origin||!['https:','http:'].includes(url.protocol)||url.username||url.password||/^\/(api|admin)(\/|$)/.test(url.pathname))throw new Error('استخدم رابط صفحة عامة داخل الموقع.');
 return {title:input.title.trim(),body:input.body.trim(),href:url.pathname+url.search+url.hash};
}
export async function dispatchBatch(env,record,token){
 try{
  const devices=await list(env,token,'notification_devices',record.pushCursor||'',10);
  let accepted=record.pushAccepted||0,failed=record.pushFailed||0;
  for(let offset=0;offset<devices.items.length;offset+=5){await Promise.all(devices.items.slice(offset,offset+5).map(async device=>{
   if(!device.enabled)return;
   try{
    const response=await fetch('https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/messages:send',{method:'POST',signal:AbortSignal.timeout(5000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({message:{token:device.token,data:{title:record.title,body:record.body,href:record.href,campaignId:record.id},webpush:{headers:{TTL:'86400',Urgency:'normal'}}}})});
    if(response.ok){accepted++;return;}
    failed++;
    try{const error=await response.json();if(error.error?.details?.some(x=>x.errorCode==='UNREGISTERED'))await store(env,token,'notification_devices',device.id,{...device,enabled:false},device.version);}catch{/* A failed cleanup does not represent a second failed delivery. */}
   }catch{failed++;}
  }));}
  await store(env,token,'notifications',record.id,{...record,pushAccepted:accepted,pushFailed:failed,pushCursor:devices.nextCursor||'',pushState:devices.nextCursor?'partial':'complete'},record.version);
 }catch{
  try{await store(env,token,'notifications',record.id,{...record,pushState:'error'},record.version);}catch{}
 }
}
export async function handleNotifications(request,env,context={},admin=false){
 const url=new URL(request.url);
 if(!ready(env))return json({error:'Notification service not configured'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Origin not allowed'},403);
 try{
  const user=admin?await authorize(request,env):await userIdentity(request,env);
  if(!user)return json({error:admin?'Administrator required':'Sign in required'},admin?403:401);
  const token=await accessToken(env,'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging');
  if(request.method==='GET'){
   const cursor=url.searchParams.get('cursor')||'';if(cursor.length>4096)return json({error:'Invalid cursor'},400);
   const result=await list(env,token,'notifications',cursor,admin?10:30);
   if(admin){result.items=await Promise.all(result.items.map(async item=>({...item,reads:await count(env,token,'notification_reads',item.id),clicks:await count(env,token,'notification_clicks',item.id)})));return json(result);}
   return json({items:result.items.filter(x=>x.status==='published').map(({id,title,body,href,createdAt,publishedAt})=>({id,title,body,href,createdAt,publishedAt})),nextCursor:result.nextCursor});
  }
  let input;try{input=await bodyJSON(request,10000);}catch(e){return json({error:e.message},e.status||400);}
  if(!admin){
   if(input.action==='subscribe'||input.action==='unsubscribe'){
    if(typeof input.token!=='string'||input.token.length<20||input.token.length>4096)return json({error:'Invalid device token'},400);
    const id=await hash(input.token),existing=unpack(await call(env,token,'/notification_devices/'+id));
    if(existing&&existing.uid!==user.uid&&input.action!=='subscribe')return json({error:'Device belongs to another account'},403);
    await store(env,token,'notification_devices',id,{uid:user.uid,token:input.token,enabled:input.action==='subscribe',createdAt:existing?.createdAt||new Date().toISOString()},existing?.version);return json({ok:true});
   }
   if(!['read','click'].includes(input.action)||!idOK(input.id))return json({error:'Invalid notification event'},400);
   const record=unpack(await call(env,token,'/notifications/'+input.id));if(record?.status!=='published')return json({error:'Notification unavailable'},404);
   const collection=input.action==='read'?'notification_reads':'notification_clicks',id=input.id+'_'+await hash(user.uid);
   try{await call(env,token,':commit',{method:'POST',body:JSON.stringify({writes:[{update:{name:name(env,collection+'/'+id),fields:{campaignId:{stringValue:input.id},userId:{stringValue:user.uid},createdAt:{timestampValue:new Date().toISOString()}}},currentDocument:{exists:false}}]})});}catch(e){if(e.status!==409)throw e;}
   return json({ok:true});
  }
  if(input.action==='save'){
   let value;try{value=validateNotification(input.record,url.origin);}catch(e){return json({error:e.message},400);}
   const id=input.id||crypto.randomUUID();if(!idOK(id))return json({error:'Invalid id'},400);
   const previous=unpack(await call(env,token,'/notifications/'+id));
   if(previous&&previous.status!=='draft')return json({error:'Only drafts can be edited'},409);
   if(previous&&input.version!==previous.version)return json({error:'Refresh before saving'},409);
   const item=await store(env,token,'notifications',id,{...value,status:'draft',createdAt:previous?.createdAt||new Date().toISOString(),createdBy:user,pushState:'idle',pushAccepted:0,pushFailed:0},previous?.version);return json({item});
  }
  if(!idOK(input.id)||!['send','continue','archive'].includes(input.action))return json({error:'Invalid action'},400);
  const previous=unpack(await call(env,token,'/notifications/'+input.id));if(!previous)return json({error:'Not found'},404);
  if(previous.version!==input.version||previous.pushState==='sending')return json({error:'التحديث جارٍ أو تغيّر السجل. حدّث القائمة.'},409);
  if(input.action==='archive'){const item=await store(env,token,'notifications',input.id,{...previous,status:'archived'},previous.version);return json({item});}
  if(input.action==='send'&&previous.status!=='draft'||input.action==='continue'&&(previous.status!=='published'||previous.pushState!=='partial'))return json({error:'Invalid campaign state'},409);
  const pushReady=!!(env.FIREBASE_MESSAGING_SENDER_ID&&env.FIREBASE_WEB_APP_ID&&env.FIREBASE_VAPID_KEY);
  const item=await store(env,token,'notifications',input.id,{...previous,status:'published',publishedAt:previous.publishedAt||new Date().toISOString(),pushState:pushReady?'sending':'unconfigured'},previous.version);
  if(pushReady){const job=dispatchBatch(env,item,token);if(context.waitUntil)context.waitUntil(job);else await job;}
  return json({item});
 }catch(e){return json({error:e.status===409?e.message:'Notification service temporarily unavailable'},e.status||502);}
}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
