(function(){
'use strict';
document.getElementById('launchNeed').onclick=function(){window.dispatchEvent(new CustomEvent('syh:contribute',{detail:{type:'need'}}));};
document.getElementById('launchRequests').onclick=function(){SyhAccount.requests();};
})();
