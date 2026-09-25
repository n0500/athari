# CLOUD ARCHITECTURE

## القرار المعتمد V1

- GitHub هو مصدر الكود.
- GitHub Actions يطبق `Athari-updates.zip` فقط.
- Firebase App Hosting يرتبط بفرع `main` ويتولى Cloud Build + rollout.
- Next.js + TypeScript هو تطبيق الويب.
- Firebase Authentication للدخول.
- Cloud Firestore للبيانات.
- Cloud Storage للشواهد.
- Server-side AI adapter داخل التطبيق.
- الأسرار في بيئة Firebase/Google Cloud المدارة، لا في GitHub ولا المتصفح.

## لا يوجد اعتماد محلي

المستخدمة لا تحتاج:
- لابتوب.
- Terminal محلي.
- Node محلي.
- Firebase CLI محلي.

قد تستخدم منصة الاستضافة Runtime مبنيًا على Node داخل السحابة، لكن ذلك جزء من البنية المدارة ولا يحتاج تشغيلًا على جهاز المستخدمة.
