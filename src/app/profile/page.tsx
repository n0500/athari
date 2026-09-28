"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AthShell, Glyph, Notice, Panel } from "@/components/athari-ui/Ui";
import { ProfessionalIdentityCard } from "@/components/ProfessionalIdentityCard";
import { ProfessionalDocumentsPanel } from "@/components/ProfessionalDocumentsPanel";
import { requireAuth } from "@/lib/firebase";
import {
  EMPTY_PROFESSIONAL_PROFILE,
  getProfessionalProfile,
  saveProfessionalProfile,
} from "@/lib/professionalProfile";
import { listUserEvidence } from "@/lib/firestore";
import type { EvidenceRecord, ProfessionalProfile } from "@/types/athari";

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

const SUGGESTED_VISION =
  "تعليم ملهم عالي الجودة، يبني متعلما واثقا بقدراته، معتزا بقيمه وهويته الوطنية، ومتمكنا من المعرفة والمهارات اللازمة للمستقبل.";
const SUGGESTED_MISSION =
  "أقدم تعليما نوعيا يراعي الفروق الفردية ويجعل المتعلم محور العملية التعليمية، وأوظف الممارسات التربوية والتقنيات المناسبة لتحقيق تعلم ذي أثر، مع تطوير مهني مستمر وشراكة فاعلة مع الأسرة والمجتمع التعليمي.";

const GOAL_OPTIONS = [
  "تعزيز التنوع في استراتيجيات التدريس بما يلائم حاجات المتعلمين.",
  "تطوير توظيف التقنيات والذكاء الاصطناعي في العملية التعليمية.",
  "تعميق تحليل نتائج المتعلمين والاستفادة من البيانات في تحسين التدريس.",
  "تطوير أساليب وأدوات التقويم والتغذية الراجعة.",
  "تعزيز الخطط العلاجية والإثرائية ومتابعة أثرها على تعلم الطالب.",
  "توسيع المشاركة في مجتمعات التعلم المهنية وتبادل الخبرات.",
  "تعزيز التواصل والشراكة مع أولياء الأمور.",
  "تطوير بيئة تعليمية آمنة ومحفزة وداعمة للتعلم.",
  "تعزيز الإدارة الصفية والانضباط الإيجابي.",
  "تطوير التخطيط للتعلم وربط الأنشطة بالأهداف التعليمية.",
];

