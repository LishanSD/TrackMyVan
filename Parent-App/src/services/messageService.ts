import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';
import { Message } from '../types/types';

const messagesRef = collection(firestore, 'messages');

export const subscribeToParentDriverMessages = (
  parentId: string,
  driverId: string,
  onChange: (messages: Message[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(
    messagesRef,
    where('driverId', '==', driverId),
    where('parentId', '==', parentId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Message[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Message, 'id'>) });
      });
      onChange(items);
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
      onError?.(error as Error);
    }
  );
};

export const sendMessageToDriver = async (params: {
  driverId: string;
  parentId: string;
  studentId?: string;
  text: string;
  senderId: string;
}): Promise<void> => {
  const { driverId, parentId, studentId, text, senderId } = params;

  if (!text.trim()) return;

  await addDoc(messagesRef, {
    driverId,
    parentId,
    studentId: studentId ?? null,
    text: text.trim(),
    senderId,
    senderRole: 'parent',
    createdAt: serverTimestamp(),
    isBroadcast: false,
  });
};


