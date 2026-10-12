// Fictional examples for UI/search testing; never claim these are real services.
const examples=[
 ['food-damascus','توصيل طعام دمشق','Food delivery Damascus','delivery',['damascus'],['توصيل','طعام','مطاعم'],'free',['نقداً (مثال)'],'yes'],
 ['food-aleppo','توصيل طعام حلب','Food delivery Aleppo','delivery',['aleppo'],['توصيل','طعام','مطاعم'],'freemium',['نقداً (مثال)'],'yes'],
 ['doctor-homs','حجز طبيب حمص','Doctor booking Homs','health',['homs'],['حجز','طبيب','صحة'],'free',['نقداً (مثال)'],'yes'],
 ['taxi-damascus','تاكسي دمشق','Taxi Damascus','transport',['damascus','rif-dimashq'],['تاكسي','نقل','مواصلات'],'free',['نقداً (مثال)'],'yes'],
 ['learn-syria','تعليم في كل سوريا','Learning across Syria','education',['nationwide'],['تعليم','دراسة','دروس'],'freemium',['تحويل بنكي (مثال)'],'no'],
 ['shop-latakia','تسوق اللاذقية','Shopping Latakia','shopping',['latakia','tartus'],['تسوق','شراء','متجر'],'free',['نقداً عند الاستلام (مثال)'],'yes']
];
export const demoApps=examples.map(([key,name,en,category,cities,needs,cost,paymentMethods,needsAccount])=>({id:'demo-'+key,name:'تجريبي — '+name,name_en:'Demo — '+en,category,description:'بيانات تجريبية لاختبار البحث والواجهة فقط. هذا تطبيق وهمي، وليس خدمة حقيقية أو توصية باستخدامها.',description_en:'Fictional sample for testing search and UI only. This is not a real service or recommendation.',platforms:['android','web'],officialLink:'https://example.com/'+key,storeLinks:{},icon:'',verified:false,isDemo:true,cities,needs,cost,paymentMethods,needsAccount,availability:'unknown',lastChecked:'',lastUpdate:'',verificationSource:'',verificationNotes:'المعلومات والمدن وطرق الدفع هنا أمثلة للاختبار، ولم يجرِ التحقق من خدمة فعلية.'}));
export function withDemoData(catalog){
 const next=structuredClone(catalog);
 if(next.site?.showDemoApps===false){next.apps=next.apps.filter(x=>!x.isDemo);return next;}
 for(const app of demoApps)if(next.categories.some(x=>x.key===app.category)&&!next.apps.some(x=>x.id===app.id))next.apps.push(structuredClone(app));
 return next;
}
