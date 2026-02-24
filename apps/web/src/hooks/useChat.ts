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
