(function(){
'use strict';
var schemas={
apps:[['id','المعرّف الثابت','id'],['name','اسم التطبيق','required'],['name_en','الاسم بالإنجليزية'],['category','القسم','category'],['platforms','المنصات','platforms'],['description','الوصف','required-text'],['description_en','الوصف بالإنجليزية','text'],['officialLink','الرابط الرسمي','required-url'],['storeLinks.android','رابط Android','url'],['storeLinks.ios','رابط iPhone','url'],['storeLinks.web','رابط الويب','url'],['icon','رابط الأيقونة','url'],['verified','موثّق','checkbox'],['lastUpdate','آخر تحديث YYYY-MM-DD']],
categories:[['key','معرّف القسم','id'],['label','اسم القسم','required'],['label_en','اسم القسم بالإنجليزية'],['icon','الرمز التعبيري','required']],
promotions:[['id','المعرّف الثابت','id'],['appId','التطبيق','app'],['type','نوع العرض','promo-type'],['title','عنوان العرض','required'],['title_en','العنوان بالإنجليزية'],['description','وصف العرض','required-text'],['description_en','الوصف بالإنجليزية','text'],['code','كود الخصم'],['discountLabel','شارة العرض'],['link','الرابط الرسمي','required-url'],['expiryDate','تاريخ الانتهاء','date'],['verified','موثّق','checkbox']],
reviews:[['id','المعرّف الثابت','id'],['appId','التطبيق','app'],['author','اسم الكاتب','required'],['rating','التقييم','rating'],['comment','نص المراجعة','required-text'],['comment_en','النص بالإنجليزية','text'],['date','التاريخ','required-date']]
};
var siteFields=[['metaTitle','عنوان الصفحة'],['metaDesc','وصف محركات البحث'],['tagline','النص أعلى العنوان'],['heroH1','عنوان الصفحة الرئيسية'],['heroSubtitle','وصف الصفحة الرئيسية'],['heroBadge','شارة الصفحة'],['suggestH2','عنوان المساهمة'],['suggestText','نص المساهمة'],['promoHeading','عنوان قسم العروض'],['recentHeading','عنوان قسم المشاهدات الأخيرة']];
var collectionNames={apps:'التطبيقات',categories:'الأقسام',promotions:'العروض',reviews:'المراجعات',site:'الصفحة الرئيسية'};
function valueAt(record,path){return path.split('.').reduce(function(value,key){return value&&value[key];},record);}
function setAt(record,path,value){var keys=path.split('.'),last=keys.pop(),node=record;keys.forEach(function(key){node[key]=node[key]||{};node=node[key];});node[last]=value;}
window.createCMS=function(api,message,onCatalog){
 var catalog=null,version=null,collection='apps',selected=null,working=false,form=document.getElementById('contentForm'),list=document.getElementById('contentList'),panel=document.getElementById('contentEditor');
 function lock(value){working=value;['contentCollection','contentAdd','contentRefresh'].forEach(function(id){document.getElementById(id).disabled=value;});}
 function fields(){if(collection!=='site')return schemas[collection];var result=[];['ar','en'].forEach(function(lang){siteFields.forEach(function(field){result.push([lang+'.'+field[0],field[1]+' ('+(lang==='ar'?'العربية':'English')+')',field[0].includes('Desc')||field[0].includes('Text')||field[0]==='heroSubtitle'?'text':'']);});});return result.concat([['showPromotions','إظهار العروض','checkbox'],['showRecent','إظهار شاهدت مؤخراً','checkbox'],['showContribute','إظهار قسم المساهمة','checkbox'],['apkUrl','رابط تحميل APK','url']]);}
 function render(){
  list.replaceChildren();if(!catalog)return;
  document.getElementById('contentAdd').hidden=collection==='site';
  document.getElementById('catalogSummary').textContent=catalog.apps.length+' تطبيق · '+catalog.categories.length+' قسم · '+catalog.promotions.length+' عرض · '+catalog.reviews.length+' مراجعة';
  if(collection==='site'){document.getElementById('contentCount').textContent='إعدادات الصفحة الرئيسية';edit(catalog.site||{});return;}
  var query=document.getElementById('contentSearch').value.trim().toLowerCase();
  var visible=catalog[collection].filter(function(item){return JSON.stringify(item).toLowerCase().includes(query);});
  document.getElementById('contentCount').textContent=visible.length+' عنصر ظاهر من '+catalog[collection].length;
  if(!visible.length){var empty=document.createElement('div');empty.className='empty-state';var heading=document.createElement('h3');heading.textContent='لا توجد عناصر مطابقة';var note=document.createElement('p');note.textContent='غيّر البحث أو أضف محتوى جديداً.';empty.append(heading,note);list.appendChild(empty);}
  visible.forEach(function(item){
    var button=document.createElement('button');button.className='request';button.setAttribute('aria-pressed',selected&&(selected.id||selected.key)===(item.id||item.key)?'true':'false');
    var kind=document.createElement('span');kind.className='request-type';kind.textContent=collectionNames[collection];
    var title=document.createElement('strong');title.textContent=item.name||item.label||item.title||item.author||item.id;
    var badge=document.createElement('span');badge.className='badge';
    badge.textContent=collection==='apps'?(catalog.categories.find(function(x){return x.key===item.category;})||{}).label||item.category:collection==='categories'?catalog.apps.filter(function(x){return x.category===item.key;}).length+' تطبيق':collection==='reviews'?item.rating+' / 5':item.type==='coupon'?'كوبون':'عرض';
    var description=document.createElement('span');description.textContent=(item.description||item.comment||item.label_en||'').slice(0,110);
    button.append(kind,title,badge,description);
    button.onclick=function(){if(!working){edit(item);list.querySelectorAll('.request').forEach(function(x){x.setAttribute('aria-pressed',x===button?'true':'false');});}};list.appendChild(button);
  });
 }

 function edit(record){selected=record;panel.hidden=false;document.getElementById('contentEditorTitle').textContent=collection==='site'?'إعدادات الصفحة الرئيسية':record.name||record.label||record.title||record.author||'إضافة عنصر جديد';document.getElementById('contentEditorType').textContent=collectionNames[collection];form.replaceChildren();fields().forEach(function(field){var path=field[0],type=field[2]||'',label=document.createElement('label'),caption=document.createElement('span');caption.textContent=field[1];label.appendChild(caption);var input;
  if(type.includes('text'))input=document.createElement('textarea');else if(['category','app','platforms','promo-type','rating'].includes(type))input=document.createElement('select');else input=document.createElement('input');
  input.name=path;input.dataset.kind=type;if(type.includes('url')||type==='id'||path.endsWith('_en')||path.startsWith('en.'))input.dir='ltr';
  var value=valueAt(record,path);
  if(input.tagName==='SELECT'){
   var options=type==='category'?catalog.categories.map(function(x){return[x.key,x.label];}):type==='app'?catalog.apps.map(function(x){return[x.id,x.name];}):type==='platforms'?[['android','Android'],['ios','iPhone'],['web','Web']]:type==='promo-type'?[['coupon','كوبون'],['promotion','عرض']]:[1,2,3,4,5].map(function(x){return[x,x];});
   if(type==='platforms'){input.multiple=true;input.size=3;}else{var blank=document.createElement('option');blank.value='';blank.textContent='اختر';input.appendChild(blank);}
   options.forEach(function(pair){var option=document.createElement('option');option.value=pair[0];option.textContent=pair[1];option.selected=type==='platforms'?(value||[]).includes(pair[0]):String(value)===String(pair[0]);input.appendChild(option);});
  }else if(type==='checkbox'){input.type='checkbox';input.checked=value===undefined&&path.startsWith('show')?true:!!value;}else{if(input.tagName==='INPUT')input.type=type.includes('url')?'url':type.includes('date')?'date':'text';input.value=value??'';}
  if(type==='id'){input.required=true;input.pattern='[A-Za-z0-9_-]{1,150}';input.readOnly=!!record[path];}
  if(type.startsWith('required')||['category','app','platforms','promo-type','rating'].includes(type))input.required=true;
  if(type.includes('text'))input.maxLength=3000;else if(input.tagName==='INPUT'&&input.type==='text')input.maxLength=path==='id'||path==='key'?150:300;
  label.appendChild(input);form.appendChild(label);
 });
 var actions=document.createElement('div');actions.className='actions';var save=document.createElement('button');save.type='submit';save.textContent='حفظ ونشر';actions.appendChild(save);
 if(collection!=='site'&&(record.id||record.key)){var remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='حذف';remove.onclick=async function(){var warning=collection==='apps'?'حذف التطبيق سيحذف عروضه ومراجعاته أيضاً. هل تريد المتابعة؟':'هل تريد حذف هذا العنصر؟';if(!confirm(warning))return;await saveChange({action:'delete',id:record.id||record.key});};actions.appendChild(remove);}
 form.appendChild(actions);
 }
 async function saveChange(change){if(working)return;lock(true);form.querySelectorAll('button').forEach(function(b){b.disabled=true;});try{var data=await api('content',{method:'POST',body:JSON.stringify(Object.assign({collection:collection,version:version},change))});catalog=data.catalog;version=data.version;selected=null;panel.hidden=true;onCatalog(catalog);render();message('تم حفظ المحتوى ونشره. يظهر عند تحديث الموقع.');}catch(error){message(error.message,true);}finally{lock(false);form.querySelectorAll('button').forEach(function(b){b.disabled=false;});}}
 form.onsubmit=function(event){event.preventDefault();if(!form.reportValidity())return;var record={};fields().forEach(function(field){var input=form.elements[field[0]],value=input.type==='checkbox'?input.checked:input.multiple?Array.from(input.selectedOptions).map(function(x){return x.value;}):input.value;if(field[2]==='rating')value=Number(value);setAt(record,field[0],value);});if(selected&&selected.sourceSubmission)record.sourceSubmission=selected.sourceSubmission;saveChange({action:'save',record:record});};
 document.getElementById('contentCollection').onchange=function(){if(working)return;collection=this.value;selected=null;panel.hidden=true;render();};
 document.getElementById('contentSearch').oninput=render;
 document.getElementById('contentAdd').onclick=function(){if(!catalog||working)return;var record={};if(collection!=='categories'){record.id=collection.slice(0,-1)+'-'+crypto.randomUUID();}if(collection==='reviews')record.date=new Date().toISOString().slice(0,10);edit(record);};
 async function load(){if(working)return;lock(true);try{var data=await api('content');catalog=data.catalog;version=data.version;panel.hidden=true;onCatalog(catalog);render();}catch(error){message(error.message,true);}finally{lock(false);}}
 document.getElementById('contentRefresh').onclick=load;
 return {load:load,reset:function(){lock(false);catalog=null;version=null;selected=null;list.replaceChildren();form.replaceChildren();panel.hidden=true;},published:function(item){if(!catalog)return null;return(catalog[item.publishedCollection]||[]).find(function(x){return x.id===item.publishedId;});}};
};
})();
