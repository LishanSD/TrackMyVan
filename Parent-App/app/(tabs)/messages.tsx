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
import { subscribeToParentStudents } from '../../src/services/childrenService';
import { sendMessageToDriver, subscribeToParentDriverMessages } from '../../src/services/messageService';
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
        style={[
          styles.messageBubble,
          isParent ? styles.messageBubbleParent : styles.messageBubbleDriver,
        ]}>
        <Text style={styles.messageSender}>
          {isParent ? 'You' : driverName}
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
                Chat directly with the driver of your children.
              </Text>

              {/* Conversation selector */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Select a driver</Text>
                {loadingStudents ? (
                  <View style={styles.centerRow}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.mutedText}>Loading children...</Text>
                  </View>
                ) : driverOptions.length === 0 ? (
                  <Text style={styles.mutedText}>
                    No children with assigned drivers yet.
                  </Text>
                ) : (
                  <View style={styles.chipRow}>
                    {driverOptions.map((student) => {
                      const isSelected =
                        selectedTarget?.driverId === student.driverId;
                      return (
                        <TouchableOpacity
                          key={student.driverId}
                          style={[
                            styles.chip,
                            isSelected && styles.chipSelected,
                          ]}
                          onPress={() =>
                            setSelectedTarget({
                              driverId: student.driverId!,
                              student,
                            })
                          }>
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                            ]}>
                            {student.driverName || 'Driver'} ({student.name})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
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
                  Select a driver above to start messaging.
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
  messageBubbleParent: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  messageBubbleDriver: {
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
  buttonDisabled: {
    opacity: 0.5,
  },
  footerCard: {
    marginTop: theme.spacing.sm,
  },
});


