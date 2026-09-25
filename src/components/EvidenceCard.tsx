import Link from "next/link";
import { Evidence } from "@/data/demo";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/Icon";

export function EvidenceCard({ item }: { item: Evidence }) {
  return (
    <Link
      href={`/evidence/review?id=${encodeURIComponent(item.id)}`}
      className="evidence-card"
    >
      <div className="evidence-card-head">
        <StatusPill status={item.status} />
        <span className="muted-small">{item.date}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.element}</p>
      <div className="file-row">
        <Icon name="file" size={17} />
        <span>{item.fileName}</span>
      </div>
    </Link>
  );
}
