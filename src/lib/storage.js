import { supabase } from "./supabase";

export const TRADE_SCREENSHOTS_BUCKET = "trade-screenshots";
export const WATCHLIST_SCREENSHOTS_BUCKET = "watchlist-screenshots";
export const MARKET_PLAN_SCREENSHOTS_BUCKET = "market-plan-screenshots";
export const MAX_SCREENSHOT_SIZE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_SCREENSHOT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function getExtension(file) {
  const extension = file.name?.split(".").pop()?.toLowerCase();

  if (extension) return extension;

  return file.type.split("/")[1] || "png";
}

export function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function isExternalUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function getPathFromPublicStorageUrl(value, bucket = TRADE_SCREENSHOTS_BUCKET) {
  if (!isExternalUrl(value)) {
    return "";
  }

  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = value.indexOf(marker);

  if (markerIndex === -1) {
    return "";
  }

  return decodeURIComponent(value.slice(markerIndex + marker.length));
}

export function validateScreenshotFile(file) {
  if (!file) {
    throw new Error("Choose an image file to upload.");
  }

  if (!ALLOWED_SCREENSHOT_TYPES.has(file.type)) {
    throw new Error("Screenshots must be PNG, JPG, WebP, or GIF images.");
  }

  if (file.size > MAX_SCREENSHOT_SIZE_BYTES) {
    throw new Error("Screenshots must be 8 MB or smaller.");
  }
}

export function generateScreenshotPath(file, userId, ownerId, now = Date.now(), randomId = crypto.randomUUID()) {
  const extension = getExtension(file);

  return `${userId}/${ownerId}/${now}-${randomId}.${extension}`;
}

async function uploadPrivateScreenshot(bucket, file, userId, ownerId) {
  if (!userId || !ownerId) {
    throw new Error("Missing user or record ID for screenshot upload.");
  }

  validateScreenshotFile(file);

  const filePath = generateScreenshotPath(file, userId, ownerId);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return filePath;
}

export async function uploadTradeScreenshot(file, userId, tradeId) {
  return uploadPrivateScreenshot(TRADE_SCREENSHOTS_BUCKET, file, userId, tradeId);
}

export async function uploadWatchlistScreenshot(file, userId, watchlistItemId) {
  return uploadPrivateScreenshot(WATCHLIST_SCREENSHOTS_BUCKET, file, userId, watchlistItemId);
}

export function generateMarketPlanScreenshotPath(file, userId, tradeDate, symbol, now = Date.now(), randomId = crypto.randomUUID()) {
  return `${userId}/${tradeDate}/${String(symbol).toLowerCase()}/${now}-${randomId}.${getExtension(file)}`;
}

export async function uploadMarketPlanScreenshot(file, userId, tradeDate, symbol) {
  validateScreenshotFile(file);
  const path = generateMarketPlanScreenshotPath(file, userId, tradeDate, symbol);
  const { error } = await supabase.storage.from(MARKET_PLAN_SCREENSHOTS_BUCKET).upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

async function getPrivateScreenshotUrl(bucket, pathOrUrl) {
  if (!pathOrUrl || isDataUrl(pathOrUrl)) {
    return pathOrUrl || "";
  }

  const storagePath = getPathFromPublicStorageUrl(pathOrUrl, bucket) || pathOrUrl;

  if (isExternalUrl(storagePath)) {
    return storagePath;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export function getTradeScreenshotUrl(pathOrUrl) {
  return getPrivateScreenshotUrl(TRADE_SCREENSHOTS_BUCKET, pathOrUrl);
}

export function getWatchlistScreenshotUrl(pathOrUrl) {
  return getPrivateScreenshotUrl(WATCHLIST_SCREENSHOTS_BUCKET, pathOrUrl);
}
export function getMarketPlanScreenshotUrl(pathOrUrl) { return getPrivateScreenshotUrl(MARKET_PLAN_SCREENSHOTS_BUCKET, pathOrUrl); }

async function removePrivateScreenshot(bucket, pathOrUrl) {
  if (!pathOrUrl || isDataUrl(pathOrUrl)) {
    return;
  }

  const storagePath = getPathFromPublicStorageUrl(pathOrUrl, bucket) || pathOrUrl;

  if (isExternalUrl(storagePath)) {
    return;
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    throw error;
  }
}

export function removeTradeScreenshot(pathOrUrl) {
  return removePrivateScreenshot(TRADE_SCREENSHOTS_BUCKET, pathOrUrl);
}

export function removeWatchlistScreenshot(pathOrUrl) {
  return removePrivateScreenshot(WATCHLIST_SCREENSHOTS_BUCKET, pathOrUrl);
}
export function removeMarketPlanScreenshot(pathOrUrl) { return removePrivateScreenshot(MARKET_PLAN_SCREENSHOTS_BUCKET, pathOrUrl); }
