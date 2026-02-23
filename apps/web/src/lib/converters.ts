import type { FirestoreDataConverter } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import type { Conversation, Message } from '@repo/shared/schemas'

function toTimestamp(d: Date | null): Timestamp | null {
  return d ? Timestamp.fromDate(d) : null
}

export const conversationConverter: FirestoreDataConverter<Conversation> = {
  toFirestore(model: Conversation) {
    return {
      uid: model.uid,
      title: model.title,
      createdAt: toTimestamp(model.createdAt),
      updatedAt: toTimestamp(model.updatedAt),
      deletedAt: toTimestamp(model.deletedAt),
    }
  },
  fromFirestore(snap) {
    const d: {
      uid: string
      title: string
      createdAt: Timestamp
      updatedAt: Timestamp
      deletedAt?: Timestamp | null
    } = snap.data() as unknown as {
      uid: string
      title: string
      createdAt: Timestamp
      updatedAt: Timestamp
      deletedAt?: Timestamp | null
    }
    return {
      id: snap.id,
      uid: d.uid,
      title: d.title,
      createdAt: d.createdAt.toDate(),
      updatedAt: d.updatedAt.toDate(),
      deletedAt: d.deletedAt ? d.deletedAt.toDate() : null,
    }
  },
}

export const messageConverter: FirestoreDataConverter<Message> = {
  toFirestore(model: Message) {
    return {
      uid: model.uid,
      conversationId: model.conversationId,
      role: model.role,
      content: model.content,
      version: model.version,
      parentMessageId: model.parentMessageId ?? null,
      citations: model.citations ?? [],
      createdAt: toTimestamp(model.createdAt),
      deletedAt: toTimestamp(model.deletedAt),
    }
  },
  fromFirestore(snap) {
    const d: {
      uid: string
      conversationId: string
      role: Message['role']
      content: string
      version: 'v1' | 'v2'
      parentMessageId?: string | null
      citations?: string[]
      createdAt: Timestamp
      deletedAt?: Timestamp | null
    } = snap.data() as unknown as {
      uid: string
      conversationId: string
      role: Message['role']
      content: string
      version: 'v1' | 'v2'
      parentMessageId?: string | null
      citations?: string[]
      createdAt: Timestamp
      deletedAt?: Timestamp | null
    }
    return {
      id: snap.id,
      uid: d.uid,
      conversationId: d.conversationId,
      role: d.role,
      content: d.content,
      version: d.version,
      parentMessageId: d.parentMessageId ?? undefined,
      citations: d.citations ?? [],
      createdAt: d.createdAt.toDate(),
      deletedAt: d.deletedAt ? d.deletedAt.toDate() : null,
    }
  },
}
