(function(){
 'use strict';
 var modal=document.getElementById('contributeModal'),options=modal.querySelector('.modal-options');
 var form=document.createElement('form');form.className='contribution-form';form.hidden=true;
 var en=false,widget=null,token='',configured=false,submitting=false,opener=null,type='app',generation=0,sdk;
 var labels={ar:{name:'اسمك',email:'البريد الإلكتروني (اختياري)',title:'اسم التطبيق',appId:'التطبيق',url:'الرابط الرسمي (HTTPS)',city:'المدينة (اختياري)',reason:'نوع البلاغ',description:'التفاصيل / تجربتك',rating:'التقييم',code:'كود الخصم (اختياري)',submit:'إرسال للمراجعة',back:'العودة',note:'تُراجع المساهمات قبل نشرها. لا ترسل كلمات مرور أو معلومات حساسة.',success:'تم استلام مساهمتك للمراجعة. شكراً لك!',unavailable:'الإرسال غير متاح حالياً. يمكنك كتابة مساهمتك والمحاولة لاحقاً.',error:'تعذّر الإرسال. تحقق من الاتصال وحاول مجدداً.',verify:'أكمل التحقق قبل الإرسال.',sending:'جارٍ الإرسال…'},en:{name:'Your name',email:'Email (optional)',title:'App name',appId:'App',url:'Official link (HTTPS)',city:'City (optional)',reason:'Report type',description:'Details / your experience',rating:'Rating',code:'Discount code (optional)',submit:'Submit for review',back:'Back',note:'Contributions are reviewed before publication. Do not send passwords or sensitive information.',success:'Your contribution has been received for review. Thank you!',unavailable:'Submissions are currently unavailable. You can write your contribution and retry later.',error:'Unable to submit. Check your connection and retry.',verify:'Complete verification before submitting.',sending:'Sending…'}};
 function text(){return labels[en?'en':'ar'];}
 function field(key,html){return '<label data-field="'+key+'"><span>'+text()[key]+'</span>'+html+'</label>';}
 function status(message,error){var el=form.querySelector('.form-status');el.textContent=message;el.dataset.error=error?'true':'false';}
 function loadTurnstile(){if(window.turnstile)return Promise.resolve();if(sdk)return sdk;sdk=new Promise(function(resolve,reject){var script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=resolve;script.onerror=function(){sdk=null;script.remove();reject(new Error());};document.head.appendChild(script);});return sdk;}
 async function show(selected,appId,seed){
  seed=seed||{};
  try{await window.SyhAccount.requireUser();}catch(e){return;}
  if(submitting)return;
  var current=++generation;
  en=document.documentElement.lang==='en';type=selected;token='';configured=false;
  if(widget!==null && window.turnstile){window.turnstile.remove(widget);widget=null;}
  var t=text();form.innerHTML=
   field('name','<input name="name" maxlength="100" autocomplete="name" required>')+
   field('email','<input name="email" type="email" maxlength="254" autocomplete="email">')+
   field('title','<input name="title" maxlength="150">')+
   field('appId','<select name="appId"><option value="">'+(en?'Choose an app':'اختر تطبيقاً')+'</option></select>')+
   field('url','<input name="url" type="url" maxlength="1000" dir="ltr" placeholder="https://">')+
   field('rating','<select name="rating"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select>')+
   field('code','<input name="code" maxlength="80" dir="ltr">')+
   field('city','<select name="city"><option value="">'+(en?'Unspecified':'غير محددة')+'</option></select>')+
   field('reason','<select name="reason"><option value="broken_link">'+(en?'Broken link':'رابط لا يعمل')+'</option><option value="outdated">'+(en?'Outdated information':'معلومات قديمة')+'</option><option value="unavailable">'+(en?'Service unavailable':'الخدمة لا تعمل')+'</option><option value="other">'+(en?'Other':'آخر')+'</option></select>')+
   field('description','<textarea name="description" minlength="10" maxlength="3000" required></textarea>')+
   '<label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><p class="form-note">'+t.note+'</p><div class="verification"></div><p class="form-status" role="status" aria-live="polite"></p><div class="form-actions"><button class="btn btn-primary" type="submit" disabled>'+t.submit+'</button><button class="btn btn-ghost" type="button" data-back>'+t.back+'</button></div>';
  (window.APPS || []).forEach(function(app){var option=document.createElement('option');option.value=app.id;option.textContent=en?(app.name_en || app.name):app.name;form.elements.appId.appendChild(option);});
  SyhLocal.cities.forEach(function(city){var option=document.createElement('option');option.value=city[0];option.textContent=city[en?2:1];form.elements.city.appendChild(option);});
  form.elements.city.value=seed.city||'';form.elements.title.value=seed.title||'';form.elements.description.value=seed.description||'';form.elements.appId.value=appId || '';if(type==='report'){var app=(window.APPS||[]).find(function(x){return x.id===appId;});form.elements.title.value=app?app.name:'';}
  var account=window.SyhAccount.user();form.elements.name.value=account.name||'';form.elements.email.value=account.email||'';form.elements.email.readOnly=true;
  ['title','appId','url','rating','code','city','reason'].forEach(function(key){var visible=key==='title'?['app','need','report'].includes(type):key==='appId'?['promo','review','report'].includes(type):key==='url'?['app','promo'].includes(type):key==='rating'?type==='review':key==='code'?type==='promo':key==='city'?['need','report'].includes(type):type==='report';form.querySelector('[data-field="'+key+'"]').hidden=!visible;form.elements[key].disabled=!visible;form.elements[key].required=visible&&key!=='code'&&key!=='city'&&!(key==='title'&&type==='report');});
  if(type==='need')form.querySelector('[data-field="title"] span').textContent=en?'What do you need an app for?':'ما الحاجة التي تبحث عن تطبيق لها؟';
  options.hidden=true;form.hidden=false;modal.classList.add('open');form.elements.name.focus();
  fetch('/api/submissions',{headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(config){
   if(current!==generation)return;
   if(!config.configured || !config.turnstileSiteKey)throw new Error();configured=true;
   return loadTurnstile().then(function(){if(current!==generation)return;widget=window.turnstile.render(form.querySelector('.verification'),{sitekey:config.turnstileSiteKey,action:'contribution',language:en?'en':'ar',callback:function(value){if(current!==generation)return;token=value;form.querySelector('[type="submit"]').disabled=false;status('');},'expired-callback':function(){token='';form.querySelector('[type="submit"]').disabled=true;},'error-callback':function(){token='';form.querySelector('[type="submit"]').disabled=true;status(t.error,true);}});});
  }).catch(function(){if(current===generation)status(t.unavailable,true);});
 }
 modal.querySelector('.modal').appendChild(form);
 window.addEventListener('syh:contribute',function(event){var data=event.detail||{};show(data.type,data.appId,data);});
 document.getElementById('requestNeed').onclick=function(){var query=document.getElementById('search').value.trim();show('need','',{title:query,city:document.getElementById('cityFilter').value||SyhLocal.parse(query).city});};
 document.addEventListener('click',function(event){var option=event.target.closest('.modal-option[data-type]'),review=event.target.closest('.btn-review');if(!option && !review)return;event.preventDefault();opener=option || review;show(option?option.dataset.type:'review',review?review.dataset.app:'');});
 document.getElementById('contributeOpen').addEventListener('click',function(){if(!submitting){form.hidden=true;options.hidden=false;}});
 form.addEventListener('click',function(event){if(event.target.closest('[data-back]') && !submitting){generation++;form.hidden=true;options.hidden=false;options.querySelector('a').focus();}});
 document.addEventListener('keydown',function(event){if(!modal.classList.contains('open'))return;if(event.key==='Tab'){var items=Array.prototype.filter.call(modal.querySelectorAll('a,button,input,select,textarea,[tabindex="0"]'),function(el){return !el.disabled && el.offsetParent!==null && !el.closest('.honeypot');}),first=items[0],last=items[items.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}}if(event.key==='Escape' && opener){opener.focus();}});
 form.addEventListener('submit',async function(event){event.preventDefault();try{await window.SyhAccount.requireUser();}catch(e){return;}if(submitting)return;if(!configured || !token){status(text().verify,true);return;}if(!form.reportValidity())return;var payload={type:type,turnstileToken:token};new FormData(form).forEach(function(value,key){payload[key]=value;});if(type==='review')payload.rating=Number(payload.rating);var button=form.querySelector('[type="submit"]');submitting=true;button.disabled=true;status(text().sending);
  window.SyhAccount.token().then(function(idToken){return fetch('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+idToken},body:JSON.stringify(payload)});}).then(function(r){if(r.status!==201)throw new Error();return r.json();}).then(function(result){if(!result.id || result.status!=='pending')throw new Error();form.reset();status(text().success+' '+(en?'Track its status from Account → My requests.':'تابع حالتها من حسابي ← طلباتي.'));}).catch(function(){status(text().error,true);}).finally(function(){submitting=false;token='';if(widget!==null && window.turnstile)window.turnstile.reset(widget);});
 });
})();
