import { requireAuth } from "@/lib/firebase";
import { AiAnalysis, FrameworkElement } from "@/types/athari";

const endpoint = process.env.NEXT_PUBLIC_ATHARI_AI_URL;

export async function analyzeEvidence(
  file: File,
  framework: FrameworkElement[]
): Promise<AiAnalysis> {
  if (!endpoint) throw new Error("AI_NOT_CONFIGURED");

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
    throw new Error(`AI_ERROR_${response.status}`);
  }

  return response.json() as Promise<AiAnalysis>;
}
