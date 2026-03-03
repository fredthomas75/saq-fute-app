import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export default function OfflineBanner() {
  const t = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleOnline = () => {
      setIsOffline(false);
      setWasOffline(true);
      // Auto-dismiss "back online" banner after 3s
      setTimeout(() => setWasOffline(false), 3000);
    };
    const handleOffline = () => { setIsOffline(true); setWasOffline(false); };

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Slide in/out animation
  useEffect(() => {
    const show = isOffline || wasOffline;
    Animated.spring(slideAnim, {
      toValue: show ? 0 : -40,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isOffline, wasOffline, slideAnim]);

  // Pulse animation when offline
  useEffect(() => {
    if (isOffline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [isOffline, pulseAnim]);

  if (!isOffline && !wasOffline) return null;

  const bgColor = isOffline ? COLORS.gray : COLORS.green;
  const message = isOffline ? t.common.offline : (t.common.backOnline || 'Connexion rétablie');
  const icon = isOffline ? 'cloud-offline-outline' : 'checkmark-circle-outline';

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bgColor, transform: [{ translateY: slideAnim }], opacity: isOffline ? pulseAnim : 1 }]}>
      <Ionicons name={icon} size={16} color={COLORS.white} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.gray,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
});
