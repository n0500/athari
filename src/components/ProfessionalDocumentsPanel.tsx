"use client";

import { useEffect, useRef, useState } from "react";
import { Glyph, Notice, Panel } from "@/components/athari-ui/Ui";
import { InfoTip } from "@/components/InfoTip";
import { DRIVE_CONTINUE_MESSAGE, ensureDriveAccessToken, getStoredDriveToken } from "@/lib/auth";
import { autoRefreshShare } from "@/lib/shareRefresh";
import {
  DOCUMENT_SLOTS,
  MAX_DOCUMENT_BYTES,
  MAX_OTHER_DOCUMENTS,
  getProfessionalDocuments,
  orderedDocuments,
  saveProfessionalDocuments,
  uploadProfessionalDocument,
} from "@/lib/professionalDocuments";
import type { ProfessionalDocument, ProfessionalDocumentKind } from "@/types/athari";

const ACCEPT = ".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

type Target = { kind: ProfessionalDocumentKind; label: string; replaceId?: string };

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ProfessionalDocumentsPanel({ uid }: { uid: string }) {
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [otherLabel, setOtherLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<Target | null>(null);
  // A chosen file waiting for one tap on «متابعة» when Drive access has expired.
  const [pending, setPending] = useState<{ file: File; target: Target } | null>(null);
  // Professional-document writes replace the whole saved list. Serialize mutations so
  // a second quick action cannot save an older snapshot over the first one.
  const mutationLockRef = useRef(false);

  useEffect(() => {
    getProfessionalDocuments(uid)
      .then((list) => setDocuments(orderedDocuments(list)))
      .catch(() => {
        setIsError(true);
        setMessage("تعذر تحميل الوثائق المهنية الآن.");
      })
      .finally(() => setLoading(false));
  }, [uid]);

  async function persist(next: ProfessionalDocument[], success: string) {
    const saved = await saveProfessionalDocuments(uid, next);
    setDocuments(orderedDocuments(saved));
    // Keep the principal's link in step (no-op when nothing is shared yet).
    const shareNote = await autoRefreshShare(uid, getStoredDriveToken());
    setIsError(false);
    setMessage(shareNote ? `${success} ${shareNote}` : success);
  }

  function pick(target: Target) {
    if (mutationLockRef.current) return;
    targetRef.current = target;
    setMessage("");
    inputRef.current?.click();
  }

  async function onFile(file: File | undefined) {
    const target = targetRef.current;
    if (inputRef.current) inputRef.current.value = "";
    if (!file || !target) return;

    if (file.size > MAX_DOCUMENT_BYTES) {
      setIsError(true);
      setMessage("حجم الملف أكبر من 20 ميجابايت.");
      return;
    }

    // Choosing a file is not a tap the browser accepts for opening a Google window.
    if (!getStoredDriveToken()) {
      setPending({ file, target });
      setIsError(false);
      setMessage(DRIVE_CONTINUE_MESSAGE);
      return;
    }
    await upload(file, target);
  }

  async function continuePending() {
    if (!pending) return;
    try {
      await ensureDriveAccessToken(); // first await: opens directly from the tap
    } catch {
      setIsError(true);
      setMessage("لم يكتمل تأكيد حساب Google. اضغطي «متابعة» مرة أخرى.");
      return;
    }
    const { file, target } = pending;
    setPending(null);
    await upload(file, target);
  }

  async function upload(file: File, target: Target) {
    const key = target.replaceId ?? target.kind;
    if (mutationLockRef.current) return;
    mutationLockRef.current = true;
    try {
      setBusyKey(key);
      setMessage("");
      const token = await ensureDriveAccessToken();
      const uploaded = await uploadProfessionalDocument(token, file);
      const previous = target.replaceId
        ? documents.find((entry) => entry.id === target.replaceId)
        : undefined;
      const entry: ProfessionalDocument = {
        id: previous?.id ?? newId(),
        kind: target.kind,
        label: target.label,
        originalFileName: file.name,
        mimeType: file.type || uploaded.mimeType || "",
        driveFileId: uploaded.id,
        ...(uploaded.webViewLink ? { driveWebViewLink: uploaded.webViewLink } : {}),
      };
      const next = previous
        ? documents.map((item) => (item.id === previous.id ? entry : item))
        : [...documents, entry];
      await persist(next, previous ? `تم استبدال «${target.label}».` : `تمت إضافة «${target.label}».`);
      if (target.kind === "other") setOtherLabel("");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setIsError(true);
      setMessage(
        code === "DRIVE_RECONNECT_REQUIRED"
          ? "يرجى تسجيل الدخول إلى Google ثم إعادة المحاولة."
          : "تعذر رفع الوثيقة الآن. حاولي مرة أخرى."
      );
    } finally {
      mutationLockRef.current = false;
      setBusyKey("");
    }
  }

  async function remove(entry: ProfessionalDocument) {
    if (mutationLockRef.current) return;
    if (!window.confirm(`إزالة «${entry.label}» من الوثائق المهنية؟ يبقى الملف محفوظًا في Google Drive.`)) return;
    mutationLockRef.current = true;
    try {
      setBusyKey(entry.id);
      await persist(documents.filter((item) => item.id !== entry.id), `أُزيلت «${entry.label}».`);
    } catch {
      setIsError(true);
      setMessage("تعذر حفظ التغيير الآن.");
    } finally {
      mutationLockRef.current = false;
      setBusyKey("");
    }
  }

  function row(entry: ProfessionalDocument) {
    const busy = busyKey === entry.id;
    return (
      <div className="pd-row" key={entry.id}>
        <span className="pd-ic"><Glyph name="doc" size={19} /></span>
        <div className="pd-nm">
          <strong>{entry.label}</strong>
          {entry.driveWebViewLink ? (
            <a href={entry.driveWebViewLink} target="_blank" rel="noreferrer">{entry.originalFileName || "فتح الملف"}</a>
          ) : (
            <span>{entry.originalFileName}</span>
          )}
        </div>
        <div className="pd-actions">
          <button type="button" disabled={Boolean(busyKey)} onClick={() => pick({ kind: entry.kind, label: entry.label, replaceId: entry.id })}>
            <Glyph name="upload" size={14} />{busy ? "…" : "استبدال"}
          </button>
          <button type="button" className="danger" disabled={Boolean(busyKey)} onClick={() => remove(entry)} aria-label={`إزالة ${entry.label}`}>
            <Glyph name="trash" size={14} />
          </button>
        </div>
      </div>
    );
  }

  const others = documents.filter((entry) => entry.kind === "other");

  return (
    <Panel
      icon={<Glyph name="folder" size={22} />}
      title="الوثائق المهنية"
      sub="وثائق ثابتة تُرفع مرة واحدة، وتظهر جميعها للمديرة في مشاركة ملف الأداء."
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => onFile(event.target.files?.[0])}
      />

      {loading ? (
        <p className="ath-fine"><span className="ath-busy" />جاري التحميل…</p>
      ) : (
        <div className="pd-list">
          {DOCUMENT_SLOTS.map((slot) => {
            const entry = documents.find((item) => item.kind === slot.kind);
            if (entry) return row(entry);
            const busy = busyKey === slot.kind;
            return (
              <div className="pd-row is-empty" key={slot.kind}>
                <span className="pd-ic"><Glyph name="plus" size={19} /></span>
                <div className="pd-nm"><strong>{slot.label}</strong><span>{slot.hint}</span></div>
                <div className="pd-actions">
                  <button type="button" className="primary" disabled={Boolean(busyKey)} onClick={() => pick({ kind: slot.kind, label: slot.label })}>
                    <Glyph name="upload" size={14} />{busy ? "جاري الرفع…" : "رفع"}
                  </button>
                </div>
              </div>
            );
          })}

          {others.map(row)}

          {others.length < MAX_OTHER_DOCUMENTS ? (
            <div className="pd-other">
              <label htmlFor="pd-other-label" className="v7-inline">
                وثيقة أخرى
                <InfoTip text="مثل السيرة الذاتية أو شهادة تقدير. اكتبي اسم الوثيقة كما تريدين أن يظهر في ملف الأداء، ثم ارفعي الملف." />
              </label>
              <div className="pd-other-row">
                <input
                  id="pd-other-label"
                  value={otherLabel}
                  maxLength={60}
                  onChange={(event) => setOtherLabel(event.target.value)}
                  placeholder="اسم الوثيقة"
                />
                <button
                  type="button"
                  disabled={!otherLabel.trim() || Boolean(busyKey)}
                  onClick={() => pick({ kind: "other", label: otherLabel.trim() })}
                >
                  <Glyph name="upload" size={14} />{busyKey === "other" ? "جاري الرفع…" : "رفع"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {message ? <Notice tone={isError ? "error" : "info"}>{message}</Notice> : null}
      {pending ? (
        <div className="ath-actions">
          <button type="button" className="ath-btn primary fit" onClick={continuePending} disabled={Boolean(busyKey)}>
            <Glyph name="upload" size={16} />متابعة رفع «{pending.target.label}»
          </button>
          <button type="button" className="ath-btn outline fit" onClick={() => { setPending(null); setMessage(""); }}>
            إلغاء
          </button>
        </div>
      ) : null}
      <p className="ath-fine">تُحفظ الملفات في مجلد «أثري / الوثائق المهنية» في Google Drive الخاص بك.</p>
    </Panel>
  );
}
