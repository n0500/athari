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
import {
  ApprovedClassification,
  EvidenceAttachment,
  EvidenceRecord,
} from "@/types/athari";

type GroupedEvidence = {
  item: EvidenceRecord;
  classification: ApprovedClassification;
};

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

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedEvidence[]>();

    for (const item of items) {
      const classifications = classificationsFor(item);
      for (const classification of classifications) {
        const key = classification.elementName;
        map.set(key, [
          ...(map.get(key) || []),
          { item, classification },
        ]);
      }
    }

    return OFFICIAL_TEACHER_FRAMEWORK_V2
      .map(
        (element) =>
          [element.officialName, map.get(element.officialName) || []] as const
      )
      .filter(([, evidence]) => evidence.length > 0);
  }, [items]);

  const covered = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      classificationsFor(item).forEach((classification) =>
        ids.add(classification.elementId)
      );
    }
    return ids;
  }, [items]);

  const year =
    process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";
  const totalElements = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const coverage = totalElements
    ? Math.round((covered.size / totalElements) * 100)
    : 0;

  const driveFileIds = useMemo(
    () =>
      [
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
      const currentShare = await getActivePortfolioShare(user.uid).catch(
        () => null
      );
      const previousPermissions =
        currentShare?.drivePermissions ?? sharePermissions;

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
      const currentShare = await getActivePortfolioShare(user.uid).catch(
        () => null
      );
      const permissions =
        currentShare?.drivePermissions ?? sharePermissions;

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
      <section className="portfolio-hero">
        <div>
          <span className="eyebrow light">العام الدراسي {year}</span>
          <h1>ملف أداء جاهز للمراجعة والمشاركة</h1>
          <p>
            {loading
              ? "جاري تحميل الملف…"
              : `${items.length} شاهد معتمد يغطي ${covered.size} من ${totalElements} عناصر الأداء.`}
          </p>
        </div>
        <div className="portfolio-score">
          <strong>{loading ? "…" : `${coverage}%`}</strong>
          <span>تغطية الإطار</span>
        </div>
      </section>

      <section className="portfolio-actions">
        <Link className="action-tile" href="/preview">
          <span className="action-icon"><Icon name="eye" size={22} /></span>
          <div>
            <strong>معاينة الملف</strong>
            <small>شاهدي نسخة العرض قبل إرسالها</small>
          </div>
          <Icon name="chevron" size={18} />
        </Link>

        <button
          type="button"
          className="action-tile share-action"
          onClick={createShare}
          disabled={shareBusy || !items.length}
        >
          <span className="action-icon"><Icon name="share" size={22} /></span>
          <div>
            <strong>{shareBusy ? "جاري التجهيز…" : "مشاركة الملف"}</strong>
            <small>رابط عرض داخل أثري · للقراءة فقط</small>
          </div>
          <Icon name="chevron" size={18} />
        </button>
      </section>

      {shareUrl ? (
        <section className="share-ready-card">
          <div className="share-ready-head">
            <span className="share-ready-icon"><Icon name="link" size={20} /></span>
            <div>
              <strong>رابط العرض جاهز</strong>
              <p>المديرة ترى نسخة مرتبة داخل أثري، ولا ترى مجلدات Drive. إذا أضفتِ شواهد جديدة اضغطي «مشاركة الملف» لتحديث نفس الرابط.</p>
            </div>
          </div>
          <a
            className="share-url"
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
          >
            {shareUrl}
          </a>
          <div className="share-buttons">
            <button
              className="secondary-button"
              onClick={() => copyShareLink(shareUrl)}
            >
              <Icon name="copy" size={17} /> نسخ الرابط
            </button>
            <a
              className="secondary-button"
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="external" size={17} /> فتح نسخة العرض
            </a>
            <button
              className="text-danger-button"
              onClick={revokeShare}
              disabled={shareBusy}
            >
              إيقاف المشاركة
            </button>
          </div>
        </section>
      ) : null}

      {shareMessage ? (
        <div className="flow-message">{shareMessage}</div>
      ) : null}

      {error ? <div className="flow-message is-error">{error}</div> : null}

      <section className="page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">عناصر الأداء</span>
            <h2>الشواهد المعتمدة</h2>
          </div>
          <span className="section-count">{grouped.length} عناصر مغطاة</span>
        </div>

        <div className="stack portfolio-stack">
          {grouped.map(([element, evidence], index) => (
            <section className="portfolio-group" key={element}>
              <div className="element-card premium-element">
                <div className="element-number">{index + 1}</div>
                <div className="element-copy">
                  <strong>{element}</strong>
                  <span>
                    {evidence.length} {evidence.length === 1 ? "شاهد" : "شواهد"}
                  </span>
                </div>
                <span className="element-check"><Icon name="check" size={17} /></span>
              </div>

              <div className="portfolio-evidence-list">
                {evidence.map(({ item, classification }) => {
                  const shared = classificationsFor(item).length > 1;
                  const attachments = attachmentsFor(item);

                  return (
                    <article
                      className="portfolio-evidence"
                      key={`${item.id}-${classification.elementId}`}
                    >
                      <div className="portfolio-evidence-head">
                        <strong>{item.approvedContent?.title}</strong>
                        {shared ? (
                          <span className="shared-badge">
                            {classification.isPrimary
                              ? "مشترك · أساسي"
                              : "شاهد مشترك"}
                          </span>
                        ) : null}
                      </div>

                      <p className="portfolio-description">
                        {item.approvedContent?.description}
                      </p>

                      <div className="portfolio-meta-row">
                        <span>
                          <Icon name="file" size={15} />{" "}
                          {attachments.length === 1
                            ? "ملف أصلي"
                            : `${attachments.length} ملفات أصلية`}
                        </span>
                        {item.approvedContent?.impact &&
                        item.approvedContent.impact !==
                          "لا يوجد أثر موثق متاح حاليًا." ? (
                          <span>
                            <Icon name="sparkle" size={15} /> أثر موثق
                          </span>
                        ) : null}
                      </div>

                      <div className="attachment-links">
                        {attachments.map((attachment, attachmentIndex) =>
                          attachment.driveWebViewLink ? (
                            <a
                              key={`${attachment.originalFileName}-${attachmentIndex}`}
                              href={attachment.driveWebViewLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Icon name="external" size={14} />
                              {attachments.length === 1
                                ? "فتح الأصل"
                                : `فتح الملف ${attachmentIndex + 1}`}
                            </a>
                          ) : null
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {!loading && !error && grouped.length === 0 ? (
            <div className="empty-state polished-empty">
              <span><Icon name="folder" size={26} /></span>
              <strong>ملفك ينتظر أول شاهد معتمد</strong>
              <p>
                بعد اعتماد الشاهد سيظهر هنا تلقائيًا تحت عنصر الأداء المناسب.
              </p>
              <Link className="primary-button" href="/evidence/new">
                إضافة شاهد
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="privacy-note">
        <Icon name="shield" size={19} />
        <p>
          رابط العرض يشارك <strong>الشواهد المعتمدة فقط</strong>. المديرة لا
          تحتاج لتسجيل الدخول، ولا يظهر لها تنظيم Google Drive الداخلي.
        </p>
      </section>
    </AppShell>
  );
}
