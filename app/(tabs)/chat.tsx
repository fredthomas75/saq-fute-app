import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, Linking, Animated, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { sendChatMessage, type ChatMessage } from '@/services/chat';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { useThemeColors } from '@/hooks/useThemeColors';

// Web: use native HTML file input for reliable camera/gallery on mobile browsers
// Native: use expo-image-picker
let ImagePicker: typeof import('expo-image-picker') | null = null;
if (Platform.OS !== 'web') {
  try { ImagePicker = require('expo-image-picker'); } catch {}
}

/** Read a File as base64 data URL and extract the raw base64 string */
function readFileAsBase64(file: File): Promise<{ uri: string; base64: string } | null> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl?.split(',')[1] || '';
      resolve(b64 ? { uri: dataUrl, base64: b64 } : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function openWebFilePicker(capture?: boolean): Promise<{ uri: string; base64: string } | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      resolve(await readFileAsBase64(file));
    };
    // User cancelled
    const onFocus = () => { setTimeout(() => { if (!input.files?.length) resolve(null); }, 500); };
    window.addEventListener('focus', onFocus, { once: true });
    input.click();
  });
}

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

/** Strip URLs, emojis, and markdown for clean TTS output */
function stripForSpeech(text: string): string {
  let out = text;
  // Remove markdown links
  out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Remove raw URLs
  out = out.replace(/https?:\/\/[^\s)>\]]+/g, '');
  // Remove ** bold
  out = out.replace(/\*\*/g, '');
  // Remove common emojis used as section headers
  out = out.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  // Collapse whitespace
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

/** TTS: try ElevenLabs API first (natural voice), fallback to browser Speech API */
const TTS_API = 'https://saq-fute-api.vercel.app/api/tts';

