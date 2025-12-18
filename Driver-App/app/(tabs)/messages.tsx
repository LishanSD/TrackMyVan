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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { subscribeToDriverStudents } from '../../src/services/studentService';
import {
  sendBroadcastMessageToAllParents,
  sendMessageToParent,
  subscribeToDriverParentMessages,
} from '../../src/services/messageService';
import { Message, Student } from '../../src/types/types';
import { theme } from '../../src/theme/theme';
import { firestore } from '../../src/config/firebaseConfig';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';

interface ParentOption {
  parentId: string;
  parentName: string;
  parentProfilePic?: string;
  students: Student[];
}

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

  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Fetch parent data and group students by parent
  useEffect(() => {
    if (students.length === 0) {
      setParentOptions([]);
      return;
    }

    const fetchParentData = async () => {
      setLoadingParents(true);
      const parentMap = new Map<
        string,
        { parentName: string; parentProfilePic?: string; students: Student[] }
      >();

      // Group students by parent
      students.forEach((student) => {
        if (student.parentId) {
          if (!parentMap.has(student.parentId)) {
            parentMap.set(student.parentId, {
              parentName: student.parentName || 'Parent',
              parentProfilePic: undefined,
              students: [],
            });
          }
          parentMap.get(student.parentId)!.students.push(student);
        }
      });

      // Fetch parent profile pics
      const parentPromises = Array.from(parentMap.entries()).map(async ([parentId, data]) => {
        try {
          const parentRef = doc(firestore, 'parents', parentId);
          let parentDoc;

          // Try to get from server first
          try {
            parentDoc = await getDoc(parentRef);
          } catch (error: any) {
            // If offline, try to get from cache
            if (error.code === 'unavailable' || error.message?.includes('offline')) {
              try {
                parentDoc = await getDocFromCache(parentRef);
              } catch (cacheError) {
                // If not in cache either, just use the data we have
                return { parentId, ...data };
              }
            } else {
              // Other errors, just use the data we have
              return { parentId, ...data };
            }
          }

          if (parentDoc.exists()) {
            const parentData = parentDoc.data();
            data.parentName = parentData.name || data.parentName;
            data.parentProfilePic = parentData.profilePic;
          }
        } catch (error) {
          // Silently fail - we'll use the data from students
          // Don't log errors for offline scenarios
        }
        return { parentId, ...data };
      });

      const parentOptionsData = await Promise.all(parentPromises);
      setParentOptions(parentOptionsData);
      setLoadingParents(false);
    };

    fetchParentData();
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
        style={[styles.messageRow, isDriver ? styles.messageRowDriver : styles.messageRowParent]}>
        {!isDriver && (
          <View style={styles.avatarSmall}>
            <Ionicons name="person" size={12} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isDriver ? styles.messageBubbleDriver : styles.messageBubbleParent,
          ]}>
          <Text
            style={[styles.messageSender, isDriver ? styles.textWhiteAlpha : styles.textDarkAlpha]}>
            {isDriver ? 'You' : selectedTarget?.student?.parentName || 'Parent'}
            {item.isBroadcast ? ' • Broadcast' : ''}
          </Text>
          <Text style={[styles.messageText, isDriver ? styles.textWhite : styles.textDark]}>
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
                <Text style={styles.subtitle}>Chat with parents & send updates</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="megaphone" size={20} color={theme.colors.secondary} />
                  <Text style={styles.cardTitle}>Broadcast Announcement</Text>
                </View>
                <Text style={styles.cardDescription}>Send a message to all parents at once.</Text>
                <View style={styles.broadcastInputContainer}>
                  <TextInput
                    style={styles.inputArea}
                    placeholder="Type an announcement..."
                    placeholderTextColor="#9CA3AF"
                    value={broadcastText}
                    onChangeText={setBroadcastText}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.broadcastButton, !broadcastText.trim() && styles.buttonDisabled]}
                    disabled={!broadcastText.trim()}
                    onPress={handleSendBroadcast}>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Direct Messages</Text>
              </View>

              {loadingStudents || loadingParents ? (
                <View style={styles.centerRow}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.mutedText}>Loading contacts...</Text>
                </View>
              ) : parentOptions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={32} color="#D1D5DB" />
                  <Text style={styles.mutedText}>No parents linked yet.</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  contentContainerStyle={styles.chipScrollContent}>
                  {parentOptions.map((parentOption) => {
                    const isSelected = selectedTarget?.parentId === parentOption.parentId;
                    const studentNames = parentOption.students.map((s) => s.name).join(', ');
                    return (
                      <TouchableOpacity
                        key={parentOption.parentId}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        activeOpacity={isSelected ? 1 : 0.7}
                        onPress={() =>
                          setSelectedTarget({
                            parentId: parentOption.parentId,
                            student: parentOption.students[0],
                          })
                        }>
                        {parentOption.parentProfilePic ? (
                          <Image
                            source={{ uri: parentOption.parentProfilePic }}
                            style={[
                              styles.avatarChipImage,
                              isSelected && styles.avatarChipImageSelected,
                            ]}
                          />
                        ) : (
                          <View
                            style={[styles.avatarChip, isSelected && styles.avatarChipSelected]}>
                            <Text style={[styles.avatarText, isSelected && styles.textWhite]}>
                              {parentOption.parentName.charAt(0)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.chipTextContainer}>
                          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                            {parentOption.parentName}
                          </Text>
                          <Text style={[styles.chipSubtext, isSelected && styles.textWhiteAlpha]}>
                            ({studentNames})
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
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
                    <Ionicons name="chatbubbles-outline" size={48} color="#E5E7EB" />
                    <Text style={styles.mutedText}>Start the conversation</Text>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.chatPlaceholder}>
                <Text style={styles.mutedText}>Select a student above to chat</Text>
              </View>
            )
          }
          ListFooterComponent={
            selectedTarget && (
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder={`Message ${selectedTarget.student?.name}'s parent...`}
                  placeholderTextColor="#9CA3AF"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !messageText.trim() && styles.buttonDisabled]}
                  disabled={!messageText.trim()}
                  onPress={handleSendMessage}>
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
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
    marginBottom: 16,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  broadcastInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingRight: 6,
  },
  inputArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
  },
  broadcastButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
    flexGrow: 0,
  },
  chipScrollContent: {
    paddingHorizontal: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    paddingRight: 12,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  avatarChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatarChipImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarChipImageSelected: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  chipTextContainer: {
    flex: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  textWhiteAlpha: {
    color: 'rgba(255,255,255,0.8)',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  messageRowDriver: {
    justifyContent: 'flex-end',
  },
  messageRowParent: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    padding: 12,
    maxWidth: '80%',
    borderRadius: 16,
  },
  messageBubbleDriver: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 2,
  },
  messageBubbleParent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
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
  textDarkAlpha: { color: '#9CA3AF' },

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
    backgroundColor: theme.colors.primary,
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
});
