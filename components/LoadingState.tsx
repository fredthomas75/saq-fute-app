import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import WineGlassLoader from './WineGlassLoader';

interface Props {
  message?: string;
}

export default function LoadingState({ message }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <WineGlassLoader size={80} />
      {message ? <Text style={[styles.text, { color: colors.gray }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  text: {
    marginTop: SPACING.md,
    fontSize: 15,
  },
});
