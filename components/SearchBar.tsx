import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, Pressable, Platform, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { hapticLight } from '@/services/haptics';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Rechercher un vin...' }: Props) {
  const colors = useThemeColors();
  const { language } = useSettings();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsListening(false);
    stopPulse();
  }, [stopPulse]);

  const startVoiceSearch = useCallback(async () => {
    if (Platform.OS !== 'web') return;

    // If already listening, stop
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(language === 'en'
        ? 'Voice search is not supported in this browser.'
        : 'La recherche vocale n\'est pas supportée dans ce navigateur.');
      return;
    }

    hapticLight();

    // Request microphone permission first (helps on mobile)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately — we just needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch {
      alert(language === 'en'
        ? 'Microphone access denied. Please allow it in your browser settings.'
        : 'Accès au micro refusé. Veuillez l\'autoriser dans les paramètres du navigateur.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language === 'en' ? 'en-CA' : 'fr-CA';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let gotResult = false;

      recognition.onstart = () => {
        setIsListening(true);
        startPulse();
      };

      recognition.onend = () => {
        // If we never got a result, show a hint
        if (!gotResult) {
          alert(language === 'en'
            ? 'No speech detected. Please try again and speak clearly.'
            : 'Aucune voix détectée. Réessayez en parlant clairement.');
        }
        stopListening();
      };

      recognition.onerror = (e: any) => {
        stopListening();
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          alert(language === 'en'
            ? 'Microphone access denied. Please allow it in your browser settings.'
            : 'Accès au micro refusé. Veuillez l\'autoriser dans les paramètres du navigateur.');
        } else if (e.error === 'no-speech') {
          alert(language === 'en'
            ? 'No speech detected. Please try again.'
            : 'Aucune voix détectée. Réessayez.');
        } else if (e.error !== 'aborted') {
          alert(language === 'en'
            ? `Voice search error: ${e.error}`
            : `Erreur recherche vocale : ${e.error}`);
        }
      };

      recognition.onresult = (event: any) => {
        gotResult = true;
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        onChangeText(transcript);
        if (result.isFinal) {
          stopListening();
          onSubmit?.();
        }
      };

      recognition.start();

      // Safety timeout — stop after 8 seconds if still listening
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }
      }, 8000);

    } catch {
      stopListening();
    }
  }, [onChangeText, onSubmit, language, isListening, stopListening, startPulse]);

  const hasSpeech = Platform.OS === 'web' && typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Show mic when: no text, OR currently listening (so user can tap to stop)
  const showMic = hasSpeech && (value.length === 0 || isListening);

  return (
    <View style={[styles.container, { backgroundColor: colors.white, borderColor: isListening ? COLORS.red : colors.grayLight }]}>
      <Ionicons name="search" size={20} color={COLORS.gray} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: colors.black }]}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={isListening ? (language === 'en' ? 'Listening...' : 'Écoute...') : placeholder}
        placeholderTextColor={isListening ? COLORS.red : COLORS.gray}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        accessibilityRole="search"
      />
      {value.length > 0 && !isListening && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} style={{ marginRight: showMic ? 4 : 0 }} accessibilityLabel="Clear search" accessibilityRole="button">
          <Ionicons name="close-circle" size={20} color={COLORS.gray} />
        </Pressable>
      )}
      {showMic && (
        <Pressable onPress={startVoiceSearch} hitSlop={8} accessibilityLabel="Voice search" accessibilityRole="button">
          <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={22}
              color={isListening ? COLORS.red : COLORS.gray}
            />
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    height: 44,
    borderWidth: 1,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
});
