# ARCHITECTURE.md — شرح المشروع الكامل: SyrHub 🏛️

> هذا الملف صُمم ليكون **المرجع الشامل** لفهم مشروع **SyrHub** — سواء كنت مطوراً تقنياً،
> أو مستخدماً غير تقني يريد معرفة كيف يعمل، **أو نموذج ذكاء اصطناعي** قرأ لكوداً غامضاً.
> يشرح الملف: مفهوم المشروع، هيكل الملفات، دور كل ملف، مخططات العمارة، مخططات البيانات،
> دورة التشغيل، التخزين، التحليلات، المعايير، وأوامر الفحص والنشر.

---

## 1) ما هو المشروع؟ (بالعربي البسيط)

**SyrHub = "دليل التطبيقات السورية"**: موقع واحد يجمع أبرز التطبيقات المحلية السورية في
قائمة واحدة منظمة، مصنّفة حسب النوع (توصيل، مواصلات، دفع، تسوق، عقارات، تعليم، صحة،
وظائف، أخرى)، مع **روابط رسمية فقط** — لا يستضيف الموقع أي ملف APK بنفسه، بل يوجّه
المستخدم إلى المصدر الرسمي (Google Play / App Store / موقع الشركة).

**لمن؟** للسوريين داخل وخارج سوريا، وأي شخص يريد معرفة التطبيقات السورية الموثوقة.

| # | المعلومة | القيمة |
|---|---|---|
| 1 | الاسم | SyrHub |
| 2 | النوع | موقع صفحة واحدة ثابت (Static SPA) — لا سيرفر ولا قاعدة بيانات |
| 3 | التقنيات | HTML + CSS + JavaScript خالص (بدون أطر عمل) |
| 4 | نسخة الجافاسكريبت | ES5 (متوافق مع WebView أندرويد القديم) |
| 5 | اللغات | عربي (افتراضي RTL) + إنجليزي (LTR) |
| 6 | الثيمات | فاتح / داكن (حفظ في المتصفح + احترام تفضيل النظام) |
| 7 | PWA | قابل للتثبيت + يعمل دون اتصال |
| 8 | البيانات العينية حالياً | 27 تطبيقاً / 9 فئات / 8 عروض / 81 رأياً |
| 9 | التحليلات | Google Analytics 4 (GA4) برمز `G-JZ7NFMPZPY` |
| 10 | النشر | GitHub Pages (ملفات ثابتة) |

---

## 2) المميزات الوظيفية (ملخص سريع)

- 🔍 بحث ذكي ثنائي اللغة مع ترتيب حسب الصلة + تمييز الكلمات.
- 🎛️ فلاتر: الفئة + المنصة (أندرويد/آيفون/ويب) + "موثّق فقط".
- ⭐ المفضلة + "شوهد مؤخراً" + مقارنة حتى 4 تطبيقات (كلها محفوظة محلياً).
- 📄 صفحة تفاصيل لكل تطبيق مع روابط رسمية + "آخر تحديث" + "الإبلاغ عن رابط معطّل".
- 🤝 توصيات "تطبيقات مشابهة" تلقائية.
- 🎟️ عروض وكوبونات تُعرض بسكّ الطابع الرسومي، مع زر نسخ الكود.
- 📱 شريط تنقل سفلي للهاتف + زر APK/PWA (صندوقان بجانب بعضهما) في التذييل.
- 📲 تثبيت كتطبيق PWA + نسخة أندرويد (حزمة APK تلفّ الموقع عبر WebView).
- 🔔 إشعارات فورية عبر Firebase Cloud Messaging: Toast عند فتح الموقع + إشعار نظام عند الإغلاق،
  مع زر تفعيل وزر "نسخ رمز الجهاز" (لاختبار الإرسال من الكونسول). تعمل بملء مفاتيح `FIREBASE`.
- 🌐 SEO ديناميكي: JSON-LD + وسوم og/twitter تتحدث لكل تطبيق + خريطة موقع.
- 📊 عدّادات GA4 لأحداث محددة (فهرستها بالأسفل).

