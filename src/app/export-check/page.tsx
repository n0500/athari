"use client";
import { useEffect, useState } from "react";
import { EvidenceReport } from "@/components/EvidenceReport";
import { PortfolioPreviewDialog } from "@/components/PortfolioPreviewDialog";
const item = {id:"qa-only",title:"شاهد اختبار تصدير محلي",description:"نموذج اختبار محلي لتنسيق التقرير بعنوان Launch Code 2026.",impact:"", classifications:[],attachments:[{originalFileName:"مرفق اختبار.pdf",mimeType:"application/pdf",driveFileId:"qa-only-file"}]};
export default function Check(){
 const [report, setReport]=useState(false);useEffect(()=>{if(new URLSearchParams(window.location.search).has("inside"))setReport(true)},[]);const [preview,setPreview]=useState(false);
 return <><button onClick={()=>setReport(true)}>اختبار التقرير</button><button onClick={()=>setPreview(true)}>اختبار المعاينة</button>{preview?<PortfolioPreviewDialog onClose={()=>setPreview(false)}/>:null}{report?<EvidenceReport item={item} meta={{ownerName:"اختبار محلي"}} allowDownload onClose={()=>setReport(false)}/>:null}</>;
}
