export type MandatoryRequirement = {
  id: string;
  elementId: string;
  label: string;
  order: number;
};

export const MANDATORY_REQUIREMENTS: MandatoryRequirement[] = [
  { id: "duty-01", elementId: "teacher-duty-performance", order: 1, label: "الحفاظ على الدوام" },
  { id: "duty-02", elementId: "teacher-duty-performance", order: 2, label: "رفع الإجازات وفق النظام" },
  { id: "duty-03", elementId: "teacher-duty-performance", order: 3, label: "إشعار الإدارة بالغياب ونوعه بوقت كاف" },
  { id: "duty-04", elementId: "teacher-duty-performance", order: 4, label: "شغل حصص الانتظار وتفعيلها" },
  { id: "duty-05", elementId: "teacher-duty-performance", order: 5, label: "المشاركة في اللجان المدرسية وتفعيلها" },
  { id: "duty-06", elementId: "teacher-duty-performance", order: 6, label: "الالتزام بالمناوبة اليومية وفق الجدول المعد" },
  { id: "duty-07", elementId: "teacher-duty-performance", order: 7, label: "تفعيل حصص النشاط" },
  { id: "duty-08", elementId: "teacher-duty-performance", order: 8, label: "المشاركة في الأنشطة والمناسبات الوطنية" },
  { id: "duty-09", elementId: "teacher-duty-performance", order: 9, label: "التواصل الفعال مع الإدارة المدرسية" },
  { id: "duty-10", elementId: "teacher-duty-performance", order: 10, label: "تقديم مبادرة للمدرسة وتنفيذها على المنسوبين" },
  { id: "duty-11", elementId: "teacher-duty-performance", order: 11, label: "تفعيل الإذاعة الصباحية" },
  { id: "duty-12", elementId: "teacher-duty-performance", order: 12, label: "الالتزام بحضور الطابور الصباحي والمساهمة في تنظيمه" },
  { id: "duty-13", elementId: "teacher-duty-performance", order: 13, label: "الالتزام بزمن الحصة الدراسية" },
  { id: "duty-14", elementId: "teacher-duty-performance", order: 14, label: "الاطلاع والالتزام بالتعاميم واللوائح المنظمة والتوقيع عليها بالعلم" },
  { id: "duty-15", elementId: "teacher-duty-performance", order: 15, label: "الالتزام بالسلوك المهني" },
  { id: "duty-16", elementId: "teacher-duty-performance", order: 16, label: "مراعاة المرحلة العمرية للطالب" },
  { id: "duty-17", elementId: "teacher-duty-performance", order: 17, label: "اتباع الأساليب التربوية مع الطالب" },
  { id: "duty-18", elementId: "teacher-duty-performance", order: 18, label: "تفعيل منصة مدرستي" },

  { id: "community-01", elementId: "professional-community-engagement", order: 1, label: "تنفيذ البرامج التدريبية" },
  { id: "community-02", elementId: "professional-community-engagement", order: 2, label: "حضور البرامج التدريبية الداخلية والخارجية والفردية" },
  { id: "community-03", elementId: "professional-community-engagement", order: 3, label: "تنفيذ زيارات تبادلية" },
  { id: "community-04", elementId: "professional-community-engagement", order: 4, label: "حضور المؤتمرات" },
  { id: "community-05", elementId: "professional-community-engagement", order: 5, label: "حضور الزيارات التبادلية" },
  { id: "community-06", elementId: "professional-community-engagement", order: 6, label: "تفعيل دورها في مجتمعات التعلم المهنية" },
  { id: "community-07", elementId: "professional-community-engagement", order: 7, label: "تنفيذ الدروس التطبيقية والحلقات التنشيطية" },
  { id: "community-08", elementId: "professional-community-engagement", order: 8, label: "تقديم إنتاج معرفي / تجارب عملية / وسيلة تعليمية / تطوير مناهج / ساعات تطوع" },
  { id: "community-09", elementId: "professional-community-engagement", order: 9, label: "إصدار الرخصة المهنية" },

  { id: "parents-01", elementId: "parent-engagement", order: 1, label: "التواصل الفعال مع أولياء الأمور" },
  { id: "parents-02", elementId: "parent-engagement", order: 2, label: "إرسال تقارير مستويات الطالب" },
  { id: "parents-03", elementId: "parent-engagement", order: 3, label: "حضور اجتماعات أولياء الأمور" },
  { id: "parents-04", elementId: "parent-engagement", order: 4, label: "إرسال استمارات الاستدعاء عند الحاجة" },
  { id: "parents-05", elementId: "parent-engagement", order: 5, label: "مشاركة أولياء الأمور في العملية التعليمية" },
  { id: "parents-06", elementId: "parent-engagement", order: 6, label: "تفعيل سجل المتابعة لإطلاع ولي الأمر على مستوى الطالب" },

  { id: "strategies-01", elementId: "teaching-strategies-variety", order: 1, label: "دمج مهارات التفكير في التدريس" },
  { id: "strategies-02", elementId: "teaching-strategies-variety", order: 2, label: "تفعيل استراتيجيات تدريس مناسبة للموقف التعليمي وملائمة لميول الطالب واحتياجاتهم" },
  { id: "strategies-03", elementId: "teaching-strategies-variety", order: 3, label: "تفعيل استراتيجيات تنمي مهارات الفهم القرائي لدى الطالب وتدعم قدرتهم على الحوار والمناقشة" },
  { id: "strategies-04", elementId: "teaching-strategies-variety", order: 4, label: "ربط الدرس بالواقع والخبرات الحياتية" },

  { id: "results-01", elementId: "learner-results-improvement", order: 1, label: "تنفيذ الاختبارات التشخيصية" },
  { id: "results-02", elementId: "learner-results-improvement", order: 2, label: "تحديد المهارات المفقودة" },
  { id: "results-03", elementId: "learner-results-improvement", order: 3, label: "وضع خطة علاجية للمهارات المتدنية" },
  { id: "results-04", elementId: "learner-results-improvement", order: 4, label: "وضع خطة إثرائية للمهارات الجيدة" },
  { id: "results-05", elementId: "learner-results-improvement", order: 5, label: "متابعة ملفات إنجاز المتعلمين" },
  { id: "results-06", elementId: "learner-results-improvement", order: 6, label: "تصحيح الكتب الدراسية" },
  { id: "results-07", elementId: "learner-results-improvement", order: 7, label: "تحليل النتائج وإعداد التقارير" },
  { id: "results-08", elementId: "learner-results-improvement", order: 8, label: "التحفيز والتكريم وتعزيز ثقة الطالب بأنفسهن" },
  { id: "results-09", elementId: "learner-results-improvement", order: 9, label: "تحسين نتائج الطالب في الاختبارات الوطنية نافس والتحصيل" },

  { id: "plan-01", elementId: "learning-plan", order: 1, label: "تسليم توزيع المنهج في الوقت المحدد" },
  { id: "plan-02", elementId: "learning-plan", order: 2, label: "تسليم خطة التعلم الأسبوعية في الوقت المحدد" },
  { id: "plan-03", elementId: "learning-plan", order: 3, label: "تحضير الدروس في المنصة في الوقت المحدد" },
  { id: "plan-04", elementId: "learning-plan", order: 4, label: "تنفيذ الخطة العلاجية للمهارات المفقودة" },
  { id: "plan-05", elementId: "learning-plan", order: 5, label: "تنفيذ الخطة الإثرائية" },
  { id: "plan-06", elementId: "learning-plan", order: 6, label: "تنفذ خطة النشاط في الوقت المحدد" },

  { id: "technology-01", elementId: "learning-technology", order: 1, label: "تفعيل سجل مصادر التعلم" },
  { id: "technology-02", elementId: "learning-technology", order: 2, label: "استخدام وسائل وتقنيات مناسبة لحاجات وأنماط المتعلمين وتراعي الفروق الفردية" },
  { id: "technology-03", elementId: "learning-technology", order: 3, label: "تنمية قدرة الطالب على التأمل والملاحظة والتفكير العلمي" },
  { id: "technology-04", elementId: "learning-technology", order: 4, label: "تفعيل تطبيقات وبرامج الذكاء الاصطناعي في الحصة الدراسية" },
  { id: "technology-05", elementId: "learning-technology", order: 5, label: "تفعيل قنوات عين" },
  { id: "technology-06", elementId: "learning-technology", order: 6, label: "تفعيل الأنشطة والواجبات والاختبارات والإثرائيات في منصة مدرستي" },

  { id: "environment-01", elementId: "learning-environment", order: 1, label: "توفير بيئة تعليمية آمنة خالية من الأخطار" },
  { id: "environment-02", elementId: "learning-environment", order: 2, label: "توفير بيئة تعليمية تحقق الأمان النفسي والاحترام المتبادل" },
  { id: "environment-03", elementId: "learning-environment", order: 3, label: "إتاحة الفرصة للطالب للتعبير عن أنفسهن ومشاركة أفكارهم مع أقرانهم" },
  { id: "environment-04", elementId: "learning-environment", order: 4, label: "إثارة دافعية الطالب داخل الفصل من خلال التنويع في أساليب التعلم" },

  { id: "classroom-01", elementId: "classroom-management", order: 1, label: "عرض القوانين الصفية للطالب في الحصة الدراسية" },
  { id: "classroom-02", elementId: "classroom-management", order: 2, label: "توجيه الطالب لتطبيق القوانين الصفية في الحصة الدراسية" },
  { id: "classroom-03", elementId: "classroom-management", order: 3, label: "تعزيز الانضباط" },
  { id: "classroom-04", elementId: "classroom-management", order: 4, label: "تنوع نبرات الصوت بما يتوافق مع الموقف التعليمي" },
  { id: "classroom-05", elementId: "classroom-management", order: 5, label: "تنظيم الطالب داخل الفصل بما يتناسب مع الموقف الدراسي" },

  { id: "analysis-01", elementId: "learner-results-analysis", order: 1, label: "تحليل نتائج التقييم وإعداد التقارير بشأن فعالية التدريس" },
  { id: "analysis-02", elementId: "learner-results-analysis", order: 2, label: "تحديد نقاط القوة والضعف" },
  { id: "analysis-03", elementId: "learner-results-analysis", order: 3, label: "إشراك الطالب في نتائجهم ومدى تقدمهم لدعم تطورهم" },

  { id: "assessment-01", elementId: "assessment-methods-variety", order: 1, label: "تنوع مصادر التقويم: ملاحظة صفية أو استبانات أو تقارير ذاتية أو تحليل نتائج" },
  { id: "assessment-02", elementId: "assessment-methods-variety", order: 2, label: "تنوع أساليب التقويم: اختبارات شفهية أو تحريرية أو مهام أدائية" },
  { id: "assessment-03", elementId: "assessment-methods-variety", order: 3, label: "تقديم التغذية الراجعة لتقويم الطالب" },
  { id: "assessment-04", elementId: "assessment-methods-variety", order: 4, label: "تطبيق التقويم التكويني والبنائي لتطوير أداء الطالب" },
  { id: "assessment-05", elementId: "assessment-methods-variety", order: 5, label: "تطبيق التقويم الختامي وقياس تقدم التعلم وإصدار الحكم على مستوى الطالب" },
  { id: "assessment-06", elementId: "assessment-methods-variety", order: 6, label: "بناء الاختبارات الفصلية والنهائية وفق معايير الاختبار الجيد" },
];

export const MANDATORY_REQUIREMENT_COUNT = MANDATORY_REQUIREMENTS.length;

export function requirementsForElement(elementId: string) {
  return MANDATORY_REQUIREMENTS.filter((item) => item.elementId === elementId).sort(
    (a, b) => a.order - b.order
  );
}

export function requirementById(id: string) {
  return MANDATORY_REQUIREMENTS.find((item) => item.id === id);
}
