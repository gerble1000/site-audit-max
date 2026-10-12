import QRCode from 'qrcode-svg';

/** Google Play listing for this app (package = applicationId). */
export const ANDROID_PACKAGE_ID = 'com.siteauditmax.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

/** Scannable QR SVG pointing at the Play Store listing. */
export function buildPlayStoreQrSvg(size = 132): string {
  return new QRCode({
    content: PLAY_STORE_URL,
    padding: 1,
    width: size,
    height: size,
    color: '#111111',
    background: '#FFFFFF',
    ecl: 'M',
    join: true,
    container: 'svg',
  }).svg();
}
