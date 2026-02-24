import { useState, useEffect, useCallback } from 'react'
import { trpc } from '../lib/trpc'
import type { Conversation } from '../types/chat'

/**
 * Paginated, searchable conversation list.
 * Uses tRPC utils.fetch (bypasses the React Query infinite-query adapter,
 * which has a breaking API change in tRPC v11 / React Query v5).
 * Search is debounced 400 ms. Pagination uses a numeric offset cursor (10/page).
 */
export function useConversationList(uid: string | null) {
  const utils = trpc.useUtils()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const toConversation = useCallback(
    (c: { id: string; title: string; createdAt: string; updatedAt: string }): Conversation => ({
      id: c.id,
      uid: uid ?? '',
      title: c.title,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      deletedAt: null,
    }),
    [uid]
  )

  const fetchFirst = useCallback(async () => {
    if (!uid) return
    setIsLoading(true)
    setConversations([])
    setNextCursor(null)
    try {
      const data = await utils.chat.listConversations.fetch({
        uid,
        search: debouncedSearch || undefined,
      })
      setConversations(data.conversations.map(toConversation))
      setNextCursor(data.nextCursor)
    } finally {
      setIsLoading(false)
    }
  }, [uid, debouncedSearch, utils, toConversation])

  // Fetch first page whenever uid or debounced search changes
  useEffect(() => {
    void fetchFirst()
  }, [fetchFirst])

  const loadMore = useCallback(async () => {
    if (!uid || nextCursor === null || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const data = await utils.chat.listConversations.fetch({
        uid,
        search: debouncedSearch || undefined,
        cursor: nextCursor,
      })
      setConversations(prev => [...prev, ...data.conversations.map(toConversation)])
      setNextCursor(data.nextCursor)
    } finally {
      setIsLoadingMore(false)
    }
  }, [uid, debouncedSearch, nextCursor, isLoadingMore, utils, toConversation])

  const refetch = useCallback(() => {
    void fetchFirst()
  }, [fetchFirst])

  return {
    conversations,
    isLoading,
    hasMore: nextCursor !== null,
    loadMore: () => {
      void loadMore()
    },
    isLoadingMore,
    search,
    setSearch,
    refetch,
  }
}
