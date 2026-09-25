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
    Vary: "Origin",
  };
}

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGINS.split(",")
    .map((v) => v.trim())
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

  const obj = value as Record<string, unknown>;

  if ("response" in obj) {
    const response = obj.response;
    if (typeof response === "string") {
      return JSON.parse(stripCodeFence(response));
    }
    if (response && typeof response === "object") {
      return response;
    }
  }

  const choices = obj.choices;
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
  const allowedById = new Map(framework.map((e) => [e.id, e]));
  const allowedByName = new Map(framework.map((e) => [e.officialName, e]));

  const facts = Array.isArray(raw.extractedFacts)
    ? raw.extractedFacts
        .slice(0, 30)
        .map((item) => {
          const x =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};
          return {
            fact: asString(x.fact),
            support: asString(x.support),
          };
        })
        .filter((x) => x.fact)
    : [];

  const classifications = Array.isArray(raw.suggestedClassifications)
    ? raw.suggestedClassifications
        .slice(0, 2)
        .map((item) => {
          const x =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};
          const requestedId = asString(x.elementId);
          const requestedName = asString(x.elementName);
          const verified =
            allowedById.get(requestedId) ||
            allowedByName.get(requestedName);

          if (!verified) return null;

          return {
            elementId: verified.id,
            elementName: verified.officialName,
            reason: asString(x.reason),
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
  const missingInformation = question
    ? {
        question,
        reason: asString(missing?.reason),
      }
    : null;

  return {
    extractedFacts: facts,
    suggestedClassifications:
      framework.length > 0 ? classifications : [],
    draftTitle: asString(raw.draftTitle),
    draftDescription: asString(raw.draftDescription),
    draftImpact: asString(raw.draftImpact),
    missingInformation,
    warnings: Array.isArray(raw.warnings)
      ? raw.warnings
          .slice(0, 10)
          .map(asString)
          .filter(Boolean)
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
              const x =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};
              return {
                id: asString(x.id),
                officialName: asString(x.officialName),
                description: asString(x.description),
              };
            })
            .filter((e) => e.id && e.officialName);
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

      const result = Array.isArray(converted) ? converted[0] : converted;

      const documentText =
        result &&
        "data" in result &&
        typeof result.data === "string"
          ? result.data
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
- "support" must briefly identify where the fact came from in the evidence.
- Use only performance elements in VERIFIED_FRAMEWORK.
- If VERIFIED_FRAMEWORK is empty, suggestedClassifications must be [].
- Use at most two classification suggestions.
- draftImpact must contain only impact directly supported by evidence.
- If no impact is documented, write a neutral Arabic sentence stating that documented impact is not available yet.
- Ask at most ONE essential missing-information question.
- Never score or rate the teacher.
- Return JSON only, with no Markdown fence and no commentary.

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
              "Return one valid JSON object only. Evidence-grounded. Never fabricate.",
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