---

## 3) هيكل المشروع الكامل (شجرة الملفات)

```
SyrHub/  (مجلد المشروع — اسم الريبو على GitHub: SyrHub)
│
├── index.html              ← الموقع كاملاً في ملف واحد (الصفحة الوحيدة)
├── sw.js                   ← Service Worker (كاش + دون اتصال)
├── storage.js              ← واجهة التخزين المحلي (مغلفة وموحدة)
├── manifest.webmanifest    ← تعريف تطبيق PWA (الاسم/الأيقونات/اللون)
├── offline.html            ← صفحة مستقلة تُعرض عند انقطاع الشبكة
├── sitemap.xml             ← خريطة الموقع (مولدة آلياً — لا تُحرر يدوياً)
├── README.md               ← الوثيقة الترويجية + التشغيل + النشر
├── CONTRIBUTING.md         ← معايير إضافة تطبيق/عرض/رأي + سياسة المراجعة
│
├── apps-data.js            ← (مولّد) الفئات CATEGORIES + التطبيقات APPS
├── promotions-data.js      ← (مولّد) العروض والكوبونات PROMOTIONS
├── reviews-data.js         ← (مولّد) الآراء والتقييمات REVIEWS
│
├── data/                   ← ⚠️ مصدر البيانات الحقيقي (يُعدَّل هنا فقط)
│   ├── apps.json
│   ├── categories.json
│   ├── promotions.json
│   └── reviews.json
│
├── build/
│   └── build.js            ← أداة البناء (Node.js) تولّد ملفات *-data.js + sitemap.xml
│
├── icons/
│   ├── App-SyrHub-Icon.png ← أيقونة تثبيت التطبيق (PWA + أندرويد)
│   └── SyrHub-Icon.png     ← شعار الموقع
├── SyrHub-Icon.png         ← favicon + apple-touch-icon + الرأس + الأغلفة الاجتماعية
```

**قاعدة ذهبية:** الملفات `apps-data.js` / `promotions-data.js` / `reviews-data.js` /
`sitemap.xml` **مولّدة آلياً — لا تُعدّل يدوياً أبداً**. مصدر الحقيقة هو `data/*.json`.

---

## 4) شرح كل ملف بالتفصيل

### 4.1 `index.html` — الصفحة الوحيدة (قلب المشروع ✨)
ملف CSS+HTML+JS كاملاً (~3700 سطر). يضم بالترتيب:

| القسم | الوظيفة |
|---|---|
| `<head>` | وسوم SEO الثابتة (description, og:, twitter:) + حاوية JSON-LD (`#seoJsonLd`) |
| سكربت BOOT الفوري | يقرأ `syh-theme` و`syh-lang` من localStorage ويطبق الثيم/الخط/الاتجاه **قبل الرسم** (يمنع وميض FOUC) |
| سكربت التحليلات | GA4 + أحداث `dataLayer` |
| خطوط Google | تحميل كسول (Aref Ruqaa / Tajawal / Inter / Playfair) |
| CSS الرئيسي | متغيرات الألوان (Light/Dark) + التخطيط + الشارات + البطاقات + الفلاتر + الكوبونات + التفاصيل + النوافذ + استعلامات الوسائط |
| `<body>` | header (الشعار/البحث/الثيم/اللغة) ← hero ← أشرطة الفلاتر (فئات/منصات/موثّق) ← شريط الأدوات (نتائج/فرز/مقارنة) ← شبكة البطاقات ← شبكة العروض ← شوهد مؤخراً ← footer (مع سطر "تم التطوير من قبل المهندس علي إبراهيم") |
| السكربت الأول | BOOT + تسجيل الـ Service Worker + GA |
| السكربتان (2–3) | جدولا `I18N.ar` و`I18N.en` (كل الترجمات) ثم واجهة التشغيل (النواة + الـ Router + العرض + المستمعون) |
| السكربت الرابع | توليد خريطة موقع ديناميكية (لبرنامج Project Sitemap) |
| السكربت الخامس | أدوات تطوير/فحص وأمان |

