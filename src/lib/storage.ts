import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { appConfig } from "./config";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase/admin";

const CV_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export type CvStorageOwner = {
  kind: "login" | "goal";
  key: string;
};

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function pathSegment(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/@/g, "-at-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return cleaned || "unknown";
}

export function safeStoredFileName(fileName: string, fallback = "file.pdf"): string {
  return fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80) || fallback;
}

/** tenant / login|goal / email-or-slug / assessment / filename */
export function cvObjectPath(params: {
  institutionSlug: string;
  owner: CvStorageOwner;
  assessmentId: string;
  fileName: string;
}): string {
  return [
    pathSegment(params.institutionSlug),
    pathSegment(params.owner.kind),
    pathSegment(params.owner.key),
    pathSegment(params.assessmentId),
    safeStoredFileName(params.fileName, "cv.pdf"),
  ].join("/");
}

export function goalContextObjectPath(institutionSlug: string, goalId: string, fileName: string): string {
  return [
    pathSegment(institutionSlug),
    "goal-context",
    pathSegment(goalId),
    safeStoredFileName(fileName, "context.pdf"),
  ].join("/");
}

async function ensureCvBucket(): Promise<string> {
  const bucket = appConfig.storageBucket;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.storage.getBucket(bucket);
  if (data) return bucket;

  const { error } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: "8MB",
    allowedMimeTypes: CV_MIME_TYPES,
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Could not create Supabase bucket "${bucket}": ${error.message}`);
  }
  return bucket;
}

function useSupabaseStorage(): boolean {
  if (appConfig.storageDriver === "local") return false;
  if (isSupabaseConfigured()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  console.warn(
    "[storage] Supabase keys missing; writing CVs under .data/uploads with the same campus/login/goal paths.",
  );
  return false;
}

function localAbsolutePath(objectPath: string): string {
  return path.join(process.cwd(), ".data", "uploads", objectPath);
}

async function writeLocalFile(objectPath: string, bytes: Uint8Array): Promise<string> {
  const absolute = localAbsolutePath(objectPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, Buffer.from(bytes));
  return objectPath;
}

export async function saveStoredFile(params: {
  objectPath: string;
  mimeType?: string;
  bytes: Uint8Array;
}): Promise<string> {
  if (useSupabaseStorage()) {
    try {
      const bucket = await ensureCvBucket();
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.from(bucket).upload(params.objectPath, params.bytes, {
        contentType: params.mimeType || "application/octet-stream",
        upsert: true,
      });
      if (error) throw new Error(`Could not store file in Supabase: ${error.message}`);
      return params.objectPath;
    } catch (err) {
      console.warn("[storage] Supabase upload failed; writing locally.", err);
    }
  }

  return writeLocalFile(params.objectPath, params.bytes);
}

export async function saveCvFile(params: {
  institutionSlug: string;
  owner: CvStorageOwner;
  assessmentId: string;
  fileName: string;
  mimeType?: string;
  bytes: Uint8Array;
}): Promise<string> {
  return saveStoredFile({
    objectPath: cvObjectPath(params),
    mimeType: params.mimeType,
    bytes: params.bytes,
  });
}

export async function readCvFile(storagePath: string): Promise<Buffer> {
  if (useSupabaseStorage()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage.from(appConfig.storageBucket).download(storagePath);
      if (!error && data) return Buffer.from(await data.arrayBuffer());
    } catch {
      // Fall through to local disk when the original blob is only available there.
    }
  }
  return readFile(localAbsolutePath(storagePath));
}

export async function deleteCvFile(storagePath: string): Promise<void> {
  if (useSupabaseStorage()) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(appConfig.storageBucket).remove([storagePath]);
    return;
  }
  await unlink(localAbsolutePath(storagePath)).catch(() => undefined);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const hash = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
