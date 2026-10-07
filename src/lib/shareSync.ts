import { getStoredDriveToken } from "@/lib/auth";
import { revokePortfolioPermissions } from "@/lib/drive";
import { listUserEvidence } from "@/lib/firestore";
import { forgetPermissions, pruneActiveShare } from "@/lib/portfolioShare";

export type ShareSyncResult = "no_share" | "unchanged" | "synced" | "revoke_pending";

/**
 * Keeps an active «مشاركة ملف الأداء» link in step with the approved evidence
 * after a record is archived, deleted or cleaned up:
 * 1. the shared copy drops evidence that is no longer approved (saved first);
 * 2. Drive access is withdrawn from files no remaining shared evidence uses.
 * If step 2 cannot finish, the permissions stay recorded on the share and are
 * withdrawn the next time the share is updated.
 */
export async function syncShareWithApproved(uid: string): Promise<ShareSyncResult> {
  const items = await listUserEvidence(uid);
  const approvedIds = new Set<string>(
    items.filter((item) => item.status === "approved").map((item) => item.id)
  );

  const { shareId, changed, dropped } = await pruneActiveShare(uid, approvedIds);
  if (!shareId) return "no_share";
  if (!changed) return "unchanged";
  if (!dropped.length) return "synced";

  // This runs after other work, so a Google window here would be blocked by the
  // browser. Without a current token the withdrawal waits for the next share update.
  const token = getStoredDriveToken();
  if (!token) return "revoke_pending";

  try {
    await revokePortfolioPermissions(token, dropped);
    await forgetPermissions(shareId, dropped);
    return "synced";
  } catch {
    return "revoke_pending";
  }
}

export const SHARE_SYNC_PENDING_MESSAGE =
  "أُزيل الشاهد من مشاركة ملف الأداء، وتعذّر سحب صلاحية بعض ملفاته الآن. حدّثي المشاركة من صفحة ملف الأداء لإكمال ذلك.";
