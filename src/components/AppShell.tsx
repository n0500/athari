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
    <div className="app-frame athari-v4-shell">
      <header className="topbar v4-topbar">
        <div className="athari-wordmark" aria-label="أثري">
          <span className="athari-mark" aria-hidden>
            <i className="athari-mark-blue" />
            <i className="athari-mark-peach" />
          </span>
          <strong>أثري</strong>
        </div>
        <span className="topbar-status v4-status">موثق ومحفوظ</span>
      </header>

      <main className="page-content v4-page-content">
        {title ? (
          <div className="v4-page-heading">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
