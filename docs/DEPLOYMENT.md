# Athari deployment and update workflow

## المسار المعتمد للتحديثات

من الآن، التحديث اليدوي الرسمي للمشروع هو ملف واحد ثابت:

`updates/Athari-updates.zip`

الـWorkflow الموجود في:

`.github/workflows/deploy.yml`

يتولى دورة التحديث كاملة في **Workflow واحد**:

رفع ZIP → تحقق أمني → فك التحديث → فحوصات → Build → Firebase Deploy → حفظ الملفات المفكوكة في المستودع.

## لماذا هذا النظام؟

حتى يمكن تحديث أثري من الجوال بدون الحاجة لمعرفة مكان كل ملف داخل GitHub، وبدون إنشاء عدة Workflows لنفس التحديث.

## قواعد ملف التحديث

- اسم الملف ثابت: `Athari-updates.zip`.
- محتويات ZIP تبدأ من جذر المشروع مباشرة.
- لا يحتوي `.github/` أو `.git/`.
- لا يحتوي `.env` أو مفاتيح API أو Service Account.
- لا يحتوي بيانات خاصة بالمستخدمين أو الطالبات.

## Firebase variables المطلوبة عند بدء النشر

تُضاف لاحقًا كـ Repository Variables:

- `FIREBASE_PROJECT_ID`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`

المصادقة مصممة باستخدام Workload Identity Federation بدل رفع مفتاح Service Account طويل الأجل.

## ملاحظة Codex

عندما يعمل Codex مباشرة على المستودع، يمكنه تعديل الملفات الأصلية مباشرة. أما التحديثات التي تُسلّم للمستخدمة كملف جاهز من ChatGPT، فتعتمد صيغة `Athari-updates.zip`.
