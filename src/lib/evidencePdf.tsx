"use client";

import { Document, Page, View, Text, Link, Image, Svg, Circle, Path, Font, StyleSheet, pdf } from "@react-pdf/renderer";
import type { ReportEvidence, ReportMeta } from "@/components/EvidenceReport";
import { requirementsForElement } from "@/data/mandatory-requirements";
import { excellenceIndicatorsFor } from "@/lib/excellenceIndicators";
import { attachmentKind, attachmentTitle } from "@/lib/attachmentDisplay";

export type PdfReportInput = {
  item: ReportEvidence;
  meta: ReportMeta;
  printedOn: string;
  images?: Array<{ index: number; src?: string }>;
};

export function registerReportFonts(base = "/report-fonts") {
  Font.register({ family: "AthariTajawal", fonts: [
    { src: `${base}/Tajawal-Regular.ttf`, fontWeight: 400 },
    { src: `${base}/Tajawal-Bold.ttf`, fontWeight: 700 },
  ] });
  Font.registerHyphenationCallback((word) => [word]);
}

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: "AthariTajawal", fontSize: 10.5, lineHeight: 1.6, color: "#1e293b", direction: "rtl", textAlign: "right" },
  row: { flexDirection: "row-reverse" },
  org: { width: "65%", fontSize: 10, fontWeight: 700 },
  doc: { width: "35%", fontSize: 9, textAlign: "left", color: "#475569" },
  rule: { borderBottomWidth: 1.4, borderBottomColor: "#0f4e59", marginTop: 10, marginBottom: 12 },
  titleBox: { alignItems: "center", marginBottom: 11 },
  pill: { fontSize: 9, color: "#0f4e59", backgroundColor: "#e6f6f2", padding: "3 10", borderRadius: 9, marginBottom: 6 },
  title: { fontSize: 16, fontWeight: 700, color: "#0f213d", textAlign: "center" },
  table: { borderTopWidth: 0.6, borderLeftWidth: 0.6, borderRightWidth: 0.6, borderColor: "#d6dee8", marginBottom: 12 },
  tableRow: { flexDirection: "row-reverse", borderBottomWidth: 0.6, borderColor: "#d6dee8" },
  label: { width: "31%", backgroundColor: "#f3f6fa", padding: "5 7", color: "#0f4e59", fontWeight: 700, borderLeftWidth: 0.6, borderColor: "#d6dee8" },
  value: { width: "69%", padding: "5 7" },
  section: { marginBottom: 10 },
  heading: { fontSize: 11, fontWeight: 700, color: "#0f4e59", borderRightWidth: 3, borderRightColor: "#2fc9b0", paddingRight: 6, marginBottom: 5 },
  impact: { padding: 8, borderWidth: 0.6, borderColor: "#d6dee8", borderRadius: 6, backgroundColor: "#fbfcfe" },
  listRow: { flexDirection: "row-reverse", marginBottom: 4, alignItems: "flex-start" },
  check: { width: 13, marginLeft: 6, marginTop: 2 },
  listText: { flex: 1 },
  gallery: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  picture: { width: 86, height: 64, objectFit: "contain", borderWidth: 0.5, borderColor: "#d6dee8", borderRadius: 5 },
  missingPicture: { width: 86, minHeight: 40, padding: 5, borderWidth: 0.5, borderColor: "#d6dee8", color: "#0f4e59", fontSize: 8 },
  file: { flexDirection: "row-reverse", alignItems: "center", borderWidth: 0.6, borderColor: "#d6dee8", borderRadius: 6, padding: 6, marginBottom: 5 },
  number: { width: 20, textAlign: "center", color: "#0f4e59", backgroundColor: "#eef3f8", marginLeft: 6, borderRadius: 4 },
  fileName: { flex: 1, color: "#0f4e59", textDecoration: "underline" },
  kind: { fontSize: 8, marginRight: 6, color: "#475569" },
  signature: { width: "50%", textAlign: "center", borderWidth: 0.6, borderColor: "#d6dee8" },
  signatureHead: { backgroundColor: "#f3f6fa", color: "#0f4e59", fontWeight: 700, padding: 5 },
  signatureName: { fontWeight: 700, padding: 6 },
  signatureSpace: { fontSize: 8, color: "#94a3b8", paddingTop: 17, paddingBottom: 4 },
  footer: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 10, borderTopWidth: 0.5, borderColor: "#d6dee8", paddingTop: 5, color: "#475569", fontSize: 8 },
});

function fileUrl(id: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={s.tableRow} wrap={false}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>;
}

