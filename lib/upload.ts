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
      else resolve({ error: uploadError(xhr.status, xhr.responseText) });
    };
    xhr.onerror = () => resolve({ error: "Network error during upload." });
    xhr.send(file);
  });
}

/**
 * Turn a storage API failure into something a creator can act on.
 *
 * The size rejection is the one that matters. Storage enforces a project-wide
 * ceiling that sits ABOVE the per-bucket limit, so a file can pass our own
 * check, upload for several minutes, and only then be refused. Saying "too
 * large" after we already told them the file was fine reads as a broken site,
 * so name the real cause and give them a way forward.
 */
function uploadError(status: number, body: string): string {
  const message = safeMessage(body);
  if (status === 413 || /maximum allowed size/i.test(message ?? "")) {
    return "This file is too large for the server to accept. Phone video is often much bigger than it looks - try a shorter clip, or export it at 1080p instead of 4K.";
  }
  if (status === 401 || status === 403) {
    return "Your session expired during the upload. Please sign in again and retry.";
  }
  return message || `Upload failed (${status}).`;
}

function safeMessage(text: string): string | null {
  try {
    return JSON.parse(text)?.message ?? null;
  } catch {
    return null;
  }
}
