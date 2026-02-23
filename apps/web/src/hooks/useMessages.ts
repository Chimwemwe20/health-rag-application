import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ChatMessage } from '../types/chat'

/**
 * Real-time subscription to messages for a single conversation,
 * ordered oldest-first so they render top-to-bottom.
 * Returns an empty array while conversationId or uid is null.
 *
 * uid must be included in the query so Firestore security rules can verify
 * ownership without rejecting the list request.
 */
export function useMessages(conversationId: string | null, uid: string | null): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (!conversationId || !uid) {
      setMessages([])
      return
    }

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      where('uid', '==', uid),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs: ChatMessage[] = snapshot.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          role: d.role as 'user' | 'assistant',
          text: d.content as string,
          sources: (d.citations as string[] | undefined) ?? [],
        }
      })
      setMessages(msgs)
    })

    return unsubscribe
  }, [conversationId, uid])

  return messages
}
