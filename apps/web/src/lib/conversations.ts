import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function createConversation(uid: string, title: string) {
  const ref = await addDoc(collection(db, 'conversations'), {
    uid,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  })
  return ref.id
}
