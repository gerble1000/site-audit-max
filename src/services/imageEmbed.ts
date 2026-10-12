import * as FileSystem from 'expo-file-system/legacy';

function mimeForUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/** Convert a local file URI into a data URI for reliable expo-print embedding. */
export async function uriToDataUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith('data:')) return uri;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${mimeForUri(uri)};base64,${b64}`;
  } catch {
    return null;
  }
}

export async function embedMany(
  uris: (string | null | undefined)[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, string>> {
  const unique = [...new Set(uris.filter(Boolean) as string[])];
  const map = new Map<string, string>();
  let done = 0;
  for (const uri of unique) {
    const data = await uriToDataUri(uri);
    if (data) map.set(uri, data);
    done += 1;
    onProgress?.(done, unique.length);
  }
  return map;
}
