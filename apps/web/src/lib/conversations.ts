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

export async function renameConversation(id: string, title: string) {
  const { doc, updateDoc } = await import('firebase/firestore')
  const ref = doc(db, 'conversations', id)
  await updateDoc(ref, { title, updatedAt: serverTimestamp() })
}

export async function softDeleteConversation(id: string) {
  const { doc, updateDoc } = await import('firebase/firestore')
  const ref = doc(db, 'conversations', id)
  await updateDoc(ref, { deletedAt: serverTimestamp() })
}
