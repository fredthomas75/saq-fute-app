import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useTasteProfile, TasteProfile } from '@/context/TasteProfileContext';
import { useTranslation } from '@/i18n';

const WINE_TYPES = ['Rouge', 'Blanc', 'Rosé', 'Mousseux'];
const TYPE_EMOJIS: Record<string, string> = { Rouge: '🍷', Blanc: '🥂', Rosé: '🌸', Mousseux: '🍾' };
const BUDGETS = [15, 20, 30, 50, 100];
const FOOD_KEYS = ['steak', 'pizza', 'sushi', 'poulet', 'poisson', 'fromage', 'pates', 'homard', 'salade', 'dessert'];
const FOOD_EMOJIS: Record<string, string> = {
  steak: '🥩', pizza: '🍕', sushi: '🍣', poulet: '🍗', poisson: '🐟',
  fromage: '🧀', pates: '🍝', homard: '🦞', salade: '🥗', dessert: '🍰',
};

export default function QuizScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { saveProfile } = useTasteProfile();
  const dishLabels = t.pairing.dishes as Record<string, string>;

  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<string[]>([]);
  const [sweetness, setSweetness] = useState<TasteProfile['sweetness']>('dry');
  const [body, setBody] = useState<TasteProfile['body']>('medium');
  const [budget, setBudget] = useState(30);
  const [foods, setFoods] = useState<string[]>([]);

  const toggleType = (type: string) => {
    setTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

  const toggleFood = (food: string) => {
    setFoods((prev) => prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food]);
  };

  const handleFinish = () => {
    saveProfile({
      preferredTypes: types.length > 0 ? types : ['Rouge'],
      sweetness,
      body,
      budgetMax: budget,
      foodPreferences: foods,
      completed: true,
    });
    router.back();
  };

  const canNext = step === 0 ? types.length > 0 : true;

  const questions = [t.quiz.q1, t.quiz.q2, t.quiz.q3, t.quiz.q4, t.quiz.q5];

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progress}>
        <Text style={styles.stepText}>{t.quiz.step} {step + 1} {t.quiz.of} 5</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((step + 1) / 5) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.question}>{questions[step]}</Text>

        {/* Step 0: Wine type */}
        {step === 0 && (
          <View style={styles.grid}>
            {WINE_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => toggleType(type)}
                style={[styles.optionCard, types.includes(type) && styles.optionCardActive]}
              >
                <Text style={styles.optionEmoji}>{TYPE_EMOJIS[type]}</Text>
                <Text style={[styles.optionLabel, types.includes(type) && styles.optionLabelActive]}>{type}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Step 1: Sweetness */}
        {step === 1 && (
          <View style={styles.optionList}>
            {(['dry', 'off-dry', 'sweet'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSweetness(s)}
                style={[styles.optionRow, sweetness === s && styles.optionRowActive]}
              >
                <Text style={[styles.optionRowText, sweetness === s && styles.optionRowTextActive]}>
                  {t.quiz[s === 'off-dry' ? 'offDry' : s]}
                </Text>
                {sweetness === s && <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />}
              </Pressable>
            ))}
          </View>
        )}

        {/* Step 2: Body */}
        {step === 2 && (
          <View style={styles.optionList}>
            {(['light', 'medium', 'full'] as const).map((b) => (
              <Pressable
                key={b}
                onPress={() => setBody(b)}
                style={[styles.optionRow, body === b && styles.optionRowActive]}
              >
                <Text style={[styles.optionRowText, body === b && styles.optionRowTextActive]}>
                  {t.quiz[b]}
                </Text>
                {body === b && <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />}
              </Pressable>
            ))}
          </View>
        )}

        {/* Step 3: Budget */}
        {step === 3 && (
          <View style={styles.budgetRow}>
            {BUDGETS.map((b) => (
              <Pressable
                key={b}
                onPress={() => setBudget(b)}
                style={[styles.budgetChip, budget === b && styles.budgetChipActive]}
              >
                <Text style={[styles.budgetText, budget === b && styles.budgetTextActive]}>{b}$</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Step 4: Food */}
        {step === 4 && (
          <View style={styles.grid}>
            {FOOD_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => toggleFood(key)}
                style={[styles.optionCard, foods.includes(key) && styles.optionCardActive]}
              >
                <Text style={styles.optionEmoji}>{FOOD_EMOJIS[key]}</Text>
                <Text style={[styles.optionLabel, foods.includes(key) && styles.optionLabelActive]}>
                  {dishLabels[key] || key}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.nav}>
        {step > 0 ? (
          <Pressable onPress={() => setStep(step - 1)} style={styles.navBtnSecondary}>
            <Text style={styles.navTextSecondary}>{t.quiz.previous}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step < 4 ? (
          <Pressable
            onPress={() => canNext && setStep(step + 1)}
            style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
          >
            <Text style={styles.navText}>{t.quiz.next}</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </Pressable>
        ) : (
          <Pressable onPress={handleFinish} style={styles.navBtn}>
            <Text style={styles.navText}>{t.quiz.finish}</Text>
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  progress: { padding: SPACING.md, paddingBottom: 0 },
  stepText: { fontSize: 13, color: COLORS.gray, marginBottom: SPACING.xs },
  progressBar: { height: 4, backgroundColor: COLORS.grayLight, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: COLORS.burgundy, borderRadius: 2 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  question: { fontSize: 22, fontWeight: '800', color: COLORS.black, marginBottom: SPACING.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  optionCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.grayLight,
    ...SHADOWS.card,
  },
  optionCardActive: { borderColor: COLORS.burgundy, backgroundColor: COLORS.burgundy },
  optionEmoji: { fontSize: 36, marginBottom: SPACING.xs },
  optionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.grayDark },
  optionLabelActive: { color: COLORS.white },
  optionList: { gap: SPACING.sm },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.grayLight,
  },
  optionRowActive: { borderColor: COLORS.burgundy, backgroundColor: COLORS.burgundy },
  optionRowText: { fontSize: 17, fontWeight: '600', color: COLORS.grayDark },
  optionRowTextActive: { color: COLORS.white },
  budgetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  budgetChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.grayLight,
  },
  budgetChipActive: { borderColor: COLORS.burgundy, backgroundColor: COLORS.burgundy },
  budgetText: { fontSize: 18, fontWeight: '700', color: COLORS.grayDark },
  budgetTextActive: { color: COLORS.white },
  nav: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight + '40',
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.burgundy,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.burgundy,
  },
  navText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  navTextSecondary: { fontSize: 16, fontWeight: '600', color: COLORS.burgundy },
});
