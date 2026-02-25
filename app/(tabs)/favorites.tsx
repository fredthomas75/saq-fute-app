import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import WineCard from '@/components/WineCard';
import EmptyState from '@/components/EmptyState';
import type { Wine } from '@/types/wine';

export default function FavoritesScreen() {
  const { favorites } = useFavorites();

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="heart-outline"
          message="Aucun favori"
          submessage="Appuie sur le ❤️ d'un vin pour le sauvegarder ici"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites as Wine[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WineCard wine={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  list: { paddingBottom: SPACING.xl },
});
