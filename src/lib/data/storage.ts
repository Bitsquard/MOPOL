import { db, UPLOAD_BUCKET } from "./client";

/**
 * Object storage helpers for the private mopol-uploads bucket. Object keys are
 * flat file names (e.g. cv_ab12.pdf); the stored *_url fields keep the
 * /api/files/<key> shape, and the files route resolves key -> signed URL.
 */

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array | ArrayBuffer,
  contentType?: string
): Promise<void> {
  const { error } = await db()
    .storage.from(UPLOAD_BUCKET)
    .upload(key, body, { contentType, upsert: false });
  if (error) throw error;
}

/** Short-lived signed URL for a private object, or null if it can't be signed. */
export async function signedUrl(key: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await db().storage.from(UPLOAD_BUCKET).createSignedUrl(key, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function removeObject(key: string): Promise<void> {
  const { error } = await db().storage.from(UPLOAD_BUCKET).remove([key]);
  if (error) throw error;
}
