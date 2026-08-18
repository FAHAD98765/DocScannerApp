import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, Text, NativeModules, Alert,
  PanResponder, GestureResponderEvent, StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { InkRecognizerModule } = NativeModules;

interface InkPoint {
  x: number;
  y: number;
  t: number;
}
type Stroke = InkPoint[];

export default function DrawingPadScreen(): React.JSX.Element {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const startTime = useRef<number>(Date.now());
  const currentStrokeRef = useRef<Stroke>([]);

const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newStroke = [{ x: locationX, y: locationY, t: Date.now() - startTime.current }];
        currentStrokeRef.current = newStroke;
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentStrokeRef.current = [
          ...currentStrokeRef.current,
          { x: locationX, y: locationY, t: Date.now() - startTime.current },
        ];
        setCurrentStroke(currentStrokeRef.current);
      },
 onPanResponderRelease: () => {
        console.log('InkDebug: RELEASE, points in current stroke =', currentStrokeRef.current.length);
        if (currentStrokeRef.current.length > 0) {
          setStrokes(prev => {
            const updated = [...prev, currentStrokeRef.current];
            console.log('InkDebug: strokes count after push =', updated.length);
            return updated;
          });
        }
        currentStrokeRef.current = [];
        setCurrentStroke([]);
      },
      onPanResponderTerminate: () => {
        console.log('InkDebug: TERMINATE, points in current stroke =', currentStrokeRef.current.length);
        if (currentStrokeRef.current.length > 0) {
          setStrokes(prev => [...prev, currentStrokeRef.current]);
        }
        currentStrokeRef.current = [];
        setCurrentStroke([]);
      },
    })
  ).current;

  const strokeToPath = (stroke: Stroke): string => {
    if (stroke.length === 0) return '';
    let d = `M ${stroke[0].x} ${stroke[0].y}`;
    stroke.forEach(p => { d += ` L ${p.x} ${p.y}`; });
    return d;
  };

 const handleRecognize = async () => {
    const validStrokes = strokes.filter(s => s.length > 0);
    if (validStrokes.length === 0) {
      Alert.alert('Draw something first');
      return;
    }
    try {
      const text: string = await InkRecognizerModule.recognizeInk(validStrokes);
      setRecognizedText(text);
    } catch (e: any) {
      Alert.alert('Recognition failed', e.message);
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    currentStrokeRef.current = [];
    setRecognizedText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.canvas} {...panResponder.panHandlers}>
        <Svg style={{ flex: 1 }}>
          {strokes.map((s, i) => (
            <Path key={i} d={strokeToPath(s)} stroke="black" strokeWidth={3} fill="none" />
          ))}
          <Path d={strokeToPath(currentStroke)} stroke="black" strokeWidth={3} fill="none" />
        </Svg>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text>🗑️ Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRecognize} style={styles.recognizeButton}>
          <Text style={{ color: '#fff' }}>✍️ Recognize</Text>
        </TouchableOpacity>
      </View>
<Text style={{ color: '#888', textAlign: 'center', paddingBottom: 4 }}>
        Strokes saved: {strokes.length}
      </Text>

      {recognizedText ? (
        <View style={{ padding: 12 }}>
          <Text style={{ fontWeight: 'bold' }}>Recognized Text:</Text>
          <Text>{recognizedText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 12 },
  clearButton: { padding: 10, backgroundColor: '#eee', borderRadius: 8 },
  recognizeButton: { padding: 10, backgroundColor: '#4a90e2', borderRadius: 8 },
});