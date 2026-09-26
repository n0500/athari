"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { ensureDriveAccessToken } from "@/lib/auth";
import { publishPortfolioFiles, revokePortfolioPermissions } from "@/lib/drive";
import { listUserEvidence } from "@/lib/firestore";
import {
  createOrUpdatePortfolioShare,
  getActivePortfolioShare,
  revokePortfolioShare,
} from "@/lib/portfolioShare";
import type { ShareDrivePermission, ShareEvidence } from "@/lib/portfolioShare";
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
  if (approved.classifications?.length) return approved.classifications.slice(0, 3);
  if (approved.elementId && approved.elementName) {
    return [{ elementId: approved.elementId, elementName: approved.elementName, isPrimary: true }];
  }
  return [];
}

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [{
    originalFileName: item.originalFileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
    ...(item.driveWebViewLink ? { driveWebViewLink: item.driveWebViewLink } : {}),
  }];
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
      ...(attachment.driveFileId ? { driveFileId: attachment.driveFileId } : {}),
    })),
  }));
}

function teacherName(user: User | null) {
  const name = user?.displayName?.trim();
  if (!name || /[A-Za-z]/.test(name)) return "أ. نهى المطيري";
  return name.startsWith("أ.") ? name : `أ. ${name}`;
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
  const coverage = totalElements ? Math.round((covered.size / totalElements) * 100) : 0;

  const driveFileIds = useMemo(
    () => [...new Set(items.flatMap((item) =>
      attachmentsFor(item)
        .map((attachment) => attachment.driveFileId)
        .filter((value): value is string => Boolean(value))
    ))],
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
      const published = await publishPortfolioFiles(token, driveFileIds, previousPermissions);
      const currentIds = new Set(driveFileIds);
      const removedPermissions = previousPermissions.filter(
        (permission) => !currentIds.has(permission.driveFileId)
      );
      if (removedPermissions.length) {
        await revokePortfolioPermissions(token, removedPermissions);
      }

      const share = await createOrUpdatePortfolioShare({
        uid: user.uid,
        ownerDisplayName: teacherName(user),
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
    <AppShell>
      <section className="exact-hero exact-portfolio-hero">
        <img className="exact-hero-art" src="/athari-assets/hero-portfolio.webp" alt="" />
        <div className="exact-hero-copy">
          <span className="exact-year"><Icon name="calendar" size={16} /> العام الدراسي {year}</span>
          <span className="exact-kicker">ملف الأداء المهني</span>
          <h1>{teacherName(user)}</h1>
          <p>{loading ? "جاري تحميل ملفك…" : `${items.length} شواهد معتمدة · ${covered.size} من ${totalElements} عنصر تقييم`}</p>
          <div className="exact-hero-actions">
            <a href="#approved-evidence"><Icon name="eye" size={18} /> استعراض الشواهد</a>
            <Link href="/preview" className="is-light"><Icon name="print" size={18} /> طباعة / حفظ PDF</Link>
          </div>
        </div>
        <div
          className="exact-progress"
          style={{ background: `conic-gradient(#6ce6d1 ${coverage * 3.6}deg, rgba(255,255,255,.18) 0deg)` }}
        >
          <div><strong>{loading ? "…" : `${coverage}%`}</strong><span>تغطية الإطار</span></div>
        </div>
      </section>

      <section className="exact-stat-grid">
        <article className="exact-stat violet"><span><Icon name="folder" size={23} /></span><div><strong>{covered.size} من {totalElements}</strong><small>عنصر تقييم مغطى</small></div></article>
        <article className="exact-stat mint"><span><Icon name="file" size={23} /></span><div><strong>{items.length}</strong><small>شواهد معتمدة</small></div></article>
        <article className="exact-stat sky"><span><Icon name="shield" size={23} /></span><div><strong>ملف جاهز للعرض</strong><small>المشاركة لا تتيح تعديل المحتوى</small></div></article>
      </section>

      <section className="exact-section">
        <div className="exact-section-head">
          <div>
            <span>وفق الدليل الرسمي</span>
            <h2>عناصر التقييم</h2>
            <p>يتم استخدام المسميات الرسمية لعناصر التقييم كما في الدليل المعتمد.</p>
          </div>
          <b><Icon name="grid" size={15} /> {totalElements} عنصر تقييم</b>
        </div>

        <div className="exact-element-grid">
          {OFFICIAL_TEACHER_FRAMEWORK_V2.map((element, index) => {
            const evidence = evidenceByElement.get(element.id) ?? [];
            const guidance = ELEMENT_GUIDANCE[element.id];
            return (
              <Link
                href={`/element?id=${encodeURIComponent(element.id)}`}
                className={`exact-element-card tone-${guidance?.tone ?? "blue"} ${evidence.length ? "is-covered" : ""}`}
                key={element.id}
              >
                <span className="exact-element-status">{evidence.length ? <Icon name="check" size={14} /> : null}</span>
                <span className={`exact-element-art art-${index + 1}`}><Icon name={guidance?.icon ?? "file"} size={30} /></span>
                <div>
                  <strong>{element.officialName}</strong>
                  <small>{evidence.length ? `${evidence.length} ${evidence.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}` : "لا يوجد شاهد معتمد"}</small>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="exact-section" id="approved-evidence">
        <div className="exact-section-head">
          <div>
            <span>الشواهد الموثقة</span>
            <h2>الشواهد المعتمدة</h2>
            <p>{items.length} شواهد معتمدة تغطي عناصر مختلفة من إطار التقييم.</p>
          </div>
          <Link className="exact-all-link" href="/evidence">عرض جميع الشواهد <Icon name="chevron" size={16} /></Link>
        </div>

        <div className="exact-evidence-grid">
          {items.slice(0, 2).map((item, index) => {
            const classification = classificationsFor(item)[0];
            return (
              <article className="exact-evidence-card" key={item.id}>
                <div className={`exact-evidence-image image-${index + 1}`} />
                <div className="exact-evidence-body">
                  {classification ? <span>{classification.elementName}</span> : null}
                  <h3>{item.approvedContent?.title || item.originalFileName}</h3>
                  {item.approvedContent?.description ? <p>{item.approvedContent.description}</p> : null}
                  <Link href={`/evidence/review?id=${encodeURIComponent(item.id)}`}><Icon name="eye" size={16} /> عرض الشاهد</Link>
                </div>
              </article>
            );
          })}
          {!loading && !items.length ? <div className="exact-empty">لا توجد شواهد معتمدة بعد.</div> : null}
        </div>
      </section>

      <details className="exact-share-manager">
        <summary><Icon name="share" size={19} /><span><strong>مشاركة الملف مع المديرة</strong><small>إنشاء أو تحديث رابط العرض للقراءة فقط</small></span><Icon name="chevron" size={18} /></summary>
        <div className="exact-share-content">
          <button type="button" className="exact-share-primary" onClick={createShare} disabled={shareBusy || !items.length}>
            <Icon name="share" size={18} /> {shareBusy ? "جاري التجهيز…" : shareUrl ? "تحديث رابط العرض" : "إنشاء رابط العرض"}
          </button>
          {shareUrl ? (
            <>
              <a className="exact-share-url" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
              <div className="exact-share-buttons">
                <button onClick={() => copyShareLink(shareUrl)}><Icon name="copy" size={16} /> نسخ الرابط</button>
                <a href={shareUrl} target="_blank" rel="noreferrer"><Icon name="external" size={16} /> فتح نسخة العرض</a>
                <button className="danger" onClick={revokeShare} disabled={shareBusy}>إيقاف المشاركة</button>
              </div>
            </>
          ) : null}
          {shareMessage ? <div className="flow-message">{shareMessage}</div> : null}
        </div>
      </details>

      {error ? <div className="flow-message is-error">{error}</div> : null}
    </AppShell>
  );
}
