export type ElementGuidance = {
  supports: [string, string, string];
  tone: "blue" | "violet" | "mint" | "amber" | "rose" | "sky";
  icon:
    | "briefcase"
    | "users"
    | "heart"
    | "idea"
    | "chart"
    | "calendar"
    | "monitor"
    | "leaf"
    | "classroom"
    | "analytics"
    | "checklist";
  sourcePage: number;
};

export const ELEMENT_GUIDANCE: Record<string, ElementGuidance> = {
  "teacher-duty-performance": {
    supports: [
      "تطبيق الأنظمة وقواعد السلوك الوظيفي وأخلاقيات بيئة التعلم",
      "تعزيز الانتماء والولاء للوطن والقيم الوطنية",
      "حماية المعلومات المهنية والامتثال للأنظمة والسياسات والإجراءات",
    ],
    tone: "sky",
    icon: "briefcase",
    sourcePage: 15,
  },
  "professional-community-engagement": {
    supports: [
      "التعلم المستمر من خلال التطوير المهني والورش والدورات والمؤتمرات",
      "التعاون والتواصل وتبادل الأفكار ومواجهة التحديات التعليمية",
      "الإسهام في التطوير والإرشاد والتوجيه ومشاركة الخبرات",
    ],
    tone: "violet",
    icon: "users",
    sourcePage: 15,
  },
  "parent-engagement": {
    supports: [
      "تفعيل قنوات اتصال فعالة لمناقشة تقدم الطلبة والتحديات",
      "تشجيع أولياء الأمور على المشاركة في العملية التعليمية",
      "إيجاد حلول مشتركة والتواصل الإيجابي المستمر لمعالجة المخاوف",
    ],
    tone: "mint",
    icon: "heart",
    sourcePage: 15,
  },
  "teaching-strategies-variety": {
    supports: [
      "استخدام إستراتيجيات تدريس مناسبة للموقف التعليمي",
      "اختيار إستراتيجيات تراعي حاجات وميول المتعلمين",
      "تنمية التفكير والإبداع ومهارات الحوار والمناقشة",
    ],
    tone: "amber",
    icon: "idea",
    sourcePage: 16,
  },
  "learner-results-improvement": {
    supports: [
      "تحديد أهداف ومعايير واضحة لما يتوقع من المتعلمين تحقيقه",
      "تقديم إفادة سريعة ومحددة واقتراحات بناءة للتحسين",
      "تكييف الإفادة وفق الاحتياجات الفردية واستخدام التكنولوجيا",
    ],
    tone: "rose",
    icon: "chart",
    sourcePage: 16,
  },
  "learning-plan": {
    supports: [
      "إعداد خطة تعلم تتواءم مع تشخيص واقع المتعلمين",
      "تحقيق الأهداف التعليمية وعناصر المواد المسندة",
      "التخطيط للأنشطة الصفية وغير الصفية وفق خصائص المرحلة العمرية",
    ],
    tone: "blue",
    icon: "calendar",
    sourcePage: 16,
  },
  "learning-technology": {
    supports: [
      "تنويع تقنيات ووسائل التعلم لتحقيق الأهداف التعليمية بفاعلية",
      "مراعاة الفروق الفردية بين المتعلمين",
      "اختيار التقنيات والوسائل المناسبة لحاجات وأنماط المتعلمين",
    ],
    tone: "sky",
    icon: "monitor",
    sourcePage: 16,
  },
  "learning-environment": {
    supports: [
      "توفير بيئة تعليمية آمنة تشجع على التعلم والنمو الأكاديمي",
      "تحقيق الأمان النفسي والاحترام المتبادل",
      "تمكين المتعلمين من التعبير والمشاركة وإثارة الدافعية",
    ],
    tone: "mint",
    icon: "leaf",
    sourcePage: 17,
  },
  "classroom-management": {
    supports: [
      "مراعاة الفروق الفردية بين المتعلمين",
      "توجيه المتعلمين لتطبيق القوانين والتعليمات الصفية",
      "تعزيز الانضباط وتنظيم التفاعل والتواصل داخل الصف",
    ],
    tone: "violet",
    icon: "classroom",
    sourcePage: 17,
  },
  "learner-results-analysis": {
    supports: [
      "تنويع مصادر التقييم لضمان شمولية النتائج وتقليل التحيز",
      "تفسير البيانات لاتخاذ قرارات مستنيرة بشأن التدريس والتعلم",
      "تحليل الأداء العام لتحديد نقاط القوة والضعف ودعم التطور المستمر",
    ],
    tone: "mint",
    icon: "analytics",
    sourcePage: 17,
  },
  "assessment-methods-variety": {
    supports: [
      "استخدام مصادر وأساليب وأدوات تقويم متنوعة",
      "توظيف التقويم القبلي والتكويني والختامي والمهمات الأدائية",
      "الاستفادة من نتائج التقويم في تحسين مستوى الأداء باستمرار",
    ],
    tone: "blue",
    icon: "checklist",
    sourcePage: 18,
  },
};