**منطق التشغيل داخل الكود (الدوال المهمة):**
- `render()`: يعيد رسم الشبكة الحالية (توليفة البحث + الفرز + الفلاتر).
- `renderPlatformFilter()`: يرسم أزرار المنصات + "موثّق فقط".
- `appCardHTML(app)` / `promoCardHTML(promo)` / `detailView(app)`: بناء HTML البطاقات والعروض والتفاصيل.
- `openDetail(id)` + `setAppHash(id)`: فتح التفاصيل وتحديث الرابط (`#app/<id>`).
- `handleRoute()`: المستمع لتغيّر الـ hash.
- `updateSeo(app)` / `resetSeo()`: تبديل title/og/twitter/JSON-LD.
- `jsonLdFor(app)`: توليد مخطط `SoftwareApplication` / `WebSite`.
- `reportBrokenLink(app)`: فتح GitHub Issue جاهز للإبلاغ عن رابط معطّل.
- `applyLang()` / `applyTheme()`: تطبيق اللغة والثيم عبر `data-i18n` و`dataset.theme`.
- `fcmInit()` / `toggleNotifications()` / `getFCMToken()` / `refreshNotifyUI()` / `showNotifyToast()`:
  تشغيل إشعارات Firebase مع حماية ذاتية عند غياب المفاتيح (كائن `FIREBASE` فارغ افتراضياً + سكربتا
  CDN من gstatic بـ`defer` في نهاية `</body>`).

### 4.2 `sw.js` — Service Worker (خادم الكاش + دون اتصال + إشعارات الخلفية)

- `CORE_ASSETS = [...]`: قائمة الموارد المعبأة مسبقاً عند أول تثبيت (الصفحة، offline.html، manifest، الأيقونات، ملفات البيانات، storage.js).
- **استراتيجيتان:**
  1. طلبات **التنقل** (صفحة): شبكة أولاً، تُخزَّن النسخة المحدثة في الكاش، وعند الفشل → `offline.html`.
  2. **الموارد الثابتة**: كاش أولاً (سريع)، ثم الشبكة، وعند الفشل → `offline.html`.
- **استثناءات**: طلبات Google Analytics / Google fonts / Firebase SDK لا تُعترض أبداً.
- **إشعارات الخلفية (FCM)**: عند تعبئة `FIREBASE_CONFIG` يُستورد سكربتا Firebase عبر `importScripts`
  من gstatic ويُعالَج `onBackgroundMessage` (إشعار نظام بصورة `SyrHub-Icon.png`) و`notificationclick`
  (فتح/تركيز الموقع). عند بقاء المفاتيح فارغة لا يُستورد أي شيء ولا يتغيّر سلوك الكاش.
- **دورة الكاش**: أي تغيير يجب أن يرفع اسم الكاش من `syh-cache-vNN` إلى `vN+1` (الآخر: `v25`)،
  فيحذف `activate` تلقائياً كل الكاش القديم. إصدار السكربت موثق في السطر الأول `v1.15.0`.

### 4.3 `storage.js` — واجهة التخزين الموحدة (نمط Module)
كل التعامل مع localStorage يُمر من هنا تحت مفتاح واحد `SyhStorage`:

- **حماية**: جميع الدوال في try/catch؛ إن تعطّل localStorage كلياً يتحول إلى ذاكرة JavaScript مؤقتة (لا يتعطل الموقع أبداً).
- **الوظائف**:
  | الدوال | المفتاح | الغرض | الحد |
  |---|---|---|---|
  | `get/add/remove/is/clearFavorites()` | `syh-favorites` | قائمة المفضلة | — |
  | `get/add/clearRecentlyViewed()` | `syh-recent` | آخر 10 تصفحات | 10 |
  | `get/set/add/remove/clearCompareList()` | `syh-compare` | المقارنة | 4 |

