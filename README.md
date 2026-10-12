# Site Audit Max

Fully offline construction snagging / punch-list app for **Android** and **iOS** (Expo).

Capture issues with photos, annotate, organize into projects and folders, and share branded **PDF / CSV / ZIP** reports through the system share sheet. **No servers or accounts.**

## Run

```bash
npm install
npx expo start
```

Use a development build for camera/Skia/Quick Snag if Expo Go is missing native modules.

## Highlights

- **Quick Snag** walk-and-shoot camera session
- Priority, status, location, trade, snag numbers, remedial notes
- Before/after photo roles, voice notes, floor-plan pins
- Templates + contacts library
- Report preview, open-only export, group-by, QR strip
- Full DB + media backup/restore
- Glove-friendly targets, select mode, overflow menus, high contrast + haptics

## ElevenLabs SFX (optional)

Placeholder WAVs ship in `assets/sfx/`. Regenerate with:

```bash
# put key in local .env only — never commit
npm run generate-sfx
```

## Privacy

All data stays on device until you explicitly share an export or backup.
