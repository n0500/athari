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
  files: File[],
  framework: FrameworkElement[]
): Promise<AiAnalysis> {
  const user = requireAuth().currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");

  const idToken = await user.getIdToken();
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  form.append("framework", JSON.stringify(framework));

  const response = await fetch(`${endpoint.replace(/\/$/, "")}/analyze`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  });

  if (response.status === 429) {
    throw new Error("AI_FREE_LIMIT_REACHED");
  }

  if (!response.ok) {
    let apiError = "";
    try {
      const payload = (await response.json()) as { error?: string };
      apiError = payload.error ?? "";
    } catch {
      // Keep status-based fallback below.
    }

    if (response.status === 422) {
      throw new Error(apiError || "AI_DOCUMENT_UNREADABLE");
    }

    throw new Error(apiError || `AI_ERROR_${response.status}`);
  }

  return response.json() as Promise<AiAnalysis>;
}

async function replaceUnreadablePdfs(
  files: File[],
  unreadableNames?: string[]
) {
  const unreadable = new Set(unreadableNames ?? []);
  const replaceAllPdfs = unreadable.size === 0;
  let changed = false;

  const normalized: File[] = [];

  for (const file of files) {
    const shouldConvert =
      isPdf(file) && (replaceAllPdfs || unreadable.has(file.name));

    if (!shouldConvert) {
      normalized.push(file);
      continue;
    }

    try {
      const fallback = await renderPdfForAiFallback(file);
      if (fallback) {
        normalized.push(fallback);
        changed = true;
      } else {
        normalized.push(file);
      }
    } catch {
      normalized.push(file);
    }
  }

  return { normalized, changed };
}

export async function analyzeEvidence(
  input: File | File[],
  framework: FrameworkElement[]
): Promise<AiAnalysis> {
  const files = Array.isArray(input) ? input : [input];
  if (!files.length) throw new Error("FILE_REQUIRED");

  let direct: AiAnalysis | null = null;
  let directError: Error | null = null;

  try {
    direct = await requestAnalysis(files, framework);
  } catch (error) {
    const current =
      error instanceof Error ? error : new Error("AI_UNKNOWN_ERROR");

    if (
      current.message === "AI_FREE_LIMIT_REACHED" ||
      current.message === "AUTH_REQUIRED"
    ) {
      throw current;
    }

    directError = current;
  }

  const unreadablePdfs = direct?.unreadableFiles?.filter((name) =>
    files.some((file) => file.name === name && isPdf(file))
  );

  const shouldTryVisualFallback =
    files.some(isPdf) &&
    (!direct ||
      analysisIsEmpty(direct) ||
      Boolean(unreadablePdfs?.length));

  if (!shouldTryVisualFallback && direct) {
    return direct;
  }

  if (shouldTryVisualFallback) {
    const { normalized, changed } = await replaceUnreadablePdfs(
      files,
      unreadablePdfs
    );

    if (changed) {
      const visual = await requestAnalysis(normalized, framework);
      if (!analysisIsEmpty(visual)) return visual;
    }
  }

  if (direct) return direct;
  throw directError ?? new Error("AI_DOCUMENT_UNREADABLE");
}
