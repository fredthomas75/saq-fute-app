import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, VIP_COLORS } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { useIsDark, useThemeColors } from '@/hooks/useThemeColors';
import HeaderLogo from '@/components/HeaderLogo';
import HeaderIcons from '@/components/HeaderIcons';

export default function TabLayout() {
  const t = useTranslation();
  const { vipMode } = useSettings();
  const isDark = useIsDark();
  const colors = useThemeColors();

  const getTabBarStyle = () => {
    if (vipMode) return { backgroundColor: VIP_COLORS.bg, borderTopColor: VIP_COLORS.border };
    if (isDark) return { backgroundColor: colors.cream, borderTopColor: colors.grayLight };
    return { backgroundColor: COLORS.cream, borderTopColor: COLORS.grayLight };
  };

  const getHeaderBg = () => {
    if (vipMode) return VIP_COLORS.bg;
    if (isDark) return colors.creamDark;
    return COLORS.burgundy;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: vipMode ? VIP_COLORS.active : (isDark ? '#D08090' : COLORS.burgundy),
        tabBarInactiveTintColor: vipMode ? VIP_COLORS.inactive : COLORS.gray,
        tabBarStyle: getTabBarStyle(),
        headerStyle: { backgroundColor: getHeaderBg() },
        headerTintColor: vipMode ? COLORS.gold : (isDark ? '#F5F5F5' : COLORS.white),
        headerTitleStyle: { fontWeight: '700' },
        headerTitle: '',
        headerLeft: () => <HeaderLogo />,
        headerRight: () => <HeaderIcons />,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          headerShown: false,
          tabBarLabel: t.tabs.home,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarLabel: t.tabs.search,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          tabBarLabel: t.tabs.deals,
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: t.tabs.chat,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          tabBarLabel: t.tabs.favorites,
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      {/* Hidden tabs — keep tab bar visible on these screens */}
      <Tabs.Screen name="pairing" options={{ href: null, headerTitle: '', headerLeft: () => <HeaderLogo subtitle={t.tabs.pairing} /> }} />
      <Tabs.Screen name="cellar" options={{ href: null, headerTitle: '', headerLeft: () => <HeaderLogo subtitle={t.cellar.title} /> }} />
      <Tabs.Screen name="wishlist" options={{ href: null, headerTitle: '', headerLeft: () => <HeaderLogo subtitle={t.wishlist.title} /> }} />
      <Tabs.Screen name="map" options={{ href: null, headerTitle: '', headerLeft: () => <HeaderLogo subtitle={t.map.title} /> }} />
      <Tabs.Screen name="settings" options={{ href: null, headerTitle: '', headerLeft: () => <HeaderLogo subtitle={t.settings.title} /> }} />
    </Tabs>
  );
}

