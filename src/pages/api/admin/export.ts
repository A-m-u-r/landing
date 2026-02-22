import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../../lib/admin/auth";
import { error } from "../../../lib/admin/http";
import { getAdminData } from "../../../lib/admin/storage";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return error(401, "Требуется вход.");
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    ...(await getAdminData()),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="admin-content.json"',
      "cache-control": "no-store",
    },
  });
};
