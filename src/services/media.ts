import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { createId } from '../utils/id';

export async function ensureMediaDir(projectId: string) {
  const dir = `${FileSystem.documentDirectory}media/${projectId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

function alertPermission(kind: string) {
  Alert.alert(
    'Permission needed',
    `Site Audit Max needs ${kind} access to capture snags. You can enable it in Settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ]
  );
}

export async function getCaptureLocation(): Promise<{ lat: number | null; lon: number | null }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { lat: null, lon: null };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (!pos) return { lat: null, lon: null };
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return { lat: null, lon: null };
  }
}

function parseExifDate(raw: unknown): number {
  if (!raw) return Date.now();
  const s = String(raw);
  const normalized = s.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const t = Date.parse(normalized);
  return Number.isNaN(t) ? Date.now() : t;
}

async function persistAsset(
  projectId: string,
  uri: string,
  opts: { quality: number; square: boolean }
) {
  const dir = await ensureMediaDir(projectId);
  const compress = Math.min(1, Math.max(0.3, opts.quality / 100));

  if (opts.square) {
    // Probe the source dimensions, then center-crop to a square before resizing
    // so images are not stretched when the square setting is enabled.
    const probed = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const side = Math.min(probed.width, probed.height);
    const originX = Math.round((probed.width - side) / 2);
    const originY = Math.round((probed.height - side) / 2);
    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width: side, height: side } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );
    const squared = await ImageManipulator.manipulateAsync(
      cropped.uri,
      [{ resize: { width: 1200, height: 1200 } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG }
    );
    const dest = `${dir}${createId('photo')}.jpg`;
    await FileSystem.copyAsync({ from: squared.uri, to: dest });
    return dest;
  }

  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const dest = `${dir}${createId('photo')}.jpg`;
  await FileSystem.copyAsync({ from: result.uri, to: dest });
  return dest;
}

export type PickResult = {
  uri: string;
  lat: number | null;
  lon: number | null;
  capturedAt: number;
  denied?: boolean;
  canceled?: boolean;
};

export async function pickImages(opts: {
  projectId: string;
  quality: number;
  square: boolean;
  allowsMultiple?: boolean;
  fromCamera?: boolean;
}): Promise<PickResult[]> {
  if (opts.fromCamera) {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      alertPermission('camera');
      return [{ uri: '', lat: null, lon: null, capturedAt: 0, denied: true }];
    }
    const loc = await getCaptureLocation();
    const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: true });
    if (result.canceled || !result.assets[0]) {
      return [{ uri: '', lat: null, lon: null, capturedAt: 0, canceled: true }];
    }
    const uri = await persistAsset(opts.projectId, result.assets[0].uri, opts);
    return [{ uri, lat: loc.lat, lon: loc.lon, capturedAt: Date.now() }];
  }

  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!lib.granted) {
    alertPermission('photo library');
    return [{ uri: '', lat: null, lon: null, capturedAt: 0, denied: true }];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 1,
    allowsMultipleSelection: opts.allowsMultiple ?? true,
    selectionLimit: opts.allowsMultiple === false ? 1 : 0,
    exif: true,
  });
  if (result.canceled) {
    return [{ uri: '', lat: null, lon: null, capturedAt: 0, canceled: true }];
  }
  const out: PickResult[] = [];
  for (const asset of result.assets) {
    const uri = await persistAsset(opts.projectId, asset.uri, opts);
    const lat =
      typeof asset.exif?.GPSLatitude === 'number' ? asset.exif.GPSLatitude : null;
    const lon =
      typeof asset.exif?.GPSLongitude === 'number' ? asset.exif.GPSLongitude : null;
    out.push({
      uri,
      lat,
      lon,
      capturedAt: parseExifDate(asset.exif?.DateTimeOriginal),
    });
  }
  return out;
}

export async function saveAnnotatedImage(projectId: string, base64Png: string): Promise<string> {
  const dir = await ensureMediaDir(projectId);
  const dest = `${dir}${createId('ann')}.png`;
  await FileSystem.writeAsStringAsync(dest, base64Png, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const info = await FileSystem.getInfoAsync(dest);
  if (!info.exists || (info.size != null && info.size < 32)) {
    throw new Error('Annotated image was not written to disk.');
  }
  return dest;
}

/** Prefer annotated file when it exists; otherwise original. No query string (Skia-safe). */
export async function resolveAnnotatedSourceUri(
  uri: string,
  annotatedUri: string | null | undefined
): Promise<string> {
  if (annotatedUri) {
    const info = await FileSystem.getInfoAsync(annotatedUri);
    if (info.exists) return annotatedUri;
  }
  return uri;
}

/** Prefer annotated file when it exists; otherwise original. Cache-bust for RN Image. */
export async function resolveDisplayUri(
  uri: string,
  annotatedUri: string | null | undefined,
  cacheKey?: number | string
): Promise<string> {
  const chosen = await resolveAnnotatedSourceUri(uri, annotatedUri);
  return cacheBustUri(chosen, cacheKey);
}

export function cacheBustUri(uri: string, cacheKey?: number | string): string {
  const bust = cacheKey != null ? String(cacheKey) : String(Date.now());
  const sep = uri.includes('?') ? '&' : '?';
  return `${uri}${sep}t=${bust}`;
}

export async function pickBrandingAsset(kind: 'logo' | 'signature'): Promise<string | null> {
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!lib.granted) {
    alertPermission('photo library');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 1,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const dir = `${FileSystem.documentDirectory}branding/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${kind}_${createId()}.jpg`;
  await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
  return dest;
}

export async function persistPickedUri(projectId: string, uri: string, quality: number) {
  return persistAsset(projectId, uri, { quality, square: false });
}
