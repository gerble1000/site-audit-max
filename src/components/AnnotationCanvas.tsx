import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  useCanvasRef,
  Circle,
  Rect,
  Line,
  Group,
  Image as SkImage,
  useImage,
  vec,
  Text as SkText,
  matchFont,
  ImageFormat,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeProvider';
import { Button } from './ui';
import { playSfx } from '../services/sfx';

type Tool =
  | 'pen'
  | 'highlighter'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'blur'
  | 'eraser'
  | 'stamp'
  | 'text';

type Stroke = {
  id: string;
  tool: Tool;
  color: string;
  width: number;
  path?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  stamp?: string;
  text?: string;
  x?: number;
  y?: number;
};

const COLORS = ['#2F6B3A', '#DC2626', '#2563EB', '#16A34A', '#111827', '#FACC15', '#FFFFFF'];
const STAMPS = ['1', '2', '3', 'A', 'B', 'C'];
const TOOL_LABELS: Record<Tool, string> = {
  pen: 'Pen',
  highlighter: 'Highlight',
  line: 'Line',
  arrow: 'Arrow',
  rect: 'Box',
  circle: 'Circle',
  blur: 'Mask',
  eraser: 'Whiteout',
  stamp: 'Stamp',
  text: 'Text',
};
const PRIMARY_TOOLS: Tool[] = ['pen', 'arrow', 'text', 'stamp'];
const MORE_TOOLS: Tool[] = ['highlighter', 'line', 'rect', 'circle', 'blur', 'eraser'];

