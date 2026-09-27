"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  AthShell,
  CountChip,
  ElementGrid,
  EvidenceTiles,
  Glyph,
  Notice,
  PortfolioHero,
  SectionHead,
  StatStrip,
} from "@/components/athari-ui/Ui";
import { Scene } from "@/components/athari-ui/Art";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { ensureDriveAccessToken } from "@/lib/auth";
import {
  newlyAddedPermissions,
  publishPortfolioFiles,
  revokePortfolioPermissions,
} from "@/lib/drive";
import { listUserEvidence } from "@/lib/firestore";
import {
  createOrUpdatePortfolioShare,
  forgetPermissions,
  getActivePortfolioShare,
  revokePortfolioShare,
} from "@/lib/portfolioShare";
import { InfoTip } from "@/components/InfoTip";
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
  const [justAdded, setJustAdded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // «إدارة مشاركة ملف الأداء» in الحساب opens this page with ?share=1
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("share") === "1") setShareOpen(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("added") !== "1") return;
    setJustAdded(true);
    window.history.replaceState(null, "", window.location.pathname);
    const timer = window.setTimeout(() => setJustAdded(false), 6000);
    return () => window.clearTimeout(timer);
  }, []);

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
      setShareMessage("تم نسخ الرابط.");
    } catch {
      setShareMessage("تعذر النسخ التلقائي؛ اضغطي على الرابط مطولًا لنسخه.");
    }
  }

  async function createShare() {
    if (!items.length || !user) return;

    const ok = window.confirm(
      shareUrl
        ? "تحديث مشاركة ملف الأداء بالشواهد المعتمدة الحالية؟"
        : "إنشاء رابط لمشاركة ملف الأداء؟ يعرض الرابط الشواهد المعتمدة فقط دون الوصول إلى بقية ملفاتك."
    );
    if (!ok) return;

    try {
      setShareBusy(true);
      setShareMessage("");

      const token = await ensureDriveAccessToken();
      const currentShare = await getActivePortfolioShare(user.uid).catch(() => null);
      const previousPermissions = currentShare?.drivePermissions ?? sharePermissions;

      // Adds Drive access; on failure it withdraws what it added.
      const published = await publishPortfolioFiles(token, driveFileIds, previousPermissions);

      const currentIds = new Set(driveFileIds);
      const removedPermissions = previousPermissions.filter(
        (permission) => !currentIds.has(permission.driveFileId)
      );

      // 1) Save the new shared copy first. Outgoing permissions stay listed
      //    until revoked, so a failed revoke can be retried on the next update.
      let share: Awaited<ReturnType<typeof createOrUpdatePortfolioShare>>;
      try {
        share = await createOrUpdatePortfolioShare({
          uid: user.uid,
          ownerDisplayName: user.displayName?.trim() || "صاحبة الملف",
          academicYear: year,
          evidence: shareEvidenceFor(items),
          drivePermissions: [...published, ...removedPermissions],
        });
      } catch (shareError) {
        // Not saved: withdraw the Drive access added in this attempt.
        await revokePortfolioPermissions(
          token,
          newlyAddedPermissions(published, previousPermissions)
        ).catch(() => undefined);
        throw shareError;
      }

      // 2) Only after the save succeeds, withdraw access to files that left the share.
      let kept = [...published, ...removedPermissions];
      if (removedPermissions.length) {
        try {
          await revokePortfolioPermissions(token, removedPermissions);
          await forgetPermissions(share.id, removedPermissions);
          kept = published;
        } catch {
          // Left recorded on the share; the next update retries it.
        }
      }

      const url = `${window.location.origin}/share?token=${share.id}`;
      setShareId(share.id);
      setSharePermissions(kept);
      setShareUrl(url);
      await copyShareLink(url);
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "UNKNOWN";
      setShareMessage(
        raw === "DRIVE_RECONNECT_REQUIRED"
          ? "انتهت جلسة Google Drive. أعيدي المحاولة لإعادة الربط."
          : "تعذر حفظ المشاركة الآن، ولم تُمنح أي صلاحية جديدة على ملفاتك."
      );
    } finally {
      setShareBusy(false);
    }
  }

  async function revokeShare() {
    if (!user || !shareId) return;

    const ok = window.confirm(
      "إيقاف مشاركة ملف الأداء؟ يتوقف الرابط فورًا، ولا تُحذف ملفاتك."
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
      setShareMessage("أُوقفت مشاركة ملف الأداء.");
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "UNKNOWN";
      setShareMessage(
        raw === "DRIVE_RECONNECT_REQUIRED"
          ? "انتهت جلسة Google Drive. أعيدي المحاولة لإيقاف المشاركة."
          : "تعذر إيقاف المشاركة الآن. حاولي مرة أخرى."
      );
    } finally {
      setShareBusy(false);
    }
  }

  const elementSummaries = OFFICIAL_TEACHER_FRAMEWORK_V2.map((element) => ({
    id: element.id,
    name: element.officialName,
    count: evidenceByElement.get(element.id)?.length ?? 0,
  }));

  const tiles = items.slice(0, 4).map((item) => {
    const primary =
      classificationsFor(item).find((entry) => entry.isPrimary) ??
      classificationsFor(item)[0];
    return {
      id: item.id,
      title: item.approvedContent?.title || item.originalFileName,
      description: item.approvedContent?.description || "",
      elementId: primary?.elementId,
      elementName: primary?.elementName,
      view: { href: `/evidence/review?id=${encodeURIComponent(item.id)}` },
    };
  });

  const ownerName = user?.displayName?.trim() || "";

  return (
    <AthShell title="ملف الأداء المهني" subtitle="عناصر التقييم والشواهد المرتبطة بها.">
      {justAdded ? (
        <section className="ath-success ath-scene-card" role="status">
          <button type="button" className="x" onClick={() => setJustAdded(false)} aria-label="إغلاق">
            <span aria-hidden>×</span>
          </button>
          <Scene kind="success" />
          <strong>أُضيف الشاهد إلى ملف الأداء</strong>
          <p>اعتُمد الشاهد وأُضيف إلى ملف الأداء.</p>
        </section>
      ) : null}

      <PortfolioHero
        year={year}
        name={ownerName}
        evidenceCount={items.length}
        covered={covered.size}
        total={totalElements}
        loading={loading}
        browse={{ href: "/preview" }}
        browseLabel="معاينة / طباعة"
        extra={
          <button
            type="button"
            className="ath-btn white"
            aria-expanded={shareOpen}
            aria-controls="portfolio-share"
            onClick={() => setShareOpen((value) => !value)}
          >
            <Icon name="share" size={18} /> مشاركة ملف الأداء
          </button>
        }
      />

      {shareOpen ? (
        <section className="ath-panel" id="portfolio-share">
          <div className="ath-ph">
            <span className="sq blue"><Icon name="share" size={22} /></span>
            <div style={{ flex: 1 }}>
              <h2 className="v7-inline">
                مشاركة ملف الأداء
                <InfoTip text="يعرض الرابط الشواهد المعتمدة فقط دون الوصول إلى بقية ملفاتك." />
              </h2>
              <p className="sub">عرض الشواهد المعتمدة وعناصر التقييم.</p>
            </div>
            <span className={`v7-share-status ${shareUrl ? "on" : "off"}`}>{shareUrl ? "مفعّلة" : "غير مفعّلة"}</span>
          </div>
          <div className="ath-share-body">
            {shareUrl ? (
              <>
                <a className="ath-share-url" href={shareUrl} target="_blank" rel="noreferrer">
                  <span>{shareUrl}</span>
                </a>
                <div className="ath-actions">
                  <button type="button" className="ath-btn primary" onClick={() => copyShareLink(shareUrl)}>
                    <Icon name="copy" size={17} /> نسخ الرابط
                  </button>
                  <button type="button" className="ath-btn outline" onClick={createShare} disabled={shareBusy || !items.length}>
                    {shareBusy ? "جاري التحديث…" : "تحديث المشاركة"}
                  </button>
                </div>
                <button type="button" className="ath-btn danger" onClick={revokeShare} disabled={shareBusy}>
                  إيقاف المشاركة
                </button>
              </>
            ) : (
              <button type="button" className="ath-btn primary" onClick={createShare} disabled={shareBusy || !items.length}>
                <Icon name="share" size={18} /> {shareBusy ? "جاري الإنشاء…" : "إنشاء رابط المشاركة"}
              </button>
            )}
            {!items.length && !loading ? <p className="ath-fine">تُتاح المشاركة بعد اعتماد شاهد واحد على الأقل.</p> : null}
            {shareMessage ? <Notice>{shareMessage}</Notice> : null}
          </div>
        </section>
      ) : null}

      <StatStrip
        first={
          shareUrl
            ? { title: "المشاركة مفعّلة", sub: "مشاركة ملف الأداء" }
            : { title: "المشاركة غير مفعّلة", sub: "مشاركة ملف الأداء" }
        }
        evidenceCount={items.length}
        covered={covered.size}
        total={totalElements}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <SectionHead
        icon={<Glyph name="bars" />}
        title="عناصر التقييم"
        side={<CountChip total={totalElements} />}
      />
      <ElementGrid
        elements={elementSummaries}
        tapFor={(id) => ({ href: `/element?id=${encodeURIComponent(id)}` })}
      />

      <SectionHead
        icon={<Glyph name="doc" className="ath-green-ico" />}
        title="الشواهد المعتمدة"
        sub={
          loading
            ? "جاري التحميل…"
            : items.length
              ? `${items.length} ${items.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}`
              : "لا توجد شواهد معتمدة بعد."
        }
        side={
          <Link className="ath-link-btn" href="/evidence">
            عرض جميع الشواهد <Glyph name="chevLeft" size={14} />
          </Link>
        }
      />
      {tiles.length ? (
        <EvidenceTiles items={tiles} />
      ) : !loading ? (
        <section className="ath-panel ath-scene-card">
          <Scene kind="empty" />
          <strong>لا توجد شواهد معتمدة بعد</strong>
          <Link className="ath-btn primary fit" href="/evidence/new"><Glyph name="plus" />إضافة أول شاهد</Link>
        </section>
      ) : null}

    </AthShell>
  );
}
