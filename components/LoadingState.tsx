import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import WineGlassLoader from './WineGlassLoader';

interface Props {
  message?: string;
}

export default function LoadingState({ message }: Props) {
  return (
    <View style={styles.container}>
      <WineGlassLoader size={80} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
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
