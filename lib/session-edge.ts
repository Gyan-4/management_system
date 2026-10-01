const secret = () =>
  process.env.AUTH_SECRET ||
  process.env.MONGODB_URI ||
  "constructflow-development-secret";

type SessionPayload = {
  id: string;
  role: string;
  name: string;
  exp: number;
};

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlToString(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function signatureFor(encoded: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded),
  );

  let binary = "";
  for (const byte of new Uint8Array(signature)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function verifySessionEdge(token: string): Promise<SessionPayload | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  try {
    const expected = await signatureFor(encoded);
    if (signature !== expected) return null;

    const payload = JSON.parse(base64UrlToString(encoded)) as SessionPayload;

    if (
      !payload ||
      typeof payload.id !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
