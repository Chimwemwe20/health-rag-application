import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Conversation } from '../types/chat'

/**
 * Real-time subscription to the current user's active conversations,
 * ordered by most recently updated first.
 */
export function useConversations(uid: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    if (!uid) {
      setConversations([])
      return
    }

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
    })

    return unsubscribe
  }, [uid])

  return conversations
}
