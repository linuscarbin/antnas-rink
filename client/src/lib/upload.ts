/** Uploads an image/PDF via /api/upload and returns its public URL. */
export async function uploadFile(file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Filen är för stor (max 8 MB).");
  }
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  try {
    const token = sessionStorage.getItem("session-token");
    if (token) headers.authorization = `Bearer ${token}`;
  } catch {
    // ignore
  }
  const resp = await fetch("/api/upload", {
    method: "POST",
    body: form,
    credentials: "include",
    headers,
  });
  const data = (await resp.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!resp.ok || !data.url) {
    throw new Error(data.error || "Uppladdning misslyckades.");
  }
  return data.url;
}
