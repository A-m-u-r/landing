import type { APIRoute } from "astro";
import { isAdminAuthenticated, verifyCsrf } from "../../../lib/admin/auth";
import { error, json } from "../../../lib/admin/http";
import { updatePricing } from "../../../lib/admin/storage";

function normalizeText(value: unknown, max: number) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function normalizePoints(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item, 120))
    .filter((item) => item.length > 0)
    .slice(0, 12);
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

  const source = payload as { pricing?: unknown };
  const items = Array.isArray(source?.pricing) ? source.pricing : [];

  const normalized = items
    .map((item) => {
      const record = item as { title?: unknown; price?: unknown; points?: unknown };
      const title = normalizeText(record?.title, 80);
      const price = normalizeText(record?.price, 40);
      const points = normalizePoints(record?.points);
      const combined = `${title}${price}${points.join("")}`;
      if (combined.includes("\uFFFD")) {
        return null;
      }
      if (!title || !price) {
        return null;
      }
      return { title, price, points };
    })
    .filter((item): item is { title: string; price: string; points: string[] } => !!item);

  if (!normalized.length) {
    return error(400, "Добавьте хотя бы один пакет с названием и ценой.");
  }

  await updatePricing(normalized);
  return json({ ok: true });
};
