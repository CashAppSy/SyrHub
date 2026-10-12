(function(){
'use strict';
var directory=document.getElementById('directoryPreview');
function reveal(){directory.hidden=false;}
function route(){if(/^#(apps|promosSection|app\/)/.test(location.hash)||location.pathname.startsWith('/apps/'))reveal();}
document.addEventListener('click',function(event){var link=event.target.closest('a[href="#apps"],a[href="#promosSection"]');if(link)reveal();});window.addEventListener('hashchange',route);route();
window.addEventListener('syh:catalog',function(event){document.querySelector('.launch-preview').hidden=!event.detail.demoMode;if(!event.detail.demoMode)reveal();});if(document.documentElement.classList.contains('demo-catalog')===false&&window.APPS&&APPS.some(function(app){return !app.isDemo;}))reveal();
document.getElementById('launchNeed').onclick=function(){window.dispatchEvent(new CustomEvent('syh:contribute',{detail:{type:'need'}}));};
document.getElementById('launchRequests').onclick=function(){SyhAccount.requests();};
})();
