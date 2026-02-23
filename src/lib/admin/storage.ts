import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_FILE, STORAGE_DIR, UPLOADS_DIR } from "./config";
import type { AdminData, AdminMedia, AdminPricingItem, AdminReview, AdminSettings, MediaKind } from "./types";

const EMPTY_DATA: AdminData = {
  media: [],
  reviews: [],
  settings: null,
  pricing: [],
};

let writeQueue = Promise.resolve();

function queueWrite<T>(operation: () => Promise<T>) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureStorage() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  if (!(await exists(DATA_FILE))) {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2), "utf8");
  }
}

function normalizeData(input: unknown): AdminData {
  if (!input || typeof input !== "object") {
    return { ...EMPTY_DATA };
  }
  const raw = input as {
    media?: unknown;
    reviews?: unknown;
    settings?: unknown;
    pricing?: unknown;
  };
  const media = Array.isArray(raw.media)
    ? raw.media.filter((item) => item && typeof item === "object") as AdminMedia[]
    : [];
  const reviews = Array.isArray(raw.reviews)
    ? raw.reviews.filter((item) => item && typeof item === "object") as AdminReview[]
    : [];
  const settings = raw.settings && typeof raw.settings === "object"
    ? (raw.settings as AdminSettings)
    : null;
  const pricing = Array.isArray(raw.pricing)
    ? raw.pricing.filter((item) => item && typeof item === "object") as AdminPricingItem[]
    : [];
  return { media, reviews, settings, pricing };
}

async function readData() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return normalizeData(JSON.parse(raw));
  } catch {
    return { ...EMPTY_DATA };
  }
}

async function writeData(data: AdminData) {
  await ensureStorage();
  const tmpFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpFile, DATA_FILE);
}

async function withMutableData<T>(operation: (data: AdminData) => Promise<T> | T) {
  return queueWrite(async () => {
    const data = await readData();
    const result = await operation(data);
    await writeData(data);
    return result;
  });
}

function getSafeUploadPath(url: string) {
  const normalized = url.replace(/^\/+/, "");
  const resolved = path.resolve(process.cwd(), "public", normalized);
  const uploadsRoot = path.resolve(UPLOADS_DIR);
  if (!resolved.startsWith(uploadsRoot)) {
    throw new Error("Unsafe upload path.");
  }
  return resolved;
}

export async function getAdminData() {
  const data = await readData();
  data.media.sort((a, b) => b.createdAt - a.createdAt);
  data.reviews.sort((a, b) => b.createdAt - a.createdAt);
  return data;
}

interface AddMediaInput {
  kind: MediaKind;
  name: string;
  size: number;
  mimeType: string;
  url: string;
}

export async function addMediaRecord(input: AddMediaInput) {
  const record: AdminMedia = {
    id: randomUUID(),
    kind: input.kind,
    name: input.name,
    size: input.size,
    mimeType: input.mimeType,
    url: input.url,
    createdAt: Date.now(),
  };

  await withMutableData((data) => {
    data.media.unshift(record);
  });

  return record;
}

export async function deleteMediaRecord(id: string) {
  let removed: AdminMedia | null = null;
  await withMutableData((data) => {
    const index = data.media.findIndex((item) => item.id === id);
    if (index < 0) return;
    removed = data.media[index];
    data.media.splice(index, 1);
  });

  if (!removed) {
    return false;
  }

  try {
    const uploadPath = getSafeUploadPath(removed.url);
    await fs.unlink(uploadPath);
  } catch {
    // If file is already gone, we still consider data cleanup successful.
  }

  return true;
}

interface AddReviewInput {
  author: string;
  subtitle: string;
  text: string;
  rating: number;
}

export async function addReviewRecord(input: AddReviewInput) {
  const review: AdminReview = {
    id: randomUUID(),
    author: input.author,
    subtitle: input.subtitle,
    text: input.text,
    rating: input.rating,
    createdAt: Date.now(),
  };

  await withMutableData((data) => {
    data.reviews.unshift(review);
  });

  return review;
}

export async function deleteReviewRecord(id: string) {
  let removed = false;
  await withMutableData((data) => {
    const index = data.reviews.findIndex((item) => item.id === id);
    if (index < 0) return;
    data.reviews.splice(index, 1);
    removed = true;
  });
  return removed;
}

export async function clearAllAdminData() {
  const urls: string[] = [];
  await withMutableData((data) => {
    urls.push(...data.media.map((item) => item.url));
    data.media = [];
    data.reviews = [];
    data.settings = null;
    data.pricing = [];
  });

  await Promise.all(
    urls.map(async (url) => {
      try {
        await fs.unlink(getSafeUploadPath(url));
      } catch {
        // Ignore missing files.
      }
    }),
  );
}

export async function updateSettings(settings: AdminSettings) {
  await withMutableData((data) => {
    data.settings = { ...settings };
  });
}

export async function updatePricing(pricing: AdminPricingItem[]) {
  await withMutableData((data) => {
    data.pricing = pricing.map((item) => ({
      title: item.title,
      price: item.price,
      points: [...item.points],
    }));
  });
}
