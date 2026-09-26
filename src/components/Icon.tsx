type IconName =
  | "home"
  | "file"
  | "sparkle"
  | "user"
  | "plus"
  | "chevron"
  | "upload"
  | "check"
  | "alert"
  | "folder"
  | "edit"
  | "eye"
  | "share"
  | "external"
  | "copy"
  | "archive"
  | "trash"
  | "link"
  | "shield"
  | "grid"
  | "clock"
  | "print"
  | "briefcase"
  | "users"
  | "heart"
  | "idea"
  | "chart"
  | "calendar"
  | "monitor"
  | "leaf"
  | "classroom"
  | "analytics"
  | "checklist"
  | "paperclip"
  | "back";

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home": return <svg {...common}><path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>;
    case "file": return <svg {...common}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 13h5M10 17h5"/></svg>;
    case "sparkle": return <svg {...common}><path d="m12 3 1.2 3.4L16.5 8l-3.3 1.5L12 13l-1.2-3.5L7.5 8l3.3-1.6z"/><path d="m18 14 .8 2.1L21 17l-2.2.9L18 20l-.8-2.1L15 17l2.2-.9z"/></svg>;
    case "user": return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "chevron": return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case "back": return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>;
    case "upload": return <svg {...common}><path d="M12 16V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 14v5h14v-5"/></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
    case "alert": return <svg {...common}><path d="M12 4 3.8 19h16.4z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case "folder": return <svg {...common}><path d="M3 6h6l2 2h10v11H3z"/></svg>;
    case "edit": return <svg {...common}><path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5z"/><path d="m13.8 6.7 3.5 3.5"/></svg>;
    case "eye": return <svg {...common}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>;
    case "share": return <svg {...common}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>;
    case "external": return <svg {...common}><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M19 13v6H5V5h6"/></svg>;
    case "copy": return <svg {...common}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>;
    case "archive": return <svg {...common}><path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3z"/><path d="M9 11h6"/></svg>;
    case "trash": return <svg {...common}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/></svg>;
    case "link": return <svg {...common}><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>;
    case "shield": return <svg {...common}><path d="M12 3 5 6v5c0 4.4 2.8 8 7 10 4.2-2 7-5.6 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "grid": return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "print": return <svg {...common}><path d="M7 8V4h10v4"/><path d="M7 17H5a2 2 0 0 1-2-2v-5h18v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v6H7z"/></svg>;
    case "briefcase": return <svg {...common}><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2"/></svg>;
    case "users": return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 14a4.5 4.5 0 0 1 6.5 4"/></svg>;
    case "heart": return <svg {...common}><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"/><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/></svg>;
    case "idea": return <svg {...common}><path d="M9 18h6M10 21h4"/><path d="M8.3 14.7A6 6 0 1 1 15.7 14.7C14.6 15.5 14 16.4 14 18h-4c0-1.6-.6-2.5-1.7-3.3Z"/></svg>;
    case "chart": return <svg {...common}><path d="M4 20V10M10 20V5M16 20v-8M22 20H2"/><path d="m4 8 5-4 5 3 6-5"/></svg>;
    case "calendar": return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M13 14h3M8 17h3"/></svg>;
    case "monitor": return <svg {...common}><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
    case "leaf": return <svg {...common}><path d="M19 4C10 4 5 9 5 17c8 0 13-5 14-13Z"/><path d="M5 20c2-6 6-9 12-12"/></svg>;
    case "classroom": return <svg {...common}><path d="M3 5h18v10H3z"/><path d="M7 19h10M12 15v4"/><circle cx="8" cy="10" r="1.3"/><path d="M11 12c.8-2 3-3 5-2"/></svg>;
    case "analytics": return <svg {...common}><path d="M4 19V9M9 19V5M14 19v-7M19 19V3"/><circle cx="15.5" cy="8.5" r="5"/><path d="m19 12 3 3"/></svg>;
    case "checklist": return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 8 1 1 2-2M13 8h3M8 13l1 1 2-2M13 13h3M8 18h8"/></svg>;
    case "paperclip": return <svg {...common}><path d="m9 12 6-6a3 3 0 1 1 4 4l-8 8a5 5 0 0 1-7-7l8-8"/></svg>;
  }
}
