import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────
// Mock @google-cloud/vertexai so tests run without real network calls
// ─────────────────────────────────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockSet: vi.fn().mockResolvedValue(undefined),
  mockUpdate: vi.fn().mockResolvedValue(undefined),
}))
const mockGenerateContent = hoisted.mockGenerateContent

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: hoisted.mockGenerateContent,
    }),
  })),
}))

// Mock firebase-admin so Firestore writes are no-ops in tests
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP') },
}))
vi.mock('../../lib/firebase.js', () => ({
  auth: {},
  db: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        set: hoisted.mockSet,
        update: hoisted.mockUpdate,
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            set: hoisted.mockSet,
          }),
        }),
      }),
    }),
  },
}))

// Import router AFTER the mocks are set up
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
        uid: 'test-uid',
      })

      expect(result.answer).toContain('Hypoglycemia')
      expect(result.sources).toEqual([fakeSourceUri])
      expect(result.conversationId).toBe('test-conv-1')
    })

    it('returns empty sources array when no grounding metadata present', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeSuccessResponse('Always consult a doctor.'))

      const result = await caller.chat.sendMessage({
        message: 'General health advice?',
        conversationId: 'test-conv-2',
        uid: 'test-uid',
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
          uid: 'test-uid',
        })
      ).rejects.toThrow()
    })

    it('throws when Vertex AI rejects with a generic error', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Internal Server Error'))

      await expect(
        caller.chat.sendMessage({
          message: 'Will this also fail?',
          conversationId: 'test-conv-4',
          uid: 'test-uid',
        })
      ).rejects.toThrow()
    })
  })
})
