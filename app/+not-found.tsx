import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page non trouvée' }} />
      <View style={styles.container}>
        <Text style={styles.title}>🍷 Page non trouvée</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Retour à l'accueil</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cream, padding: SPACING.lg },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.grayDark },
  link: { marginTop: SPACING.lg },
  linkText: { fontSize: 16, color: COLORS.burgundy, fontWeight: '600' },
});