### 4.4 `manifest.webmanifest` — بطاقة هوية التطبيق (PWA)
الاسم (`SyrHub — دليل التطبيقات السورية`)، العرض `standalone`، الاتجاه `rtl`،
اللون `#1B2A4A`، وأيقونات 192px و512px (بنمط عادي + maskable). هذا الملف هو ما
يجعل المتصفح يعرض "تثبيت التطبيق".

### 4.5 `offline.html` — صفحة "غير متصل" 🇸🇾
صفحة مستقلة ثنائية اللغة (قراءة `syh-lang`) + وضعان فاتح/داكن، تعرض رسالة
ودية مع زر **إعادة المحاولة**، وتُستدعى من `sw.js` عند انقطاع الشبكة.

### 4.6 `build/build.js` — أداة البناء (Node.js، بلا اعتماديات)
الأمر: `node build/build.js`

```
data/*.json  ──►  build.js  ──►  apps-data.js
                                promotions-data.js
                                reviews-data.js
                                sitemap.xml
```

- **يقبل التحليل** (validation): لا معرّف مكرر، كل `category` موجودة في categories.json،
  كل `platform` ضمن `['android','ios','web']`.
- **ينبّه** على روابط تجريبية `example.com` المتبقية.
- يبني الملفات على صيغة `var X = [...]` (ES5) مع ترويسة تحذيرية "ملف مولَّد".
- يولّد `sitemap.xml`: الصفحة الرئيسية + رابط لكل تطبيق (`#app/<id>`) + `lastmod` من `lastUpdate`.

### 4.7 `data/*.json` — مصدر البيانات الحقيقي (مخططات موضحة في القسم 5)
- `apps.json`: قائمة التطبيقات.
- `categories.json`: الفئات.
- `promotions.json`: العروض والكوبونات.
- `reviews.json`: الآراء.

### 4.8 `README.md` و`CONTRIBUTING.md` — الوثائق
README: ترويج + مميزات + التشغيل المحلي + النشر على GitHub Pages.
CONTRIBUTING: معايير القبول الصارمة لإضافة تطبيق/عرض/رأي (رابط رسمي موثّق، هوية المطور، صلة فعلية بسوريا، رفض الملفات الضارة وreview bombing).

### 4.9 الأيقونات
- `SyrHub-Icon.png` → favicon + مشاهد التواصل الاجتماعي + شعار الرأس.
- `icons/App-SyrHub-Icon.png` → أيقونة تثبيت التطبيق/الـ PWA (معروفة في manifest وفي CORE_ASSETS).

---

## 5) مخططات البيانات (Data Schemas) — باسم الحقول الفعلي

### 5.1 تطبيق: `data/apps.json`
```json
{
  "id": "sufra-food",
  "name": "سُفرة",
  "name_en": "Sufra",
  "category": "delivery",
  "description": "طلب المأكولات من مطاعم مدينتك...",
  "description_en": "Order food from restaurants...",
  "platforms": ["android", "ios", "web"],
  "officialLink": "https://example.com/sufra-food",
  "storeLinks": {
    "android": "https://example.com/sufra-food/android",
    "ios":    "https://example.com/sufra-food/ios",
    "web":    "https://example.com/sufra-food/web"
  },
  "verified": true,
  "lastUpdate": "2026-01",
  "icon":  "https://رابط_اختياري_لأيقونة_الصورة.png"
}
```
| الحقل | إلزامي؟ | الوصف |
|---|---|---|
| `id` | ✅ | معرّف فريد باللاتيني (يُستخدم في الرابط `#app/<id>` والتخزين) |
| `name` / `name_en` | ✅ | الاسم بالعربي والإنجليزي |
| `category` | ✅ | مفتاح فئة موجود في categories.json |
| `description` / `description_en` | ✅ | وصف موجز بكل لغة |
| `platforms` | ✅ | قائمة من `android` / `ios` / `web` |
| `officialLink` | ✅ | الرابط الرسمي للشركة/المتجر |
| `storeLinks` | ✅ (كائن) | روابط المتاجر لكل منصة على حدة |
| `verified` | ✅ (bool) | هل التطبيق موثّق لدى الفريق |
| `lastUpdate` | ⬜ | صيغة `YYYY-MM` أو `YYYY-MM-DD` — يظهر كـ"آخر تحديث" ويغذي sitemap/JSON-LD |
| `icon` | ⬜ | صورة الأيقونة (تحميل كسول بدل أيقونة الفئة) |

