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
import { subscribeToParentStudents } from '../../src/services/childrenService';
import {
  sendMessageToDriver,
  subscribeToParentDriverMessages,
} from '../../src/services/messageService';
import { Message, Student } from '../../src/types/types';
import { theme } from '../../src/theme/theme';
import { firestore } from '../../src/config/firebaseConfig';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';

interface DriverOption {
  driverId: string;
  driverName: string;
  driverProfilePic?: string;
  students: Student[];
}

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

  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Fetch driver data and group students by driver
  useEffect(() => {
    if (students.length === 0) {
      setDriverOptions([]);
      return;
    }

    const fetchDriverData = async () => {
      setLoadingDrivers(true);
      const driverMap = new Map<
        string,
        { driverName: string; driverProfilePic?: string; students: Student[] }
      >();

      // Group students by driver
      students.forEach((student) => {
        if (student.driverId) {
          if (!driverMap.has(student.driverId)) {
            driverMap.set(student.driverId, {
              driverName: student.driverName || 'Driver',
              driverProfilePic: undefined,
              students: [],
            });
          }
          driverMap.get(student.driverId)!.students.push(student);
        }
      });

      // Fetch driver profile pics
      const driverPromises = Array.from(driverMap.entries()).map(async ([driverId, data]) => {
        try {
          const driverRef = doc(firestore, 'drivers', driverId);
          let driverDoc;

          // Try to get from server first
          try {
            driverDoc = await getDoc(driverRef);
          } catch (error: any) {
            // If offline, try to get from cache
            if (error.code === 'unavailable' || error.message?.includes('offline')) {
              try {
                driverDoc = await getDocFromCache(driverRef);
              } catch (cacheError) {
                // If not in cache either, just use the data we have
                return { driverId, ...data };
              }
            } else {
              // Other errors, just use the data we have
              return { driverId, ...data };
            }
          }

          if (driverDoc.exists()) {
            const driverData = driverDoc.data();
            data.driverName = driverData.name || data.driverName;
            data.driverProfilePic = driverData.profilePic;
          }
        } catch (error) {
          // Silently fail - we'll use the data from students
          // Don't log errors for offline scenarios
        }
        return { driverId, ...data };
      });

      const driverOptionsData = await Promise.all(driverPromises);
      setDriverOptions(driverOptionsData);
      setLoadingDrivers(false);
    };

    fetchDriverData();
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

              {loadingStudents || loadingDrivers ? (
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
                  {driverOptions.map((driverOption) => {
                    const isSelected = selectedTarget?.driverId === driverOption.driverId;
                    const studentNames = driverOption.students.map((s) => s.name).join(', ');
                    return (
                      <TouchableOpacity
                        key={driverOption.driverId}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        activeOpacity={1}
                        onPress={() =>
                          setSelectedTarget({
                            driverId: driverOption.driverId,
                            student: driverOption.students[0],
                          })
                        }>
                        {driverOption.driverProfilePic ? (
                          <Image
                            source={{ uri: driverOption.driverProfilePic }}
                            style={[
                              styles.avatarChipImage,
                              isSelected && styles.avatarChipImageSelected,
                            ]}
                          />
                        ) : (
                          <View
                            style={[styles.avatarChip, isSelected && styles.avatarChipSelected]}>
                            <Ionicons
                              name="person"
                              size={14}
                              color={isSelected ? '#FFFFFF' : '#6B7280'}
                            />
                          </View>
                        )}
                        <View>
                          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                            {driverOption.driverName}
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
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
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
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatarChipImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarChipImageSelected: {
    borderWidth: 0,
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
