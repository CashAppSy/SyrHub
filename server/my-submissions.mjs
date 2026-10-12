import {json,userIdentity} from './user-auth.mjs';
import {accessToken} from './submissions.mjs';
export function requestSummary(doc,uid){
 const field=key=>doc.fields?.[key]?.stringValue??doc.fields?.[key]?.timestampValue??'';
 if(field('userId')!==uid)return null;
 const item={id:doc.name.split('/').pop()};
 for(const key of ['type','title','appId','status','createdAt','reviewedAt','responseNote','publishedId'])item[key]=field(key);
 return item;
}
export async function handleMySubmissions(request,env){
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(!env.FIREBASE_PROJECT_ID||!env.FIREBASE_CLIENT_EMAIL||!env.FIREBASE_PRIVATE_KEY||!env.FIREBASE_WEB_API_KEY)return json({error:'Request tracking is not configured'},503);
 const cursor=new URL(request.url).searchParams.get('cursor');if(cursor&&!/^[A-Za-z0-9_-]{1,150}$/.test(cursor))return json({error:'Invalid cursor'},400);
 try{
  const user=await userIdentity(request,env);if(!user)return json({error:'Sign in to view your requests'},401);
  const root='projects/'+env.FIREBASE_PROJECT_ID+'/databases/(default)/documents',token=await accessToken(env);
  // A single-field equality query uses Firestore's automatic index, avoiding a new composite index.
  const structuredQuery={from:[{collectionId:'submissions'}],where:{fieldFilter:{field:{fieldPath:'userId'},op:'EQUAL',value:{stringValue:user.uid}}},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:26};
  if(cursor)structuredQuery.startAt={values:[{referenceValue:root+'/submissions/'+cursor}],before:false};
  const response=await fetch('https://firestore.googleapis.com/v1/'+root+':runQuery',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({structuredQuery})});
  if(!response.ok)throw new Error('Storage unavailable');
  const rows=await response.json(),items=rows.filter(x=>x.document).map(x=>requestSummary(x.document,user.uid)).filter(Boolean);
  const more=items.length>25,visible=items.slice(0,25);return json({items:visible,nextCursor:more?visible[visible.length-1].id:null});
 }catch{return json({error:'Unable to load requests. Please retry.'},502);}
}
