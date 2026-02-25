import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';

interface Props {
  message?: string;
}

export default function LoadingState({ message = 'Chargement...' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.burgundy} />
      <Text style={styles.text}>{message}</Text>
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
    color: COLORS.gray,
  },
});