### 5.2 فئة: `data/categories.json`
```json
{ "key": "delivery", "label": "توصيل الطعام", "label_en": "Food Delivery", "icon": "🍽️" }
```

### 5.3 عرض/كوبون: `data/promotions.json`
```json
{
  "id": "promo-sufra-1",
  "appId": "sufra-food",
  "type": "coupon",                 // coupon | promotion | event
  "title": "توصيل مجاني لأول 3 طلبات",
  "title_en": "Free delivery on your first 3 orders",
  "description": "...",
  "description_en": "...",
  "code": "SUF3FREE",               // فارغ "" إذا كان مجرد إعلان
  "discountLabel": "توصيل مجاني",   // خصم يعرض في شارة البطاقة
  "link": "https://example.com/sufra-food",
  "expiryDate": "2026-12-31",
  "verified": false
}
```
- العرض يتلاشى تلقائياً بعد `expiryDate` (يقارن باليوم الحالي).
- **سقف العرض تلقائي** — إذا كانت كل العروض منتهية فإن قسم العروض يختفي كلياً.
- بطاقة العرض تعرض الآن: `promo-app` (اسم التطبيق) بجانب `promo-badge` (نوع الخصم).

### 5.4 رأي: `data/reviews.json`
```json
{
  "id": "rev-sufra-food-1",
  "appId": "sufra-food",
  "author": "مستخدم",
  "rating": 3,
  "comment": "التطبيق بسيط ويعمل بشكل جيد.",
  "comment_en": "The app is simple and works well.",
  "date": "2026-01-14"
}
```
> ⭐ **تقييم النجوم لكل تطبيق يُحسب آلياً** كمعدّل آرائه — لا تدخل رقماً يدوياً.

---

## 6) مخططات العمارة (Architecture Diagrams)

### 6.1 المخطط العام

```
┌────────────────────────────────────────────────────────────────┐
│                        المتصفح (Client)                        │
│                                                                │
│   index.html ← storage.js, apps-data.js, promotions-data.js,   │
│               reviews-data.js                                  │
│         │                                                      │
│         ▼                                                      │
│     نافذة SPA: عرض / بحث / فلاتر / تفاصيل / مقارنة / عروض       │
│         │                                                      │
│         ├── localStorage (syh-*): الثيم/اللغة/الفلاتر/مفاتيح    │
│         ├── SyhStorage: fav / recent / compare                  │
│         ├── GA4 dataLayer: أحداث التفاعل                        │
│         └── فتح/إغلاق الـ hash (#app/x, #compare)               │
│                                                                │
│    manifest.webmanifest + sw.js + offline.html  ⇒ PWA + Offline│
└────────────────────────────────────────────────────────────────┘
                     ▲
      مولّدة آلياً   │
┌────────────────────┴───────────────────────────────────────────┐
│          طبقة البناء (Dev-only)                                │
│   data/*.json  ──►  node build/build.js  ──►  *-data.js + sitemap │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 تدفق بدء التشغيل (Boot Sequence)

```
فتح index.html
  │
  ├─ 1) سكربت BOOT: قراءة syh-theme / syh-lang → تطبيقها فوراً (بدون وميض)
  ├─ 2) تسجيل GA4 + إرسال page_view
  ├─ 3) تحميل ملفات البيانات (storage.js + *-data.js)
  ├─ 4) أول رسم: render() (البحث/الفلاتر المحفوظة) + renderPromotions()
  │        + renderRecent() + renderPlatformFilter() + renderCompare()
  ├─ 5) تسجيل sw.js (فقط في الإنتاج)
  └─ 6) ربط المستمعين (نقرات، hashchange، زر الرجوع/التقدم)
