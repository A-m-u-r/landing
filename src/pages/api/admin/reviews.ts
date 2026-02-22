import type { APIRoute } from "astro";
import { isAdminAuthenticated, verifyCsrf } from "../../../lib/admin/auth";
import { error, json } from "../../../lib/admin/http";
import { addReviewRecord } from "../../../lib/admin/storage";

function normalizeText(value: unknown, max = 1200) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
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
    author?: unknown;
    subtitle?: unknown;
    text?: unknown;
    rating?: unknown;
  };

  const author = normalizeText(source?.author, 80);
  const subtitle = normalizeText(source?.subtitle, 120);
  const text = normalizeText(source?.text, 1200);
  const ratingRaw = Number(source?.rating);
  const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : 5;
  const combined = `${author}${subtitle}${text}`;

  if (!author || !text) {
    return error(400, "Имя и текст отзыва обязательны.");
  }
  if (combined.includes("\uFFFD")) {
    return error(400, "Текст отзыва поврежден кодировкой. Обновите страницу и попробуйте снова.");
  }

  const item = await addReviewRecord({
    author,
    subtitle,
    text,
    rating,
  });

  return json({ item }, 201);
};
