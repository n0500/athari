import { requireAuth } from "@/lib/firebase";
import { renderPdfForAiFallback } from "@/lib/pdfFallback";
import { AiAnalysis, FrameworkElement } from "@/types/athari";

const endpoint =
  process.env.NEXT_PUBLIC_ATHARI_AI_URL ??
  "https://athari-ai.t720711.workers.dev";

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function analysisIsEmpty(analysis: AiAnalysis) {
  return (
    !analysis.extractedFacts?.length &&
    !analysis.suggestedClassifications?.length &&
    !analysis.draftTitle?.trim() &&
    !analysis.draftDescription?.trim()
  );
}

async function requestAnalysis(
  file: File,
  framework: FrameworkElement[]
): Promise<AiAnalysis> {
  const user = requireAuth().currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");

  const idToken = await user.getIdToken();
  const form = new FormData();
  form.append("file", file);
  form.append("framework", JSON.stringify(framework));

  const response = await fetch(
    `${endpoint.replace(/\/$/, "")}/analyze`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: form,
    }
  );

  if (response.status === 429) {
    throw new Error("AI_FREE_LIMIT_REACHED");
  }

  if (!response.ok) {
    let apiError = "";
    try {
      const payload = (await response.json()) as { error?: string };
      apiError = payload.error ?? "";
    } catch {
      // Keep the status-based fallback below.
    }

    if (response.status === 422) {
      throw new Error(apiError || "AI_DOCUMENT_UNREADABLE");
    }

    throw new Error(apiError || `AI_ERROR_${response.status}`);
  }

  return response.json() as Promise<AiAnalysis>;
}

export async function analyzeEvidence(
  file: File,
  framework: FrameworkElement[]
): Promise<AiAnalysis> {
  let firstError: Error | null = null;

  try {
    const direct = await requestAnalysis(file, framework);

    if (!isPdf(file) || !analysisIsEmpty(direct)) {
      return direct;
    }

    firstError = new Error("AI_EMPTY_ANALYSIS");
  } catch (error) {
    const current =
      error instanceof Error ? error : new Error("AI_UNKNOWN_ERROR");

    if (
      !isPdf(file) ||
      current.message === "AI_FREE_LIMIT_REACHED" ||
      current.message === "AUTH_REQUIRED"
    ) {
      throw current;
    }

    firstError = current;
  }

  let fallbackImage: File | null = null;

  try {
    fallbackImage = await renderPdfForAiFallback(file);
  } catch (error) {
    const current =
      error instanceof Error ? error : new Error("PDF_VISUAL_FALLBACK_FAILED");
    throw current;
  }

  if (!fallbackImage) {
    throw firstError ?? new Error("AI_DOCUMENT_UNREADABLE");
  }

  const visual = await requestAnalysis(fallbackImage, framework);

  if (analysisIsEmpty(visual)) {
    throw new Error("AI_VISUAL_ANALYSIS_EMPTY");
  }

  return visual;
}
