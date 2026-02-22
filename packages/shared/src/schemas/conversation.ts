import { z } from 'zod'

export const MessageRoleSchema = z.enum(['user', 'assistant'])

export const ConversationSchema = z.object({
  id: z.string().min(1),
  uid: z.string().min(1),
  title: z.string().min(1).max(256),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().default(null),
})

export const MessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  uid: z.string().min(1),
  role: MessageRoleSchema,
  content: z.string().min(1),
  version: z.enum(['v1', 'v2']).default('v1'),
  parentMessageId: z.string().min(1).optional(),
  citations: z.array(z.string().url()).optional().default([]),
  createdAt: z.date(),
  deletedAt: z.date().nullable().default(null),
})

export const CreateConversationSchema = z.object({
  title: z.string().min(1).max(256),
})

export type MessageRole = z.infer<typeof MessageRoleSchema>
export type Conversation = z.infer<typeof ConversationSchema>
export type Message = z.infer<typeof MessageSchema>
export type CreateConversation = z.infer<typeof CreateConversationSchema>
