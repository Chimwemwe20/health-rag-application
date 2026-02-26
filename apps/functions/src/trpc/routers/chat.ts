import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { VertexAI, type Tool } from '@google-cloud/vertexai'
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '../../lib/firebase.js'

// ─────────────────────────────────────────────────────────────────
// Config — read from environment (set in Firebase Function config
// or .env for local dev)
// ─────────────────────────────────────────────────────────────────

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? 'health-lifeline-53fb3'
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? 'europe-west2'
const CORPUS_ID = process.env.RAG_CORPUS_ID ?? '7631349568579305472'
const DIABETES_DOMAINS =
  process.env.DIABETES_DOMAINS ??
  'diabetes.org,niddk.nih.gov,cdc.gov/diabetes,idf.org,nhs.uk/conditions/diabetes'

const RAG_CORPUS_RESOURCE = `projects/${PROJECT}/locations/${LOCATION}/ragCorpora/${CORPUS_ID}`

// ─────────────────────────────────────────────────────────────────
// VertexAI client — lazily initialised on first request so the
// Firebase CLI can inspect exported functions without timing out
// ─────────────────────────────────────────────────────────────────

let _model: ReturnType<VertexAI['getGenerativeModel']> | null = null
const HISTORY_MAX_MESSAGES = 12

function getModel() {
  if (!_model) {
    const vertexAI = new VertexAI({ project: PROJECT, location: LOCATION })
    _model = vertexAI.getGenerativeModel({
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
  }
  return _model
}

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
  uid: z.string().min(1),
})

const SendMessageOutput = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
  conversationId: z.string(),
})

// ─────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(SendMessageInput)
    .output(SendMessageOutput)
    .mutation(async ({ input }) => {
      const db = getDb()
      try {
        // ── 1. Resolve or create the conversation ──────────────────
        let convId = input.conversationId
        if (convId === 'new') {
          const convRef = db.collection('conversations').doc()
          convId = convRef.id
          await convRef.set({
            uid: input.uid,
            title: input.message.slice(0, 60),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            deletedAt: null,
          })
        }

        // ── 2. Persist the user message ────────────────────────────
        await db.collection('conversations').doc(convId).collection('messages').doc().set({
          uid: input.uid,
          conversationId: convId,
          role: 'user',
          content: input.message,
          version: 'v1',
          citations: [],
          createdAt: FieldValue.serverTimestamp(),
          deletedAt: null,
        })

        // ── 3. Build conversation history for context ──────────────
        const historySnap = await db
          .collection('conversations')
          .doc(convId)
          .collection('messages')
          .where('uid', '==', input.uid)
          .where('deletedAt', '==', null)
          .orderBy('createdAt', 'desc')
          .limit(HISTORY_MAX_MESSAGES)
          .get()

        const historyDocs = historySnap.docs.reverse()
        const contents =
          historyDocs.length > 0
            ? [
                ...historyDocs.map(d => {
                  const data = d.data() as {
                    role?: string
                    content?: string
                  }
                  const role = data.role === 'assistant' ? 'model' : 'user'
                  const text = data.content ?? ''
                  return { role, parts: [{ text }] }
                }),
                { role: 'user', parts: [{ text: input.message }] },
              ]
            : [{ role: 'user', parts: [{ text: input.message }] }]

        // ── 4. Call Vertex AI ──────────────────────────────────────
        const result = await getModel().generateContent({
          tools: [ragTool],
          contents,
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

        const domainList = DIABETES_DOMAINS.split(',')
          .map(s => s.trim())
          .filter(Boolean)
        const extraLinks = domainList.map(
          d => `https://www.google.com/search?q=${encodeURIComponent(`site:${d} ${input.message}`)}`
        )

        // ── 5. Persist the assistant message ───────────────────────
        await db.collection('conversations').doc(convId).collection('messages').doc().set({
          uid: input.uid,
          conversationId: convId,
          role: 'assistant',
          content: answerText,
          version: 'v1',
          citations: sources,
          extraLinks,
          createdAt: FieldValue.serverTimestamp(),
          deletedAt: null,
        })

        // ── 6. Bump conversation updatedAt ─────────────────────────
        await db.collection('conversations').doc(convId).update({
          updatedAt: FieldValue.serverTimestamp(),
        })

        return { answer: answerText, sources, conversationId: convId }
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
