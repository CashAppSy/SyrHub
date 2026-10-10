# SyrHub — نشر الويب وPWA وبناء APK

## حالة النسخة

الكود جاهز للفحص المحلي. الربط الحي يحتاج إعداد Firebase وCloudflare وTurnstile. لا يحتوي المستودع على مفاتيح سرية أو APK جديد مبني. المشروع الجديد الذي اختاره المستخدم: `syrhub-7e44a`.

## التشغيل المحلي

```sh
npm ci
npm test
npm run build
npm run check:functions
npm run dev
```

يعمل Wrangler عادة على المنفذ 8788. للتشغيل الثابت فقط: `python3 -m http.server 8000 --directory dist`؛ هذا لا يشغّل خدمة النماذج. إعدادات التطوير توضع في ملف `.dev.vars` المتجاهل من Git. لا تنشر هذا الملف ولا أي ملف حساب خدمة.

## Firebase

1. افتح مشروع `syrhub-7e44a` في Firebase Console.
2. أنشئ Cloud Firestore بقاعدة `(default)` ووضع Production واختر المنطقة بعناية.
3. انشر محتويات `firestore.rules` من تبويب Rules. هذه تمنع وصول المتصفح المباشر للمساهمات الخاصة.
4. في Google Cloud → IAM & Admin → Service Accounts، أنشئ حساب `syrhub-submissions` بدور **Cloud Datastore User** (`roles/datastore.user`).
5. من حساب الخدمة → Keys → Add key → Create new key → JSON، نزّل المفتاح. احتفظ به بأمان، ولا ترفعه إلى Git ولا ترسله في المحادثة.

## Cloudflare Pages

1. ارفع هذه الملفات إلى GitHub أولاً؛ يجب أن تجد `package.json` و`wrangler.toml` في جذر الفرع المنشور.
2. اختر Workers & Pages → Create application → **Pages** → Connect to Git، ثم `CashAppSy/SyrHub`.
3. Production branch: `main`، Framework: None، Build command: `npm run build`، Output: `dist`، Root directory: فارغ.
4. يمكن ضبط متغير البناء `NODE_VERSION=22`.
5. استخدم نشر Git حتى تُبنى `functions/`؛ رفع الملفات الثابتة وحدها لا يشغّل API.

## Turnstile والمتغيرات

أنشئ Managed widget في Cloudflare Turnstile. أضف اسم مضيف Pages الفعلي وأي نطاق خاص، دون بروتوكول أو مسار. ثم أضف هذه القيم في Pages → Settings → Variables and Secrets لبيئة Production:

| الاسم | النوع | القيمة |
| --- | --- | --- |
| FIREBASE_PROJECT_ID | Variable | syrhub-7e44a |
| FIREBASE_CLIENT_EMAIL | Secret | client_email من مفتاح حساب الخدمة |
| FIREBASE_PRIVATE_KEY | Secret | private_key كاملة بصيغة PEM |
| TURNSTILE_SITE_KEY | Variable | Site Key من الأداة |
| TURNSTILE_SECRET_KEY | Secret | Secret Key من الأداة |

المفتاح الخاص يدعم الأسطر الفعلية أو `\n`. لا تضعه في JavaScript أو Git. إعدادات Preview مستقلة؛ اضبطها فقط إذا أردت تشغيل النماذج في المعاينات. أعد النشر بعد ضبط القيم.

## اختبار الحفظ الحقيقي

افتح `/api/submissions`: يجب أن يظهر `configured: true`. هذه تؤكد وجود القيم فقط. أرسل اقتراح تطبيق، وعرضاً، وتقييماً من النماذج مع Turnstile، ثم تحقق في Firestore من وجود مستندات ضمن `submissions` بحالة `pending` ووقت `createdAt`.

503 يعني إعداداً ناقصاً، 403 يعني رفض التحقق أو المصدر، 400 يعني مدخلات غير صالحة، 502 يعني فشل خدمة التحقق أو المصادقة أو التخزين. راجع صلاحيات الحساب وقاعدة `(default)` إذا فشل الحفظ.

المساهمات تنتظر المراجعة ولا تُنشر تلقائياً: أضف المقبول إلى `data/*.json` ثم نفّذ `npm run build:data` وراجع الفرق وارفعه وأعد النشر. لا تنشر البريد الإلكتروني. إدارة المراجعة حالياً عبر Firestore Console وليست لوحة إدارة داخل الموقع.

## PWA

Android: Chrome → Install app. iPhone: Safari → Share → Add to Home Screen. اختبر الموقع أثناء الاتصال ثم عدم الاتصال. النماذج تحتاج الإنترنت ولا تُرسل تلقائياً لاحقاً. إشعارات Firebase القديمة أزيلت؛ إعادة تفعيل push للمشروع الجديد عمل مستقل.

## APK

بعد نشر الموقع وتحديد الرابط النهائي:

1. افتح GitHub → Actions → **Build Android APK** → Run workflow.
2. أدخل الرابط HTTPS في `site_url`.
3. بعد نجاح التشغيل نزّل `SyrHub-debug-apk` من Artifacts، وفك الضغط لتجد `app-debug.apk`.
4. اختبره على Android: التنقل، الرجوع، المفضلة، النماذج وTurnstile والحفظ الحقيقي.

المسار يثبت JDK 17 وGradle 8.11.1 وAndroid SDK 35. البديل المحلي:

```sh
cd android
gradle --no-daemon assembleDebug -PsiteUrl=https://YOUR_DEPLOYED_DOMAIN/
```

يتطلب SDK مثبتاً وقبول التراخيص. النسخة الناتجة Debug للاختبار. للنشر العام أضف توقيع Release بمفتاح محفوظ بأمان وابنِ إصداراً موقّعاً؛ لا ترفع ملفات keystore إلى Git. بعد نشر الإصدار اضبط `APK_LINK` في `index.html`. WebView لا يدعم Firebase browser push؛ iPhone يستخدم PWA.