```

### 6.3 نظام التوجيه (Hash Routing) — لماذا يعمل Back/Forward

```
الرابط:  https://ali-mhd-ibrahim.github.io/SyrHub/
           │
           ├── #                ← الرئيسية (شبكة البطاقات)
           ├── #app/<id>        ← صفحة تفاصيل التطبيق
           └── #compare         ← نافذة المقارنة

نقرة على بطاقة:
  pushState('#app/sufra-food')      ← لا يعيد تحميل الصفحة
        │
        ▼
  حدث hashchange
        │
        ▼
  handleRoute()
        ├─ اسم موجود → openDetail(id) + إضافة "شوهد مؤخراً"
        ├─ 'compare'  → فتح المقارنة
        └─ غيره       → إغلاق النوافذ (الرئيسية)
```
> النتيجة: أزرار الرجوع/التقدم تعمل بين التطبيقات، والرابط قابل للمشاركة.
> **قيود SEO معروفة**: `#app/...` روابط تجزئة — محركات البحث تراها كصفحة واحدة،
> والحل الكامل (سابقاً محل نقاش) هو مسارات حقيقية `/app/<id>` عبر pushState.

### 6.4 دورة Service Worker

```
install ──► cache.addAll(CORE_ASSETS + التسجيل الذاتي skipWaiting())
  │
activate ─► حذف كل caches ما عدا syh-cache-v<رقم حالي> + clients.claim()
  │
fetch ─────────┬─ navigate (صفحة) ──► تحاول الشبكة → تخزن نسخة جديدة
               │                          │
               │                          ▼ لا شبكة
               │                     offline.html
               │
               └─ موارد ثابتة ──► cacheFirst(resource)
                                      │
                                      ▼ لا كاش
                                الشبكة → تخزين → إرجاع
                                      │
                                      ▼ لا شبكة
                                offline.html
```

**ماذا تحسّن عند النشر؟** عدّل `index.html` ⇒ ارفع `CACHE_NAME` إلى `v26`+ في `sw.js` (الآخر: `v25`).
الواجهة تسمع `controllerchange` وتعيد تحميل الصفحة تلقائياً. لا حاجة لإجبار الزائر.

### 6.5 أداة البناء — دورة البيانات

```
عدّل data/apps.json (أو categories/promotions/reviews)
        │
        ▼
node build/build.js
  └─ تحقق (ids/fcategories/platforms) + تنبيه example.com
        │
        ▼
   apps-data.js (CATEGORIES + APPS)
   promotions-data.js
   reviews-data.js
   sitemap.xml
        │
        ▼
   index.html يلتقطها عبر <script src="...">
```

### 6.6 خريطة مفاتيح localStorage

```
localStorage
 ├── syh-theme     = "dark" | "light"
 ├── syh-lang      = "ar" | "en"
 ├── syh-platform  = "all" | "android" | "ios" | "web"   (أيضاً "all")
 ├── syh-verified  = "1" | "0" | absent
 ├── syh-favorites = ["1","4",...]
 ├── syh-recent    = ["4","1",...]   ← أقصى 10
 ├── syh-compare   = ["1","2",...]   ← أقصى 4
 └── syh-fcm-token = "device_token..." ← رمز إشعارات Firebase (عند تفعيلها)
```

### 6.7 قائمة أحداث GA4 (المخصصة)

`search`, `sort_apps`, `filter_category`, `filter_platform`, `filter_verified`,
`select_content` (installs/official site), `write_review`, `favorite_add`,
`favorite_remove`, `compare_add`, `compare_remove`, `compare_clear`,
`compare_open`, `compare_close`, `promo_code_copy`, `promo_open`,
`app_back`, `recently_viewed_click`, `recommendation_click`, `bottom_nav`,
`apk_download`, `install_prompt`, `install_complete`, `install_guide_open`,
`clear_recent`, `contribute_open`, `contribute_pick`, `report_broken_link`,
`push_enabled`, `push_denied`.

