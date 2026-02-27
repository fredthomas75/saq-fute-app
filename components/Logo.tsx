import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Ellipse, Rect, G, Polygon } from 'react-native-svg';
import { COLORS } from '@/constants/theme';

interface Props {
  size?: number;
  showText?: boolean;
  color?: string;
  accentColor?: string;
}

export default function Logo({
  size = 100,
  showText = false,
  color = COLORS.cream,
  accentColor = COLORS.gold,
}: Props) {
  const scale = size / 100;

  return (
    <View style={[styles.container, showText && styles.withText]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Glass bowl */}
        <Path
          d="M28,15 C28,15 23,58 42,64 L58,64 C77,58 72,15 72,15"
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Glass rim */}
        <Ellipse
          cx="50"
          cy="15"
          rx="22"
          ry="4"
          fill="none"
          stroke={color}
          strokeWidth={2.5}
        />

        {/* Wine fill */}
        <Path
          d="M33,38 C33,38 30,58 42,64 L58,64 C70,58 67,38 67,38 Z"
          fill={accentColor}
          opacity={0.5}
        />

        {/* Stem */}
        <Rect x="47" y="64" width="6" height="18" rx={3} fill={color} />

        {/* Base */}
        <Ellipse
          cx="50"
          cy="85"
          rx="18"
          ry="4"
          fill="none"
          stroke={color}
          strokeWidth={2.5}
        />

        {/* Sparkle star (top-right) - the "futé" element */}
        <G>
          <Polygon
            points="78,10 80,4 82,10 88,12 82,14 80,20 78,14 72,12"
            fill={accentColor}
          />
          <Polygon
            points="86,3 87,0 88,3 91,4 88,5 87,8 86,5 83,4"
            fill={accentColor}
            opacity={0.6}
          />
        </G>
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color, fontSize: 22 * scale }]}>SAQ Futé</Text>
          <Text style={[styles.subtitle, { color: accentColor, fontSize: 10 * scale }]}>
            Buvez mieux, dépensez moins
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  withText: {
    gap: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
