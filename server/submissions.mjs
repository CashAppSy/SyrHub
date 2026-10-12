import {userIdentity} from './user-auth.mjs';
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validate(data) {
  if(!data || !['app','promo','review','need','report'].includes(data.type)) throw new Error('Invalid contribution type');
  const result={type:data.type};
  for(const [key,max] of Object.entries({name:100,email:254,title:150,appId:100,url:1000,description:3000,code:80,city:100,reason:50})) {
    if(data[key] !== undefined && typeof data[key] !== 'string') throw new Error('Invalid field');
    result[key]=(data[key] || '').trim();
    if(result[key].length>max) throw new Error('Field too long');
  }
  if(!result.name || result.description.length<10) throw new Error('Name and description are required');
  if(result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Invalid email');
  if(['app','need'].includes(result.type) && !result.title) throw new Error('App name is required');
  if(['promo','review','report'].includes(result.type) && !result.appId) throw new Error('App is required');
  if(result.type==='report'&&!['broken_link','outdated','unavailable','other'].includes(result.reason))throw new Error('Invalid report reason');
  if(result.city&&!['nationwide','damascus','rif-dimashq','aleppo','homs','hama','latakia','tartus','idlib','raqqa','deir-ez-zor','hasakah','daraa','suwayda','quneitra'].includes(result.city))throw new Error('Invalid city');
  if(['app','promo'].includes(result.type)||result.url) {
    let url;try{url=new URL(result.url);}catch{throw new Error('Official URL is required');}
    if(url.protocol!=='https:' || url.username || url.password) throw new Error('Use an HTTPS URL');
  }
  if(result.type==='review') {
    if(!Number.isInteger(data.rating) || data.rating<1 || data.rating>5) throw new Error('Invalid rating');
    result.rating=data.rating;
  }
  return result;
}
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode = obj => base64url(new TextEncoder().encode(JSON.stringify(obj)));
export async function accessToken(env,scope='https://www.googleapis.com/auth/datastore') {
  const now=Math.floor(Date.now()/1000);
  const body=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:env.FIREBASE_CLIENT_EMAIL,scope:scope,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const pem=env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n').replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(body));
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:body+'.'+base64url(signature)})});
  if(!response.ok) throw new Error('Authentication unavailable');
  const token=await response.json();if(!token.access_token)throw new Error('Authentication unavailable');return token.access_token;
}
const configured = env => !!(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY && env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.FIREBASE_WEB_API_KEY);
export async function handle(request,env) {
  const url=new URL(request.url);
  if(request.method==='GET')return json({configured:configured(env),turnstileSiteKey:env.TURNSTILE_SITE_KEY || ''});
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Origin not allowed'},403);
  if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({error:'JSON required'},415);
  if(Number(request.headers.get('Content-Length'))>16384)return json({error:'Request too large'},413);
  if(!configured(env))return json({error:'Submission service is not configured yet'},503);
  let raw,data;
  try {
    const reader=request.body?.getReader();if(!reader)return json({error:'Empty request'},400);
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();return json({error:'Request too large'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    raw=JSON.parse(new TextDecoder().decode(bytes));data=validate(raw);
    if(raw.website) return json({error:'Invalid submission'},400);
    if(typeof raw.turnstileToken!=='string' || !raw.turnstileToken || raw.turnstileToken.length>2048)return json({error:'Verification required'},400);
  }catch(error){return json({error:error.message},400);}
  try {
    const identity=await userIdentity(request,env);
    if(!identity)return json({error:'Sign in to submit a contribution'},401);
    data.email=identity.email;
    data.userId=identity.uid;
    const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:raw.turnstileToken,remoteip:request.headers.get('CF-Connecting-IP') || ''})});
    if(!verification.ok)throw new Error('Verification unavailable');
    const verified=await verification.json();
    if(!verified.success || verified.hostname!==url.hostname || verified.action!=='contribution')return json({error:'Verification failed'},403);
    const token=await accessToken(env),id=crypto.randomUUID(),fields={};
    for(const [key,value] of Object.entries({...data,status:'pending'}))fields[key]=typeof value==='number'?{integerValue:String(value)}:{stringValue:value};
    fields.createdAt={timestampValue:new Date().toISOString()};
    const response=await fetch('https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents/submissions?documentId='+id,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({fields})});
    if(!response.ok)throw new Error('Storage unavailable');
    return json({id,status:'pending'},201);
  }catch{return json({error:'Submission service temporarily unavailable. Please retry.'},502);}
}
