import type { APIRoute } from "astro";
import { clearSessionCookie, isAdminAuthenticated, verifyCsrf } from "../../../lib/admin/auth";
import { error, json } from "../../../lib/admin/http";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return error(401, "Требуется вход.");
  }
  if (!verifyCsrf(request, cookies)) {
    return error(403, "Неверный CSRF токен.");
  }
  clearSessionCookie(cookies);
  return json({ ok: true });
};
