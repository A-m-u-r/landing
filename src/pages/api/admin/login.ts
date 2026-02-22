import type { APIRoute } from "astro";
import {
  clearLoginFailures,
  clientKey,
  createSessionToken,
  getLoginLimit,
  markLoginFailure,
  setSessionCookie,
  verifyAdminPassword,
  verifyCsrf,
} from "../../../lib/admin/auth";
import { error, json } from "../../../lib/admin/http";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const ip = clientKey(context);
  const limit = getLoginLimit(ip);
  if (limit.blocked) {
    return error(429, `Слишком много попыток. Повторите через ${limit.retryAfterSec} сек.`);
  }

  if (!verifyCsrf(context.request, context.cookies)) {
    return error(403, "Неверный CSRF токен.");
  }

  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return error(400, "Некорректный JSON.");
  }

  const password =
    payload && typeof payload === "object" && "password" in payload ? String((payload as { password?: unknown }).password || "") : "";

  if (!password) {
    return error(400, "Пароль обязателен.");
  }

  try {
    const valid = verifyAdminPassword(password);
    if (!valid) {
      markLoginFailure(ip);
      return error(401, "Неверный пароль.");
    }
  } catch {
    return error(500, "Сервер админки не настроен.");
  }

  clearLoginFailures(ip);
  setSessionCookie(context.cookies, createSessionToken());
  return json({ ok: true });
};
