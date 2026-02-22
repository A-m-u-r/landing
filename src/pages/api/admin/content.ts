import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../../lib/admin/auth";
import { error, json } from "../../../lib/admin/http";
import { getAdminData } from "../../../lib/admin/storage";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return error(401, "Требуется вход.");
  }
  const data = await getAdminData();
  return json(data);
};
