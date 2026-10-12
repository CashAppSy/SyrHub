export const cityKeys=['nationwide','damascus','rif-dimashq','aleppo','homs','hama','latakia','tartus','idlib','raqqa','deir-ez-zor','hasakah','daraa','suwayda','quneitra'];
export function localMetadata(input,{text,date,url}){
 const result={};
 for(const [key,allowed] of Object.entries({cost:['unknown','free','paid','freemium'],needsAccount:['unknown','yes','no'],availability:['unknown','reported','verified','unavailable']})){
  result[key]=input[key]??'unknown';if(!allowed.includes(result[key]))throw new Error('Invalid '+key);
 }
 if(input.cities!==undefined&&!Array.isArray(input.cities))throw new Error('Invalid cities');result.cities=[...new Set(input.cities||[])];if(result.cities.some(x=>!cityKeys.includes(x)))throw new Error('Invalid city');
 for(const [key,max,count] of [['needs',60,20],['paymentMethods',80,10]]){if(input[key]!==undefined&&!Array.isArray(input[key]))throw new Error('Invalid '+key);if((input[key]||[]).length>count)throw new Error('Too many '+key);result[key]=[...new Set((input[key]||[]).map(x=>text(x,max,true)))];}
 result.lastChecked=date(input.lastChecked);if(result.lastChecked&&Date.parse(result.lastChecked)>Date.now()+86400000)throw new Error('تاريخ التحقق لا يمكن أن يكون في المستقبل');result.verificationSource=url(input.verificationSource);result.verificationNotes=text(input.verificationNotes,1000);
 if(result.availability==='verified'&&(!result.lastChecked||!result.verificationSource&&!result.verificationNotes))throw new Error('Verified availability needs a date and evidence/source');
 return result;
}
