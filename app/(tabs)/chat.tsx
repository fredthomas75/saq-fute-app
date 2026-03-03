import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, Linking, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { sendChatMessage, type ChatMessage } from '@/services/chat';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { useThemeColors } from '@/hooks/useThemeColors';

const URL_SPLIT = /(https?:\/\/[^\s)\]>,]+)/g;
const IS_URL = /^https?:\/\//;
const SAQ_HOST = /https?:\/\/(?:www\.)?saq\.com/;
// Emojis that mark a new section in wine descriptions
const SECTION_EMOJI = /\s*([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/gu;

function formatWineText(text: string): string {
  // Add line breaks before section emojis (📍💰🍇📝🍽️⭐❤️ etc.)
  let formatted = text.replace(SECTION_EMOJI, '\n$1');
  // Clean up leading newline if any
  formatted = formatted.replace(/^\n+/, '');
  return formatted;
}

function preprocess(text: string): string {
  // Convert markdown links [text](url) → url
  let out = text.replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '$2');
  // Remove · separators between sections
  out = out.replace(/\s*·\s*/g, ' ');
  // Remove ** bold markers
  out = out.replace(/\*\*/g, '');
  return out;
}

function ThinkingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.thinkingRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.thinkingDot, { opacity: dot, transform: [{ scale: dot.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] }) }] }]} />
      ))}
    </View>
  );
}

function MessageContent({ text, isUser, textColor }: { text: string; isUser: boolean; textColor?: string }) {
  const t = useTranslation();
  const processed = preprocess(text);
  const baseTextColor = textColor || COLORS.black;
  const parts = processed.split(URL_SPLIT);

  if (parts.length === 1) {
    return <Text style={[styles.bubbleText, { color: baseTextColor }, isUser && styles.userText]}>{formatWineText(processed)}</Text>;
  }

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (IS_URL.test(part)) {
      if (SAQ_HOST.test(part)) {
        elements.push(
          <Pressable key={i} onPress={() => Linking.openURL(part)} style={[styles.saqLink, isUser && styles.saqLinkUser]}>
            <Ionicons name="cart-outline" size={13} color={isUser ? COLORS.cream : COLORS.burgundy} />
            <Text style={[styles.saqLinkText, isUser && styles.saqLinkTextUser]}>{t.chat.viewOnSAQ}</Text>
          </Pressable>
        );
      } else {
        elements.push(
          <Pressable key={i} onPress={() => Linking.openURL(part)} style={styles.otherLinkRow}>
            <Ionicons name="link-outline" size={13} color={isUser ? COLORS.goldLight : COLORS.burgundy} />
            <Text style={[styles.otherLinkText, isUser && styles.otherLinkTextUser]} numberOfLines={1}>
              {part.replace(/^https?:\/\/(?:www\.)?/, '')}
            </Text>
          </Pressable>
        );
      }
    } else {
      // Clean parens/brackets that wrapped adjacent URLs
      let cleaned = part;
      if (i + 1 < parts.length && IS_URL.test(parts[i + 1])) {
        cleaned = cleaned.replace(/\s*[\(\[]\s*$/, '');
      }
      if (i > 0 && IS_URL.test(parts[i - 1])) {
        cleaned = cleaned.replace(/^\s*[\)\]]\s*/, '');
      }
      // Remove SAQ markers/cart emojis that the API injects (the link already shows this)
      cleaned = cleaned.replace(/[·\-\s]*🛒\s*\[SAQ\]/g, '');
      cleaned = cleaned.replace(/[·\-\s]*\[SAQ\]/g, '');
      cleaned = cleaned.replace(/[·\-\s]*🛒/g, '');
      // Remove leftover markdown link text like "[SAQ ici]"
      cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
      cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
      if (cleaned) {
        elements.push(
          <Text key={i} style={[styles.bubbleText, { color: baseTextColor }, isUser && styles.userText]}>{formatWineText(cleaned)}</Text>
        );
      }
    }
  }

  return <View>{elements}</View>;
}

export default function ChatScreen() {
  const t = useTranslation();
  const { language, vipMode } = useSettings();
  const colors = useThemeColors();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced scroll-to-end to avoid rapid calls
  const scrollToEnd = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Cleanup scroll timer on unmount
  useEffect(() => {
    return () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); };
  }, []);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await sendChatMessage(newMessages, language, vipMode);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: t.chat.error }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.bubble,
      item.role === 'user'
        ? styles.userBubble
        : [styles.assistantBubble, { backgroundColor: colors.white }],
    ]}>
      <MessageContent text={item.content as string} isUser={item.role === 'user'} textColor={item.role === 'user' ? undefined : colors.black} />
    </View>
  ), [colors.white, colors.black]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.cream }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>{t.chat.welcomeTitle}</Text>
          <Text style={styles.welcomeSub}>{t.chat.welcomeSub}</Text>
          <View style={styles.suggestions}>
            {t.chat.suggestions.map((s, i) => (
              <Pressable key={i} onPress={() => send(s)} style={styles.suggestionBtn}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToEnd}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'web'}
          ListFooterComponent={loading ? (
            <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.white }]}>
              <ThinkingDots />
            </View>
          ) : null}
        />
      )}

      <View style={[styles.inputRow, { backgroundColor: colors.white, borderTopColor: colors.grayLight }]}>
        <TextInput
          style={[styles.input, { color: colors.black, backgroundColor: colors.cream }]}
          value={input}
          onChangeText={setInput}
          placeholder={t.chat.placeholder}
          placeholderTextColor={COLORS.gray}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          editable={!loading}
          accessibilityLabel={t.chat.placeholder}
        />
        <Pressable onPress={() => send()} style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} accessibilityLabel="Send" accessibilityRole="button">
          <Ionicons name="send" size={20} color={COLORS.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg },
  welcomeTitle: { fontSize: 28, fontWeight: '800', color: COLORS.burgundy, marginBottom: SPACING.sm },
  welcomeSub: { fontSize: 16, color: COLORS.gray, marginBottom: SPACING.lg },
  suggestions: { width: '100%', gap: SPACING.sm },
  suggestionBtn: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  suggestionText: { fontSize: 15, color: COLORS.burgundy, fontWeight: '500' },
  messageList: { padding: SPACING.md, paddingBottom: SPACING.sm },
  bubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  userBubble: {
    backgroundColor: COLORS.burgundy,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: COLORS.white },
  saqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  saqLinkUser: {},
  saqLinkText: { fontSize: 13, color: COLORS.burgundy, textDecorationLine: 'underline' },
  saqLinkTextUser: { color: COLORS.goldLight },
  otherLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  otherLinkText: { fontSize: 13, color: COLORS.burgundy, textDecorationLine: 'underline', flexShrink: 1 },
  otherLinkTextUser: { color: COLORS.goldLight },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
  sendBtn: {
    backgroundColor: COLORS.burgundy,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  thinkingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.burgundy,
  },
});