---

### 6.8 تدفق إشعارات Firebase (FCM)

```
firebaseConfig (index.html → كائن FIREBASE) + VAPID key
        │
        ▼
زر "تفعيل الإشعارات" (#sheetNotify)
  └─ Notification.requestPermission()  ─── رفض → push_denied + رسالة توضيحية
        │ granted
        ▼
fcmInit() → getFCMToken() → تخزين syh-fcm-token + إظهار "نسخ رمز الجهاز" → push_enabled
        │
        ▼
الكونسول: Messaging → Send test message ← رمز الجهاز
        │
        ├─ التبويب مفتوح  → onMessage → Toast داخل الصفحة (.notify-toast)
        └─ التبويب مغلق   → sw.js onBackgroundMessage → إشعار النظام
                             → notificationclick → فتح/تركيز الموقع
```
> **الحماية الذاتية:** غياب أي قيمة في `FIREBASE` / `FIREBASE_CONFIG` يعطّل كل شيء تلقائياً
> (`FCM_ENABLED`)، ويظهر للزر نص "ضبط الإشعارات (يُنشئ Firebase)" دون أي خطأ.
> أحداث GA4 المرتبطة: `push_enabled` / `push_denied`.

---

## 7) قيود ومعايير التطوير (✨ مهم لأي نموذج ذكاء اصطناعي يعدّل الكود)

1. **ES5 فقط**: استخدم `var` والدوال التقليدية — **ممنوع** `let`/`const`/arrow/class/modules/spread (متوافق مع WebView أندرويد).
2. **الملفات المولّدة**: لا تعدّل `apps-data.js` / `promotions-data.js` / `reviews-data.js` / `sitemap.xml` يدوياً — عدّل `data/*.json` ثم `node build/build.js`.
3. **I18N**: أي نص ظاهر للمستخدم يجب أن يدخل جدولي `I18N.ar` و`I18N.en` ثم يستخدم عبر `T.<key>` أو `data-i18n="<key>"`. لا نص عربي مدمج في HTML مباشرة (إلا للاحتياط داخل `data-i18n`).
4. **RTL/LTR**: الصفحة `dir="rtl"` افتراضياً وتتجه تلقائياً عند اللغة؛ استخدم `inset-inline-start/end` في CSS المتعلق بالاتجاه إن أمكن.
5. **Dark/Light**: كل الألوان من متغيرات `:root`/`[data-theme="dark"]` — لا تثبّت ألواناً صلبة جديدة إلا بإذن.
6. **أحداث GA4**: أي تفاعل جديد مهم أرسل حدثاً باسم واضح عبر الدالة الموجودة `gtag('event', ...)`.
7. **التوافق**: الاختبار النهائي عبر فحص صيغة (يقبله معالج JSON) + بيئة jsdom متاحة خارج المشروع.
8. **FCM جرّ وفعّل**: مفاتيح Firebase مدخلات فارغة افتراضياً — لا تعطِّل الموقع أبداً؛ كل تهيئة
   مشروطة بـ`FCM_ENABLED` (index.html) و`FIREBASE_CONFIG.apiKey` (sw.js)، واملأ القيم عندهما معاً.

---

## 8) سير عمل التطوير (Workflow) خطوة بخطوة

1. اختر المهمة (وظيفة جديدة / تعديل بيانات / إصلاح خلل).
2. حدد المجال:
   - **بيانات** → حرر `data/*.json` ثم اركض `node build/build.js`.
   - **واجهة/منطق** → حرر `index.html` (CSS في القسم المعني، JS في السكربتات).
   - **كاش/دون اتصال** → حرر `sw.js` + `offline.html` وارفع رقم الكاش مع كل تغيير في index/offline.
   - **هوية التطبيق** → `manifest.webmanifest`.
