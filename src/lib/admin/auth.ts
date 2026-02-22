import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";
import type { APIContext } from "astro";
import {
  CSRF_COOKIE,
  CSRF_TTL_SECONDS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "./config";

interface SessionPayload {
  sub: "admin";
  exp: number;
  nonce: string;
}

interface AttemptState {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, AttemptState>();
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};

function readEnv(name: string) {
  return process.env[name] || viteEnv[name] || "";
}

function isProduction() {
  return readEnv("NODE_ENV") === "production";
}

function getSessionSecret() {
  const secret = readEnv("SESSION_SECRET");
  if (secret.length >= 32) {
    return secret;
  }
  if (!isProduction()) {
    return "dev-only-session-secret-change-me-before-production";
  }
  throw new Error("SESSION_SECRET must be set and at least 32 characters long.");
}

function safeEqualString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPasswordHash(password: string, encoded: string) {
  const parts = encoded.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const salt = parts[1];
  const expected = parts[2];
  const actual = scryptSync(password, salt, 64).toString("hex");
  return safeEqualString(actual, expected);
}

export function verifyAdminPassword(password: string) {
  const encoded = readEnv("ADMIN_PASSWORD_HASH");
  if (encoded) {
    return verifyPasswordHash(password, encoded);
  }

  const fallback = readEnv("ADMIN_PASSWORD");
  if (!fallback) {
    throw new Error("Set ADMIN_PASSWORD_HASH (recommended) or ADMIN_PASSWORD.");
  }
  return safeEqualString(password, fallback);
}

function signPayload(payloadPart: string) {
  return createHmac("sha256", getSessionSecret()).update(payloadPart).digest("base64url");
}

export function createSessionToken() {
  const payload: SessionPayload = {
    sub: "admin",
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    nonce: randomBytes(12).toString("hex"),
  };
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signaturePart = signPayload(payloadPart);
  return `${payloadPart}.${signaturePart}`;
}

export function parseSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) {
    return null;
  }
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }
  const expected = signPayload(payloadPart);
  if (!safeEqualString(expected, signaturePart)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as SessionPayload;
    if (payload.sub !== "admin" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function isAdminAuthenticated(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  return !!parseSessionToken(token);
}

export function setSessionCookie(cookies: AstroCookies, token: string) {
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction(),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction(),
  });
}

export function ensureCsrfToken(cookies: AstroCookies) {
  let token = cookies.get(CSRF_COOKIE)?.value;
  if (!token) {
    token = randomBytes(32).toString("hex");
    cookies.set(CSRF_COOKIE, token, {
      path: "/",
      httpOnly: false,
      sameSite: "strict",
      secure: isProduction(),
      maxAge: CSRF_TTL_SECONDS,
    });
  }
  return token;
}

export function verifyCsrf(request: Request, cookies: AstroCookies) {
  const headerToken = request.headers.get("x-csrf-token") || "";
  const cookieToken = cookies.get(CSRF_COOKIE)?.value || "";
  if (!headerToken || !cookieToken) {
    return false;
  }
  return safeEqualString(headerToken, cookieToken);
}

export function clientKey(context: APIContext) {
  const forwarded = context.request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return context.clientAddress || "unknown";
}

export function getLoginLimit(ip: string) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.delete(ip);
    return { blocked: false, retryAfterSec: 0 };
  }
  if (current.count >= LOGIN_MAX_ATTEMPTS) {
    return { blocked: true, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { blocked: false, retryAfterSec: 0 };
}

export function markLoginFailure(ip: string) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
  loginAttempts.set(ip, current);
}

export function clearLoginFailures(ip: string) {
  loginAttempts.delete(ip);
}