export function AnnotationCanvas({
  imageUri,
  onSave,
  onCancel,
}: {
  imageUri: string;
  onSave: (base64Png: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const c = useAppTheme();
  const insets = useSafeAreaInsets();
  const image = useImage(imageUri);
  const canvasRef = useCanvasRef();
  const [mode, setMode] = useState<'draw' | 'zoom'>('draw');
  const [tool, setTool] = useState<Tool>('pen');
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(4);
  const [stamp, setStamp] = useState('1');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [livePath, setLivePath] = useState<string | null>(null);
  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null);
  const [saving, setSaving] = useState(false);
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [size, setSize] = useState(() => ({
    w: Dimensions.get('window').width,
    h: Math.max(280, Dimensions.get('window').height - 320),
  }));
  const toolRef = React.useRef(tool);
  const colorRef = React.useRef(color);
  const widthRef = React.useRef(width);
  const stampRef = React.useRef(stamp);
  const pathRef = React.useRef<ReturnType<typeof Skia.Path.Make> | null>(null);
  toolRef.current = tool;
  colorRef.current = color;
  widthRef.current = width;
  stampRef.current = stamp;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const onCanvasAreaLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w <= 0 || h <= 0) return;
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  };

  const begin = (x: number, y: number) => {
    const t = toolRef.current;
    if (t === 'text') {
      setTextDraft('');
      setTextPrompt({ x, y });
      return;
    }
    if (t === 'stamp') {
      setStrokes((s) => [
        ...s,
        {
          id: `s_${Date.now()}`,
          tool: 'stamp',
          color: colorRef.current,
          width: widthRef.current,
          stamp: stampRef.current,
          x,
          y,
        },
      ]);
      setRedoStack([]);
      playSfx('annotate');
      return;
    }
    if (t === 'pen' || t === 'highlighter' || t === 'eraser') {
      const p = Skia.Path.Make();
      p.moveTo(x, y);
      pathRef.current = p;
      setLivePath(p.toSVGString());
    } else {
      setDraftStroke({
        id: `d_${Date.now()}`,
        tool: t,
        color: colorRef.current,
        width: widthRef.current,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
      });
    }
  };

  const move = (x: number, y: number) => {
    const t = toolRef.current;
    if (t === 'stamp' || t === 'text') return;
    if (t === 'pen' || t === 'highlighter' || t === 'eraser') {
      const p = pathRef.current;
      if (!p) return;
      p.lineTo(x, y);
      setLivePath(p.toSVGString());
    } else {
      setDraftStroke((d) => (d ? { ...d, x2: x, y2: y } : d));
    }
  };

  const end = () => {
    const t = toolRef.current;
    if (t === 'stamp' || t === 'text') return;
    if (t === 'pen' || t === 'highlighter' || t === 'eraser') {
      const svg = pathRef.current?.toSVGString();
      pathRef.current = null;
      setLivePath(null);
      if (svg) {
        setStrokes((s) => [
          ...s,
          {
            id: `s_${Date.now()}`,
            tool: t,
            color: t === 'eraser' ? '#FFFFFF' : colorRef.current,
            width: t === 'highlighter' ? widthRef.current * 3 : widthRef.current,
            path: svg,
          },
        ]);
        setRedoStack([]);
        playSfx('annotate');
      }
    } else {
      setDraftStroke((d) => {
        if (d) {
          setStrokes((s) => [...s, d]);
          setRedoStack([]);
          playSfx('annotate');
        }
        return null;
      });
    }
  };

  const drawPan = Gesture.Pan()
    .enabled(mode === 'draw' && tool !== 'text')
    .onBegin((e) => {
      runOnJS(begin)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(move)(e.x, e.y);
    })
    .onEnd(() => {
      runOnJS(end)();
    });

  const textTap = Gesture.Tap()
    .enabled(mode === 'draw' && tool === 'text')
    .onEnd((e) => {
      runOnJS(begin)(e.x, e.y);
    });

  const zoomPinch = Gesture.Pinch()
    .enabled(mode === 'zoom')
    .onUpdate((e) => {
      scale.value = Math.min(4, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const zoomPan = Gesture.Pan()
    .enabled(mode === 'zoom')
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const composed =
    mode === 'draw'
      ? tool === 'text'
        ? textTap
        : drawPan
      : Gesture.Simultaneous(zoomPinch, zoomPan);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const undo = () => {
    setStrokes((s) => {
      if (!s.length) return s;
      const next = [...s];
      const last = next.pop()!;
      setRedoStack((r) => [...r, last]);
      return next;
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const next = [...r];
      const last = next.pop()!;
      setStrokes((s) => [...s, last]);
      return next;
    });
  };

  const save = async () => {
    if (!image || saving) return;
    setSaving(true);
    try {
      const ref = canvasRef.current;
      if (!ref) {
        Alert.alert('Save failed', 'Canvas is not ready. Try again.');
        return;
      }
      const snap =
        typeof ref.makeImageSnapshotAsync === 'function'
          ? await ref.makeImageSnapshotAsync()
          : ref.makeImageSnapshot();
      if (!snap) {
        Alert.alert('Save failed', 'Could not capture the annotated photo. Try again.');
        return;
      }
      const base64 = snap.encodeToBase64(ImageFormat.PNG, 100);
      if (!base64) {
        Alert.alert('Save failed', 'Could not encode the annotated photo. Try again.');
        return;
      }
      await onSave(base64);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const confirmText = () => {
    if (!textPrompt) return;
    const value = textDraft.trim();
    if (value) {
      setStrokes((s) => [
        ...s,
        {
          id: `t_${Date.now()}`,
          tool: 'text',
          color: colorRef.current,
          width: widthRef.current,
          text: value,
          x: textPrompt.x,
          y: textPrompt.y,
        },
      ]);
      setRedoStack([]);
      playSfx('annotate');
    }
    setTextPrompt(null);
    setTextDraft('');
  };

  const all = [...strokes, ...(draftStroke ? [draftStroke] : [])];
  let font: ReturnType<typeof matchFont> | null = null;
  let textFont: ReturnType<typeof matchFont> | null = null;
  try {
    font = matchFont({
      fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
      fontSize: 18,
      fontWeight: '700',
    });
    textFont = matchFont({
      fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
      fontSize: 22,
      fontWeight: '700',
    });
  } catch {
    font = null;
    textFont = null;
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: c.background,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.chrome}>
        <Text style={[styles.tip, { color: c.textMuted }]}>
          Draw or write, then tap Save — markup is saved on the photo
        </Text>
        <View style={styles.modes}>
          <Pressable
            onPress={() => setMode('draw')}
            style={[styles.modeBtn, mode === 'draw' && { backgroundColor: c.accentSoft, borderColor: c.accent }]}
          >
            <Text style={{ color: c.text, fontWeight: '700' }}>Draw</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('zoom')}
            style={[styles.modeBtn, mode === 'zoom' && { backgroundColor: c.accentSoft, borderColor: c.accent }]}
          >
            <Text style={{ color: c.text, fontWeight: '700' }}>Zoom / Pan</Text>
          </Pressable>
        </View>
        <View style={styles.toolbar}>
          {PRIMARY_TOOLS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTool(t)}
              style={[styles.tool, tool === t && { backgroundColor: c.accentSoft, borderColor: c.accent }]}
            >
              <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>{TOOL_LABELS[t]}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setShowMoreTools((v) => !v)}
            style={[
              styles.tool,
              (showMoreTools || MORE_TOOLS.includes(tool)) && {
                backgroundColor: c.accentSoft,
                borderColor: c.accent,
              },
            ]}
          >
            <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>
              {showMoreTools ? 'Less' : 'More'}
            </Text>
          </Pressable>
        </View>
        {showMoreTools ? (
          <View style={styles.toolbar}>
            {MORE_TOOLS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTool(t)}
                style={[styles.tool, tool === t && { backgroundColor: c.accentSoft, borderColor: c.accent }]}
              >
                <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>{TOOL_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {tool === 'stamp' ? (
          <View style={styles.colors}>
            {STAMPS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStamp(s)}
                style={[styles.tool, stamp === s && { borderColor: c.accent }]}
              >
                <Text style={{ color: c.text, fontWeight: '700' }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.colors}>
          {COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => setColor(col)}
              style={[
                styles.swatch,
                { backgroundColor: col, borderWidth: color === col ? 3 : 1, borderColor: c.text },
              ]}
            />
          ))}
          {[2, 4, 8].map((w) => (
            <Pressable
              key={w}
              onPress={() => setWidth(w)}
              style={[styles.tool, width === w && { borderColor: c.accent }]}
            >
              <Text style={{ color: c.text, fontSize: 12 }}>{w}px</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.canvasArea} onLayout={onCanvasAreaLayout}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[{ width: size.w, height: size.h }, zoomStyle]}>
            <Canvas ref={canvasRef} style={{ width: size.w, height: size.h }}>
              {image ? (
                <SkImage image={image} x={0} y={0} width={size.w} height={size.h} fit="contain" />
              ) : null}
              {all.map((s) => renderStroke(s, font, textFont))}
              {livePath ? (
                <Path
                  path={livePath}
                  color={tool === 'eraser' ? '#FFFFFF' : color}
                  style="stroke"
                  strokeWidth={tool === 'highlighter' ? width * 3 : width}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={tool === 'highlighter' ? 0.35 : 1}
                />
              ) : null}
            </Canvas>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.actions}>
        <Button label="Undo" variant="secondary" onPress={undo} style={styles.actionBtn} />
        <Button label="Redo" variant="secondary" onPress={redo} style={styles.actionBtn} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.actionBtn} />
        <Button
          label={saving ? 'Saving…' : 'Save'}
          onPress={() => void save()}
          disabled={!image || saving}
          style={styles.actionBtn}
        />
      </View>

      <Modal visible={!!textPrompt} transparent animationType="fade" onRequestClose={() => setTextPrompt(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.textBackdrop}
        >
          <View style={[styles.textCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Add text</Text>
            <TextInput
              autoFocus
              value={textDraft}
              onChangeText={setTextDraft}
              placeholder="Type note…"
              placeholderTextColor={c.textMuted}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surfaceElevated,
                color: c.text,
                borderRadius: 10,
                padding: 12,
                minHeight: 48,
                marginBottom: 12,
              }}
              onSubmitEditing={confirmText}
            />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Button label="Cancel" variant="ghost" onPress={() => setTextPrompt(null)} />
              <Button label="Place" onPress={confirmText} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function renderStroke(
  s: Stroke,
  font: ReturnType<typeof matchFont> | null,
  textFont: ReturnType<typeof matchFont> | null
) {
  if (s.tool === 'text' && s.text != null && s.x != null && s.y != null) {
    return (
      <Group key={s.id}>
        {textFont ? (
          <SkText x={s.x} y={s.y} text={s.text} color={s.color} font={textFont} />
        ) : null}
      </Group>
    );
  }
  if (s.tool === 'stamp' && s.stamp != null && s.x != null && s.y != null) {
    return (
      <Group key={s.id}>
        <Circle cx={s.x} cy={s.y} r={16} color={s.color} />
        {font ? <SkText x={s.x - 6} y={s.y + 7} text={s.stamp} color="#fff" font={font} /> : null}
      </Group>
    );
  }
  if (s.path) {
    return (
      <Path
        key={s.id}
        path={s.path}
        color={s.tool === 'eraser' ? '#FFFFFF' : s.color}
        style="stroke"
        strokeWidth={s.width}
        strokeCap="round"
        strokeJoin="round"
        opacity={s.tool === 'highlighter' ? 0.35 : 1}
      />
    );
  }
  const x1 = s.x1 ?? 0;
  const y1 = s.y1 ?? 0;
  const x2 = s.x2 ?? 0;
  const y2 = s.y2 ?? 0;
  if (s.tool === 'line' || s.tool === 'arrow') {
    return (
      <Group key={s.id}>
        <Line p1={vec(x1, y1)} p2={vec(x2, y2)} color={s.color} strokeWidth={s.width} />
        {s.tool === 'arrow' ? <Circle cx={x2} cy={y2} r={s.width + 2} color={s.color} /> : null}
      </Group>
    );
  }
  if (s.tool === 'rect' || s.tool === 'blur') {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    return (
      <Rect
        key={s.id}
        x={x}
        y={y}
        width={w}
        height={h}
        color={s.tool === 'blur' ? 'rgba(180,180,180,0.55)' : s.color}
        style={s.tool === 'blur' ? 'fill' : 'stroke'}
        strokeWidth={s.width}
      />
    );
  }
  if (s.tool === 'circle') {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const r = Math.hypot(x2 - x1, y2 - y1) / 2;
    return (
      <Circle key={s.id} cx={cx} cy={cy} r={r} color={s.color} style="stroke" strokeWidth={s.width} />
    );
  }
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { flexShrink: 0 },
  tip: { paddingHorizontal: 12, paddingTop: 8, fontSize: 13 },
  modes: { flexDirection: 'row', gap: 8, padding: 8 },
  modeBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0D7DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, gap: 6 },
  tool: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D7DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colors: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 6,
  },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  canvasArea: {
    flex: 1,
    minHeight: 160,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionBtn: { flex: 1, paddingHorizontal: 6 },
  textBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  textCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
});
