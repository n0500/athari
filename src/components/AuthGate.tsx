"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";

type State = "checking" | "in" | "out";

/** Same-site path to return to after signing in; anything else falls back to the home page. */
export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}

/**
 * Teacher pages require a signed-in account. A signed-out visitor (after
 * logging out, in another tab, or on a new device) is sent to the login page
 * instead of seeing an empty portfolio that looks like lost data.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>(firebaseConfigured ? "checking" : "in");

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(requireAuth(), (user) => {
      if (user) {
        setState("in");
        return;
      }
      setState("out");
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(safeNextPath(here))}`);
    });
  }, [router]);

  if (state !== "in") {
    return (
      <div className="ath-auth-wait" role="status" aria-live="polite">
        {state === "checking" ? "جاري التحقق من تسجيل الدخول…" : "جاري الانتقال إلى صفحة تسجيل الدخول…"}
      </div>
    );
  }

  return <>{children}</>;
}
