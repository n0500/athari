"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { PortfolioPresentation } from "@/components/PortfolioPresentation";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { getActivePortfolioShare } from "@/lib/portfolioShare";
import { getProfessionalProfile } from "@/lib/professionalProfile";
import { getProfessionalDocuments, orderedDocuments } from "@/lib/professionalDocuments";
import { shareEvidenceFor } from "@/lib/shareRefresh";
import type { PortfolioShare } from "@/lib/portfolioShare";

/** Preview is read-only: it never creates a public link or changes file permissions. */
export function PrincipalPortfolioPreview() {
  const router = useRouter();
  const [share, setShare] = useState<PortfolioShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [privatePreview, setPrivatePreview] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!firebaseConfigured) {
      setError("تعذر تحميل المعاينة الآن.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let request = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const startTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (cancelled) return;
        ++request;
        setError("تعذر تحميل المعاينة. تحققي من الاتصال ثم أعيدي المحاولة.");
        setLoading(false);
      }, 15_000);
    };
    startTimeout();
    const unsubscribe = onAuthStateChanged(requireAuth(), async (user) => {
      const currentRequest = ++request;
      const isCurrent = () => !cancelled && request === currentRequest;
      startTimeout();
      setShare(null);
      setPrivatePreview(false);
      setLoading(true);
      setError("");
      if (!user) {
        clearTimeout(timeout);
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        // When sharing is active, show the very same saved copy the principal sees.
        const activeShare = await getActivePortfolioShare(user.uid);
        if (!isCurrent()) return;
        if (activeShare) {
          setShare(activeShare);
          return;
        }

        // A teacher can also preview before enabling sharing, without publishing anything.
        const [all, profile, documents] = await Promise.all([
          listUserEvidence(user.uid),
          getProfessionalProfile(user.uid),
          getProfessionalDocuments(user.uid),
        ]);
        if (!isCurrent()) return;
        setShare({
          id: "private-preview",
          ownerUid: user.uid,
          ownerDisplayName: user.displayName?.trim() || "",
          academicYear: process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ",
          active: false,
          evidence: shareEvidenceFor(all.filter((item) => item.status === "approved")),
          drivePermissions: [],
          professionalProfile: profile ?? undefined,
          documents: orderedDocuments(documents).map((entry) => ({
            kind: entry.kind,
            label: entry.label,
            originalFileName: entry.originalFileName,
            mimeType: entry.mimeType,
            driveFileId: entry.driveFileId,
          })),
        });
        setPrivatePreview(true);
      } catch {
        if (isCurrent()) setError("تعذر تحميل المعاينة. حاولي مرة أخرى.");
      } finally {
        if (isCurrent()) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [router, attempt]);

  if (error) {
    return (
      <div className="ath" dir="rtl">
        <main className="ath-auth">
          <section className="ath-auth-card" role="alert">
            <p>{error}</p>
            <button type="button" className="ath-btn primary" onClick={() => setAttempt((value) => value + 1)}>
              إعادة المحاولة
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <>
      {privatePreview ? (
        <div className="ath no-print" dir="rtl" role="status" style={{ padding: "12px 16px", textAlign: "center" }}>
          المشاركة غير مفعلة. هذه معاينة خاصة لشواهدك المعتمدة بنفس تصميم عرض المديرة.
        </div>
      ) : null}
      <PortfolioPresentation share={share} loading={loading} allowDownload />
    </>
  );
}
