import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "atomquest-dev-secret-key";

function base64url(data: string) {
  return Buffer.from(data)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export interface JwtPayload {
  userId: number;
  role: string;
}

export function sign(payload: JwtPayload): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now() }));
  const sig = createHmac("sha256", SECRET)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${body}.${sig}`;
}

export function verify(token: string): JwtPayload | null {
  try {
    const [header, body, sig] = token.split(".");
    const expected = createHmac("sha256", SECRET)
      .update(`${header}.${body}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    if (expected !== sig) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

export function generateToken(): string {
  return randomBytes(20).toString("hex");
}
