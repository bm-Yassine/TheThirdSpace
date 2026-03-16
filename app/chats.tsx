import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FloatingNavigation from '../components/FloatingNavigation';
import {
  authService,
  dataService,
  type ChatMessage,
  type ConversationSummary,
} from '../Backend/firebase';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatConversationTime = (value: any) => {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatMessageTime = (value: any) => {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ChatsScreen() {
  const params = useLocalSearchParams();
  const conversationParam = String(params.conversationId || '');
  const otherUserIdParam = String(params.otherUserId || '');

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const currentUid = authService.getCurrentUser()?.uid || '';

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const loadConversations = useCallback(async () => {
    const list = await dataService.getUserConversations();
    setConversations(list);
    return list;
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const list = await dataService.getConversationMessages(conversationId);
      setMessages(list);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Login Required', 'Please sign in to view chats.', [
          { text: 'Cancel', style: 'cancel', onPress: () => router.replace('/home') },
          { text: 'Sign In', onPress: () => router.replace('/login') },
        ]);
        setLoading(false);
        return;
      }

      try {
        const list = await loadConversations();

        if (otherUserIdParam) {
          const conversationId = await dataService.getOrCreateConversation(otherUserIdParam);
          setSelectedConversationId(conversationId);
          await loadMessages(conversationId);
          return;
        }

        if (conversationParam) {
          setSelectedConversationId(conversationParam);
          await loadMessages(conversationParam);
          return;
        }

        if (list.length > 0) {
          setSelectedConversationId(list[0].id);
          await loadMessages(list[0].id);
        }
      } catch (error) {
        console.error('Failed to initialize chats:', error);
        Alert.alert('Error', 'Could not load chats right now.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [conversationParam, loadConversations, loadMessages, otherUserIdParam]);

  const openConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    await loadMessages(conversationId);
  };

  const onSend = async () => {
    if (!selectedConversationId || !draft.trim()) return;
    try {
      const text = draft;
      setDraft('');
      await dataService.sendMessage(selectedConversationId, text);
      await Promise.all([loadMessages(selectedConversationId), loadConversations()]);
    } catch (error) {
      console.error('Send message failed:', error);
      Alert.alert('Error', 'Could not send your message.');
    }
  };

  const renderConversation = ({ item }: { item: ConversationSummary }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => openConversation(item.id)}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.otherUserName?.charAt(0) || 'U'}</Text>
        </View>
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.otherUserName || 'User'}</Text>
          <Text style={styles.timestamp}>{formatConversationTime(item.updatedAt)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage || 'Start the conversation'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === currentUid;
    return (
      <View style={[styles.messageRow, mine ? styles.messageRight : styles.messageLeft]}>
        <View style={[styles.messageBubble, mine ? styles.messageMine : styles.messageTheirs]}>
          <Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.text}</Text>
          <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{formatMessageTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {!!selectedConversationId && (
            <Pressable onPress={() => setSelectedConversationId(null)}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          )}
          <Text style={styles.headerTitle}>{selectedConversation?.otherUserName || 'Chats'}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {!selectedConversationId ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No Chats Yet</Text>
              <Text style={styles.emptyText}>Open an organizer profile and tap “Message”.</Text>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          {loadingMessages ? (
            <View style={[styles.centered, { flex: 1 }]}>
              <ActivityIndicator size="small" color="#111827" />
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesContent}
            />
          )}

          <View style={styles.inputBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message"
              style={styles.input}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={onSend}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FloatingNavigation activeScreen="chats" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    fontSize: 14,
    color: '#2563EB',
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 90,
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  messageLeft: { justifyContent: 'flex-start' },
  messageRight: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  messageMine: {
    backgroundColor: '#111827',
  },
  messageTheirs: {
    backgroundColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 14,
    color: '#111827',
  },
  messageTextMine: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMine: {
    color: '#D1D5DB',
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
