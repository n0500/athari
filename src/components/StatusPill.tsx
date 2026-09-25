import { EvidenceStatus } from "@/data/demo";

const labels: Record<EvidenceStatus, string> = {
  ready: "جاهز للمراجعة",
  "needs-info": "يحتاج معلومة",
  approved: "معتمد",
};

export function StatusPill({ status }: { status: EvidenceStatus }) {
  return <span className={`status-pill status-${status}`}>{labels[status]}</span>;
}
