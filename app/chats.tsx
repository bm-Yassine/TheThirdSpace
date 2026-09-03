import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  dataService,
  type ChatMessage,
  type ConversationSummary,
} from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import Avatar from '../components/Avatar';

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

  const { user, initializing } = useAuth();
  const currentUid = user?.uid || '';

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const messagesRef = useRef<FlatList<ChatMessage>>(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const visibleConversations = useMemo(
    () => conversations.filter((c) => !blockedIds.has(c.otherUserId)),
    [conversations, blockedIds]
  );

  // Live conversation list - the inbox reorders itself as messages arrive.
  useEffect(() => {
    if (initializing) return;

    if (!user) {
      setLoading(false);
      Alert.alert('Sign in required', 'Please sign in to view your chats.', [
        { text: 'Cancel', style: 'cancel', onPress: () => router.replace('/home') },
        { text: 'Sign In', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    dataService
      .getBlockedUserIds()
      .then((ids) => setBlockedIds(new Set(ids)))
      .catch(() => undefined);

    const unsubscribe = dataService.subscribeToConversations(
      (list) => {
        // A blocked person's thread disappears from the inbox.
        setConversations(list);
        setLoading(false);
      },
      (error) => {
        console.error('Conversation stream failed:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [initializing, user]);

  // Deep link from "Message organizer": open (or create) that thread.
  useEffect(() => {
    if (initializing || !user) return;

    if (otherUserIdParam) {
      dataService
        .getOrCreateConversation(otherUserIdParam)
        .then(setSelectedConversationId)
        .catch(() => Alert.alert('Error', 'Could not open that conversation.'));
      return;
    }

    if (conversationParam) setSelectedConversationId(conversationParam);
  }, [initializing, user, otherUserIdParam, conversationParam]);

  // Live messages for the open thread.
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const unsubscribe = dataService.subscribeToConversationMessages(
      selectedConversationId,
      (list) => {
        setMessages(list);
        requestAnimationFrame(() => messagesRef.current?.scrollToEnd({ animated: true }));
      },
      (error) => console.error('Message stream failed:', error)
    );

    return unsubscribe;
  }, [selectedConversationId]);

  const openConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const onSend = async () => {
    const text = draft.trim();
    if (!selectedConversationId || !text || sending) return;

    setDraft('');
    setSending(true);
    try {
      await dataService.sendMessage(selectedConversationId, text);
      // No manual refetch: the snapshot listener delivers the new message.
    } catch (error) {
      console.error('Send message failed:', error);
      setDraft(text); // Restore so the user does not lose what they typed.
      Alert.alert('Error', 'Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  const renderConversation = ({ item }: { item: ConversationSummary }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => openConversation(item.id)}>
      <View style={styles.avatarContainer}>
        <Avatar
          uid={item.otherUserId}
          name={item.otherUserName}
          photoURL={item.otherUserPhotoURL}
          size={52}
        />
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

  if (initializing || loading) {
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
          data={visibleConversations}
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
          <FlatList
            ref={messagesRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => messagesRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
              </View>
            }
          />

          <View style={styles.inputBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message"
              style={styles.input}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, (!draft.trim() || sending) && { opacity: 0.5 }]}
              onPress={onSend}
              disabled={!draft.trim() || sending}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FloatingNavigation activeScreen="chats" tone="dark" />
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
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    fontSize: 14,
    color: '#2563eb',
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
    borderBottomColor: '#f3f4f6',
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
    backgroundColor: '#f3f4f6',
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
    color: '#6b7280',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMine: {
    color: '#d1d5db',
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
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
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
