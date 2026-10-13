import {publicCatalog} from './catalog.mjs';
import {validateDownload} from './download-metadata.mjs';
export {validateDownload} from './download-metadata.mjs';
export async function handleDownload(request,env,id){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 if(!/^[A-Za-z0-9_-]{1,150}$/.test(id||''))return new Response('Invalid application',{status:400});
 const response=await publicCatalog(env);if(!response.ok)return new Response('Download information temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
 const {catalog}=await response.json(),app=catalog.apps.find(x=>x.id===id);
 if(!app)return new Response('Application not found',{status:404});
 if(app.isDemo)return new Response('Demo listings do not offer real downloads',{status:409,headers:{'Cache-Control':'no-store'}});
 let download;try{download=validateDownload(app.download);}catch{return new Response('Invalid download information',{status:503});}
 if(!app.platforms?.includes('android')||!download.enabled)return new Response('No approved APK download is available',{status:404});
 // The admin's saved catalog is the authority; query parameters cannot replace the target.
 return new Response(null,{status:307,headers:{Location:download.url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
}
