import {validateDownload} from './download-metadata.mjs';
import local from '../local-data.js';
// Submitted URLs and claims are reviewed; they do not prove ownership or verification.
export function validateListing(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid listing details');
 const str=(key,max=150)=>{const value=input[key]??'';if(typeof value!=='string'||value.length>max)throw new Error('Invalid listing '+key);return value.trim();};
 const url=value=>{if(!value)return '';let parsed;try{parsed=new URL(value);}catch{throw new Error('Invalid listing URL');}if(parsed.protocol!=='https:'||parsed.username||parsed.password||value.length>1000)throw new Error('Use HTTPS listing URLs');return parsed.href;};
 const list=(key,allowed,max)=>{const value=input[key]??[];if(!Array.isArray(value)||value.length>max||value.some(x=>typeof x!=='string'||!allowed.includes(x)))throw new Error('Invalid listing '+key);return [...new Set(value)];};
 const result={name_en:str('name_en'),category:str('category',100),organization:str('organization'),contact:str('contact',300),role:str('role',30),icon:url(str('icon',1000)),platforms:list('platforms',['android','ios','web'],3),cities:list('cities',local.cities.map(x=>x[0]),16)};
 if(!result.organization||!result.contact||!['owner','team','community'].includes(result.role)||!result.category||!result.platforms.length)throw new Error('Complete organization, contact, role, category and platforms');
 result.storeLinks={};for(const key of ['android','ios','web']){const value=input.storeLinks?.[key]??'';if(typeof value!=='string')throw new Error('Invalid store URL');const safe=url(value);if(safe)result.storeLinks[key]=safe;}
 const shots=input.screenshots??[];if(!Array.isArray(shots)||shots.length>5||shots.some(x=>typeof x!=='string'||!x))throw new Error('Maximum five screenshot URLs');result.screenshots=shots.map(url);
 if(input.download!==undefined){result.download=validateDownload({...input.download,enabled:false});if(result.download.url&&!result.platforms.includes('android'))throw new Error('APK requires Android');}
 result.notes=str('notes',1500);return result;
}
