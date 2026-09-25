# أثري | Athari

منصة ذكية تساعد المعلمة على بناء ملف الأداء المهني من الشواهد الفعلية التي ترفعها بنفسها.

## الفكرة الأساسية

المعلمة ترفع الشاهد الأصلي، ثم يقوم النظام بـ:
1. قراءة محتوى الشاهد.
2. اقتراح عنصر الأداء المناسب.
3. اقتراح عنوان مهني ووصف مختصر.
4. استخراج أثر مدعوم بالشاهد فقط.
5. طرح سؤال مختصر إذا كانت معلومة أساسية ناقصة.
6. عرض معاينة للمعلمة.
7. الإضافة إلى ملفها فقط بعد الاعتماد.

## مبدأ غير قابل للتفاوض

لا يختلق النظام إنجازًا أو أثرًا أو نتيجة غير موجودة في الشاهد أو لم تؤكدها المعلمة.

## القرار المعماري V1

- Frontend + secure server routes: Next.js + TypeScript.
- Cloud build/deploy: Firebase App Hosting connected directly to GitHub `main`.
- Authentication: Firebase Authentication.
- Database: Cloud Firestore.
- Evidence files: Cloud Storage for Firebase.
- AI: server-side provider adapter only; secrets in managed cloud secrets.
- GitHub Actions: يطبق `Athari-updates.zip` فقط، ولا يبني أو ينشر التطبيق.

راجع:
- `docs/ARCHITECTURE_V1.md`
- `docs/UI_V1.md`
- `docs/SECURITY.md`

## نظام التحديثات

كل تحديث يدوي من الجوال يأتي باسم ثابت:

`Athari-updates.zip`

ويرفع إلى جذر المستودع. GitHub Actions يتحقق منه ويفك الملفات ويحفظها في `main`. بعد ربط Firebase App Hosting بفرع `main`، تتولى Firebase البناء والنشر سحابيًا عند وصول commit جديد.