export function EvidencePdfDocument({ item, meta, printedOn, images = [] }: PdfReportInput) {
  const ordered = [...item.classifications].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const primary = ordered[0];
  const role = [meta.specialization, meta.rank].filter(Boolean).join(" · ");
  const impact = item.impact === "لا يوجد أثر موثق متاح حاليًا." ? "" : item.impact;
  const indicators = excellenceIndicatorsFor({ highlight: item.highlight, description: item.description, impact }).slice(0, 5);
  const requirements = ordered.flatMap((entry) => requirementsForElement(entry.elementId).filter((r) => entry.requirementIds?.includes(r.id)));
  const count = item.attachments.length;
  const countText = count === 1 ? "ملف واحد" : count === 2 ? "ملفان" : count <= 10 ? `${count} ملفات` : `${count} ملفًا`;
  return <Document title={item.title} author={meta.ownerName} language="ar-SA">
    <Page size="A4" style={s.page}>
      <View style={s.row} wrap={false}>
        <View style={s.org}><Text style={{textAlign: "right"}}>المملكة العربية السعودية</Text><Text>{meta.ministry || "وزارة التعليم"}</Text>{meta.department ? <Text>{meta.department}</Text> : null}{meta.school ? <Text>{meta.school}</Text> : null}</View>
        <View style={s.doc}><Text style={{ fontWeight: 700, color: "#0f4e59", fontSize: 11, textAlign: "left" }}>تقرير شاهد</Text>{meta.academicYear ? <Text style={{textAlign: "left"}}>العام الدراسي {meta.academicYear}</Text> : null}<Text style={{textAlign: "left"}}>التاريخ: {printedOn}</Text></View>
      </View>
      <View style={s.rule} />
      <View style={s.titleBox} wrap={false}>{primary ? <Text style={s.pill}>{primary.elementName}</Text> : null}<Text style={s.title}>{item.title}</Text></View>
      <View style={s.table}>
        <Info label="اسم المعلمة" value={meta.ownerName || "—"} />
        {role ? <Info label="التخصص / الرتبة" value={role} /> : null}
        <Info label="عنصر التقييم" value={primary?.elementName || "—"} />
        {ordered.length > 1 ? <Info label="عناصر داعمة" value={ordered.slice(1).map((e) => e.elementName).join("، ")} /> : null}
        <Info label="عدد المرفقات" value={countText} />
      </View>
      {item.description ? <View style={s.section}><Text style={s.heading} minPresenceAhead={36}>وصف التنفيذ</Text><Text>{"\u202B" + item.description + "\u202C"}</Text></View> : null}
      {impact ? <View style={s.section}><Text style={s.heading} minPresenceAhead={36}>الأثر</Text><View style={s.impact}><Text>{"\u202B" + impact + "\u202C"}</Text></View></View> : null}
      {indicators.length ? <View style={s.section}><Text style={s.heading} minPresenceAhead={36}>مؤشرات التميز</Text>{indicators.map((line, i) => <Text key={i} style={{ marginBottom: 3 }}>{line}</Text>)}</View> : null}
      {requirements.length ? <View style={s.section}><Text style={s.heading} minPresenceAhead={36}>بنود المتابعة الموثقة</Text>{requirements.map((r, i) => <View style={s.listRow} key={`${r.id}-${i}`} wrap={false}><Svg style={s.check} viewBox="0 0 18 18" height={13}><Circle cx="9" cy="9" r="9" fill="#1f9d6a" /><Path d="M5 9l2.5 2.5L13 6" stroke="white" strokeWidth={1.8} fill="none" /></Svg><Text style={s.listText}>{r.label}</Text></View>)}</View> : null}
      {images.length ? <View style={s.section} wrap={false}><Text style={s.heading}>صور من الشاهد</Text><View style={s.gallery}>{images.map(({ index, src }) => src ? <Image key={index} src={src} style={s.picture} /> : <Link key={index} src={fileUrl(item.attachments[index].driveFileId!)} style={s.missingPicture}>عرض الصورة من المرفق {index + 1}</Link>)}</View></View> : null}
      {count ? <View style={s.section}><Text style={s.heading} minPresenceAhead={36}>المرفقات</Text>{item.attachments.map((a, i) => <View key={i} style={s.file} wrap={false}><Text style={s.number}>{i + 1}</Text>{a.driveFileId ? <Link src={fileUrl(a.driveFileId)} style={s.fileName}>{attachmentTitle(a.originalFileName, meta.ownerName, i)}</Link> : <Text style={{ flex: 1 }}>{attachmentTitle(a.originalFileName, meta.ownerName, i)}</Text>}<Text style={s.kind}>{attachmentKind(a.mimeType, a.originalFileName).label}</Text></View>)}</View> : null}
      <View style={s.row} wrap={false}>{[{ label: "المعلمة", name: meta.ownerName, space: "التوقيع" }, { label: "مديرة المدرسة", name: meta.principalName, space: "التوقيع والختم" }].map((v) => <View key={v.label} style={s.signature}><Text style={s.signatureHead}>{v.label}</Text><Text style={s.signatureName}>{v.name || "—"}</Text><Text style={s.signatureSpace}>{v.space}</Text></View>)}</View>
      <View style={s.footer} wrap={false}><Text>أعد عبر أثري</Text><Text>{printedOn}</Text></View>
    </Page>
  </Document>;
}

let pdfQueue: Promise<void> = Promise.resolve();
let fontsRegistered = false;
export function createEvidencePdf(input: PdfReportInput) {
  const result = pdfQueue.then(() => {
    if (!fontsRegistered) { registerReportFonts(); fontsRegistered = true; }
    return pdf(<EvidencePdfDocument {...input} />).toBlob();
  });
  pdfQueue = result.then(() => {}, () => {});
  return result;
}

/** Images are read only; missing previews remain accessible through their attachment links. */
export async function loadReportImages(item: ReportEvidence, token: string | null): Promise<NonNullable<PdfReportInput["images"]>> {
  const candidates = item.attachments.map((attachment, index) => ({ attachment, index }))
    .filter(({ attachment }) => attachment.driveFileId && attachmentKind(attachment.mimeType, attachment.originalFileName).tone === "img").slice(0, 6);
  return Promise.all(candidates.map(async ({ attachment, index }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    try {
      const id = encodeURIComponent(attachment.driveFileId!);
      const response = await fetch(token ? `https://www.googleapis.com/drive/v3/files/${id}?alt=media` : `https://drive.google.com/thumbnail?id=${id}&sz=w1000`, {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}), signal: controller.signal,
      });
      if (!response.ok || Number(response.headers.get("content-length")) > 8 * 1024 * 1024) return { index };
      const blob = await response.blob();
      if (blob.size > 8 * 1024 * 1024) return { index };
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { index, src };
    } catch { return { index }; }
    finally { clearTimeout(timeout); controller.abort(); }
  }));
}
