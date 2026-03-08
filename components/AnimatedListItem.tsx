import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface Props {
  index: number;
  children: React.ReactNode;
  /** Skip entrance animation (e.g. for infinite-scroll loaded items) */
  skipAnimation?: boolean;
}

export default function AnimatedListItem({ index, children, skipAnimation }: Props) {
  const opacity = useRef(new Animated.Value(skipAnimation ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(skipAnimation ? 0 : 20)).current;

  useEffect(() => {
    if (skipAnimation) return;
    const delay = Math.min(index * 60, 300); // Cap at 300ms
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, skipAnimation]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
