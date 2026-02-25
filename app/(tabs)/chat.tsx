import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { sendChatMessage, type ChatMessage } from '@/services/chat';

const SUGGESTIONS = [
  'Bon vin rouge sous 20$ ?',
  'Vin pour accompagner un sushi ?',
  'Meilleurs deals cette semaine ?',
  'Un blanc frais pour l\'apéro ?',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await sendChatMessage(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '❌ Erreur de connexion. Le chat IA sera disponible prochainement.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>🍷 Sommelier IA</Text>
          <Text style={styles.welcomeSub}>Posez-moi vos questions sur le vin!</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={loading ? (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.bubbleText}>⏳ Réflexion...</Text>
            </View>
          ) : null}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Demandez un conseil..."
          placeholderTextColor={COLORS.gray}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          editable={!loading}
        />
        <Pressable onPress={() => send()} style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}>
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
  bubbleText: { fontSize: 15, lineHeight: 22, color: COLORS.black },
  userText: { color: COLORS.white },
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
});
