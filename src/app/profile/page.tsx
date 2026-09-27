"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AthShell, Glyph, Notice, Panel } from "@/components/athari-ui/Ui";
import { ProfessionalIdentityCard } from "@/components/ProfessionalIdentityCard";
import { requireAuth } from "@/lib/firebase";
import {
  EMPTY_PROFESSIONAL_PROFILE,
  getProfessionalProfile,
  saveProfessionalProfile,
} from "@/lib/professionalProfile";
import type { ProfessionalProfile } from "@/types/athari";

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfessionalProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfile>({ ...EMPTY_PROFESSIONAL_PROFILE });
  const [achievementsText, setAchievementsText] = useState("");
  const [goalsText, setGoalsText] = useState("");
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
        const saved = await getProfessionalProfile(nextUser.uid);
        const next = {
          ...saved,
          fullName: saved.fullName || nextUser.displayName?.trim() || "",
        };
        setProfile(next);
        setAchievementsText(next.achievements.join("\n"));
        setGoalsText(next.developmentGoals.join("\n"));
      } catch {
        setIsError(true);
        setMessage("تعذر تحميل الهوية المهنية الآن.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const preview = useMemo(
    () => ({
      ...profile,
      achievements: lines(achievementsText),
      developmentGoals: lines(goalsText),
    }),
    [profile, achievementsText, goalsText]
  );

  function field<K extends keyof ProfessionalProfile>(key: K, value: ProfessionalProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setMessage("");
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
          <ProfessionalIdentityCard profile={preview} fallbackName={user?.displayName?.trim() || ""} />

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
              <div className="ath-field"><label>جهة العمل</label><input value={profile.employer} onChange={(e) => field("employer", e.target.value)} /></div>
              <div className="ath-field"><label>المدرسة</label><input value={profile.school} onChange={(e) => field("school", e.target.value)} /></div>
              <div className="ath-field"><label>الإدارة التعليمية</label><input value={profile.educationDepartment} onChange={(e) => field("educationDepartment", e.target.value)} /></div>
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

          <Panel icon={<Glyph name="sparkle" size={22} />} title="أبرز المنجزات والأهداف" sub="اختياري · سطر لكل بند">
            <div className="ath-field">
              <label>أبرز المنجزات المهنية</label>
              <textarea value={achievementsText} onChange={(e) => setAchievementsText(e.target.value)} placeholder="منجز واحد في كل سطر" />
            </div>
            <div className="ath-field">
              <label>أهداف التطوير المهني</label>
              <textarea value={goalsText} onChange={(e) => setGoalsText(e.target.value)} placeholder="هدف واحد في كل سطر" />
            </div>
          </Panel>

          {message ? <Notice tone={isError ? "error" : "info"}>{message}</Notice> : null}

          <button type="button" className="ath-btn primary block" onClick={save} disabled={saving}>
            <Glyph name="check" /> {saving ? "جاري الحفظ…" : "حفظ الهوية المهنية"}
          </button>
        </>
      ) : null}
    </AthShell>
  );
}
