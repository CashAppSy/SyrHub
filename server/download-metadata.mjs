export function validateDownload(input){
 if(input===undefined)return {enabled:false};if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid APK download');
 const result={enabled:input.enabled??false};if(typeof result.enabled!=='boolean')throw new Error('Invalid download switch');
 for(const [key,max] of Object.entries({url:1000,version:60,sizeMB:20,minAndroid:60,publisher:150,sha256:64,releaseNotes:3000})){const value=input[key]??'';if(typeof value!=='string'||value.length>max)throw new Error('Invalid download '+key);result[key]=value.trim();}
 if(result.url){let url;try{url=new URL(result.url);}catch{throw new Error('Invalid APK URL');}if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS download URL');result.url=url.href;}
 if(result.sha256&&!/^[a-fA-F0-9]{64}$/.test(result.sha256))throw new Error('Invalid SHA-256');
 if(result.sizeMB&&(!/^\d+(\.\d{1,2})?$/.test(result.sizeMB)||Number(result.sizeMB)<=0||Number(result.sizeMB)>4096))throw new Error('Invalid APK size');
 if(result.enabled&&(!result.url||!result.version||!result.publisher))throw new Error('A download URL, version and publisher are required');
 result.sha256=result.sha256.toLowerCase();return result;
}
