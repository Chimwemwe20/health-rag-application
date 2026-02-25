import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Conversation } from '../types/chat'

/**
 * Real-time subscription to the current user's active conversations,
 * ordered by most recently updated first.
 *
 * Returns `{ conversations, isLoading }` — `isLoading` is true until
 * the first snapshot arrives so the UI can show skeleton placeholders.
 */
export function useConversations(uid: string | null): {
  conversations: Conversation[]
  isLoading: boolean
} {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setConversations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const q = query(
      collection(db, 'conversations'),
      where('uid', '==', uid),
      where('deletedAt', '==', null),
      orderBy('updatedAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, snapshot => {
      const convs: Conversation[] = snapshot.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          uid: d.uid as string,
          title: d.title as string,
          createdAt: (d.createdAt as Timestamp).toDate(),
          updatedAt: (d.updatedAt as Timestamp).toDate(),
          deletedAt: d.deletedAt ? (d.deletedAt as Timestamp).toDate() : null,
        }
      })
      setConversations(convs)
      setIsLoading(false)
    })

    return unsubscribe
  }, [uid])

  return { conversations, isLoading }
}
