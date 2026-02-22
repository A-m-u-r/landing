import path from "node:path";

export const SESSION_COOKIE = "admin_session";
export const CSRF_COOKIE = "admin_csrf";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;
export const CSRF_TTL_SECONDS = 60 * 60 * 12;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 7;

export const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;

export const STORAGE_DIR = path.resolve(process.cwd(), "storage", "admin");
export const DATA_FILE = path.resolve(STORAGE_DIR, "content.json");
export const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads");

export const SAFE_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const SAFE_VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);
