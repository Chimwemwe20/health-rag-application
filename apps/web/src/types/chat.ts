// Matches the Firestore conversations/{id} schema
export interface Conversation {
  id: string
  uid: string
  title: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// Matches the Firestore conversations/{id}/messages/{id} schema
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: string[]
}
