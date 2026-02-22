import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { isAdminAuthenticated, verifyCsrf } from "../../../lib/admin/auth";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  SAFE_IMAGE_MIME,
  SAFE_VIDEO_MIME,
  UPLOADS_DIR,
} from "../../../lib/admin/config";
import { error, json } from "../../../lib/admin/http";
import { addMediaRecord } from "../../../lib/admin/storage";
import type { MediaKind } from "../../../lib/admin/types";

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function normalizeFilename(input: string) {
  const trimmed = input.trim().replace(/[\r\n\t]+/g, " ");
  return trimmed.slice(0, 140) || "file";
}

function parseKind(value: FormDataEntryValue | null): MediaKind | null {
  if (value === "photo" || value === "video") return value;
  return null;
}

function pickExtension(kind: MediaKind, mime: string, originalName: string) {
  const fromMime = kind === "photo" ? IMAGE_EXT[mime] : VIDEO_EXT[mime];
  if (fromMime) return fromMime;

  const ext = path.extname(originalName).replace(".", "").toLowerCase();
  if (!ext) return null;
  if (kind === "photo" && ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  if (kind === "video" && ["mp4", "webm", "mov"].includes(ext)) {
    return ext;
  }
  return null;
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return error(401, "Требуется вход.");
  }
  if (!verifyCsrf(request, cookies)) {
    return error(403, "Неверный CSRF токен.");
  }

  const formData = await request.formData();
  const kind = parseKind(formData.get("kind"));
  const file = formData.get("file");

  if (!kind) {
    return error(400, "Некорректный тип файла.");
  }
  if (!(file instanceof File)) {
    return error(400, "Файл обязателен.");
  }

  const mime = file.type.toLowerCase();
  const size = file.size;
  const isPhoto = kind === "photo";

  if (isPhoto && !SAFE_IMAGE_MIME.has(mime)) {
    return error(400, "Разрешены только JPG, PNG и WEBP изображения.");
  }
  if (!isPhoto && !SAFE_VIDEO_MIME.has(mime)) {
    return error(400, "Разрешены только MP4, WEBM и MOV видео.");
  }

  const maxSize = isPhoto ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
  if (size <= 0 || size > maxSize) {
    return error(400, `Недопустимый размер файла. Лимит: ${Math.floor(maxSize / 1024 / 1024)} MB.`);
  }

  const extension = pickExtension(kind, mime, file.name);
  if (!extension) {
    return error(400, "Не удалось определить безопасное расширение файла.");
  }

  const serverName = `${Date.now()}-${randomUUID()}.${extension}`;
  const serverPath = path.resolve(UPLOADS_DIR, serverName);
  const publicUrl = `/uploads/${serverName}`;
  const displayName = normalizeFilename(file.name);

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(serverPath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });

  try {
    const record = await addMediaRecord({
      kind,
      name: displayName,
      size,
      mimeType: mime,
      url: publicUrl,
    });
    return json({ item: record }, 201);
  } catch {
    try {
      await fs.unlink(serverPath);
    } catch {
      // Ignore cleanup errors.
    }
    return error(500, "Не удалось сохранить файл.");
  }
};
