"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { ensureDriveAccessToken } from "@/lib/auth";
import {
  publishPortfolioFiles,
  revokePortfolioPermissions,
} from "@/lib/drive";
import { listUserEvidence } from "@/lib/firestore";
import {
  createOrUpdatePortfolioShare,
  getActivePortfolioShare,
  revokePortfolioShare,
} from "@/lib/portfolioShare";
import type {
  ShareDrivePermission,
  ShareEvidence,
} from "@/lib/portfolioShare";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
import {
  ApprovedClassification,
  EvidenceAttachment,
  EvidenceRecord,
} from "@/types/athari";

function classificationsFor(item: EvidenceRecord): ApprovedClassification[] {
  const approved = item.approvedContent;
  if (!approved) return [];

  if (approved.classifications?.length) {
    return approved.classifications.slice(0, 3);
  }

  if (approved.elementId && approved.elementName) {
    return [
      {
        elementId: approved.elementId,
        elementName: approved.elementName,
        isPrimary: true,
      },
    ];
  }

  return [];
}

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [
    {
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
      ...(item.driveWebViewLink
        ? { driveWebViewLink: item.driveWebViewLink }
        : {}),
    },
  ];
}

function shareEvidenceFor(items: EvidenceRecord[]): ShareEvidence[] {
  return items.map((item) => ({
    id: item.id,
    title: item.approvedContent?.title || item.originalFileName,
    description: item.approvedContent?.description || "",
    impact: item.approvedContent?.impact || "",
    classifications: classificationsFor(item).map((classification) => ({
      elementId: classification.elementId,
      elementName: classification.elementName,
      isPrimary: classification.isPrimary,
    })),
    attachments: attachmentsFor(item).map((attachment) => ({
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      ...(attachment.driveFileId
        ? { driveFileId: attachment.driveFileId }
        : {}),
    })),
  }));
}

