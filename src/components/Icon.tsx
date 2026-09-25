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
  | "edit";

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
    case "home":
      return <svg {...common}><path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>;
    case "file":
      return <svg {...common}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 13h5M10 17h5"/></svg>;
    case "sparkle":
      return <svg {...common}><path d="m12 3 1.2 3.4L16.5 8l-3.3 1.5L12 13l-1.2-3.5L7.5 8l3.3-1.6z"/><path d="m18 14 .8 2.1L21 17l-2.2.9L18 20l-.8-2.1L15 17l2.2-.9z"/></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "chevron":
      return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case "upload":
      return <svg {...common}><path d="M12 16V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 14v5h14v-5"/></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
    case "alert":
      return <svg {...common}><path d="M12 4 3.8 19h16.4z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case "folder":
      return <svg {...common}><path d="M3 6h6l2 2h10v11H3z"/></svg>;
    case "edit":
      return <svg {...common}><path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5z"/><path d="m13.8 6.7 3.5 3.5"/></svg>;
  }
}
