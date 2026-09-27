import { ReactNode } from "react";
import { AthShell } from "@/components/athari-ui/Ui";

/**
 * Legacy wrapper kept for simple screens (privacy, terms, legacy links).
 * It now renders the unified Athari chrome (top bar + bottom nav).
 */
export function AppShell({
  children,
  title,
  subtitle,
  showNav = true,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showNav?: boolean;
}) {
  return (
    <AthShell showNav={showNav} title={title} subtitle={subtitle}>
      {children}
    </AthShell>
  );
}
