import {userIdentity} from './user-auth.mjs';
import {accessToken,validate} from './submissions.mjs';
import {readCatalog,catalogWrite,commit,publishSubmission,changeCatalog} from './catalog.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const ready=env=>!!(env.FIREBASE_WEB_API_KEY && env.ADMIN_UIDS && env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
export async function authorize(request,env){
 const user=await userIdentity(request,env);
 if(!user||!env.ADMIN_UIDS?.split(',').map(x=>x.trim()).filter(Boolean).includes(user.uid))return null;
 return user.uid;
}
export function decode(document){
 const result={id:document.name.split('/').pop(),updateTime:document.updateTime};
 for(const [key,value] of Object.entries(document.fields || {}))result[key]=value.stringValue ?? value.timestampValue ?? (value.integerValue!==undefined?Number(value.integerValue):null);
 return result;
}
export async function handleAdmin(request,env,id){
 if(!ready(env))return json({error:'Admin service is not configured'},503);
 if(!['GET','PATCH'].includes(request.method))return json({error:'Method not allowed'},405);
 if(request.method==='PATCH' && request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Origin not allowed'},403);
 try{
  const uid=await authorize(request,env);if(!uid)return json({error:'Administrator access required'},403);
  const token=await accessToken(env);
  const base='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents/submissions';
  if(request.method==='GET' && !id){
   const query=new URL(request.url).searchParams, params=new URLSearchParams({pageSize:'50',orderBy:'createdAt desc'});
   const cursor=query.get('cursor');if(cursor){if(cursor.length>4096)return json({error:'Invalid cursor'},400);params.set('pageToken',cursor);}
   const response=await fetch(base+'?'+params,{headers:{Authorization:'Bearer '+token}});
   if(!response.ok)throw new Error();const data=await response.json();return json({items:(data.documents || []).map(decode),nextCursor:data.nextPageToken || null});
  }
  if(request.method!=='PATCH' || !id || !/^[A-Za-z0-9_-]{1,150}$/.test(id))return json({error:'Invalid request'},400);
  if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return json({error:'JSON required'},415);
  // Enforce size on streamed bodies, even without Content-Length.
  const reader=request.body?.getReader();if(!reader)return json({error:'Empty request'},400);
  let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();return json({error:'Request too large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let input,edited;
  try{
   input=JSON.parse(new TextDecoder().decode(bytes));edited=validate(input);
   if(!(edited.type==='need'||edited.type==='report'?['pending','in_progress','resolved','rejected']:['pending','approved','rejected']).includes(input.status))throw new Error('Invalid status');
   if(typeof input.updateTime!=='string' || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(input.updateTime))throw new Error('Version required');
   if(input.responseNote!==undefined&&(typeof input.responseNote!=='string'||input.responseNote.length>2000))throw new Error('Invalid public response');
   if(typeof input.moderationNote!=='string' || input.moderationNote.length>2000)throw new Error('Invalid moderation note');
  }catch(error){return json({error:error.message},400);}
  const existingResponse=await fetch(base+'/'+id,{headers:{Authorization:'Bearer '+token}});
  if(existingResponse.status===404)return json({error:'Request not found'},404);
  if(!existingResponse.ok)throw new Error();
  const existing=await existingResponse.json(),previous=decode(existing);
  if(existing.updateTime!==input.updateTime)return json({error:'This request changed. Refresh before saving.'},409);
  if(previous.type!==edited.type)return json({error:'Submission type cannot be changed'},400);
  const fields={},values={...edited,status:input.status,moderationNote:input.moderationNote.trim(),responseNote:(input.responseNote??previous.responseNote??'').trim(),reviewedBy:uid};
  let catalogUpdate=null;
  if(input.status==='approved' || previous.publishedId){
    const current=await readCatalog(env,token);let next;
    try{
      if(input.status==='approved'){
        const published=publishSubmission(current.catalog,input,edited,id);next=published.catalog;
        values.publishedId=published.publishedId;values.publishedCollection=published.collection;
      }else{
        next=changeCatalog(current.catalog,{collection:previous.publishedCollection,action:'delete',id:previous.publishedId});
        values.publishedId='';values.publishedCollection='';
      }
      catalogUpdate=catalogWrite(env,next,current.version,uid);
    }catch(error){return json({error:error.message},400);}
  }
  for(const [key,value] of Object.entries(values))fields[key]=typeof value==='number'?{integerValue:String(value)}:{stringValue:value};
  fields.reviewedAt={timestampValue:new Date().toISOString()};
  const write={update:{name:existing.name,fields},updateMask:{fieldPaths:Object.keys(fields)},currentDocument:{updateTime:input.updateTime}};
  try{
    const result=await commit(env,token,catalogUpdate?[write,catalogUpdate]:[write]);
    return json({item:decode({...existing,fields:{...existing.fields,...fields},updateTime:result.writeResults[0].updateTime})});
  }catch(error){if(error.status===409)return json({error:error.message},409);throw error;}

 }catch{return json({error:'Admin service temporarily unavailable'},502);}
}
export function config(env){return json({configured:ready(env),apiKey:env.FIREBASE_WEB_API_KEY || ''});}
