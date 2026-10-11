export const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function userIdentity(request,env){
 const bearer=request.headers.get('Authorization');
 if(!env.FIREBASE_WEB_API_KEY||!bearer?.startsWith('Bearer ')||bearer.length>8192)return null;
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_WEB_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:bearer.slice(7)})});
 if(!response.ok)return null;
 const user=(await response.json()).users?.[0];
 return user?.localId&&!user.disabled?{uid:user.localId,email:user.email||'',name:user.displayName||'',emailVerified:!!user.emailVerified}:null;
}
export function publicConfig(env){return json({authConfigured:!!env.FIREBASE_WEB_API_KEY,apiKey:env.FIREBASE_WEB_API_KEY||'',firebase:{apiKey:env.FIREBASE_WEB_API_KEY||'',projectId:env.FIREBASE_PROJECT_ID||'',messagingSenderId:env.FIREBASE_MESSAGING_SENDER_ID||'',appId:env.FIREBASE_WEB_APP_ID||''},vapidKey:env.FIREBASE_VAPID_KEY||'',pushConfigured:!!(env.FIREBASE_WEB_API_KEY&&env.FIREBASE_PROJECT_ID&&env.FIREBASE_MESSAGING_SENDER_ID&&env.FIREBASE_WEB_APP_ID&&env.FIREBASE_VAPID_KEY)});}
