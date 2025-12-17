import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { subscribeToParentStudents } from '../../src/services/childrenService';
import {
  sendMessageToDriver,
  subscribeToParentDriverMessages,
} from '../../src/services/messageService';
import { Message, Student } from '../../src/types/types';
import { theme } from '../../src/theme/theme';

interface ConversationTarget {
  driverId: string;
  student?: Student;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const parentId = user?.uid;

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ConversationTarget | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Subscribe to this parent's students
  useEffect(() => {
    if (!parentId) return;

    setLoadingStudents(true);
    const unsubscribe = subscribeToParentStudents(
      parentId,
      (list) => {
        setStudents(list);
        setLoadingStudents(false);
      },
      () => {
        setLoadingStudents(false);
      }
    );

    return () => unsubscribe();
  }, [parentId]);

  // Build unique list of drivers based on students
  const driverOptions = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => {
      if (s.driverId && !map.has(s.driverId)) {
        map.set(s.driverId, s);
      }
    });
    return Array.from(map.values());
  }, [students]);

  // Subscribe to messages for selected driver
  useEffect(() => {
    if (!parentId || !selectedTarget?.driverId) return;

    setLoadingMessages(true);
    const unsubscribe = subscribeToParentDriverMessages(
      parentId,
      selectedTarget.driverId,
      (items) => {
        setMessages(items);
        setLoadingMessages(false);
      },
      () => setLoadingMessages(false)
    );

    return () => unsubscribe();
  }, [parentId, selectedTarget?.driverId]);

  const handleSendMessage = async () => {
    if (!parentId || !user || !selectedTarget?.driverId || !messageText.trim()) return;

    await sendMessageToDriver({
      driverId: selectedTarget.driverId,
      parentId,
      studentId: selectedTarget.student?.id,
      text: messageText,
      senderId: user.uid,
    });
    setMessageText('');
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isParent = item.senderRole === 'parent';
    const driverName = selectedTarget?.student?.driverName || 'Driver';

    return (
      <View
        style={[styles.messageRow, isParent ? styles.messageRowParent : styles.messageRowDriver]}>
        {!isParent && (
          <View style={styles.avatarSmall}>
            <Ionicons name="bus" size={12} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isParent ? styles.messageBubbleParent : styles.messageBubbleDriver,
          ]}>
          <Text
            style={[styles.messageSender, isParent ? styles.textWhiteAlpha : styles.textDarkAlpha]}>
            {isParent ? 'You' : driverName}
            {item.isBroadcast ? ' • Broadcast' : ''}
          </Text>
          <Text style={[styles.messageText, isParent ? styles.textWhite : styles.textDark]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.headerContainer}>
                <Text style={styles.title}>Messages</Text>
                <Text style={styles.subtitle}>Direct communication with your drivers</Text>
              </View>

              {/* Conversation selector */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Driver</Text>
              </View>

              {loadingStudents ? (
                <View style={styles.centerRow}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.mutedText}>Loading drivers...</Text>
                </View>
              ) : driverOptions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bus-outline" size={32} color="#D1D5DB" />
                  <Text style={styles.mutedText}>No drivers assigned yet.</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  contentContainerStyle={styles.chipScrollContent}>
                  {driverOptions.map((student) => {
                    const isSelected = selectedTarget?.driverId === student.driverId;
                    return (
                      <TouchableOpacity
                        key={student.driverId}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() =>
                          setSelectedTarget({
                            driverId: student.driverId!,
                            student,
                          })
                        }>
                        <View style={[styles.avatarChip, isSelected && styles.avatarChipSelected]}>
                          <Ionicons
                            name="person"
                            size={14}
                            color={isSelected ? '#FFFFFF' : '#6B7280'}
                          />
                        </View>
                        <View>
                          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                            {student.driverName || 'Driver'}
                          </Text>
                          <Text style={[styles.chipSubtext, isSelected && styles.textWhiteAlpha]}>
                            For: {student.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.divider} />
            </>
          }
          data={selectedTarget ? messages : []}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          ListEmptyComponent={
            selectedTarget ? (
              <View style={styles.chatEmptyState}>
                {loadingMessages ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="chatbox-ellipses-outline" size={48} color="#E5E7EB" />
                    <Text style={styles.mutedText}>No messages yet.</Text>
                    <Text style={styles.subMutedText}>Start the conversation below</Text>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.chatPlaceholder}>
                <Text style={styles.mutedText}>Select a driver above to view messages.</Text>
              </View>
            )
          }
          ListFooterComponent={
            selectedTarget && (
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type a message to the driver..."
                  placeholderTextColor="#9CA3AF"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !messageText.trim() && styles.buttonDisabled]}
                  disabled={!messageText.trim()}
                  onPress={handleSendMessage}>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chipScrollContent: {
    paddingHorizontal: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 16,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
    minWidth: 140,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
    marginHorizontal: 20,
  },

  // Chat Styles
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  messageRowParent: {
    justifyContent: 'flex-end',
  },
  messageRowDriver: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '80%',
  },
  messageBubbleParent: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleDriver: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageSender: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textWhite: { color: '#FFFFFF' },
  textDark: { color: '#1F2937' },
  textWhiteAlpha: { color: 'rgba(255,255,255,0.8)' },
  textDarkAlpha: { color: '#9CA3AF' },

  // Input Styles
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 6,
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#D1D5DB',
  },

  // State Styles
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  chatEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  chatPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  mutedText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  subMutedText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
});