export default function PortfolioPage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareId, setShareId] = useState("");
  const [sharePermissions, setSharePermissions] = useState<ShareDrivePermission[]>([]);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(requireAuth(), async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setError("");
        const [all, activeShare] = await Promise.all([
          listUserEvidence(nextUser.uid),
          getActivePortfolioShare(nextUser.uid).catch(() => null),
        ]);

        setItems(all.filter((item) => item.status === "approved"));

        if (activeShare && typeof window !== "undefined") {
          setShareId(activeShare.id);
          setSharePermissions(activeShare.drivePermissions ?? []);
          setShareUrl(`${window.location.origin}/share?token=${activeShare.id}`);
        }
      } catch {
        setError("تعذر تحميل ملف الأداء الآن. حاولي تحديث الصفحة.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const evidenceByElement = useMemo(() => {
    const map = new Map<string, EvidenceRecord[]>();
    for (const item of items) {
      for (const classification of classificationsFor(item)) {
        const current = map.get(classification.elementId) ?? [];
        if (!current.some((entry) => entry.id === item.id)) {
          map.set(classification.elementId, [...current, item]);
        }
      }
    }
    return map;
  }, [items]);

  const covered = useMemo(
    () => new Set([...evidenceByElement.entries()].filter(([, list]) => list.length).map(([id]) => id)),
    [evidenceByElement]
  );

  const year = process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";
  const totalElements = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const coverage = totalElements
    ? Math.round((covered.size / totalElements) * 100)
    : 0;

  const driveFileIds = useMemo(
    () => [
      ...new Set(
        items.flatMap((item) =>
          attachmentsFor(item)
            .map((attachment) => attachment.driveFileId)
            .filter((value): value is string => Boolean(value))
        )
      ),
    ],
    [items]
  );

  async function copyShareLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("تم نسخ رابط العرض.");
    } catch {
      setShareMessage("الرابط جاهز؛ اضغطي عليه مطولًا لنسخه.");
    }
  }

  async function createShare() {
    if (!items.length || !user) return;

    const ok = window.confirm(
      "سينشئ أثري رابط عرض خاص بالملف المهني. أي شخص يملك الرابط يستطيع مشاهدة الشواهد المعتمدة فقط، دون الدخول إلى حسابك أو رؤية مجلدات Google Drive. هل نكمل؟"
    );
    if (!ok) return;

    try {
      setShareBusy(true);
      setShareMessage("");

      const token = await ensureDriveAccessToken();
      const currentShare = await getActivePortfolioShare(user.uid).catch(() => null);
      const previousPermissions = currentShare?.drivePermissions ?? sharePermissions;

      const published = await publishPortfolioFiles(
        token,
        driveFileIds,
        previousPermissions
      );

      const currentIds = new Set(driveFileIds);
      const removedPermissions = previousPermissions.filter(
        (permission) => !currentIds.has(permission.driveFileId)
      );

      if (removedPermissions.length) {
        await revokePortfolioPermissions(token, removedPermissions);
      }

      const share = await createOrUpdatePortfolioShare({
        uid: user.uid,
        ownerDisplayName: user.displayName?.trim() || "صاحبة الملف",
        academicYear: year,
        evidence: shareEvidenceFor(items),
        drivePermissions: published,
      });

      const url = `${window.location.origin}/share?token=${share.id}`;
      setShareId(share.id);
      setSharePermissions(published);
      setShareUrl(url);
      await copyShareLink(url);
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "UNKNOWN";
      setShareMessage(
        raw === "DRIVE_RECONNECT_REQUIRED"
          ? "انتهت جلسة Drive. أعيدي الضغط لإعادة الربط ثم إنشاء الرابط."
          : "تعذر إنشاء رابط العرض الآن. لم تتغير ملفاتك الأصلية."
      );
    } finally {
      setShareBusy(false);
    }
  }

  async function revokeShare() {
    if (!user || !shareId) return;

    const ok = window.confirm(
      "سيتم إيقاف رابط العرض فورًا، ولن تستطيع المديرة فتحه بعد ذلك. ملفاتك الأصلية لن تُحذف. هل نكمل؟"
    );
    if (!ok) return;

    try {
      setShareBusy(true);
      setShareMessage("");
      const token = await ensureDriveAccessToken();
      const currentShare = await getActivePortfolioShare(user.uid).catch(() => null);
      const permissions = currentShare?.drivePermissions ?? sharePermissions;

      await revokePortfolioPermissions(token, permissions);
      await revokePortfolioShare(user.uid, shareId);

      setShareUrl("");
      setShareId("");
      setSharePermissions([]);
      setShareMessage("تم إيقاف رابط العرض.");
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "UNKNOWN";
      setShareMessage(
        raw === "DRIVE_RECONNECT_REQUIRED"
          ? "انتهت جلسة Drive. أعيدي المحاولة لإيقاف المشاركة."
          : "تعذر إيقاف المشاركة الآن. حاولي مرة أخرى."
      );
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <AppShell title="ملفي" subtitle="ملف الأداء المهني">
      <section className="v4-portfolio-hero">
        <div className="v4-hero-illustration" aria-hidden>
          <span className="v4-folder f1" />
          <span className="v4-folder f2" />
          <span className="v4-folder f3" />
          <span className="v4-pencil p1" />
          <span className="v4-leaf l1" />
          <span className="v4-leaf l2" />
          <span className="v4-star s1">✦</span>
        </div>

        <div className="v4-portfolio-hero-copy">
          <span className="v4-year-chip">العام الدراسي {year}</span>
          <h2>ملف أداء جاهز للمراجعة والمشاركة</h2>
          <p>
            {loading
              ? "جاري تحميل ملفك…"
              : `${items.length} شاهد معتمد تغطي ${covered.size} من ${totalElements} عنصر تقييم`}
          </p>
        </div>

        <div className="v4-progress-wrap">
          <div
            className="v4-progress-ring"
            style={{
              background: `conic-gradient(#6ce6d1 ${coverage * 3.6}deg, rgba(255,255,255,.18) 0deg)`,
            }}
          >
            <div className="v4-progress-core">
              <strong>{loading ? "…" : `${coverage}%`}</strong>
              <span>تغطية الإطار</span>
            </div>
          </div>
        </div>
      </section>

      <section className="v4-action-stack">
        <Link className="v4-action-card v4-action-blue" href="/preview">
          <span className="v4-action-icon"><Icon name="eye" size={24} /></span>
          <div>
            <strong>معاينة الملف</strong>
            <small>شاهدي نسخة العرض قبل إرسالها</small>
          </div>
          <Icon name="chevron" size={20} />
        </Link>

        <button
          type="button"
          className="v4-action-card v4-action-mint"
          onClick={createShare}
          disabled={shareBusy || !items.length}
        >
          <span className="v4-action-icon"><Icon name="share" size={24} /></span>
          <div>
            <strong>{shareBusy ? "جاري التجهيز…" : "مشاركة الملف"}</strong>
            <small>رابط عرض داخل أثري - للقراءة فقط</small>
          </div>
          <Icon name="chevron" size={20} />
        </button>
      </section>

      {shareUrl ? (
        <section className="v4-share-card">
          <div className="v4-share-head">
            <span className="v4-share-icon"><Icon name="link" size={23} /></span>
            <div>
              <strong>رابط العرض جاهز</strong>
              <p>
                المديرة ترى نسخة مرتبة داخل أثري، ولا ترى مجلدات Drive. إذا
                أضفتِ شواهد جديدة اضغطي «مشاركة الملف» لتحديث نفس الرابط.
              </p>
            </div>
          </div>

          <a className="v4-share-url" href={shareUrl} target="_blank" rel="noreferrer">
            <span>{shareUrl}</span>
            <Icon name="copy" size={18} />
          </a>

          <div className="v4-share-buttons">
            <button className="v4-blue-button" onClick={() => copyShareLink(shareUrl)}>
              <Icon name="copy" size={17} /> نسخ الرابط
            </button>
            <a className="v4-outline-button" href={shareUrl} target="_blank" rel="noreferrer">
              <Icon name="external" size={17} /> فتح نسخة العرض
            </a>
            <button className="v4-danger-button" onClick={revokeShare} disabled={shareBusy}>
              إيقاف المشاركة
            </button>
          </div>
        </section>
      ) : null}

      {shareMessage ? <div className="flow-message">{shareMessage}</div> : null}
      {error ? <div className="flow-message is-error">{error}</div> : null}

      <section className="v4-elements-section">
        <div className="v4-section-heading">
          <div>
            <span>عناصر التقييم</span>
            <h2>الشواهد المعتمدة</h2>
            <p>المسميات والتفسيرات وفق الدليل الإرشادي المعتمد.</p>
          </div>
          <span className="v4-covered-pill">{covered.size} عناصر مغطاة</span>
        </div>

        <div className="v4-element-grid">
          {OFFICIAL_TEACHER_FRAMEWORK_V2.map((element) => {
            const evidence = evidenceByElement.get(element.id) ?? [];
            const guidance = ELEMENT_GUIDANCE[element.id];
            return (
              <Link
                href={`/element?id=${encodeURIComponent(element.id)}`}
                className={`v4-element-card tone-${guidance?.tone ?? "blue"} ${
                  evidence.length ? "is-covered" : ""
                }`}
                key={element.id}
              >
                <span className="v4-element-icon">
                  <Icon name={guidance?.icon ?? "file"} size={29} />
                </span>
                {evidence.length ? (
                  <span className="v4-element-check"><Icon name="check" size={15} /></span>
                ) : null}
                <strong>{element.officialName}</strong>
                <small>
                  {evidence.length
                    ? `${evidence.length} ${evidence.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}`
                    : "لا يوجد شاهد معتمد بعد"}
                </small>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="v4-privacy-note">
        <Icon name="shield" size={18} />
        <p>
          رابط العرض يشارك <strong>الشواهد المعتمدة فقط</strong> ولا يتيح
          للمديرة تعديل بياناتك أو رؤية تنظيم Google Drive الداخلي.
        </p>
      </section>
    </AppShell>
  );
}
