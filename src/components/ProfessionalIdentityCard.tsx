import type { ProfessionalProfile } from "@/types/athari";
import { Glyph } from "@/components/athari-ui/Ui";

function hasProfile(profile?: ProfessionalProfile | null) {
  if (!profile) return false;
  return Boolean(
    profile.fullName ||
      profile.specialization ||
      profile.professionalRank ||
      profile.school ||
      profile.bio
  );
}

export function ProfessionalIdentityCard({
  profile,
  fallbackName = "",
  compact = false,
}: {
  profile?: ProfessionalProfile | null;
  fallbackName?: string;
  compact?: boolean;
}) {
  if (!profile && !fallbackName) return null;
  const current = profile ?? {
    fullName: fallbackName,
    specialization: "",
    qualification: "",
    university: "",
    employer: "",
    school: "",
    educationDepartment: "",
    professionalRank: "",
    experience: "",
    professionalLicense: "",
    bio: "",
    achievements: [],
    developmentGoals: [],
  };
  const name = current.fullName || fallbackName;
  const details = [
    current.specialization && { label: "التخصص", value: current.specialization },
    current.qualification && { label: "المؤهل", value: current.qualification },
    current.university && { label: "جهة التخرج", value: current.university },
    current.professionalRank && { label: "الرتبة المهنية", value: current.professionalRank },
    current.experience && { label: "الخبرة", value: current.experience },
    current.professionalLicense && { label: "الرخصة المهنية", value: current.professionalLicense },
    current.employer && { label: "جهة العمل", value: current.employer },
    current.school && { label: "المدرسة", value: current.school },
    current.educationDepartment && { label: "الإدارة التعليمية", value: current.educationDepartment },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (!hasProfile(profile) && fallbackName) {
    return (
      <section className="ath-panel">
        <div className="ath-ph">
          <span className="sq blue"><Glyph name="user" size={22} /></span>
          <div><h2>الهوية المهنية</h2><p className="sub">{fallbackName}</p></div>
        </div>
      </section>
    );
  }

  return (
    <section className="ath-panel ath-professional-identity">
      <div className="ath-ph">
        <span className="sq blue"><Glyph name="user" size={22} /></span>
        <div style={{ flex: 1 }}>
          <h2>{name || "الهوية المهنية"}</h2>
          <p className="sub">
            {[current.professionalRank, current.specialization].filter(Boolean).join(" · ") || "الهوية المهنية"}
          </p>
        </div>
      </div>

      {current.bio ? (
        <div className="ath-quote" style={{ marginBottom: 14 }}>
          <span className="qm" aria-hidden>”</span>{current.bio}
        </div>
      ) : null}

      {details.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
          }}
        >
          {details.map((item) => (
            <div key={item.label} style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(62,107,190,.06)" }}>
              <small style={{ display: "block", opacity: .66, marginBottom: 3 }}>{item.label}</small>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