export default function ProfessionalProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfile>({ ...EMPTY_PROFESSIONAL_PROFILE });
  const [achievementsText, setAchievementsText] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [approvedEvidence, setApprovedEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), async (nextUser) => {
      if (!nextUser) {
        router.replace("/login");
        return;
      }
      setUser(nextUser);
      try {
        const [saved, evidence] = await Promise.all([
          getProfessionalProfile(nextUser.uid),
          listUserEvidence(nextUser.uid),
        ]);
        const next = {
          ...saved,
          fullName: saved.fullName || nextUser.displayName?.trim() || "",
        };
        setProfile(next);
        setAchievementsText(next.achievements.join("\n"));
        setGoalsText(next.developmentGoals.join("\n"));
        setApprovedEvidence(evidence.filter((item) => item.status === "approved"));
      } catch {
        setIsError(true);
        setMessage("تعذر تحميل الهوية المهنية الآن.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const achievementSuggestions = useMemo(
    () =>
      unique(
        approvedEvidence.map(
          (item) => item.approvedContent?.title || item.originalFileName
        )
      ).slice(0, 20),
    [approvedEvidence]
  );

  const preview = useMemo(
    () => ({
      ...profile,
      achievements: lines(achievementsText),
      developmentGoals: lines(goalsText),
    }),
    [profile, achievementsText, goalsText]
  );

  const chosenAchievements = useMemo(() => new Set(lines(achievementsText)), [achievementsText]);
  const chosenGoals = useMemo(() => new Set(lines(goalsText)), [goalsText]);

  function field<K extends keyof ProfessionalProfile>(key: K, value: ProfessionalProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setMessage("");
    setIsError(false);
  }

  function toggleLine(currentText: string, setText: (value: string) => void, value: string) {
    const current = lines(currentText);
    const exists = current.includes(value);
    const next = exists ? current.filter((item) => item !== value) : [...current, value];
    setText(next.join("\n"));
    setMessage("");
    setIsError(false);
  }

  function fillAchievementsFromEvidence() {
    if (!achievementSuggestions.length) {
      setMessage("لا توجد شواهد معتمدة يمكن الاقتراح منها حتى الآن.");
      setIsError(false);
      return;
    }
    const next = unique([...lines(achievementsText), ...achievementSuggestions]).slice(0, 5);
    setAchievementsText(next.join("\n"));
    setMessage("أضيفت اقتراحات من شواهدك المعتمدة. يمكنك تعديلها أو حذفها قبل الحفظ.");
    setIsError(false);
  }

  async function save() {
    if (!user) return;
    try {
      setSaving(true);
      setMessage("");
      setIsError(false);
      const saved = await saveProfessionalProfile(user.uid, preview);
      setProfile(saved);
      setAchievementsText(saved.achievements.join("\n"));
      setGoalsText(saved.developmentGoals.join("\n"));
      setMessage("تم حفظ الهوية المهنية.");
    } catch {
      setIsError(true);
      setMessage("تعذر حفظ الهوية المهنية الآن. حاولي مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AthShell
      title="الهوية المهنية"
      subtitle="بيانات مهنية مختصرة تظهر في ملف الأداء والمشاركة."
      back={{ href: "/account" }}
    >
      {loading ? <Notice><span className="ath-busy" />جاري تحميل البيانات…</Notice> : null}

      {!loading ? (
        <>
          <ProfessionalIdentityCard profile={preview} fallbackName={user?.displayName?.trim() || ""} showName />

          <Panel
            icon={<Glyph name="user" size={22} />}
            title="البيانات المهنية"
            sub="لا يطلب أثري رقم الجوال أو أي بيانات شخصية غير لازمة."
          >
            <div className="ath-stack">
              <div className="ath-field"><label>الاسم الكامل</label><input value={profile.fullName} onChange={(e) => field("fullName", e.target.value)} /></div>
              <div className="ath-field"><label>التخصص</label><input value={profile.specialization} onChange={(e) => field("specialization", e.target.value)} /></div>
              <div className="ath-field"><label>المؤهل العلمي</label><input value={profile.qualification} onChange={(e) => field("qualification", e.target.value)} /></div>
              <div className="ath-field"><label>جهة التخرج</label><input value={profile.university} onChange={(e) => field("university", e.target.value)} /></div>
              <div className="ath-field"><label>جهة العمل</label><input value={profile.employer} onChange={(e) => field("employer", e.target.value)} placeholder="وزارة التعليم" /></div>
              <div className="ath-field"><label>الإدارة التعليمية</label><input value={profile.educationDepartment} onChange={(e) => field("educationDepartment", e.target.value)} placeholder="مثال: إدارة التعليم بمنطقة القصيم" /></div>
              <div className="ath-field"><label>اسم المدرسة كاملًا</label><input value={profile.school} onChange={(e) => field("school", e.target.value)} placeholder="كما يُكتب في الخطابات الرسمية" /></div>
              <div className="ath-field"><label>اسم مديرة المدرسة</label><input value={profile.principalName ?? ""} onChange={(e) => field("principalName", e.target.value)} placeholder="يظهر أسفل تقارير الشواهد" /></div>
              <div className="ath-field"><label>الرتبة المهنية</label><input value={profile.professionalRank} onChange={(e) => field("professionalRank", e.target.value)} /></div>
              <div className="ath-field"><label>سنوات الخبرة</label><input value={profile.experience} onChange={(e) => field("experience", e.target.value)} placeholder="مثال: أكثر من 14 عامًا" /></div>
              <div className="ath-field"><label>الرخصة المهنية</label><input value={profile.professionalLicense} onChange={(e) => field("professionalLicense", e.target.value)} /></div>
            </div>
          </Panel>

          <Panel icon={<Glyph name="docOutline" size={22} />} title="النبذة المهنية" sub="تظهر للمديرة بصورة مختصرة.">
            <div className="ath-field">
              <textarea
                value={profile.bio}
                onChange={(e) => field("bio", e.target.value)}
                maxLength={500}
                placeholder="نبذة موجزة عن خبرتك واهتماماتك المهنية."
                style={{ minHeight: 120 }}
              />
              <small className="ath-fine">{profile.bio.length}/500</small>
            </div>
          </Panel>

          <Panel icon={<Glyph name="eye" size={22} />} title="الرؤية والرسالة" sub="رؤيتك ورسالتك التعليمية، وتظهر للمديرة بعد النبذة.">
            {!profile.vision && !profile.mission ? (
              <div className="ath-actions" style={{ marginBottom: 10 }}>
                <button
                  type="button"
                  className="ath-btn outline fit"
                  onClick={() => {
                    field("vision", SUGGESTED_VISION);
                    field("mission", SUGGESTED_MISSION);
                  }}
                >
                  <Glyph name="sparkle" size={17} /> إدراج صيغة مقترحة
                </button>
              </div>
            ) : null}
            <div className="ath-field">
              <label htmlFor="pf-vision">رؤيتي</label>
              <textarea id="pf-vision" value={profile.vision ?? ""} onChange={(e) => field("vision", e.target.value)} maxLength={300} rows={3} placeholder="ما الذي تطمحين إلى تحقيقه في التعليم؟ جملة واحدة موجزة." />
              <small className="ath-fine">{(profile.vision ?? "").length}/300</small>
            </div>
            <div className="ath-field">
              <label htmlFor="pf-mission">رسالتي</label>
              <textarea id="pf-mission" value={profile.mission ?? ""} onChange={(e) => field("mission", e.target.value)} maxLength={700} rows={5} placeholder="كيف تحققين رؤيتك؟ الممارسات والقيم التي تلتزمين بها." />
              <small className="ath-fine">{(profile.mission ?? "").length}/700</small>
            </div>
          </Panel>

          <Panel icon={<Glyph name="sparkle" size={22} />} title="أبرز المنجزات المهنية" sub="اختاري من شواهدك أو أضيفيها يدويًا.">
            <div className="ath-actions" style={{ marginBottom: 10 }}>
              <button type="button" className="ath-btn outline fit" onClick={fillAchievementsFromEvidence}>
                <Glyph name="sparkle" size={17} /> تعبئة من الشواهد المعتمدة
              </button>
            </div>

            {achievementSuggestions.length ? (
              <div className="ath-stack" style={{ marginBottom: 12 }}>
                {achievementSuggestions.map((item) => {
                  const selected = chosenAchievements.has(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      className={`ath-choice ${selected ? "sel" : ""}`}
                      onClick={() => toggleLine(achievementsText, setAchievementsText, item)}
                      aria-pressed={selected}
                      style={{ textAlign: "right", width: "100%" }}
                    >
                      <span className="main" style={{ width: "100%" }}>
                        <span className="tx"><strong>{item}</strong></span>
                        <Glyph name={selected ? "check" : "empty"} size={22} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="ath-fine">عند اعتماد الشواهد ستظهر هنا اقتراحات جاهزة للاختيار.</p>
            )}

            <div className="ath-field">
              <label>المنجزات المختارة</label>
              <textarea value={achievementsText} onChange={(e) => setAchievementsText(e.target.value)} placeholder="يمكنك أيضًا كتابة منجز واحد في كل سطر" />
            </div>
          </Panel>

          <Panel icon={<Glyph name="chart" size={22} />} title="أهداف التطوير المهني" sub="قائمة مقترحة · اختاري ما يناسب خطتك المهنية.">
            <div className="ath-stack" style={{ marginBottom: 12 }}>
              {GOAL_OPTIONS.map((goal) => {
                const selected = chosenGoals.has(goal);
                return (
                  <button
                    type="button"
                    key={goal}
                    className={`ath-choice ${selected ? "sel" : ""}`}
                    onClick={() => toggleLine(goalsText, setGoalsText, goal)}
                    aria-pressed={selected}
                    style={{ textAlign: "right", width: "100%" }}
                  >
                    <span className="main" style={{ width: "100%" }}>
                      <span className="tx"><strong>{goal}</strong></span>
                      <Glyph name={selected ? "check" : "empty"} size={22} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="ath-field">
              <label>الأهداف المختارة</label>
              <textarea value={goalsText} onChange={(e) => setGoalsText(e.target.value)} placeholder="يمكنك أيضًا كتابة هدف آخر في سطر مستقل" />
            </div>
          </Panel>

          {message ? <Notice tone={isError ? "error" : "info"}>{message}</Notice> : null}

          <button type="button" className="ath-btn primary block" onClick={save} disabled={saving}>
            <Glyph name="check" /> {saving ? "جاري الحفظ…" : "حفظ الهوية المهنية"}
          </button>

          {user ? <ProfessionalDocumentsPanel uid={user.uid} /> : null}
        </>
      ) : null}
    </AthShell>
  );
}
