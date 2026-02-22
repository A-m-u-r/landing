import type { APIRoute } from "astro";
import { isAdminAuthenticated, verifyCsrf } from "../../../../lib/admin/auth";
import { error, json } from "../../../../lib/admin/http";
import { deleteReviewRecord } from "../../../../lib/admin/storage";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return error(401, "Требуется вход.");
  }
  if (!verifyCsrf(request, cookies)) {
    return error(403, "Неверный CSRF токен.");
  }

  const id = params.id;
  if (!id) {
    return error(400, "ID обязателен.");
  }

  const removed = await deleteReviewRecord(id);
  if (!removed) {
    return error(404, "Отзыв не найден.");
  }
  return json({ ok: true });
};
