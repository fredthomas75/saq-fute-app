import React, { useState, useRef } from 'react';
import { View, Text, Pressable, FlatList, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@saq_fute_onboarding_done';

const SLIDES = [
  { icon: 'scan-outline' as const, color: COLORS.burgundy },
  { icon: 'restaurant-outline' as const, color: COLORS.gold },
  { icon: 'chatbubbles-outline' as const, color: '#7FB3D8' },
];

export default function OnboardingScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const slideTexts = [
    { title: t.onboarding.slide1Title, sub: t.onboarding.slide1Sub },
    { title: t.onboarding.slide2Title, sub: t.onboarding.slide2Sub },
    { title: t.onboarding.slide3Title, sub: t.onboarding.slide3Sub },
  ];

  const handleDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/');
  };

  const handleNext = () => {
    if (activeIndex < 2) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleDone();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View style={styles.container}>
      {/* Skip */}
      <View style={styles.skipRow}>
        <Pressable onPress={handleDone} hitSlop={12}>
          <Text style={styles.skipText}>{t.onboarding.skip}</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={80} color={item.color} />
            </View>
            <Text style={styles.title}>{slideTexts[index].title}</Text>
            <Text style={styles.sub}>{slideTexts[index].sub}</Text>
          </View>
        )}
      />

      {/* Dots + button */}
      <View style={styles.bottomSection}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextText}>
            {activeIndex === 2 ? t.onboarding.start : t.onboarding.next}
          </Text>
          <Ionicons name={activeIndex === 2 ? 'checkmark' : 'arrow-forward'} size={20} color={COLORS.white} />
        </Pressable>
      </View>
    </View>
  );
}

export async function shouldShowOnboarding(): Promise<boolean> {
  const done = await AsyncStorage.getItem(ONBOARDING_KEY);
  return done !== 'true';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  sub: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  bottomSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 50,
    gap: SPACING.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.burgundy,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.burgundy,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
});
