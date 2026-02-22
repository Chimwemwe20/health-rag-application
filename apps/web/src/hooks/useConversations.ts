import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { conversationConverter } from '../lib/converters'
import type { Conversation } from '@repo/shared/schemas'

export function useConversations(uid: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setConversations([])
      return
    }
    setLoading(true)
    setError(null)
    const q = query(
      collection(db, 'conversations').withConverter(conversationConverter),
      where('uid', '==', uid),
      where('deletedAt', '==', null),
      orderBy('updatedAt', 'desc')
    )
    const unsub = onSnapshot(
      q,
      snap => {
        setConversations(snap.docs.map(d => d.data()))
        setLoading(false)
      },
      err => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => {
      unsub()
    }
  }, [uid])

  return { conversations, loading, error }
}
