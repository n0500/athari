"use client";
import { useEffect, useState } from "react";
import { PortfolioPreviewDialog } from "@/components/PortfolioPreviewDialog";

export default function PreviewControlsCheck() {
  const [open, setOpen] = useState(false);
  const [printed, setPrinted] = useState("");
  useEffect(() => {
    const original = window.print;
    window.print = () => {
      setPrinted(document.title);
      window.dispatchEvent(new Event("afterprint"));
    };
    return () => { window.print = original; };
  }, []);
  return <>
    <div className="ath" style={{ padding: 32 }}>
      <h1>اختبار مستقل لأزرار المعاينة</h1>
      <p>بيانات اختبار فقط. زر التصدير هنا يتحقق من استدعاء نافذة الحفظ واسم الملف.</p>
      <button type="button" onClick={() => setOpen(true)}>فتح المعاينة للاختبار</button>
    </div>
    {open ? <PortfolioPreviewDialog onClose={() => setOpen(false)} /> : null}
    {printed ? <output role="status" style={{position:"fixed",bottom:8,left:8,zIndex:90,padding:8,background:"white",border:"1px solid teal"}}>استدعاء حفظ PDF: {printed}</output> : null}
  </>;
}