function SpeakButton({ text, lang }: { text: string; lang: string }) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
    } catch {}
    setSpeaking(false);
  };

  const speakWithBrowser = (clean: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang === 'fr' ? 'fr-CA' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang === 'fr' ? 'fr' : 'en';
    const matching = voices.filter(v => v.lang.startsWith(prefix));
    const google = matching.find(v => v.name.includes('Google'));
    const premium = matching.find(v =>
      ['Amélie','Amelie','Thomas','Samantha','Karen','Daniel'].some(n => v.name.includes(n))
    );
    const best = google || premium || matching.find(v => !v.name.includes('espeak')) || matching[0];
    if (best) utterance.voice = best;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const toggle = async () => {
    if (speaking) { stop(); return; }

    const clean = stripForSpeech(text);
    if (!clean) return;
    setSpeaking(true);

    try {
      // Try ElevenLabs API first
      const res = await fetch(TTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, lang }),
      });
      if (!res.ok) throw new Error('TTS API error');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
    } catch {
      // Fallback to browser voices
      speakWithBrowser(clean);
    }
  };

  return (
    <Pressable onPress={toggle} style={styles.speakBtn} hitSlop={8} accessibilityLabel={speaking ? 'Stop' : 'Listen'} accessibilityRole="button">
      <Ionicons name={speaking ? 'stop' : 'play'} size={14} color={COLORS.gray} />
    </Pressable>
  );
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
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick 4 random suggestions from the pool on each mount
  const randomSuggestions = useMemo(() => {
    const pool = [...t.chat.suggestions];
    const picked: string[] = [];
    while (picked.length < 4 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }, []);

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

  const pickImage = async () => {
    if (loading) return;
    if (Platform.OS === 'web') {
      const result = await openWebFilePicker(false);
      if (result) setPendingImage(result);
      return;
    }
    if (!ImagePicker) return;
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 as number });
    if (!res.canceled && res.assets[0]) {
      setPendingImage({ uri: res.assets[0].uri, base64: res.assets[0].base64 || '' });
    }
  };

  const takePhoto = async () => {
    if (loading) return;
    if (Platform.OS === 'web') {
      // On mobile web, capture="environment" opens the back camera directly
      const result = await openWebFilePicker(true);
      if (result) setPendingImage(result);
      return;
    }
    if (!ImagePicker) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 as number });
    if (!res.canceled && res.assets[0]) {
      let b64 = res.assets[0].base64 || '';
      if (b64.startsWith('data:')) b64 = b64.split(',')[1] || '';
      if (!b64 && res.assets[0].uri?.startsWith('data:')) b64 = res.assets[0].uri.split(',')[1] || '';
      if (b64) setPendingImage({ uri: res.assets[0].uri, base64: b64 });
    }
  };

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && !pendingImage) || loading) return;
    setInput('');

    let userMsg: ChatMessage;
    let displayUri: string | undefined;

    if (pendingImage) {
      const contentBlocks: any[] = [];
      if (msg) contentBlocks.push({ type: 'text', text: msg });
      else contentBlocks.push({ type: 'text', text: language === 'en' ? 'What can you tell me about this wine?' : 'Que peux-tu me dire sur ce vin ?' });
      contentBlocks.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${pendingImage.base64}` },
      });
      userMsg = { role: 'user', content: contentBlocks };
      displayUri = pendingImage.uri;
      setPendingImage(null);
    } else {
      userMsg = { role: 'user', content: msg };
    }

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

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const hasImage = Array.isArray(item.content);

    // Extract text and image from content
    let textContent = '';
    let imageUri: string | undefined;

    if (hasImage) {
      for (const block of item.content as any[]) {
        if (block.type === 'text') textContent = block.text || '';
        if (block.type === 'image_url') imageUri = block.image_url?.url;
      }
    } else {
      textContent = item.content as string;
    }

    return (
      <View>
        <View style={[
          styles.bubble,
          isUser
            ? styles.userBubble
            : [styles.assistantBubble, { backgroundColor: colors.white }],
        ]}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.chatImage} resizeMode="cover" />
          )}
          {textContent ? (
            <MessageContent text={textContent} isUser={isUser} textColor={isUser ? undefined : colors.black} />
          ) : null}
        </View>
        {!isUser && textContent ? (
          <SpeakButton text={textContent} lang={language} />
        ) : null}
      </View>
    );
  }, [colors.white, colors.black, language]);

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
            {randomSuggestions.map((s, i) => (
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

      {pendingImage && (
        <View style={[styles.previewRow, { backgroundColor: colors.white, borderTopColor: colors.grayLight }]}>
          <Image source={{ uri: pendingImage.uri }} style={styles.previewThumb} resizeMode="cover" />
          <Text style={[styles.previewText, { color: colors.black }]} numberOfLines={1}>{t.chat.imageAttached}</Text>
          <Pressable onPress={() => setPendingImage(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={COLORS.gray} />
          </Pressable>
        </View>
      )}

      <View style={[styles.inputRow, { backgroundColor: colors.white, borderTopColor: pendingImage ? 'transparent' : colors.grayLight }]}>
        <Pressable onPress={takePhoto} style={styles.attachBtn} disabled={loading} accessibilityLabel={t.chat.takePhoto}>
          <Ionicons name="camera-outline" size={24} color={loading ? COLORS.gray : COLORS.burgundy} />
        </Pressable>
        <Pressable onPress={pickImage} style={styles.attachBtn} disabled={loading} accessibilityLabel={t.chat.addImage}>
          <Ionicons name="image-outline" size={22} color={loading ? COLORS.gray : COLORS.burgundy} />
        </Pressable>
        <TextInput
          style={[styles.input, { color: colors.black, backgroundColor: colors.cream }]}
          value={input}
          onChangeText={setInput}
          placeholder={pendingImage ? (t.chat.imagePromptPlaceholder) : t.chat.placeholder}
          placeholderTextColor={COLORS.gray}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          editable={!loading}
          accessibilityLabel={t.chat.placeholder}
        />
        <Pressable onPress={() => send()} style={[styles.sendBtn, (!input.trim() && !pendingImage || loading) && styles.sendBtnDisabled]} accessibilityLabel="Send" accessibilityRole="button">
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
  attachBtn: {
    padding: 6,
    marginRight: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderTopWidth: 1,
  },
  previewThumb: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
  },
  chatImage: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
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
  speakBtn: {
    alignSelf: 'flex-start',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    marginTop: -4,
    marginBottom: SPACING.sm,
  },
});
