"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { PortfolioPresentation } from "@/components/PortfolioPresentation";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { getPublicPortfolioShare } from "@/lib/portfolioShare";
import type { PortfolioShare } from "@/lib/portfolioShare";

export default function PublicSharePage() {
  const [share, setShare] = useState<PortfolioShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [viewerUid, setViewerUid] = useState<string | null>(null);

  // An owner can also export when she opens her shared link directly.
  // Authentication never blocks the public, read-only portfolio from opening.
  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(requireAuth(), (user) => setViewerUid(user?.uid ?? null), () => setViewerUid(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setCanRetry(false);
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) {
      setError("رابط المشاركة غير مكتمل.");
      setLoading(false);
      return;
    }

    getPublicPortfolioShare(token)
      .then((result) => {
        if (cancelled) return;
        if (result) setShare(result);
        else setError("رابط المشاركة غير متاح أو أُوقف.");
      })
      .catch(() => {
        if (!cancelled) {
          setError("تعذر تحميل الملف. تحققي من الاتصال ثم أعيدي المحاولة.");
          setCanRetry(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [attempt]);

  return <PortfolioPresentation share={share} loading={loading} error={error} allowDownload={Boolean(viewerUid && share?.ownerUid === viewerUid)} onRetry={canRetry ? () => setAttempt((value) => value + 1) : undefined} />;
}
