export function safeId(value: string) {
  if (!/^[\w-]{1,150}$/.test(value)) throw Error("Invalid document id");
  return value;
}
export function requireOrigin(request: Request, origin: string) {
  if (request.headers.get("origin") !== origin)
    throw Error("Invalid request origin");
}
export function validateClaims(
  claims: Record<string, unknown>,
  project: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (
    claims.aud !== project ||
    claims.iss !== `https://securetoken.google.com/${project}` ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.sub.length > 128 ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now ||
    typeof claims.auth_time !== "number" ||
    claims.auth_time > now
  )
    throw Error("Invalid Firebase token");
  return {
    uid: safeId(claims.sub),
    expiresAt: claims.exp,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
export type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};
function encode(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw Error("Invalid number");
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encode) } };
  if (typeof value === "object" && value)
    return {
      mapValue: { fields: encodeFields(value as Record<string, unknown>) },
    };
  throw Error("Unsupported Firestore value");
}
export function encodeFields(
  value: Record<string, unknown>,
): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([key, v]) => [key, encode(v)]),
  );
}
export function decodeFields(
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw Error("Unsafe field");
    result[key] =
      value.stringValue ??
      (value.integerValue !== undefined
        ? Number(value.integerValue)
        : (value.doubleValue ??
          value.booleanValue ??
          (value.arrayValue
            ? (value.arrayValue.values ?? []).map((v) => decodeFields({ v }).v)
            : value.mapValue
              ? decodeFields(value.mapValue.fields ?? {})
              : null)));
  }
  return result;
}
