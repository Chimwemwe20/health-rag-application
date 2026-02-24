import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Firestore write actions for conversations.
 * Rename updates the title; delete soft-deletes by setting deletedAt.
 * Both are permitted client-side by the existing Firestore security rules.
 */
export function useConversationActions() {
  async function renameConversation(id: string, title: string) {
    await updateDoc(doc(db, 'conversations', id), {
      title: title.trim(),
      updatedAt: serverTimestamp(),
    })
  }

  async function deleteConversation(id: string) {
    await updateDoc(doc(db, 'conversations', id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return { renameConversation, deleteConversation }
}
