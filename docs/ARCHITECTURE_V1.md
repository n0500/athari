# ARCHITECTURE V1 — أثري

## القرار

أثري سيبنى كتطبيق ويب سحابي Mobile-first باستخدام:

- **Next.js App Router + TypeScript** للواجهة ومسارات الخادم الآمنة.
- **Firebase App Hosting** للبناء والنشر التلقائي من GitHub.
- **Firebase Authentication** لتسجيل الدخول.
- **Cloud Firestore** لبيانات المستخدم وملف الأداء وحالات التحليل.
- **Cloud Storage for Firebase** للشواهد الأصلية.
- **AI Provider Adapter** داخل الخادم حتى لا يرتبط المنتج بمزود واحد.
- **Cloud Secret Manager / App Hosting secrets** لمفاتيح مزود الذكاء الاصطناعي.

## لماذا هذا الاختيار؟

1. يبقى التطوير والنشر Cloud-first ولا يعتمد على جهاز المستخدم.
2. Firebase App Hosting مرتبط مباشرة بـ GitHub ويبني التطبيق في Cloud Build.
3. Next.js يسمح بواجهة حديثة ومسارات Server-side في نفس المشروع، وهذا يقلل عدد الخدمات في MVP.
4. Firebase Auth + Firestore + Storage تكفي لبناء النسخة الأولى دون Backend منفصل كبير.
5. يمكن نقل تحليل الملفات لاحقًا إلى Cloud Run/Tasks إذا أصبحت المعالجة طويلة أو كثيفة.

## مسار الشاهد

1. المعلمة تسجل الدخول.
2. تنشئ Evidence record بحالة `uploading`.
3. ترفع الملف الأصلي إلى Storage في مسار خاص بالمستخدم.
4. تتحول الحالة إلى `uploaded`.
5. الواجهة تستدعي مسار خادم آمن لتحليل `evidenceId`.
6. الخادم:
   - يتحقق من جلسة المستخدم وملكية الشاهد.
   - يقرأ إطار الأداء الرسمي المفعّل.
   - يقرأ الملف من Storage.
   - يرسل أقل قدر لازم من المحتوى إلى مزود AI.
   - يحفظ الحقائق المستخرجة والاقتراحات منفصلة.
7. الحالة تصبح:
   - `needs_info` إذا نقصت معلومة جوهرية.
   - `ready_for_review` إذا اكتمل الاقتراح.
   - `analysis_failed` إذا فشلت المعالجة.
8. المعلمة تراجع وتعدل ثم تعتمد.
9. القيم المعتمدة تحفظ منفصلة عن مخرجات AI.

## نموذج البيانات

### users/{uid}
- displayName
- email
- role
- createdAt
- updatedAt

### frameworks/{frameworkId}
يمثل نسخة موثقة من إطار الأداء.
- name
- version
- sourceReference
- status

### frameworks/{frameworkId}/elements/{elementId}
- officialName
- description
- weight (nullable)
- order
- sourceReference

### portfolios/{portfolioId}
- ownerUid
- frameworkId
- academicYear
- status
- createdAt
- updatedAt

### evidence/{evidenceId}
- ownerUid
- portfolioId
- filePath
- originalFileName
- mimeType
- fileSize
- fileHash
- status
- extractedFacts
- aiSuggestions
- missingInformation
- approvedContent
- createdAt
- updatedAt
- approvedAt

### auditEvents/{eventId}
- ownerUid
- evidenceId
- action
- createdAt
- metadata

## حالات Evidence المقترحة

`draft`
`uploading`
`uploaded`
`analyzing`
`needs_info`
`ready_for_review`
`approved`
`analysis_failed`
`archived`

## AI contract

مخرجات التحليل يجب أن تكون structured JSON، وتشمل:
- extractedFacts
- suggestedClassifications[]
- draftTitle
- draftDescription
- draftImpact
- missingInformation[]
- warnings[]

كل حقل مقترح لا يعتبر حقيقة إلا إذا كان مبنيًا على الشاهد أو أكّدته المعلمة.

## الفصل بين الاقتراح والاعتماد

لا تستخدم حقولًا مثل `title` فقط.

استخدم:
- `aiSuggestions.title`
- `approvedContent.title`

ونفس المبدأ للوصف، الأثر، والتصنيف.

## الأمان

- Storage path مرتبط بـ `uid`.
- Firestore Rules تمنع قراءة أو تعديل سجل ليس للمستخدم.
- مسارات التحليل تتحقق من هوية Firebase server-side.
- ملفات الشواهد ليست Public.
- مفاتيح AI لا تصل للمتصفح.
- روابط المشاركة لاحقًا تكون قابلة للإلغاء ومحددة الصلاحية.

## التوسع لاحقًا

إذا تجاوز التحليل مدة الطلب المناسبة:
- ننقل المعالجة إلى Cloud Run job/worker أو Cloud Tasks.
- تبقى الواجهة ونموذج البيانات كما هما.
