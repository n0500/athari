import { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";

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
    <div className="app-frame">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden>أ</div>
          <div className="topbar-copy">
            <strong>{title ?? "أثري"}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
        </div>
        <span className="topbar-status">موثق ومحفوظ</span>
      </header>
      <main className="page-content">{children}</main>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
