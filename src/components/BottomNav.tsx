"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const items = [
  { href: "/", label: "الرئيسية", icon: "home" as const },
  { href: "/portfolio", label: "ملفي", icon: "folder" as const },
  { href: "/evidence", label: "الشواهد", icon: "file" as const },
  { href: "/account", label: "الحساب", icon: "user" as const },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            className={`nav-item ${active ? "is-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <span className="nav-icon"><Icon name={item.icon} size={20} /></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
