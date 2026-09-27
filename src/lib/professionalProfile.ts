import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import type { ProfessionalProfile } from "@/types/athari";

export const EMPTY_PROFESSIONAL_PROFILE: ProfessionalProfile = {
  fullName: "",
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

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asTextList(value: unknown) {
  return Array.isArray(value)
    ? value.map(asText).filter(Boolean).slice(0, 20)
    : [];
}

export function normalizeProfessionalProfile(value: unknown): ProfessionalProfile {
  if (!value || typeof value !== "object") return { ...EMPTY_PROFESSIONAL_PROFILE };
  const raw = value as Record<string, unknown>;
  return {
    fullName: asText(raw.fullName),
    specialization: asText(raw.specialization),
    qualification: asText(raw.qualification),
    university: asText(raw.university),
    employer: asText(raw.employer),
    school: asText(raw.school),
    educationDepartment: asText(raw.educationDepartment),
    professionalRank: asText(raw.professionalRank),
    experience: asText(raw.experience),
    professionalLicense: asText(raw.professionalLicense),
    bio: asText(raw.bio),
    achievements: asTextList(raw.achievements),
    developmentGoals: asTextList(raw.developmentGoals),
  };
}

export async function getProfessionalProfile(uid: string) {
  const snap = await getDoc(doc(requireDb(), "users", uid));
  if (!snap.exists()) return { ...EMPTY_PROFESSIONAL_PROFILE };
  return normalizeProfessionalProfile(snap.data().professionalProfile);
}

export async function saveProfessionalProfile(
  uid: string,
  profile: ProfessionalProfile
) {
  const normalized = normalizeProfessionalProfile(profile);
  await setDoc(
    doc(requireDb(), "users", uid),
    {
      professionalProfile: normalized,
      professionalProfileUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return normalized;
}
