type RestValue = {
  nullValue?: null;
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: Record<string, RestValue> };
};

function decodeValue(value: RestValue): unknown {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue?.values ?? []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue?.fields ?? {});
  return null;
}

function decodeFields(fields: Record<string, RestValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

/**
 * Read exactly one already-shared document using an ordinary HTTPS request.
 * Anonymous REST reads are still governed by the existing Firestore security rules.
 * This avoids waiting for Auth / WebChannel initialization on a public read-only page.
 */
export async function readPublicShareDocument(projectId: string, token: string, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/publicShares/${encodeURIComponent(token)}`,
      { signal: controller.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }
    );
    if (response.status === 403 || response.status === 404) return null;
    if (!response.ok) throw new Error("PUBLIC_SHARE_READ_FAILED");
    const document = await response.json() as { fields?: Record<string, RestValue> };
    if (!document.fields) throw new Error("INVALID_PUBLIC_SHARE_RESPONSE");
    return decodeFields(document.fields);
  } finally {
    clearTimeout(timeout);
  }
}
