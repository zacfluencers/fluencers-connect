/**
 * Upload a file straight to Supabase Storage with real progress events.
 *
 * The Supabase JS `upload()` helper doesn't expose progress, so for large
 * files (portfolio videos) we POST to the storage REST endpoint via XHR and
 * report bytes-sent. This is the same direct browser→storage path (fast), just
 * with a progress callback so the UI isn't a silent "Uploading…".
 */
export function uploadToBucketWithProgress({
  bucket,
  path,
  file,
  token,
  onProgress,
}: {
  bucket: string;
  path: string;
  file: File;
  token: string;
  onProgress?: (percent: number) => void;
}): Promise<{ error?: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Keep folder slashes, but make each segment URL-safe.
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${base}/storage/v1/object/${bucket}/${safePath}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    if (anon) xhr.setRequestHeader("apikey", anon);
    xhr.setRequestHeader("cache-control", "3600");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve({});
      else
        resolve({
          error:
            safeMessage(xhr.responseText) || `Upload failed (${xhr.status}).`,
        });
    };
    xhr.onerror = () => resolve({ error: "Network error during upload." });
    xhr.send(file);
  });
}

function safeMessage(text: string): string | null {
  try {
    return JSON.parse(text)?.message ?? null;
  } catch {
    return null;
  }
}
