import { trpc } from '../lib/trpc'

/**
 * Hook that wraps the `chat.sendMessage` tRPC mutation.
 * Returns the standard TanStack Query mutation object.
 *
 * Usage:
 *   const sendMessage = useSendMessage()
 *   sendMessage.mutateAsync({ message: '...', conversationId: '...' })
 */
export function useSendMessage() {
  return trpc.chat.sendMessage.useMutation()
}

/**
 * Hook that wraps the `chat.editMessage` tRPC mutation.
 * Soft-deletes the original user+assistant pair and creates a new pair
 * with the updated message and a fresh AI response.
 */
export function useEditMessage() {
  return trpc.chat.editMessage.useMutation()
}

/**
 * Hook that wraps the `chat.deleteMessage` tRPC mutation.
 * Soft-deletes a user message and its paired assistant response.
 */
export function useDeleteMessage() {
  return trpc.chat.deleteMessage.useMutation()
}
