import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Speech from 'expo-speech';

export default function usePronunciation() {
  const [error, setError] = useState('');
  const generation = useRef(0);
  const available = Platform.OS !== 'web' || (typeof window !== 'undefined' &&
    typeof window.speechSynthesis?.speak === 'function' &&
    typeof window.speechSynthesis?.cancel === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function');

  const stop = useCallback(() => {
    generation.current++;
    if (available) void Speech.stop().catch(() => {});
  }, [available]);

  const play = useCallback((texts: readonly string[]) => {
    stop();
    setError('');
    if (!available) {
      setError('このブラウザーは音声再生に対応していません。');
      return;
    }
    const current = generation.current;
    const onError = () => {
      if (generation.current !== current) return;
      stop();
      setError('音声を再生できませんでした。「単語を聞く」「例文を聞く」で再試行できます。');
    };
    try {
      // Queue both utterances during the tap, preserving the browser's user gesture.
      // A replay replaces the queue instead of overlapping the previous audio.
      for (const text of texts.filter(text => text.trim())) {
        Speech.speak(text, { language: 'en-US', rate: 0.85, onError });
      }
    } catch {
      onError();
    }
  }, [available, stop]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') stop();
    });
    return () => { listener.remove(); stop(); };
  }, [stop]);

  return { play, stop, error };
}
