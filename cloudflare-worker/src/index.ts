import { createRemoteJWKSet, jwtVerify } from "jose";

type Env = {
  AI: Ai;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
};

const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Analysis = {
  extractedFacts: Array<{ fact: string; support: string }>;
  suggestedClassifications: Array<{
    elementId: string;
    elementName: string;
    reason: string;
  }>;
  draftTitle: string;
  draftDescription: string;
  draftImpact: string;
  missingInformation: null | { question: string; reason: string };
  warnings: string[];
};

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
}

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGINS
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowed.includes(origin) ? origin : allowed[0] || "";
}

async function verifyFirebaseToken(request: Request, env: Env) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");

  const token = header.slice(7);
  const jwks = createRemoteJWKSet(
    new URL(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    )
  );

  const issuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: env.FIREBASE_PROJECT_ID,
  });

  if (!payload.sub) throw new Error("UNAUTHORIZED");
  return payload.sub;
}

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseModelJson(value: unknown): unknown {
  if (typeof value === "string") {
    return JSON.parse(stripCodeFence(value));
  }

  if (!value || typeof value !== "object") {
    throw new Error("AI_INVALID_OUTPUT");
  }

  const object = value as Record<string, unknown>;

  if ("response" in object) {
    const response = object.response;
    if (typeof response === "string") {
      return JSON.parse(stripCodeFence(response));
    }
    if (response && typeof response === "object") {
      return response;
    }
  }

  const choices = object.choices;
  if (Array.isArray(choices) && choices.length) {
    const first = choices[0] as Record<string, unknown>;
    const message =
      first && typeof first.message === "object" && first.message
        ? (first.message as Record<string, unknown>)
        : undefined;

    const content = message?.content;
    if (typeof content === "string") {
      return JSON.parse(stripCodeFence(content));
    }
  }

  throw new Error("AI_INVALID_OUTPUT");
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeAnalysis(
  value: unknown,
  framework: Array<{
    id: string;
    officialName: string;
    description?: string;
  }>
): Analysis {
  if (!value || typeof value !== "object") {
    throw new Error("AI_INVALID_OUTPUT");
  }

  const raw = value as Record<string, unknown>;
  const allowedById = new Map(framework.map((item) => [item.id, item]));
  const allowedByName = new Map(
    framework.map((item) => [item.officialName, item])
  );

  const extractedFacts = Array.isArray(raw.extractedFacts)
    ? raw.extractedFacts
        .slice(0, 30)
        .map((item) => {
          const fact =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};
          return {
            fact: asString(fact.fact),
            support: asString(fact.support),
          };
        })
        .filter((item) => item.fact)
    : [];

  const suggestedClassifications = Array.isArray(
    raw.suggestedClassifications
  )
    ? raw.suggestedClassifications
        .slice(0, 3)
        .map((item) => {
          const suggestion =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};

          const requestedId = asString(suggestion.elementId);
          const requestedName = asString(suggestion.elementName);

          const verified =
            allowedById.get(requestedId) ||
            allowedByName.get(requestedName);

          if (!verified) return null;

          return {
            elementId: verified.id,
            elementName: verified.officialName,
            reason: asString(suggestion.reason),
          };
        })
        .filter(Boolean) as Analysis["suggestedClassifications"]
    : [];

  const missing =
    raw.missingInformation &&
    typeof raw.missingInformation === "object"
      ? (raw.missingInformation as Record<string, unknown>)
      : null;

  const question = missing ? asString(missing.question) : "";

  return {
    extractedFacts,
    suggestedClassifications:
      framework.length > 0 ? suggestedClassifications : [],
    draftTitle: asString(raw.draftTitle),
    draftDescription: asString(raw.draftDescription),
    draftImpact: asString(raw.draftImpact),
    missingInformation: question
      ? {
          question,
          reason: asString(missing?.reason),
        }
      : null,
    warnings: Array.isArray(raw.warnings)
      ? raw.warnings.slice(0, 10).map(asString).filter(Boolean)
      : [],
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(origin) });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/analyze") {
      return Response.json(
        { error: "NOT_FOUND" },
        { status: 404, headers: cors(origin) }
      );
    }

    try {
      await verifyFirebaseToken(request, env);

      const form = await request.formData();
      const file = form.get("file");
      const frameworkText = String(form.get("framework") || "[]");

      if (!(file instanceof File)) {
        return Response.json(
          { error: "FILE_REQUIRED" },
          { status: 400, headers: cors(origin) }
        );
      }

      if (file.size > MAX_FILE_BYTES) {
        return Response.json(
          { error: "FILE_TOO_LARGE" },
          { status: 413, headers: cors(origin) }
        );
      }

      let framework: Array<{
        id: string;
        officialName: string;
        description?: string;
      }> = [];

      try {
        const parsed = JSON.parse(frameworkText);
        if (Array.isArray(parsed)) {
          framework = parsed
            .slice(0, 30)
            .map((item) => {
              const data =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};

              return {
                id: asString(data.id),
                officialName: asString(data.officialName),
                description: asString(data.description),
              };
            })
            .filter((item) => item.id && item.officialName);
        }
      } catch {
        framework = [];
      }

      const converted = await env.AI.toMarkdown(
        {
          name: file.name,
          blob: new Blob([await file.arrayBuffer()], {
            type: file.type || "application/octet-stream",
          }),
        },
        {
          conversionOptions: {
            output: { format: "markdown" },
            pdf: { metadata: false },
          },
        }
      );

      const conversionResult = Array.isArray(converted)
        ? converted[0]
        : converted;

      const documentText =
        conversionResult &&
        "data" in conversionResult &&
        typeof conversionResult.data === "string"
          ? conversionResult.data
          : "";

      if (!documentText.trim()) {
        return Response.json(
          { error: "DOCUMENT_COULD_NOT_BE_READ" },
          { status: 422, headers: cors(origin) }
        );
      }

      const evidence = documentText.slice(0, 120000);

      const prompt = `
You are Athari, an evidence-grounded assistant for teachers.

NON-NEGOTIABLE RULES:
- Never invent results, impact, dates, counts, people, organizations, percentages, or achievements.
- Extract only facts directly supported by the supplied evidence.
- "support" must briefly identify where the fact came from in the evidence, using a short Arabic label whenever possible.
- Use only performance elements in VERIFIED_FRAMEWORK.
- If VERIFIED_FRAMEWORK is empty, suggestedClassifications must be [].
- Suggest up to THREE classification elements only when each one is directly supported by the evidence.
- Order suggestedClassifications from strongest evidence match to weakest supported match. The first suggestion is the recommended primary classification.
- Each classification reason must independently explain the exact evidence that supports that element.
- Do not add a classification merely because it is thematically related; there must be direct support in the evidence.
- draftImpact must contain only impact directly supported by evidence.
- If no impact is documented, write exactly: "لا يوجد أثر موثق متاح حاليًا."
- Ask at most ONE essential missing-information question.
- Never score or rate the teacher.
- Return JSON only, with no Markdown fence and no commentary.

ARABIC OUTPUT RULES:
- All user-facing generated text must be in clear Modern Standard Arabic, even when the evidence is in English.
- This applies to extractedFacts.fact, extractedFacts.support, suggestedClassifications.reason, draftTitle, draftDescription, draftImpact, missingInformation.question, missingInformation.reason, and warnings.
- Keep official performance element names exactly as they appear in VERIFIED_FRAMEWORK.
- Proper nouns, organization names, product names, and original document titles may remain in their original language only when that preserves accuracy.
- Do not copy long English sentences from the evidence into user-facing fields; summarize them faithfully in Arabic.
- Preserve the distinction between facts explicitly documented in the evidence and draft wording suggested by Athari.
- Do not add an Arabic fact unless its meaning is directly supported by the evidence.

Required JSON shape:
{
  "extractedFacts":[{"fact":"","support":""}],
  "suggestedClassifications":[{"elementId":"","elementName":"","reason":""}],
  "draftTitle":"",
  "draftDescription":"",
  "draftImpact":"",
  "missingInformation":null,
  "warnings":[]
}

VERIFIED_FRAMEWORK:
${JSON.stringify(framework)}

EVIDENCE:
${evidence}
`;

      const aiResult = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content:
              "Return one valid JSON object only. Evidence-grounded. Never fabricate. Write all user-facing generated text in clear Modern Standard Arabic, while preserving official framework names and necessary proper nouns exactly.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_completion_tokens: 1200,
        chat_template_kwargs: {
          enable_thinking: false,
        },
      });

      const parsed = parseModelJson(aiResult);
      const safe = sanitizeAnalysis(parsed, framework);

      return Response.json(safe, {
        headers: {
          ...cors(origin),
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "UNKNOWN_ERROR";

      const status =
        message === "UNAUTHORIZED"
          ? 401
          : /quota|limit|too many|429/i.test(message)
          ? 429
          : 500;

      return Response.json(
        { error: message },
        { status, headers: cors(origin) }
      );
    }
  },
};
