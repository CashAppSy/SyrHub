import {accessToken,validate} from './submissions.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const ready=env=>!!(env.FIREBASE_WEB_API_KEY && env.ADMIN_UIDS && env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
export async function authorize(request,env){
 const bearer=request.headers.get('Authorization');
 if(!bearer?.startsWith('Bearer ') || bearer.length>8192)return null;
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_WEB_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:bearer.slice(7)})});
 if(!response.ok)return null;
 const user=(await response.json()).users?.[0];
 if(!user || user.disabled || !env.ADMIN_UIDS.split(',').map(x=>x.trim()).filter(Boolean).includes(user.localId))return null;
 return user.localId;
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
   if(!['pending','approved','rejected'].includes(input.status))throw new Error('Invalid status');
   if(typeof input.updateTime!=='string' || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(input.updateTime))throw new Error('Version required');
   if(typeof input.moderationNote!=='string' || input.moderationNote.length>2000)throw new Error('Invalid moderation note');
  }catch(error){return json({error:error.message},400);}
  const fields={},params=new URLSearchParams({'currentDocument.updateTime':input.updateTime});
  const values={...edited,status:input.status,moderationNote:input.moderationNote.trim(),reviewedBy:uid};
  for(const [key,value] of Object.entries(values)){fields[key]=typeof value==='number'?{integerValue:String(value)}:{stringValue:value};params.append('updateMask.fieldPaths',key);}
  fields.reviewedAt={timestampValue:new Date().toISOString()};params.append('updateMask.fieldPaths','reviewedAt');
  const response=await fetch(base+'/'+id+'?'+params,{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({fields})});
  if(response.status===409 || response.status===412)return json({error:'This request changed. Refresh before saving.'},409);
  if(response.status===404)return json({error:'Request not found'},404);
  if(!response.ok)throw new Error();return json({item:decode(await response.json())});
 }catch{return json({error:'Admin service temporarily unavailable'},502);}
}
export function config(env){return json({configured:ready(env),apiKey:env.FIREBASE_WEB_API_KEY || ''});}
