"use client";

import { useEffect, useState } from "react";
import { PortfolioPresentation } from "@/components/PortfolioPresentation";
import { getPublicPortfolioShare } from "@/lib/portfolioShare";
import type { PortfolioShare } from "@/lib/portfolioShare";

export default function PublicSharePage() {
  const [share, setShare] = useState<PortfolioShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
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
        if (!cancelled) setError("رابط المشاركة غير متاح أو أُوقف.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return <PortfolioPresentation share={share} loading={loading} error={error} />;
}
