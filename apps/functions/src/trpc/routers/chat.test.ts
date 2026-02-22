import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────
// Mock @google-cloud/vertexai so tests run without real network calls
// ─────────────────────────────────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}))
const mockGenerateContent = hoisted.mockGenerateContent

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: hoisted.mockGenerateContent,
    }),
  })),
}))

// Import router AFTER the mock is set up
import { appRouter } from '../router.js'
import { createCallerFactory } from '../trpc.js'

const createCaller = createCallerFactory(appRouter)
const caller = createCaller({})

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function makeSuccessResponse(text: string, uri?: string) {
  return {
    response: {
      candidates: [
        {
          content: { parts: [{ text }] },
          groundingMetadata: uri
            ? {
                groundingChunks: [{ retrievedContext: { uri } }],
              }
            : undefined,
        },
      ],
    },
  }
}

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe('chatRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('returns answer and sources when Vertex AI resolves', async () => {
      const fakeSourceUri = 'gs://health-lifeline-53fb3/chunk-001.txt'
      mockGenerateContent.mockResolvedValueOnce(
        makeSuccessResponse(
          'Hypoglycemia warning signs include shakiness and sweating.',
          fakeSourceUri
        )
      )

      const result = await caller.chat.sendMessage({
        message: 'What are the warning signs of hypoglycemia?',
        conversationId: 'test-conv-1',
      })

      expect(result.answer).toContain('Hypoglycemia')
      expect(result.sources).toEqual([fakeSourceUri])
    })

    it('returns empty sources array when no grounding metadata present', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeSuccessResponse('Always consult a doctor.'))

      const result = await caller.chat.sendMessage({
        message: 'General health advice?',
        conversationId: 'test-conv-2',
      })

      expect(result.answer).toBe('Always consult a doctor.')
      expect(result.sources).toEqual([])
    })

    it('throws when Vertex AI rejects with a 403 error', async () => {
      const permError = Object.assign(new Error('403 Permission Denied'), { code: 403 })
      mockGenerateContent.mockRejectedValueOnce(permError)

      await expect(
        caller.chat.sendMessage({
          message: 'Will this fail?',
          conversationId: 'test-conv-3',
        })
      ).rejects.toThrow()
    })

    it('throws when Vertex AI rejects with a generic error', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Internal Server Error'))

      await expect(
        caller.chat.sendMessage({
          message: 'Will this also fail?',
          conversationId: 'test-conv-4',
        })
      ).rejects.toThrow()
    })
  })
})
