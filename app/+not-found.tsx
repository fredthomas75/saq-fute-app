import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export default function NotFoundScreen() {
  const t = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t.notFound.title }} />
      <View style={styles.container}>
        <Text style={styles.title}>🍷 {t.notFound.title}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t.notFound.backHome}</Text>
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
