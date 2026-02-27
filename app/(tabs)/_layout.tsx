import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import Logo from '@/components/Logo';

function HeaderLogo() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.replace('/')} style={styles.headerLogoRow}>
      <Logo size={28} color={COLORS.cream} accentColor={COLORS.gold} />
      <Text style={styles.headerLogoText}>SAQ Futé</Text>
    </Pressable>
  );
}

function HeaderRight() {
  const router = useRouter();
  return (
    <View style={styles.headerRightRow}>
      <Pressable onPress={() => router.push('/cellar')} style={styles.headerBtn} hitSlop={12}>
        <MaterialCommunityIcons name="bottle-wine-outline" size={22} color={COLORS.white} />
      </Pressable>
      <Pressable onPress={() => router.push('/wishlist')} style={styles.headerBtn} hitSlop={12}>
        <Ionicons name="bookmark-outline" size={21} color={COLORS.white} />
      </Pressable>
      <Pressable onPress={() => router.push('/map')} style={styles.headerBtn} hitSlop={12}>
        <Ionicons name="map-outline" size={21} color={COLORS.white} />
      </Pressable>
      <Pressable onPress={() => router.push('/settings')} style={styles.headerBtn} hitSlop={12}>
        <Ionicons name="settings-outline" size={22} color={COLORS.white} />
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const t = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.burgundy,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: COLORS.cream, borderTopColor: COLORS.grayLight },
        headerStyle: { backgroundColor: COLORS.burgundy },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
        headerTitle: () => <HeaderLogo />,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.search,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: t.tabs.deals,
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pairing"
        options={{
          title: t.tabs.pairing,
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t.tabs.chat,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t.tabs.favorites,
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: SPACING.md,
  },
  headerLogoText: {
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: SPACING.sm,
  },
  headerBtn: {
    padding: 6,
  },
});
