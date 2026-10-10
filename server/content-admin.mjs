import {authorize} from './admin.mjs';
import {accessToken} from './submissions.mjs';
import {readCatalog,catalogWrite,commit,changeCatalog} from './catalog.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function bodyJSON(request,limit=20000){
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw new Error('JSON required');
 const reader=request.body?.getReader();if(!reader)throw new Error('Empty body');let size=0;const parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();const e=new Error('Request too large');e.status=413;throw e;}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function handleContent(request,env){
 if(!env.FIREBASE_WEB_API_KEY||!env.ADMIN_UIDS||!env.FIREBASE_PRIVATE_KEY||!env.FIREBASE_CLIENT_EMAIL||!env.FIREBASE_PROJECT_ID)return json({error:'Service not configured'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405);
 if(request.method==='POST' && request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Origin not allowed'},403);
 try{const uid=await authorize(request,env);if(!uid)return json({error:'Administrator required'},403);
 const token=await accessToken(env),current=await readCatalog(env,token);
 if(request.method==='GET')return json(current);
 let input,next;try{input=await bodyJSON(request);if(input.version!==current.version)return json({error:'Content changed. Refresh before saving.'},409);next=changeCatalog(current.catalog,input);}catch(e){return json({error:e.message},e.status||400);}
 const result=await commit(env,token,[catalogWrite(env,next,current.version,uid)]);return json({catalog:next,version:result.writeResults[0].updateTime});
 }catch(e){return json({error:e.status===409?e.message:'Content service temporarily unavailable'},e.status||502);}
}
