import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable, Platform, StyleSheet } from 'react-native';
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

  const startVoiceSearch = useCallback(() => {
    if (Platform.OS !== 'web') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    hapticLight();
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'en' ? 'en-CA' : 'fr-CA';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onChangeText(transcript);
      onSubmit?.();
    };

    recognition.start();
  }, [onChangeText, onSubmit, language]);

  const hasSpeech = Platform.OS === 'web' && typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <View style={[styles.container, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
      <Ionicons name="search" size={20} color={COLORS.gray} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: colors.black }]}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        accessibilityRole="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} style={{ marginRight: hasSpeech ? 4 : 0 }} accessibilityLabel="Clear search" accessibilityRole="button">
          <Ionicons name="close-circle" size={20} color={COLORS.gray} />
        </Pressable>
      )}
      {hasSpeech && value.length === 0 && (
        <Pressable onPress={startVoiceSearch} hitSlop={8} accessibilityLabel="Voice search" accessibilityRole="button">
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={22}
            color={isListening ? COLORS.red : COLORS.gray}
          />
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
