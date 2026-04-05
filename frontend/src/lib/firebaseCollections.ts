import type { User } from 'firebase/auth';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type AyahAttemptPayload = {
  surahNo: number;
  surahNameAr: string;
  ayahNo: number;
  targetAyahText: string;
  recognizedText: string;
  mistakes: number;
  isLastAyah: boolean;
};

export type SurahCompletionPayload = {
  surahNo: number;
  surahNameAr: string;
  totalMistakes: number;
  completedWithLessThan10Mistakes: boolean;
};

const isReady = () => !!db;

export async function upsertUserProfile(user: User | null) {
  if (!user || !isReady()) return;

  const userRef = doc(db!, 'users', user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function writeAyahAttempt(uid: string, payload: AyahAttemptPayload) {
  if (!uid || !isReady()) return;

  const attemptsRef = collection(db!, 'users', uid, 'ayahAttempts');
  await addDoc(attemptsRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function writeSurahCompletion(uid: string, payload: SurahCompletionPayload) {
  if (!uid || !isReady()) return;

  const completionRef = doc(db!, 'users', uid, 'surahCompletions', String(payload.surahNo));
  await setDoc(
    completionRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
