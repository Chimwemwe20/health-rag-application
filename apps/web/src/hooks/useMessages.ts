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
 *
 * Returns `{ messages, isLoading }` — `isLoading` is true until the first
 * snapshot arrives so the UI can show skeleton placeholders.
 */
export function useMessages(
  conversationId: string | null,
  uid: string | null
): { messages: ChatMessage[]; isLoading: boolean } {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!conversationId || !uid) {
      setMessages([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

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
      setIsLoading(false)
    })

    return unsubscribe
  }, [conversationId, uid])

  return { messages, isLoading }
}
