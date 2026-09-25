# أثري | Athari

منصة عربية Mobile-first لتنظيم شواهد الأداء المهني للمعلمة، مع تحليل AI قائم على الشاهد نفسه وقرار نهائي للمعلمة.

## Zero Cost V2

- GitHub: الكود والتحديثات.
- Firebase Hosting (Spark): الواجهة.
- Firebase Authentication (Spark): دخول Google.
- Cloud Firestore (Spark): الفهرس والترتيب.
- Google Drive الخاص بالمعلمة: الشواهد الأصلية ونسخة احتياطية.
- Cloudflare Workers AI Free: التحليل.
- Cloudflare Markdown Conversion: قراءة PDF/Word/الصور.

لا Firebase Storage، لا Cloud Functions، لا App Hosting، ولا Blaze.

## مسار الشاهد

1. يحفظ الأصل في `أثري / السنة / 00 - قيد المراجعة` داخل Drive.
2. يمرر أثري نسخة مؤقتة إلى AI للتحليل.
3. تعرض الحقائق والاقتراحات للمعلمة.
4. لا يعتمد شيء قبل موافقتها.
5. بعد الاعتماد ينقل الملف إلى `أثري / السنة / عنصر الأداء`.
6. يحدث `athari-backup.json` داخل Drive.

## صلاحية Drive

يستخدم أثري scope:
`https://www.googleapis.com/auth/drive.file`

ولا يطلب وصولًا عامًا لكل ملفات Drive.
