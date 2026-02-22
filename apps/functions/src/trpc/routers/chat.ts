import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { VertexAI, type Tool } from '@google-cloud/vertexai'

// ─────────────────────────────────────────────────────────────────
// Config — read from environment (set in Firebase Function config
// or .env for local dev)
// ─────────────────────────────────────────────────────────────────

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? 'health-lifeline-53fb3'
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? 'europe-west2'
const CORPUS_ID = process.env.RAG_CORPUS_ID ?? '7631349568579305472'

const RAG_CORPUS_RESOURCE = `projects/${PROJECT}/locations/${LOCATION}/ragCorpora/${CORPUS_ID}`

// ─────────────────────────────────────────────────────────────────
// VertexAI client (lazily initialised once)
// ─────────────────────────────────────────────────────────────────

const vertexAI = new VertexAI({ project: PROJECT, location: LOCATION })

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: {
    role: 'system',
    parts: [
      {
        text:
          'You are a Zambian Health Assistant. Answer questions clearly and compassionately ' +
          'using only the health documents provided to you as context. ' +
          'If the documents do not contain enough information to answer, say so honestly. ' +
          'Never fabricate medical facts.',
      },
    ],
  },
})

// ─────────────────────────────────────────────────────────────────
// RAG retrieval tool — tells Vertex AI to fetch relevant chunks
// from the corpus before generating an answer
// ─────────────────────────────────────────────────────────────────

const ragTool: Tool = {
  retrieval: {
    vertexRagStore: {
      ragResources: [{ ragCorpus: RAG_CORPUS_RESOURCE }],
      similarityTopK: 5,
    },
  },
}

// ─────────────────────────────────────────────────────────────────
// I/O schemas
// ─────────────────────────────────────────────────────────────────

const SendMessageInput = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string(),
})

const SendMessageOutput = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
})

// ─────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(SendMessageInput)
    .output(SendMessageOutput)
    .mutation(async ({ input }) => {
      try {
        const result = await model.generateContent({
          tools: [ragTool],
          contents: [
            {
              role: 'user',
              parts: [{ text: input.message }],
            },
          ],
        })

        const response = result.response

        // Extract the text answer from the first candidate
        const candidate = response.candidates?.[0]
        const answerText =
          candidate?.content?.parts?.map(p => p.text ?? '').join('') ??
          'I was unable to generate a response. Please try again.'

        // Extract source URIs from grounding metadata if present
        const sources: string[] = []
        const groundingMetadata = candidate?.groundingMetadata

        if (groundingMetadata) {
          // retrievalMetadata is present when RAG returns citations
          const chunks =
            (groundingMetadata.groundingChunks as
              | Array<{ retrievedContext?: { uri?: string } }>
              | undefined) ?? []

          for (const chunk of chunks) {
            const uri = chunk.retrievedContext?.uri
            if (uri && !sources.includes(uri)) {
              sources.push(uri)
            }
          }
        }

        return { answer: answerText, sources }
      } catch (error: unknown) {
        // ──────────────────────────────────────────────────────────
        // IAM debugging: log 403 Permission Denied errors clearly
        // ──────────────────────────────────────────────────────────
        const isPermissionDenied =
          (error instanceof Error && error.message.includes('403')) ||
          (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: number }).code === 403)

        if (isPermissionDenied) {
          console.error(
            '[chat] 403 Permission Denied — the Firebase service account does not yet have ' +
              'the "Vertex AI User" IAM role on project ' +
              PROJECT +
              '. Wait a few minutes for IAM propagation and try again.',
            error
          )
        } else {
          console.error('[chat] Unexpected error calling Vertex AI:', error)
        }

        // Re-throw so tRPC returns an Internal Server Error to the client
        throw error
      }
    }),
})
