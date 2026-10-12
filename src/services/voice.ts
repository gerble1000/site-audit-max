import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';
import AudioModule from 'expo-audio/build/AudioModule';
import * as FileSystem from 'expo-file-system/legacy';
import { createId } from '../utils/id';

let recording: AudioRecorder | null = null;

export async function startVoiceNote(): Promise<void> {
  const perm = await requestRecordingPermissionsAsync();
  if (!perm.granted) throw new Error('Microphone permission was not granted.');
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
  const rec = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  await rec.prepareToRecordAsync();
  rec.record();
  recording = rec;
}

export async function stopVoiceNote(projectId: string): Promise<string | null> {
  if (!recording) return null;
  await recording.stop();
  const uri = recording.uri;
  recording = null;
  if (!uri) return null;
  const dir = `${FileSystem.documentDirectory}media/${projectId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${createId('voice')}.m4a`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  await setAudioModeAsync({ allowsRecording: false });
  return dest;
}

export async function playVoiceNote(uri: string) {
  const player = createAudioPlayer({ uri });
  const sub = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      sub.remove();
      player.remove();
    }
  });
  player.play();
}
