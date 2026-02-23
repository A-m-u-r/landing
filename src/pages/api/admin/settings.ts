import type { APIRoute } from "astro";
import { isAdminAuthenticated, verifyCsrf } from "../../../lib/admin/auth";
import { error, json } from "../../../lib/admin/http";
import { updateSettings } from "../../../lib/admin/storage";

function normalizeText(value: unknown, max: number) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function normalizeUrl(value: unknown, max: number) {
  const raw = String(value || "").trim().slice(0, max);
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) {
    return "";
  }
  return raw;
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return error(401, "Требуется вход.");
  }
  if (!verifyCsrf(request, cookies)) {
    return error(403, "Неверный CSRF токен.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return error(400, "Некорректный JSON.");
  }

  const source = payload as {
    city?: unknown;
    socialLabel?: unknown;
    socialUrl?: unknown;
    socialText?: unknown;
  };

  const city = normalizeText(source?.city, 80);
  const socialLabel = normalizeText(source?.socialLabel, 24);
  const socialUrl = normalizeUrl(source?.socialUrl, 200);
  const socialText = normalizeText(source?.socialText, 120);
  const combined = `${city}${socialLabel}${socialUrl}${socialText}`;

  if (!city || !socialLabel || !socialUrl) {
    return error(400, "Укажите город, название соцсети и ссылку.");
  }
  if (combined.includes("\uFFFD")) {
    return error(400, "Текст поврежден кодировкой. Обновите страницу и попробуйте снова.");
  }

  await updateSettings({
    city,
    socialLabel,
    socialUrl,
    socialText: socialText || socialUrl.replace(/^https?:\/\//i, ""),
  });

  return json({ ok: true });
};
