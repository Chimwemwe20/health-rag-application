// Matches the Firestore conversations/{id} schema
export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}
