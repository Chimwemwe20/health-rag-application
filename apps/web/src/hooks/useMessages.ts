import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ChatMessage } from '../types/chat'

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
      setMessages(
        snapshot.docs.map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            role: d.role as 'user' | 'assistant',
            text: d.content as string,
            sources: (d.citations as string[] | undefined) ?? [],
          }
        })
      )
      setIsLoading(false)
    })

    return unsubscribe
  }, [conversationId, uid])

  return { messages, isLoading }
}
