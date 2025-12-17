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

export const subscribeToDriverParentMessages = (
  driverId: string,
  parentId: string,
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

export const sendMessageToParent = async (params: {
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
    senderRole: 'driver',
    createdAt: serverTimestamp(),
    isBroadcast: false,
  });
};

/**
 * Broadcast a message from a driver to all parents of the driver's students.
 * This creates one message per unique parent so parents see it in their
 * existing conversation thread.
 */
export const sendBroadcastMessageToAllParents = async (params: {
  driverId: string;
  parentIds: string[];
  text: string;
  senderId: string;
}): Promise<void> => {
  const { driverId, parentIds, text, senderId } = params;
  if (!text.trim()) return;

  const uniqueParentIds = Array.from(new Set(parentIds.filter((id) => !!id)));

  const batchPromises = uniqueParentIds.map((parentId) =>
    addDoc(messagesRef, {
      driverId,
      parentId,
      studentId: null,
      text: text.trim(),
      senderId,
      senderRole: 'driver',
      createdAt: serverTimestamp(),
      isBroadcast: true,
    })
  );

  await Promise.all(batchPromises);
}


