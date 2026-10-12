import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type SfxName =
  | 'add'
  | 'capture'
  | 'complete'
  | 'share'
  | 'delete'
  | 'error'
  | 'annotate';

const sources: Record<SfxName, number> = {
  add: require('../../assets/sfx/add.mp3'),
  capture: require('../../assets/sfx/capture.mp3'),
  complete: require('../../assets/sfx/complete.mp3'),
  share: require('../../assets/sfx/share.mp3'),
  delete: require('../../assets/sfx/delete.mp3'),
  error: require('../../assets/sfx/error.mp3'),
  annotate: require('../../assets/sfx/annotate.mp3'),
};

let enabled = true;
let hapticsOn = true;
let reduceMotion = false;

AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
  reduceMotion = !!v;
});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => {
  reduceMotion = v;
});

export function setSfxEnabled(value: boolean) {
  enabled = value;
}

export function setHapticsEnabled(value: boolean) {
  hapticsOn = value;
}

export async function playSfx(name: SfxName) {
  if (hapticsOn && !reduceMotion) {
    try {
      if (name === 'error' || name === 'delete') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (name === 'complete' || name === 'share') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      /* ignore */
    }
  }
  if (!enabled || reduceMotion) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
    const player = createAudioPlayer(sources[name]);
    player.volume = 0.55;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.remove();
      }
    });
    player.play();
  } catch {
    /* missing asset or audio unavailable */
  }
}

void Platform;
