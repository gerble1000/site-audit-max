import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AccessibilityInfo } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export type VoiceClip =
  | 'welcome'
  | 'snag_captured'
  | 'issue_complete'
  | 'report_ready'
  | 'backup_done';

const sources: Record<VoiceClip, number> = {
  welcome: require('../../assets/voice/welcome.mp3'),
  snag_captured: require('../../assets/voice/snag_captured.mp3'),
  issue_complete: require('../../assets/voice/issue_complete.mp3'),
  report_ready: require('../../assets/voice/report_ready.mp3'),
  backup_done: require('../../assets/voice/backup_done.mp3'),
};

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
  reduceMotion = !!v;
});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => {
  reduceMotion = v;
});

/** Plays a short ElevenLabs TTS clip when sound effects are enabled. */
export async function playVoice(clip: VoiceClip) {
  if (reduceMotion) return;
  const settings = useAppStore.getState().settings;
  if (settings && !settings.sfxEnabled) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
    const player = createAudioPlayer(sources[clip]);
    player.volume = 0.75;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.remove();
      }
    });
    player.play();
  } catch {
    /* ignore */
  }
}
