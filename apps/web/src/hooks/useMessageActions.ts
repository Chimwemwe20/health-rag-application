import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Firestore write actions for individual messages.
 *
 * NOTE on editing:
 *   Firestore security rules mark `content` as immutable — only `deletedAt`
 *   can be updated by clients. To "edit" a message the UI should:
 *     1. Call deleteMessage() to soft-delete the original
 *     2. Re-send the new text via the chat mutation (same as a fresh message)
 *
 * deleteMessage — soft-delete: sets deletedAt = serverTimestamp()
 */
export function useMessageActions() {
  async function deleteMessage(conversationId: string, messageId: string) {
    await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return { deleteMessage }
}
