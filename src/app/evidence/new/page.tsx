"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { requireAuth } from "@/lib/firebase";
import { ensureDriveAccessToken } from "@/lib/auth";
import { ensureAthariInbox, uploadEvidenceToDrive } from "@/lib/drive";
import {
  attachDriveFile, computeEvidenceHash, createEvidenceDraft, findDuplicateEvidence,
  getActiveFrameworkElements, markAnalyzing, markAnalysisFailed, saveAnalysis, setEvidenceContentHash,
} from "@/lib/firestore";
import { analyzeEvidence } from "@/lib/ai";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["application/pdf","image/jpeg","image/png","image/webp","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export default function NewEvidencePage() {
  const router = useRouter();
  const [file,setFile] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [isError,setIsError] = useState(false);
  const academicYear = process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  function chooseFile(next: File|null) {
    setMessage(""); setIsError(false);
    if (!next) return setFile(null);
    if (next.size > MAX_FILE_BYTES) { setFile(null); setMessage("الحد الحالي للشاهد 10 MB للمحافظة على التحليل المجاني."); setIsError(true); return; }
    if (next.type && !ACCEPTED.includes(next.type)) { setFile(null); setMessage("استخدمي PDF أو صورة أو ملف Word."); setIsError(true); return; }
    setFile(next);
  }

  async function processEvidence() {
    if (!file) return;
    let evidenceId = "";
    try {
      setBusy(true); setIsError(false);
      const user = requireAuth().currentUser;
      if (!user) { router.push("/login"); return; }

      setMessage("يتحقق أثري أولًا من عدم تكرار الشاهد…");
      const contentHash = await computeEvidenceHash(file);
      const duplicate = await findDuplicateEvidence({ uid:user.uid, academicYear, file, contentHash });

      if (duplicate && ["approved","ready_for_review","needs_info"].includes(duplicate.status)) {
        if (!duplicate.contentHash) await setEvidenceContentHash(duplicate.id, contentHash).catch(() => undefined);
        router.push(`/evidence/review?id=${encodeURIComponent(duplicate.id)}`);
        return;
      }

      if (duplicate) {
        evidenceId = duplicate.id;
        if (!duplicate.contentHash) await setEvidenceContentHash(duplicate.id, contentHash);
      } else {
        evidenceId = await createEvidenceDraft({ ownerUid:user.uid, academicYear, file, contentHash });
      }

      if (!duplicate?.driveFileId) {
        setMessage("نحفظ الأصل في Google Drive الخاص بك…");
        const token = await ensureDriveAccessToken();
        const { inbox } = await ensureAthariInbox(token, academicYear);
        const saved = await uploadEvidenceToDrive(token, file, inbox.id);
        await attachDriveFile(evidenceId, { driveFileId:saved.id, driveWebViewLink:saved.webViewLink, driveParentFolderId:inbox.id });
      } else {
        setMessage("وجد أثري الأصل محفوظًا مسبقًا؛ نعيد التحليل دون إنشاء نسخة جديدة…");
      }

      await markAnalyzing(evidenceId);
      const framework = await getActiveFrameworkElements();
      const analysis = await analyzeEvidence(file, framework);
      await saveAnalysis(evidenceId, analysis);
      router.push(`/evidence/review?id=${encodeURIComponent(evidenceId)}`);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "UNKNOWN";
      if (evidenceId) await markAnalysisFailed(evidenceId, raw).catch(() => undefined);
      setIsError(true);
      if (raw === "AI_FREE_LIMIT_REACHED") setMessage("اكتملت حصة AI المجانية اليوم. الشاهد محفوظ في Drive ويمكن تحليله لاحقًا.");
      else if (raw === "DRIVE_RECONNECT_REQUIRED") setMessage("انتهت جلسة Drive. اضغطي «حفظ وتحليل الشاهد» مرة أخرى لإعادة الربط تلقائيًا.");
      else setMessage("تعذر إكمال التحليل الآن. إذا كان الأصل محفوظًا في Drive فلن ينشئ أثري نسخة أخرى عند إعادة المحاولة.");
    } finally { setBusy(false); }
  }

  return <AppShell title="إضافة شاهد" subtitle="الأصل يبقى في Google Drive لديك">
    <section className="upload-card">
      <div className="upload-icon"><Icon name="upload" size={30}/></div>
      <h1>ارفعي الشاهد الأصلي</h1>
      <p>يتحقق أثري من التكرار أولًا، ثم يحفظ الأصل مرة واحدة في Google Drive ويحلله.</p>
      <label className="upload-picker"><input type="file" accept="image/jpeg,image/png,image/webp,.pdf,.docx" onChange={(e)=>chooseFile(e.target.files?.[0]??null)} disabled={busy}/><span>{file?file.name:"اختيار شاهد"}</span></label>
      {file ? <button className="primary-button full-button process-button" onClick={processEvidence} disabled={busy}><Icon name="sparkle" size={20}/>{busy?"جاري التحقق والحفظ…":"حفظ وتحليل الشاهد"}</button> : null}
      {message ? <div className={`flow-message ${isError?"is-error":""}`}>{message}</div> : null}
      <div className="privacy-row"><Icon name="check" size={18}/><span>لن ينشئ أثري سجلًا جديدًا لنفس الملف عند إعادة المحاولة.</span></div>
    </section>
  </AppShell>;
}
