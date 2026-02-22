import type { APIRoute } from "astro";
import { isAdminAuthenticated, verifyCsrf } from "../../../lib/admin/auth";
import { error, json } from "../../../lib/admin/http";
import { clearAllAdminData } from "../../../lib/admin/storage";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return error(401, "Требуется вход.");
  }
  if (!verifyCsrf(request, cookies)) {
    return error(403, "Неверный CSRF токен.");
  }

  await clearAllAdminData();
  return json({ ok: true });
};