3. فحص الصيغة السريعة (أنظر القسم 9).
4. جرب يدوياً في المتصفح (أو عبر بيئة jsdom الآلية الخارجية).
5. انشر على GitHub Pages.

**إضافة تطبيق جديد (مثال كامل):**
```bash
# 1) أضف كائناً في data/apps.json بقيم صحيحة
# 2) أعد البناء
node build/build.js
# 3) راجع أنه ظهر في الشبكة والتفاصيل والـ sitemap
```
(تُرحّب الإضافات عبر Pull Request فقط إذا توافقت مع CONTRIBUTING.md.)

---

## 9) أوامر الفحص والتحقق

**فحص صيغة JS لكل السكربتات الداخلية (Node):**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');
const re=/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;let m,i=0,ok=true;
while((m=re.exec(h))!==null){i++;try{new Function(m[1]);}catch(e){ok=false;console.log('script',i,'ERR:',e.message);}}
console.log('index.html script count:',i,ok?'ALL OK':'FAIL');
['sw.js','apps-data.js','promotions-data.js','reviews-data.js','build/build.js'].forEach(f=>{try{new Function(fs.readFileSync(f,'utf8'));console.log(f,'OK');}catch(e){console.log(f,'ERR:',e.message);}});"
```

**إعادة توليد البيانات:** `node build/build.js`

**تشغيل محلي (اختياري):**
```bash
python3 -m http.server 8000     # ثم افتح http://localhost:8000
```

> بيئة فحص jsdom كاملة موجودة خارج المشروع في
> `C:\Users\ali\AppData\Local\Temp\opencode\jsdom-env` (للاستخدام التقني المتقدم).

---

## 10) النشر

1. ارفع كل الملفات إلى مستودع GitHub.
2. الإعدادات ← Pages ← Branch: `main` / ملف `/root`.
3. الرابط النهائي: `https://<اسم-المستخدم>.github.io/<اسم-المستودع>/`.
4. **APK**: تُصنع حزمة أندرويد تلفّ هذا الرابط داخل WebView؛ يُحدَّث `APK_LINK`
   في `index.html` عند توفّر ملف APK حقيقي.
5. **الكاش**: بعد كل نشر، تأكد من رفع `CACHE_NAME` في `sw.js` ليحصل الجميع على النسخة الجديدة.

---

## 11) مفاتيح وأشياء سهلة التفصيل (أماكن مرجعية سريعة)

- شارات APK/PWA: `#appBadges` داخل `<footer>` (`index.html` ~سطر 1580)؛
  CSS: `.app-badges` (صف دائماً: `flex-wrap:nowrap` + `.app-badge{flex:1 1 0}`).
- بطاقة تطبيق: `appCardHTML(app)` + CSS `.card / .card-actions / .card-extra`.
- بطاقة عرض: `promoCardHTML(promo)` + CSS `.promo-card / .promo-head / .promo-app / .promo-badge`.
- تفاصيل التطبيق: `detailView(app)` + قسم `#detailView`/`.detail-*`.
- ترويسة dict التحليلات: `dataLayer` و`gtag` في الكود.
- سطر المطوّر: `<p class="footer-credit">` + مفتاح `footerDeveloper` في `I18N.*`.
- إشعارات Firebase: كائن `FIREBASE` (index.html ~سطر 2156) + `FIREBASE_CONFIG` (sw.js) + زر
  `#sheetNotify` و`#sheetNotifyCopy` في ورقة "المزيد" + دالة `toggleNotifications()` + توست
  `.notify-toast` + سكربتا CDN بـ`defer` في نهاية `</body>`. الحالة الخاملة تعرض
  "ضبط الإشعارات (يُنشئ Firebase)" تلقائياً.

---

*الملف يُحدَّث مع كل تغيير معماري جوهري. أي التباس راجعه مقابل `README.md` و`CONTRIBUTING.md` وكود `index.html` و`build/build.js`.*