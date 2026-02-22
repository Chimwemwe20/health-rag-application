// Matches the Firestore conversations/{id} schema
export interface Conversation {
  id: string
  uid: string
  title: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
