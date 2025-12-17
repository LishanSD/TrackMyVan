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
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { subscribeToDriverStudents } from '../../src/services/studentService';
import {
  sendBroadcastMessageToAllParents,
  sendMessageToParent,
  subscribeToDriverParentMessages,
} from '../../src/services/messageService';
import { Message, Student } from '../../src/types/types';
import { theme } from '../../src/theme/theme';

interface ConversationTarget {
  parentId: string;
  student?: Student;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const driverId = user?.uid;

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ConversationTarget | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [broadcastText, setBroadcastText] = useState('');

  // Subscribe to driver's students (to know which parents they can message)
  useEffect(() => {
    if (!driverId) return;

    setLoadingStudents(true);
    const unsubscribe = subscribeToDriverStudents(
      driverId,
      (list) => {
        setStudents(list);
        setLoadingStudents(false);
      },
      () => {
        setLoadingStudents(false);
      }
    );

    return () => unsubscribe();
  }, [driverId]);

  // Subscribe to messages for selected parent
  useEffect(() => {
    if (!driverId || !selectedTarget?.parentId) return;

    setLoadingMessages(true);
    const unsubscribe = subscribeToDriverParentMessages(
      driverId,
      selectedTarget.parentId,
      (items) => {
        setMessages(items);
        setLoadingMessages(false);
      },
      () => setLoadingMessages(false)
    );

    return () => unsubscribe();
  }, [driverId, selectedTarget?.parentId]);

  const parentOptions = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => {
      if (s.parentId && !map.has(s.parentId)) {
        map.set(s.parentId, s);
      }
    });
    return Array.from(map.values());
  }, [students]);

  const handleSendMessage = async () => {
    if (!driverId || !user || !selectedTarget?.parentId || !messageText.trim()) return;

    await sendMessageToParent({
      driverId,
      parentId: selectedTarget.parentId,
      studentId: selectedTarget.student?.id,
      text: messageText,
      senderId: user.uid,
    });
    setMessageText('');
  };

  const handleSendBroadcast = async () => {
    if (!driverId || !user || !broadcastText.trim()) return;
    const parentIds = students
      .map((s) => s.parentId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (!parentIds.length) return;

    await sendBroadcastMessageToAllParents({
      driverId,
      parentIds,
      text: broadcastText,
      senderId: user.uid,
    });
    setBroadcastText('');
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isDriver = item.senderRole === 'driver';
    return (
      <View
        style={[
          styles.messageBubble,
          isDriver ? styles.messageBubbleDriver : styles.messageBubbleParent,
        ]}>
        <Text style={styles.messageSender}>
          {isDriver ? 'You' : selectedTarget?.student?.parentName || 'Parent'}
          {item.isBroadcast ? ' (Broadcast)' : ''}
        </Text>
        <Text style={styles.messageText}>{item.text}</Text>
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
              <Text style={styles.title}>Messages</Text>
              <Text style={styles.subtitle}>
                Chat with parents of your students and send broadcast updates.
              </Text>

              {/* Broadcast section */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Broadcast to all parents</Text>
                <Text style={styles.cardDescription}>
                  Send an announcement to parents of all students assigned to you.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type a broadcast message..."
                  placeholderTextColor={theme.colors.text.light}
                  value={broadcastText}
                  onChangeText={setBroadcastText}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    !broadcastText.trim() && styles.buttonDisabled,
                  ]}
                  disabled={!broadcastText.trim()}
                  onPress={handleSendBroadcast}>
                  <Text style={styles.buttonText}>Send Broadcast</Text>
                </TouchableOpacity>
              </View>

              {/* Conversation selector */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Conversations</Text>
                {loadingStudents ? (
                  <View style={styles.centerRow}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.mutedText}>Loading students...</Text>
                  </View>
                ) : parentOptions.length === 0 ? (
                  <Text style={styles.mutedText}>
                    No students with parents found yet.
                  </Text>
                ) : (
                  <View style={styles.chipRow}>
                    {parentOptions.map((student) => {
                      const isSelected =
                        selectedTarget?.parentId === student.parentId;
                      return (
                        <TouchableOpacity
                          key={student.parentId}
                          style={[
                            styles.chip,
                            isSelected && styles.chipSelected,
                          ]}
                          onPress={() =>
                            setSelectedTarget({
                              parentId: student.parentId!,
                              student,
                            })
                          }>
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                            ]}>
                            {student.parentName || 'Parent'} ({student.name})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Conversation header & input live below list via ListFooterComponent */}
            </>
          }
          data={selectedTarget ? messages : []}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          ListEmptyComponent={
            selectedTarget ? (
              <View style={styles.card}>
                {loadingMessages ? (
                  <View style={styles.centerRow}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.mutedText}>Loading messages...</Text>
                  </View>
                ) : (
                  <Text style={styles.mutedText}>No messages yet.</Text>
                )}
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Conversation</Text>
                <Text style={styles.mutedText}>
                  Select a parent above to start messaging.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            selectedTarget && (
              <View style={[styles.card, styles.footerCard]}>
                <Text style={styles.cardTitle}>Type a message</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.text.light}
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !messageText.trim() && styles.buttonDisabled,
                    ]}
                    disabled={!messageText.trim()}
                    onPress={handleSendMessage}>
                    <Text style={styles.sendButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  chipRow: {
    marginTop: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  chipTextSelected: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  mutedText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  messageBubble: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    maxWidth: '90%',
  },
  messageBubbleDriver: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  messageBubbleParent: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageSender: {
    fontSize: 11,
    color: theme.colors.text.light,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: theme.spacing.sm,
  },
  inputFlex: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  footerCard: {
    marginTop: theme.spacing.sm,
  },
});


