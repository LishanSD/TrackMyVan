import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { firestore } from '../../src/config/firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { theme } from '../../src/theme/theme';

interface Child {
  id: string;
  name: string;
  age: string;
  grade: string;
  driverEmail: string;
  driverName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function ChildrenScreen() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchDriverEmail, setSearchDriverEmail] = useState('');
  const [driverFound, setDriverFound] = useState<any>(null);
  const [searchingDriver, setSearchingDriver] = useState(false);

  // Form fields
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childGrade, setChildGrade] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(firestore, 'students'), where('parentId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const childrenData: Child[] = [];
      snapshot.forEach((doc) => {
        childrenData.push({ id: doc.id, ...doc.data() } as Child);
      });
      setChildren(childrenData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const searchDriver = async () => {
    if (!searchDriverEmail.trim()) {
      Alert.alert('Error', 'Please enter driver email');
      return;
    }

    setSearchingDriver(true);
    try {
      const driversRef = collection(firestore, 'drivers');
      const q = query(driversRef, where('email', '==', searchDriverEmail.trim()));

      const snapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });

      if (snapshot.empty) {
        Alert.alert('Not Found', 'No driver found with this email');
        setDriverFound(null);
      } else {
        const driverData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setDriverFound(driverData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSearchingDriver(false);
    }
  };

  const addChild = async () => {
    if (!childName.trim() || !childAge.trim() || !childGrade.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!driverFound) {
      Alert.alert('Error', 'Please search and select a driver first');
      return;
    }

    try {
      await addDoc(collection(firestore, 'students'), {
        name: childName.trim(),
        age: childAge.trim(),
        grade: childGrade.trim(),
        parentId: user?.uid,
        parentEmail: user?.email,
        driverId: driverFound.id,
        driverEmail: driverFound.email,
        driverName: driverFound.name,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Child added successfully. Waiting for driver approval.');
      resetForm();
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setChildName('');
    setChildAge('');
    setChildGrade('');
    setSearchDriverEmail('');
    setDriverFound(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'rejected':
        return theme.colors.error;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>My Children</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addButtonText}>+ Add Child</Text>
            </TouchableOpacity>
          </View>

          {children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No children added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Child" to assign a child to a driver</Text>
            </View>
          ) : (
            children.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(child.status) + '20' },
                    ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(child.status) }]}>
                      {getStatusText(child.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Age:</Text>
                  <Text style={styles.value}>{child.age} years</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Grade:</Text>
                  <Text style={styles.value}>{child.grade}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Driver:</Text>
                  <Text style={styles.value}>{child.driverName}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.valueSmall}>{child.driverEmail}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Child Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetForm();
          setModalVisible(false);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add Child</Text>

              {/* Driver Search Section */}
              <Text style={styles.sectionTitle}>1. Search Driver</Text>
              <TextInput
                style={styles.input}
                placeholder="Driver's Email"
                value={searchDriverEmail}
                onChangeText={setSearchDriverEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchDriver}
                disabled={searchingDriver}>
                {searchingDriver ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.searchButtonText}>Search Driver</Text>
                )}
              </TouchableOpacity>

              {driverFound && (
                <View style={styles.driverFoundCard}>
                  <Text style={styles.driverFoundTitle}>Driver Found!</Text>
                  <Text style={styles.driverFoundText}>Name: {driverFound.name}</Text>
                  <Text style={styles.driverFoundText}>Email: {driverFound.email}</Text>
                  <Text style={styles.driverFoundText}>Phone: {driverFound.phone}</Text>
                </View>
              )}

              {/* Child Details Section */}
              <Text style={styles.sectionTitle}>2. Child Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Child's Name"
                value={childName}
                onChangeText={setChildName}
              />
              <TextInput
                style={styles.input}
                placeholder="Age"
                value={childAge}
                onChangeText={setChildAge}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Grade"
                value={childGrade}
                onChangeText={setChildGrade}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={addChild}>
                  <Text style={styles.submitButtonText}>Add Child</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.light,
    textAlign: 'center',
  },
  childCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    width: 80,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  valueSmall: {
    fontSize: 13,
    color: theme.colors.text.primary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  driverFoundCard: {
    backgroundColor: theme.colors.success + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  driverFoundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  driverFoundText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
