import { createRemoteJWKSet, jwtVerify } from "jose";

type Env = {
  AI: Ai;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
};

const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

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

function parseResult(value: unknown) {
  if (typeof value === "object" && value && "response" in value) {
    return JSON.parse(String((value as { response: unknown }).response));
  }
  if (typeof value === "string") return JSON.parse(value);
  return value;
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

      let framework: unknown[] = [];
      try {
        const parsed = JSON.parse(frameworkText);
        if (Array.isArray(parsed)) framework = parsed.slice(0, 30);
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

Rules:
- Never invent results, impact, dates, counts, people, organizations or achievements.
- Extract only facts supported by the evidence.
- If no verified framework is supplied, suggestedClassifications must be [].
- Use at most two classifications from the supplied framework.
- draftImpact must contain only supported impact; otherwise say no documented impact is available yet.
- Ask at most one essential missing-information question.
- Do not score the teacher.
- Return valid JSON only.

Return this exact shape:
{
  "extractedFacts":[{"fact":"","support":""}],
  "suggestedClassifications":[{"elementId":"","elementName":"","reason":""}],
  "draftTitle":"",
  "draftDescription":"",
  "draftImpact":"",
  "missingInformation":null,
  "warnings":[]
}

VERIFIED FRAMEWORK:
${JSON.stringify(framework)}

EVIDENCE:
${evidence}
`;

      const result = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content: "Return evidence-grounded JSON only. Never fabricate.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_completion_tokens: 1200,
        response_format: { type: "json_object" },
      });

      return Response.json(parseResult(result), {
        headers: {
          ...cors(origin),
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "UNKNOWN_ERROR";
      const status = message === "UNAUTHORIZED" ? 401 : 500;
      return Response.json(
        { error: message },
        { status, headers: cors(origin) }
      );
    }
  },
};
