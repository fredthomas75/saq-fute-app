import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path, Ellipse, Rect, Defs, ClipPath, G } from 'react-native-svg';
import { COLORS } from '@/constants/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface Props {
  size?: number;
  color?: string;
}

export default function WineGlassLoader({ size = 80, color = COLORS.burgundy }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) })
      ),
      -1
    );
  }, []);

  // Animated fill rect: moves upward as wine fills
  const fillProps = useAnimatedProps(() => {
    const fillHeight = interpolate(progress.value, [0, 1], [0, 38]);
    return {
      y: 52 - fillHeight,
      height: fillHeight,
    };
  });

  // Animated wine surface ellipse (wave effect at top of fill)
  const surfaceProps = useAnimatedProps(() => {
    const surfaceY = interpolate(progress.value, [0, 1], [52, 14]);
    const ry = interpolate(progress.value, [0, 0.1, 0.5, 1], [0, 2.5, 2, 1.5]);
    return {
      cy: surfaceY,
      ry,
    };
  });

  const scale = size / 80;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 80 90"
      >
        <Defs>
          {/* Clip path for the bowl interior */}
          <ClipPath id="bowlClip">
            <Path d="M22,14 C22,14 18,52 35,56 L45,56 C62,52 58,14 58,14 Z" />
          </ClipPath>
        </Defs>

        {/* Wine fill (clipped to bowl shape) */}
        <G clipPath="url(#bowlClip)">
          <AnimatedRect
            x="16"
            width="48"
            fill={color}
            opacity={0.75}
            animatedProps={fillProps}
          />
          {/* Wine surface wave */}
          <AnimatedEllipse
            cx="40"
            rx="22"
            fill={color}
            opacity={0.9}
            animatedProps={surfaceProps}
          />
        </G>

        {/* Glass bowl outline */}
        <Path
          d="M22,12 C22,12 18,52 35,56 L45,56 C62,52 58,12 58,12"
          fill="none"
          stroke={COLORS.gold}
          strokeWidth={2.2}
          strokeLinecap="round"
        />

        {/* Glass rim */}
        <Ellipse
          cx="40"
          cy="12"
          rx="18"
          ry="3"
          fill="none"
          stroke={COLORS.gold}
          strokeWidth={2}
        />

        {/* Stem */}
        <Rect
          x="38"
          y="56"
          width="4"
          height="18"
          rx={2}
          fill={COLORS.gold}
        />

        {/* Base */}
        <Ellipse
          cx="40"
          cy="76"
          rx="14"
          ry="3.5"
          fill="none"
          stroke={COLORS.gold}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
