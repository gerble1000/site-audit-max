/**
 * Dev-only: generate SFX + short voice clips via ElevenLabs.
 * Usage (PowerShell):
 *   $env:ELEVENLABS_API_KEY="..."; npx tsx scripts/generate-sfx.ts
 * Never commit .env or bake the key into the app bundle.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('Missing ELEVENLABS_API_KEY in environment / .env');
  process.exit(1);
}

const SFX_OUT = path.join(process.cwd(), 'assets', 'sfx');
const VOICE_OUT = path.join(process.cwd(), 'assets', 'voice');
fs.mkdirSync(SFX_OUT, { recursive: true });
fs.mkdirSync(VOICE_OUT, { recursive: true });

/** Duration must be >= 0.5 per ElevenLabs sound-generation API. */
const cues: { file: string; text: string; duration_seconds: number }[] = [
  {
    file: 'add.mp3',
    text: 'Soft clean UI click, short and crisp, confirming an item was added in a mobile app',
    duration_seconds: 0.6,
  },
  {
    file: 'capture.mp3',
    text: 'Realistic camera shutter click for a smartphone photo capture, sharp and quick',
    duration_seconds: 0.6,
  },
  {
    file: 'complete.mp3',
    text: 'Pleasant short success chime, two soft notes ascending, task completed',
    duration_seconds: 0.8,
  },
  {
    file: 'share.mp3',
    text: 'Light whoosh and soft confirmation ping for sharing a document successfully',
    duration_seconds: 0.7,
  },
  {
    file: 'delete.mp3',
    text: 'Soft low delete thud confirmation, muted and brief, not alarming',
    duration_seconds: 0.6,
  },
  {
    file: 'error.mp3',
    text: 'Gentle soft error buzz for a mobile app, short and not harsh',
    duration_seconds: 0.7,
  },
  {
    file: 'annotate.mp3',
    text: 'Tiny pen tip tap on paper, subtle annotation drawing sound',
    duration_seconds: 0.5,
  },
];

const voices: { file: string; text: string }[] = [
  { file: 'welcome.mp3', text: 'Welcome to Site Audit Max. Capture snags, annotate photos, and share reports offline.' },
  { file: 'snag_captured.mp3', text: 'Snag captured.' },
  { file: 'issue_complete.mp3', text: 'Issue marked complete.' },
  { file: 'report_ready.mp3', text: 'Report ready to share.' },
  { file: 'backup_done.mp3', text: 'Backup exported.' },
];

async function generateSfx(cue: (typeof cues)[0]) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': KEY!,
    },
    body: JSON.stringify({
      text: cue.text,
      duration_seconds: cue.duration_seconds,
      prompt_influence: 0.4,
      model_id: 'eleven_text_to_sound_v2',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SFX ${cue.file}: ${res.status} ${body}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(SFX_OUT, cue.file);
  fs.writeFileSync(dest, buf);
  console.log('SFX  ', dest, `(${buf.length} bytes)`);
}

async function generateVoice(clip: (typeof voices)[0]) {
  // Rachel - clear English voice commonly available on ElevenLabs
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'xi-api-key': KEY!,
    },
    body: JSON.stringify({
      text: clip.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
        style: 0.15,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voice ${clip.file}: ${res.status} ${body}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(VOICE_OUT, clip.file);
  fs.writeFileSync(dest, buf);
  console.log('Voice', dest, `(${buf.length} bytes)`);
}

(async () => {
  console.log('Generating sound effects…');
  for (const cue of cues) {
    await generateSfx(cue);
  }
  console.log('Generating voice clips…');
  for (const clip of voices) {
    await generateVoice(clip);
  }
  console.log('Done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
