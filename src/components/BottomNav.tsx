import Link from "next/link";
import { Icon } from "@/components/Icon";

const items = [
  { href: "/", label: "الرئيسية", icon: "home" as const },
  { href: "/portfolio", label: "ملفي", icon: "folder" as const },
  { href: "/evidence", label: "الشواهد", icon: "file" as const },
  { href: "/account", label: "الحساب", icon: "user" as const },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {items.map((item) => (
        <Link className="nav-item" href={item.href} key={item.href}>
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
