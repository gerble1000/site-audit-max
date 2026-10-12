import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Rect, Skia, useCanvasRef } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import { createId } from '../utils/id';
import { Button } from './ui';
import { useAppTheme } from '../theme/ThemeProvider';

export function SignaturePad({
  onSaved,
  onCancel,
}: {
  onSaved: (uri: string) => void;
  onCancel: () => void;
}) {
  const c = useAppTheme();
  const canvasRef = useCanvasRef();
  const [paths, setPaths] = useState<string[]>([]);
  const [live, setLive] = useState<string | null>(null);
  const [padSize, setPadSize] = useState({ w: 0, h: 0 });
  const current = useRef(Skia.Path.Make());

  const begin = (x: number, y: number) => {
    current.current = Skia.Path.Make();
    current.current.moveTo(x, y);
    setLive(current.current.toSVGString());
  };
  const move = (x: number, y: number) => {
    current.current.lineTo(x, y);
    setLive(current.current.toSVGString());
  };
  const end = () => {
    const svg = current.current.toSVGString();
    setPaths((p) => [...p, svg]);
    setLive(null);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => runOnJS(begin)(e.x, e.y))
    .onUpdate((e) => runOnJS(move)(e.x, e.y))
    .onEnd(() => runOnJS(end)());

  const save = async () => {
    const ref = canvasRef.current;
    if (!ref) return;
    const snap =
      typeof ref.makeImageSnapshotAsync === 'function'
        ? await ref.makeImageSnapshotAsync()
        : ref.makeImageSnapshot();
    if (!snap) return;
    const b64 = snap.encodeToBase64();
    const dir = `${FileSystem.documentDirectory}branding/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = `${dir}signature_${createId()}.png`;
    await FileSystem.writeAsStringAsync(dest, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    onSaved(dest);
  };

  return (
    <View style={[styles.wrap, { borderColor: c.border, backgroundColor: c.surface }]}>
      <GestureDetector gesture={pan}>
        <View
          style={styles.pad}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setPadSize((p) => (p.w === w && p.h === h ? p : { w, h }));
          }}
        >
          <Canvas ref={canvasRef} style={{ flex: 1 }}>
            <Rect x={0} y={0} width={padSize.w} height={padSize.h} color="#FFFFFF" />
            {[...paths, live].filter(Boolean).map((d, i) => (
              <Path
                key={`${i}-${d?.slice(0, 12)}`}
                path={d!}
                color="#111"
                style="stroke"
                strokeWidth={3}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Canvas>
        </View>
      </GestureDetector>
      <View style={styles.row}>
        <Button label="Clear" variant="secondary" onPress={() => setPaths([])} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
        <Button label="Save signature" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  pad: { height: 160, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, padding: 10, justifyContent: 'flex-end' },
});
